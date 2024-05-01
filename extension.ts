import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import {
    Extension,
    gettext as _
} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as MumblePing from './mumblePing.js';
import {ExtensionMetadata} from '@girs/gnome-shell/extensions/extension';

interface MumblePingConstructorParams {
  settings: Gio.Settings;
  dir: Gio.File;
  metadata: ExtensionMetadata;
}

const enum Status {
  DISABLED = 0,
  NEUTRAL = 1,
  ERROR = 2,
  WAITING = 3,
}

const enum Icon {
  NEUTRAL = 'icon_neutral.svg',
  ERROR = 'icon_red.svg',
}

const enum Settings {
  MUMBLE_PORT = 'mumble-port',
  MUMBLE_HOST = 'mumble-host',
  REFRESH_TIMEOUT = 'refresh-timeout',
}

interface IndicatorStatus {
  lastResponse: MumblePing.MumblePingResult;
  status: Status;
}

class MumbleIndicatorButton extends PanelMenu.Button {
    #settings: Gio.Settings | null;
    #mumbleIcon: St.Icon | undefined;
    #numUsersLabel: St.Label | undefined;
    #settingsSignalHandlers: number[] | null;
    #indicatorStatus: IndicatorStatus | null;
    #isDebugModeEnabled: boolean;
    #autoCancel: Gio.Cancellable | undefined | null;
    #connection: Gio.SocketConnection | undefined | null;
    /**
     * Timeout ID
     */
    #mainLoopTimeout: number | undefined | null;
    #metadata: ExtensionMetadata;
    #dir: Gio.File;

    constructor(params: MumblePingConstructorParams) {
        super(0.0, _('Mumble Ping'), false);
        this.#settings = params.settings;
        this.#metadata = params.metadata;
        this.#dir = params.dir;
        this.#settingsSignalHandlers = [];
        this.#indicatorStatus = {
            lastResponse: {
                users: 0,
                maxUsers: 0,
            },
            status: Status.NEUTRAL,
        };
        this.#isDebugModeEnabled = this.#settings.get_boolean('debug');

        this.#setupWidgets();

        this.#attachSettingsSignalHandlers();

        if (this.#settings.get_boolean('enabled')) {
            // Refresh indicator on extension start immediately
            this.#mainLoop();
            this.#startMainLoop();
        }
    }

    #setupWidgets() {
        const menuLayout = new St.BoxLayout();
        this.#mumbleIcon = new St.Icon({
            styleClass: 'system-status-icon',
        });
        this.#setIndicatorIcon(Icon.NEUTRAL);
        this.#numUsersLabel = new St.Label({
            text: '',
            yExpand: true,
            yAlign: Clutter.ActorAlign.CENTER,
        });
        menuLayout.add_child(this.#mumbleIcon);
        menuLayout.add_child(this.#numUsersLabel);
        this.add_child(menuLayout);
    }

    #attachSignalHandler(signalName: string) {
        if (this.#settings === null)
            return;

        const restart = () => {
            this.#stopMainLoop();
            if (this.#settings!.get_boolean('enabled')) {
                this.#setIndicatorToWaiting();
                this.#startMainLoop();
            }
        };
        this.#settingsSignalHandlers?.push(
            this.#settings.connect(`changed::${signalName}`, () => {
                this.#log(`Changed ${signalName}`);
                restart();
            })
        );
    }

    #setIndicatorToWaiting() {
        if (this.#indicatorStatus!.status !== Status.WAITING) {
            this.#numUsersLabel?.set_text('...');
      this.#indicatorStatus!.status = Status.WAITING;
        }
    }

    #attachSettingsSignalHandlers() {
        this.#attachSignalHandler(Settings.MUMBLE_PORT);
        this.#attachSignalHandler(Settings.MUMBLE_HOST);
        this.#attachSignalHandler(Settings.REFRESH_TIMEOUT);
        this.#settingsSignalHandlers?.push(
      this.#settings!.connect('changed::debug', () => {
          this.#log('Changed debug mode setting');
          this.#isDebugModeEnabled = this.#settings!.get_boolean('debug');
      })
        );
    }

    /**
     * Log a message if the extension is currently in debug mode
     *
     * @param msg Message to log
     */
    #log(msg: string) {
        if (this.#isDebugModeEnabled)
            console.log(`${this.#metadata.name}: ${msg}`);
    }

    #startMainLoop() {
        this.#mainLoopTimeout = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
      this.#settings!.get_int(Settings.REFRESH_TIMEOUT),
      () => {
          this.#mainLoop();
          return true;
      }
        );
    }

    /**
     * Stop the main loop and clear the connection
     */
    #stopMainLoop() {
        if (this.#mainLoopTimeout) {
            GLib.source_remove(this.#mainLoopTimeout);
            this.#mainLoopTimeout = null;
        }
        this.#connection = null;
    }

    toggleEnableDisable() {
        const enabledNow = !this.#settings!.get_boolean('enabled');
        this.#log(
            `Setting status of indicator to ${enabledNow ? 'enabled' : 'disabled'}`
        );
        this.#stopMainLoop();
    this.#settings!.set_boolean('enabled', enabledNow);
    if (enabledNow) {
        this.#setIndicatorToWaiting();
        this.#mainLoop();
        this.#startMainLoop();
    } else {
        this.#cancelPendingRequests();
      this.#numUsersLabel!.set_text('');
      this.#indicatorStatus!.status = Status.DISABLED;
    }
    }

    #cancelPendingRequests() {
        this.#autoCancel?.cancel();
        this.#autoCancel = null;
    }

    async #mainLoop() {
        try {
            this.#cancelPendingRequests();
            this.#autoCancel = new Gio.Cancellable();
            if (!this.#connection) {
                const port = this.#settings!.get_int(Settings.MUMBLE_PORT);
                const host = this.#settings!.get_string(Settings.MUMBLE_HOST);
                this.#log(`Connecting to ${host} on port ${port}`);
                this.#connection = await MumblePing.createClient(
          host!,
          port,
          this.#autoCancel
                );
            }
            this.#log('Sending Ping');
            const pingResponse = await MumblePing.pingMumble(
                this.#connection,
                this.#autoCancel
            );
            this.#autoCancel = null;
            this.#updateIndicator(pingResponse);
        } catch (error: any) {
            if (error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) {
                this.#log('Cancelled previous operation');
                this.#setIndicatorToError();
            } else {
                this.#connection = null;
                this.#handleError(error, '_mainLoop');
            }
        }
    }

    /**
     * Set mumble status indicator icon
     *
     * @param {string} iconFileName
     */
    #setIndicatorIcon(iconFileName: string) {
        const iconPath = this.#dir
      .get_child('icons')
      .get_child(iconFileName)
      .get_path();
        this.#mumbleIcon?.set_gicon(Gio.Icon.new_for_string(iconPath!));
    }

    /**
     * Update the indicator based on the ping response
     *
     * @param pingResponse
     */
    #updateIndicator(pingResponse: MumblePing.MumblePingResult) {
        if (this.#hasStatusChanged(pingResponse)) {
            this.#numUsersLabel?.set_text(
                `${pingResponse.users}/${pingResponse.maxUsers}`
            );
            if (this.#indicatorStatus!.status !== Status.NEUTRAL)
                this.#setIndicatorIcon(Icon.NEUTRAL);

      this.#indicatorStatus!.lastResponse = pingResponse;
      this.#indicatorStatus!.status = Status.NEUTRAL;
        }
    }

    #setIndicatorToError() {
        if (!this.#indicatorStatus?.status)
            return;
        if (this.#indicatorStatus.status !== Status.ERROR) {
            this.#setIndicatorIcon(Icon.ERROR);
            this.#numUsersLabel?.set_text('');
            this.#indicatorStatus.status = Status.ERROR;
        }
    }

    #handleError(error: object | string, method = '') {
        this.#log(`${method}: ${error}`);
        this.#setIndicatorToError();
    }

    #hasStatusChanged(result: MumblePing.MumblePingResult): boolean {
        if (!result)
            return false;
        const lastNumUsers = this.#indicatorStatus!.lastResponse?.users;
        const lastMaxUsers = this.#indicatorStatus!.lastResponse?.maxUsers;
        const lastStatus = this.#indicatorStatus!.status;
        const updateNeeded =
      result.users !== lastNumUsers ||
      result.maxUsers !== lastMaxUsers ||
      lastStatus !== Status.NEUTRAL;
        return updateNeeded;
    }

    _onDestroy() {
        this.#stopMainLoop();
        this.#cancelPendingRequests();
        this.#settingsSignalHandlers?.forEach(handle => {
      this.#settings!.disconnect(handle);
        });
        this.#settingsSignalHandlers = null;
        this.#indicatorStatus = null;
        this.#settings = null;
        super.destroy();
    }
}

const MumblePingIndicator = GObject.registerClass(MumbleIndicatorButton);

export default class MumblePingExtension extends Extension {
    #indicator: MumbleIndicatorButton | undefined | null;
    #settings?: Gio.Settings | null;

    enable() {
        this.#settings = this.getSettings();
        this.#indicator = new MumblePingIndicator({
            metadata: this.metadata,
            settings: this.#settings,
            dir: this.dir,
        });
        this.#setupPopupMenu();
        Main.panel.addToStatusArea(this.uuid, this.#indicator);
    }

    disable() {
        this.#log('disabling extension.');
        this.#indicator?.destroy();
        this.#indicator = null;
        this.#settings = null;
    }

    #setupPopupMenu() {
        const enableDisableMenuItem = new PopupMenu.PopupSwitchMenuItem(
            _('Enable/Disable'),
      this.#settings!.get_boolean('enabled')
        );
        enableDisableMenuItem.connect('activate', () => {
            this.#indicator?.toggleEnableDisable();
        });
        (this.#indicator!.menu as PopupMenu.PopupMenu).addMenuItem(
            enableDisableMenuItem
        );
        (this.#indicator!.menu as PopupMenu.PopupMenu).addMenuItem(
            new PopupMenu.PopupSeparatorMenuItem()
        );
        (this.#indicator!.menu as PopupMenu.PopupMenu).addAction(
            _('Settings'),
            () => {
                this.openPreferences();
            }
        );
    }

    /**
     * Log a message if the extension is currently in debug mode
     *
     * @param msg Message to log
     */
    #log(msg: string) {
        if (this.#settings!.get_boolean('debug'))
            console.debug(`${this.metadata.name}: ${msg}`);
    }
}

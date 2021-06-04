const { GObject, St, Clutter, GLib, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const GETTEXT_DOMAIN = Me.metadata['gettext-domain'];
const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const Util = imports.misc.util;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const MumblePing = Me.imports.mumblePing;
const Status = {
    NEUTRAL: 1,
    ERROR: 2,
    WAITING: 3,
};

const Icon = {
    NEUTRAL: 'icon_neutral.svg',
    ERROR: 'icon_red.svg',
};

const Settings = {
    MUMBLE_PORT: 'mumble-port',
    MUMBLE_HOST: 'mumble-host',
    REFRESH_TIMEOUT: 'refresh-timeout',
};

const MumblePingIndicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('Mumble Ping'));
            this._settingsSignalHandlers = [];
            this._autoCancel = null;
            this._indicatorStatus = {
                lastResponse: null,
                status: Status.NEUTRAL,
            };
            this._settings = ExtensionUtils.getSettings();
            this._debugMode = this._settings.get_boolean('debug');

            this._setupWidgets();

            this._attachSettingsSignalHandlers();
            this._log(`${Me.metadata.name}: Running`);

            // Refresh indicator on extension start immediately
            this._mainLoop();
            this._startMainLoop();
        }

        _setupWidgets() {
            this._menuLayout = new St.BoxLayout();
            this._mumbleIcon = new St.Icon({
                style_class: 'system-status-icon',
            });
            this._setIndicatorIcon(Icon.NEUTRAL);
            this._numUsersLabel = new St.Label({
                text: '',
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            this._menuLayout.add_actor(this._mumbleIcon);
            this._menuLayout.add_actor(this._numUsersLabel);
            this.add_actor(this._menuLayout);

            this._setupPopupMenu();
        }

        _attachSignalHandler(signalName) {
            const restart = () => {
                this._setIndicatorToWaiting();
                this._stopMainLoop();
                this._startMainLoop();
            };
            this._settingsSignalHandlers.push(
                this._settings.connect(`changed::${signalName}`, () => {
                    this._log(`Changed ${signalName}`);
                    restart();
                })
            );
        }

        _setIndicatorToWaiting() {
            if (this._indicatorStatus.status !== Status.WAITING) {
                this._numUsersLabel.set_text('...');
                this._indicatorStatus.status = Status.WAITING;
            }
        }

        _attachSettingsSignalHandlers() {
            this._attachSignalHandler(Settings.MUMBLE_PORT);
            this._attachSignalHandler(Settings.MUMBLE_HOST);
            this._attachSignalHandler(Settings.REFRESH_TIMEOUT);
            this._settingsSignalHandlers.push(
                this._settings.connect('changed::debug', () => {
                    this._log('Changed debug mode setting');
                    this._debugMode = this._settings.get_boolean('debug');
                })
            );
        }

        /**
         * Log a message if the extension is currently in debug mode
         * @param {string} msg Message to log
         */
        _log(msg) {
            if (this._debugMode)
                log(`${Me.metadata.name}: ${msg}`);
        }

        _startMainLoop() {
            this._mainLoopTimeout = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                this._settings.get_int(Settings.REFRESH_TIMEOUT),
                () => {
                    this._mainLoop();
                    return true;
                }
            );
        }

        /**
         * Stop the main loop and clear the connection
         */
        _stopMainLoop() {
            if (this._mainLoopTimeout) {
                GLib.source_remove(this._mainLoopTimeout);
                this._mainLoopTimeout = null;
            }
            this._connection = null;
        }

        _setupPopupMenu() {
            this._settingsMenuItem = new PopupMenu.PopupMenuItem(_('Settings'));
            this._settingsMenuItem.connect('activate', () => {
                Util.spawn(['gnome-extensions', 'prefs', Me.metadata.uuid]);
            });
            this.menu.addMenuItem(this._settingsMenuItem);
        }

        _cancelPreviousIteration() {
            if (this._autoCancel) {
                this._autoCancel.cancel();
                this._autoCancel = null;
            }
        }

        async _mainLoop() {
            try {
                this._cancelPreviousIteration();
                this._autoCancel = new Gio.Cancellable();
                if (!this._connection) {
                    const port = this._settings.get_int(Settings.MUMBLE_PORT);
                    const host = this._settings.get_string(
                        Settings.MUMBLE_HOST
                    );
                    this._log(`Connecting to ${host} on port ${port}`);
                    this._connection = await MumblePing.createClient(
                        host,
                        port,
                        this._autoCancel
                    );
                }
                this._log('Sending Ping');
                let pingResponse = await MumblePing.pingMumble(
                    this._connection,
                    this._autoCancel
                );
                this._autoCancel = null;
                this._updateIndicator(pingResponse);
            } catch (error) {
                if (error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) {
                    this._log('Cancelled previous operation');
                    this._setIndicatorToError();
                } else {
                    this._handleError(error, '_mainLoop');
                }
            }
        }

        _setIndicatorIcon(iconFileName) {
            const iconPath = Me.dir
                .get_child('icons')
                .get_child(iconFileName)
                .get_path();
            this._mumbleIcon.set_gicon(Gio.Icon.new_for_string(iconPath));
        }

        /**
         * Update the indicator based on the ping response
         * @param {Object} pingResponse Response of the status ping
         */
        _updateIndicator(pingResponse) {
            let updateNeeded = this._hasStatusChanged(pingResponse);
            if (updateNeeded) {
                this._numUsersLabel.set_text(
                    `${pingResponse.users}/${pingResponse.maxUsers}`
                );
                if (this._indicatorStatus.status !== Status.NEUTRAL)
                    this._setIndicatorIcon(Icon.NEUTRAL);

                this._indicatorStatus.lastResponse = pingResponse;
                this._indicatorStatus.status = Status.NEUTRAL;
            }
        }

        _setIndicatorToError() {
            if (!this._indicatorStatus.status)
                return;
            if (this._indicatorStatus.status !== Status.ERROR) {
                this._setIndicatorIcon(Icon.ERROR);
                this._numUsersLabel.set_text('');
                this._indicatorStatus.status = Status.ERROR;
            }
        }

        _handleError(error, method = '') {
            this._log(`${method}: ${error}`);
            this._setIndicatorToError();
        }

        _hasStatusChanged(result) {
            if (!result)
                return false;
            let lastNumUsers = this._indicatorStatus.lastResponse?.users;
            let lastMaxUsers = this._indicatorStatus.lastResponse?.maxUsers;
            let lastStatus = this._indicatorStatus.status;
            let updateNeeded =
                result.users !== lastNumUsers ||
                result.maxUsers !== lastMaxUsers ||
                lastStatus !== Status.NEUTRAL;
            return updateNeeded;
        }

        _onDestroy() {
            this._log('Indicator._onDestroy()');
            this._stopMainLoop();
            if (this._autoCancel) {
                this._autoCancel.cancel();
                this._autoCancel = null;
            }
            this._settingsSignalHandlers.forEach(handle => {
                this._settings.disconnect(handle);
            });
            this._settingsSignalHandlers = null;
            this._menuLayout = null;
            this._indicatorStatus = null;
            this._settings = null;
            super._onDestroy();
        }
    }
);

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._mumbleIndicator = new MumblePingIndicator();
        Main.panel.addToStatusArea(this._uuid, this._mumbleIndicator);
    }

    disable() {
        this._mumbleIndicator.destroy();
        this._mumbleIndicator = null;
    }
}

// eslint-disable-next-line no-unused-vars
function init(meta) {
    return new Extension(meta.uuid);
}

const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GTK_MAJOR_VERSION = Gtk.get_major_version();
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const GETTEXT_DOMAIN = Me.metadata['gettext-domain'];
const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;
const MAX_UNIX_PORT = 65535;

// eslint-disable-next-line no-unused-vars
function init() {
    ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
}

const MumblePingPrefsWidget = new GObject.registerClass(
    class ExtensionMumblePingPrefsWidget extends Gtk.Frame {
        _setMargin(widget, numPixels) {
            if (GTK_MAJOR_VERSION >= 4) {
                widget.set_margin_start(numPixels);
                widget.set_margin_end(numPixels);
            } else {
                widget.set_margin_left(numPixels);
                widget.set_margin_right(numPixels);
            }
            widget.set_margin_top(numPixels);
            widget.set_margin_bottom(numPixels);
        }

        _init() {
            super._init();
            const grid = new Gtk.Grid();
            grid.set_column_spacing(10);
            grid.set_row_spacing(10);
            this._setMargin(this, 10);
            this._setMargin(grid, 10);
            if (GTK_MAJOR_VERSION >= 4)
                this.set_child(grid);
            else
                this.add(grid);

            this._settings = ExtensionUtils.getSettings();

            const refreshTimeoutLabel = new Gtk.Label({
                label: _('Poll Server Every (sec)'),
                halign: Gtk.Align.END,
            });
            const refreshTimeoutSpinButton = Gtk.SpinButton.new_with_range(
                1,
                60,
                1
            );
            refreshTimeoutSpinButton.set_hexpand(true);
            const hostNameLabel = new Gtk.Label({
                label: _('Mumble Server'),
                halign: Gtk.Align.END,
            });
            const hostNameBuffer = Gtk.EntryBuffer.new('', -1);
            const hostNameEntry = Gtk.Entry.new_with_buffer(hostNameBuffer);
            const mumblePortLabel = new Gtk.Label({
                label: _('Mumble Port'),
                halign: Gtk.Align.END,
            });
            const mumblePortSpinButton = Gtk.SpinButton.new_with_range(
                1,
                MAX_UNIX_PORT,
                1
            );
            const debuggingModeLabel = new Gtk.Label({
                label: _('Debugging Mode'),
                halign: Gtk.Align.END,
            });
            const debugSwitch = new Gtk.Switch();
            const debugModeHbox = Gtk.Box.new(Gtk.Orientation.HORIZONTAL, 0);
            if (GTK_MAJOR_VERSION >= 4)
                debugModeHbox.append(debugSwitch);
            else
                debugModeHbox.add(debugSwitch);

            grid.attach(refreshTimeoutLabel, 0, 0, 1, 1);
            grid.attach(refreshTimeoutSpinButton, 1, 0, 1, 1);

            grid.attach(hostNameLabel, 0, 1, 1, 1);
            grid.attach(hostNameEntry, 1, 1, 1, 1);

            grid.attach(mumblePortLabel, 0, 2, 1, 1);
            grid.attach(mumblePortSpinButton, 1, 2, 1, 1);

            grid.attach(debuggingModeLabel, 0, 3, 1, 1);
            grid.attach(debugModeHbox, 1, 3, 1, 1);

            this._settings.bind(
                'refresh-timeout',
                refreshTimeoutSpinButton,
                'value',
                Gio.SettingsBindFlags.DEFAULT
            );
            this._settings.bind(
                'mumble-host',
                hostNameBuffer,
                'text',
                Gio.SettingsBindFlags.DEFAULT
            );
            this._settings.bind(
                'mumble-port',
                mumblePortSpinButton,
                'value',
                Gio.SettingsBindFlags.DEFAULT
            );
            this._settings.bind(
                'debug',
                debugSwitch,
                'active',
                Gio.SettingsBindFlags.DEFAULT
            );
        }
    }
);

// eslint-disable-next-line no-unused-vars
function buildPrefsWidget() {
    const prefsWidget = new MumblePingPrefsWidget();
    if (GTK_MAJOR_VERSION < 4) {
        prefsWidget.show_all();
        prefsWidget.connect('destroy', Gtk.main_quit);
    }
    return prefsWidget;
}

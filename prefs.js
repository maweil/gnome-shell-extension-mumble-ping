const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GTK_MAJOR_VERSION = Gtk.get_major_version();
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const GETTEXT_DOMAIN = Me.metadata['gettext-domain'];
const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

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
            this._setMargin(this, 5);
            this._setMargin(grid, 5);
            if (GTK_MAJOR_VERSION >= 4)
                this.set_child(grid);
            else
                this.add(grid);

            this._settings = ExtensionUtils.getSettings();

            grid.attach(
                new Gtk.Label({
                    label: _('Poll Server Every (sec)'),
                    halign: Gtk.Align.END,
                }),
                0,
                0,
                1,
                1
            );
            let refreshTimeoutSpinButton = Gtk.SpinButton.new_with_range(
                1,
                60,
                1
            );
            grid.attach(refreshTimeoutSpinButton, 1, 0, 1, 1);

            grid.attach(
                new Gtk.Label({
                    label: _('Mumble Server'),
                    halign: Gtk.Align.END,
                }),
                0,
                1,
                1,
                1
            );
            const hostNameBuffer = Gtk.EntryBuffer.new('', -1);
            const hostNameEntry = Gtk.Entry.new_with_buffer(hostNameBuffer);
            grid.attach(hostNameEntry, 1, 1, 1, 1);

            grid.attach(
                new Gtk.Label({
                    label: _('Mumble Port'),
                    halign: Gtk.Align.END,
                }),
                0,
                2,
                1,
                1
            );

            const MAX_UNIX_PORT = 65535;
            const mumblePortSpinButton = Gtk.SpinButton.new_with_range(
                1,
                MAX_UNIX_PORT,
                1
            );
            grid.attach(mumblePortSpinButton, 1, 2, 1, 1);

            grid.attach(
                new Gtk.Label({
                    label: _('Debugging Mode'),
                    halign: Gtk.Align.END,
                }),
                0,
                3,
                1,
                1
            );

            let debugSwitch = new Gtk.Switch();
            let hBox = Gtk.Box.new(Gtk.Orientation.HORIZONTAL, 0);
            if (GTK_MAJOR_VERSION >= 4)
                hBox.append(debugSwitch);
            else
                hBox.add(debugSwitch);

            grid.attach(hBox, 1, 3, 1, 1);
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

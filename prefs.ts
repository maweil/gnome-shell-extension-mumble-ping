import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import {
    ExtensionPreferences,
    gettext as _
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
const MAX_UNIX_PORT = 65535;

export default class MumblePingPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        const generalSettings = new Adw.PreferencesGroup({
            title: _('General Settings'),
        });
        const connectionSettings = new Adw.PreferencesGroup({
            title: _('Connection'),
        });
        const refreshTimeoutRow = new Adw.SpinRow({
            title: _('Poll Server Every (sec)'),
            adjustment: new Gtk.Adjustment({
                value: 120,
                lower: 1,
                upper: 3600,
                step_increment: 1,
                page_increment: 1,
                page_size: 10,
            }),
            climb_rate: 2,
            digits: 0,
        });
        const hostnameRow = new Adw.EntryRow({
            title: _('Mumble Server'),
        });
        const portRow = new Adw.SpinRow({
            title: _('Mumble Port'),
            adjustment: new Gtk.Adjustment({
                value: 64738,
                lower: 1,
                upper: MAX_UNIX_PORT,
                step_increment: 1,
                page_increment: 1,
                page_size: 10,
            }),
            climb_rate: 1,
            digits: 0,
        });

        const debugRow = new Adw.SwitchRow({
            title: _('Debug Mode'),
        });

        generalSettings.add(refreshTimeoutRow);
        generalSettings.add(debugRow);
        connectionSettings.add(hostnameRow);
        connectionSettings.add(portRow);

        page.add(generalSettings);
        page.add(connectionSettings);
        window.add(page);

        window._settings.bind(
            'refresh-timeout',
            refreshTimeoutRow,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );
        window._settings.bind(
            'mumble-host',
            hostnameRow,
            'text',
            Gio.SettingsBindFlags.DEFAULT
        );
        window._settings.bind(
            'mumble-port',
            portRow,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );
        window._settings.bind(
            'debug',
            debugRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
    }
}

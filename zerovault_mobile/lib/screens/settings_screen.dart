import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../state/auth_state.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  int _autoLockSeconds = 300;
  bool _deadManSwitch = false;
  int _deadManDays = 30;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  void _loadSettings() {
    final profile = ref.read(vaultLockProvider).userProfile;
    if (profile != null) {
      setState(() {
        _autoLockSeconds = profile.autoLockSeconds;
        _deadManSwitch = profile.deadManSwitchEnabled;
        _deadManDays = profile.deadManInactivityDays;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _sectionTitle('Security'),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.timer),
                  title: const Text('Auto-Lock'),
                  subtitle: Text(_autoLockLabel()),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: _showAutoLockPicker,
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.key),
                  title: const Text('Change Master Password'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pushNamed(context, '/change-password'),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  secondary: const Icon(Icons.schedule_send),
                  title: const Text('Dead Man\'s Switch'),
                  subtitle: Text(_deadManSwitch
                      ? 'Wipe after $_deadManDays days inactive'
                      : 'Disabled'),
                  value: _deadManSwitch,
                  onChanged: (v) async {
                    setState(() => _deadManSwitch = v);
                    await ref.read(vaultLockProvider.notifier).loadProfile();
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          _sectionTitle('Account'),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.email_outlined),
                  title: const Text('Email'),
                  subtitle: Text(ref.read(authProvider).email ?? ''),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.security),
                  title: const Text('Security Logs'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pushNamed(context, '/security-logs'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.import_export),
                  title: const Text('Import / Export'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pushNamed(context, '/import-export'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          _sectionTitle('About'),
          Card(
            child: Column(
              children: [
                const ListTile(
                  leading: Icon(Icons.info_outline),
                  title: Text('ZeroVault Mobile'),
                  subtitle: Text('Version 1.0.0'),
                ),
                const Divider(height: 1),
                const ListTile(
                  leading: Icon(Icons.shield),
                  title: Text('Encryption'),
                  subtitle: Text('AES-256-GCM + PBKDF2 (600K iterations)'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => ref.read(authProvider.notifier).signOut(),
            icon: const Icon(Icons.logout),
            label: const Text('Sign Out'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              minimumSize: const Size(double.infinity, 52),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _sectionTitle(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8, left: 4),
        child: Text(text,
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.white.withValues(alpha: 0.5))),
      );

  String _autoLockLabel() {
    switch (_autoLockSeconds) {
      case 30:
        return '30 seconds';
      case 60:
        return '1 minute';
      case 120:
        return '2 minutes';
      case 300:
        return '5 minutes';
      case 600:
        return '10 minutes';
      default:
        return '${_autoLockSeconds}s';
    }
  }

  void _showAutoLockPicker() {
    showDialog(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Auto-Lock Timeout'),
        children: [30, 60, 120, 300, 600].map((s) {
          final label = s < 60
              ? '$s seconds'
              : '${s ~/ 60} minute${s >= 120 ? "s" : ""}';
          return SimpleDialogOption(
            onPressed: () {
              setState(() => _autoLockSeconds = s);
              Navigator.pop(ctx);
            },
            child: Text(label,
                style: TextStyle(
                    fontWeight:
                        s == _autoLockSeconds ? FontWeight.bold : null)),
          );
        }).toList(),
      ),
    );
  }
}

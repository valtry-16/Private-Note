import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import '../core/supabase/supabase_service.dart';
import '../state/auth_state.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _autoLockSeconds = 300;
  bool _deadManSwitch = false;
  int _deadManDays = 30;
  bool _biometricEnabled = false;
  bool _biometricAvailable = false;
  bool _totpEnabled = false;
  ThemeMode _themeMode = ThemeMode.dark;
  String _accentColor = 'Indigo';
  String _recoveryEmail = '';
  final _recoveryEmailController = TextEditingController();
  final _emergencyEmailController = TextEditingController();
  bool _isSaving = false;

  static const _storage = FlutterSecureStorage();
  final _localAuth = LocalAuthentication();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadSettings();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _recoveryEmailController.dispose();
    _emergencyEmailController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    final profile = ref.read(vaultLockProvider).userProfile;
    if (profile != null) {
      setState(() {
        _autoLockSeconds = profile.autoLockSeconds;
        _deadManSwitch = profile.deadManSwitchEnabled;
        _deadManDays = profile.deadManInactivityDays;
        _totpEnabled = profile.totpEnabled;
        _emergencyEmailController.text = profile.emergencyContactEmail ?? '';
      });
    }

    try {
      final canCheck = await _localAuth.canCheckBiometrics;
      final isSupported = await _localAuth.isDeviceSupported();
      final saved = await _storage.read(key: 'zerovault_biometric_enabled');
      setState(() {
        _biometricAvailable = canCheck && isSupported;
        _biometricEnabled = saved == 'true';
      });
    } catch (_) {}

    final savedTheme = await _storage.read(key: 'zerovault_theme_mode');
    final savedAccent = await _storage.read(key: 'zerovault_accent_color');
    setState(() {
      _themeMode = savedTheme == 'light'
          ? ThemeMode.light
          : savedTheme == 'system'
              ? ThemeMode.system
              : ThemeMode.dark;
      _accentColor = savedAccent ?? 'Indigo';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Appearance'),
            Tab(text: 'Security'),
            Tab(text: 'Account'),
            Tab(text: 'Advanced'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildAppearanceTab(),
          _buildSecurityTab(),
          _buildAccountTab(),
          _buildAdvancedTab(),
        ],
      ),
    );
  }

  // ─── Appearance Tab ─────────────────────────────────────────────

  Widget _buildAppearanceTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _sectionTitle('Theme'),
        Card(
          child: Column(
            children: [
              RadioListTile<ThemeMode>(
                title: const Text('Dark'),
                secondary: const Icon(Icons.dark_mode),
                value: ThemeMode.dark,
                groupValue: _themeMode,
                onChanged: (v) => _setTheme(v!),
              ),
              const Divider(height: 1),
              RadioListTile<ThemeMode>(
                title: const Text('Light'),
                secondary: const Icon(Icons.light_mode),
                value: ThemeMode.light,
                groupValue: _themeMode,
                onChanged: (v) => _setTheme(v!),
              ),
              const Divider(height: 1),
              RadioListTile<ThemeMode>(
                title: const Text('System'),
                secondary: const Icon(Icons.brightness_auto),
                value: ThemeMode.system,
                groupValue: _themeMode,
                onChanged: (v) => _setTheme(v!),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        _sectionTitle('Accent Color'),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _colorOption('Indigo', const Color(0xFF6366F1)),
                _colorOption('Blue', const Color(0xFF3B82F6)),
                _colorOption('Emerald', const Color(0xFF10B981)),
                _colorOption('Rose', const Color(0xFFF43F5E)),
                _colorOption('Violet', const Color(0xFF8B5CF6)),
                _colorOption('Amber', const Color(0xFFF59E0B)),
                _colorOption('Cyan', const Color(0xFF06B6D4)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
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
      ],
    );
  }

  Widget _colorOption(String name, Color color) {
    final isSelected = _accentColor == name;
    return GestureDetector(
      onTap: () async {
        setState(() => _accentColor = name);
        await _storage.write(key: 'zerovault_accent_color', value: name);
      },
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: isSelected
              ? Border.all(color: Colors.white, width: 3)
              : null,
        ),
        child: isSelected ? const Icon(Icons.check, color: Colors.white, size: 20) : null,
      ),
    );
  }

  Future<void> _setTheme(ThemeMode mode) async {
    setState(() => _themeMode = mode);
    final label = mode == ThemeMode.dark ? 'dark' : mode == ThemeMode.light ? 'light' : 'system';
    await _storage.write(key: 'zerovault_theme_mode', value: label);
  }

  // ─── Security Tab ───────────────────────────────────────────────

  Widget _buildSecurityTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _sectionTitle('Authentication'),
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
              if (_biometricAvailable) ...[
                SwitchListTile(
                  secondary: const Icon(Icons.fingerprint),
                  title: const Text('Biometric Unlock'),
                  subtitle: const Text('Use fingerprint or face to unlock'),
                  value: _biometricEnabled,
                  onChanged: _toggleBiometric,
                ),
                const Divider(height: 1),
              ],
              SwitchListTile(
                secondary: const Icon(Icons.security),
                title: const Text('Two-Factor Authentication'),
                subtitle: Text(_totpEnabled ? 'Enabled' : 'Disabled'),
                value: _totpEnabled,
                onChanged: (v) => _toggle2FA(v),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        _sectionTitle('Password'),
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.key),
                title: const Text('Change Master Password'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.pushNamed(context, '/change-password'),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.health_and_safety),
                title: const Text('Password Health'),
                subtitle: const Text('Check for weak, reused, or old passwords'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.pushNamed(context, '/password-health'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        _sectionTitle('Emergency'),
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.contact_mail),
                title: const Text('Emergency Contact'),
                subtitle: Text(_emergencyEmailController.text.isNotEmpty
                    ? _emergencyEmailController.text
                    : 'Not set'),
                trailing: const Icon(Icons.chevron_right),
                onTap: _showEmergencyContactDialog,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _toggleBiometric(bool enable) async {
    if (enable) {
      try {
        final authenticated = await _localAuth.authenticate(
          localizedReason: 'Authenticate to enable biometric unlock',
          options: const AuthenticationOptions(biometricOnly: true),
        );
        if (!authenticated) return;
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Biometric auth failed: $e')),
          );
        }
        return;
      }
    }
    await _storage.write(key: 'zerovault_biometric_enabled', value: enable.toString());
    setState(() => _biometricEnabled = enable);
  }

  Future<void> _toggle2FA(bool enable) async {
    if (enable) {
      // Show a dialog explaining 2FA setup
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Enable 2FA'),
          content: const Text(
            'Two-factor authentication adds an extra layer of security. '
            'You\'ll need to enter a 6-digit code from your authenticator app '
            'each time you unlock the vault.\n\n'
            'Please set up 2FA from the web app at zero-vault-storage.vercel.app '
            'to scan the QR code with your authenticator app.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('I\'ve set up 2FA on web'),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
    } else {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Disable 2FA'),
          content: const Text('Are you sure you want to disable two-factor authentication?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Disable', style: TextStyle(color: Colors.red)),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
    }

    try {
      await SupabaseService.upsertUserProfile({'totp_enabled': enable});
      await ref.read(vaultLockProvider.notifier).loadProfile();
      setState(() => _totpEnabled = enable);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    }
  }

  void _showEmergencyContactDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Emergency Contact'),
        content: TextField(
          controller: _emergencyEmailController,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
            labelText: 'Contact Email',
            hintText: 'trusted@email.com',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await SupabaseService.upsertUserProfile({
                'emergency_contact_email': _emergencyEmailController.text.trim(),
              });
              await ref.read(vaultLockProvider.notifier).loadProfile();
              setState(() {});
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  // ─── Account Tab ────────────────────────────────────────────────

  Widget _buildAccountTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _sectionTitle('Profile'),
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
                leading: const Icon(Icons.email),
                title: const Text('Recovery Email'),
                subtitle: Text(_recoveryEmail.isNotEmpty ? _recoveryEmail : 'Not set'),
                trailing: const Icon(Icons.chevron_right),
                onTap: _showRecoveryEmailDialog,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        _sectionTitle('Activity'),
        Card(
          child: Column(
            children: [
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
        const SizedBox(height: 20),
        _sectionTitle('Danger Zone'),
        Card(
          color: Colors.red.withValues(alpha: 0.05),
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text('Sign Out', style: TextStyle(color: Colors.red)),
                subtitle: const Text('Sign out and clear local data'),
                onTap: () => _confirmSignOut(),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.delete_forever, color: Colors.red),
                title: const Text('Delete Account', style: TextStyle(color: Colors.red)),
                subtitle: const Text('Permanently delete your account and all data'),
                onTap: () => _confirmDeleteAccount(),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  void _showRecoveryEmailDialog() {
    _recoveryEmailController.text = _recoveryEmail;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Recovery Email'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Set a recovery email to reset your account password if you forget it.',
                style: TextStyle(fontSize: 13)),
            const SizedBox(height: 12),
            TextField(
              controller: _recoveryEmailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Recovery Email',
                hintText: 'your-recovery@email.com',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final email = _recoveryEmailController.text.trim();
                await SupabaseService.updateUser(email: email);
                setState(() => _recoveryEmail = email);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Recovery email updated')),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed: $e')),
                  );
                }
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _confirmSignOut() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out? Local data will be cleared.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(authProvider.notifier).signOut();
            },
            child: const Text('Sign Out', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteAccount() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Account'),
        content: const Text(
          'This will permanently delete your account and ALL vault data. '
          'This action cannot be undone.\n\n'
          'Are you absolutely sure?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              setState(() => _isSaving = true);
              try {
                final userId = SupabaseService.userId;
                if (userId != null) {
                  await SupabaseService.client.from('vault_items').delete().eq('user_id', userId);
                  await SupabaseService.client.from('security_logs').delete().eq('user_id', userId);
                  await SupabaseService.client.from('shared_links').delete().eq('user_id', userId);
                  await SupabaseService.client.from('user_profiles').delete().eq('user_id', userId);
                  await _storage.deleteAll();
                }
                await SupabaseService.signOut();
                if (mounted) {
                  ref.read(authProvider.notifier).signOut();
                }
              } catch (e) {
                setState(() => _isSaving = false);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed: $e')),
                  );
                }
              }
            },
            child: const Text('Delete My Account', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  // ─── Advanced Tab ───────────────────────────────────────────────

  Widget _buildAdvancedTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _sectionTitle('Hidden Vault'),
        Card(
          child: ListTile(
            leading: const Icon(Icons.visibility_off),
            title: const Text('Hidden Vault Passcode'),
            subtitle: const Text('Set a separate passcode for hidden items'),
            trailing: const Icon(Icons.chevron_right),
            onTap: _showHiddenVaultSetup,
          ),
        ),
        const SizedBox(height: 20),
        _sectionTitle('Dead Man\'s Switch'),
        Card(
          child: Column(
            children: [
              SwitchListTile(
                secondary: const Icon(Icons.schedule_send),
                title: const Text('Dead Man\'s Switch'),
                subtitle: Text(_deadManSwitch
                    ? 'Wipe after $_deadManDays days inactive'
                    : 'Disabled'),
                value: _deadManSwitch,
                onChanged: (v) async {
                  setState(() => _deadManSwitch = v);
                  await SupabaseService.upsertUserProfile({
                    'dead_man_switch_enabled': v,
                  });
                  await ref.read(vaultLockProvider.notifier).loadProfile();
                },
              ),
              if (_deadManSwitch) ...[
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.calendar_today),
                  title: const Text('Inactivity Threshold'),
                  subtitle: Text('$_deadManDays days'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: _showDeadManDaysPicker,
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 20),
        _sectionTitle('Data'),
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.download),
                title: const Text('Export All Data'),
                subtitle: const Text('Download a copy of all vault data'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.pushNamed(context, '/import-export'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _showHiddenVaultSetup() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hidden Vault Passcode'),
        content: TextField(
          controller: controller,
          obscureText: true,
          decoration: const InputDecoration(
            labelText: 'Passcode',
            hintText: 'Min 6 characters',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (controller.text.length < 6) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Passcode must be at least 6 characters')),
                );
                return;
              }
              Navigator.pop(ctx);
              final hash = VaultCryptoHelper.hashPasscode(controller.text);
              await SupabaseService.upsertUserProfile({
                'hidden_vault_hash': hash,
              });
              await ref.read(vaultLockProvider.notifier).loadProfile();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Hidden vault passcode set')),
                );
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showDeadManDaysPicker() {
    showDialog(
      context: context,
      builder: (ctx) {
        int selectedDays = _deadManDays;
        return AlertDialog(
          title: const Text('Inactivity Threshold'),
          content: StatefulBuilder(
            builder: (context, setDialogState) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [30, 60, 90, 180, 365].map((days) {
                  return RadioListTile<int>(
                    title: Text('$days days'),
                    value: days,
                    groupValue: selectedDays,
                    onChanged: (v) => setDialogState(() => selectedDays = v!),
                  );
                }).toList(),
              );
            },
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(ctx);
                setState(() => _deadManDays = selectedDays);
                await SupabaseService.upsertUserProfile({
                  'dead_man_inactivity_days': selectedDays,
                });
                await ref.read(vaultLockProvider.notifier).loadProfile();
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }

  // ─── Common ─────────────────────────────────────────────────────

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
        return '$_autoLockSeconds seconds';
    }
  }

  void _showAutoLockPicker() {
    showDialog(
      context: context,
      builder: (ctx) {
        int selected = _autoLockSeconds;
        return AlertDialog(
          title: const Text('Auto-Lock Timer'),
          content: StatefulBuilder(
            builder: (context, setDialogState) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _lockOption(30, '30 seconds', selected, (v) {
                    setDialogState(() => selected = v);
                  }),
                  _lockOption(60, '1 minute', selected, (v) {
                    setDialogState(() => selected = v);
                  }),
                  _lockOption(120, '2 minutes', selected, (v) {
                    setDialogState(() => selected = v);
                  }),
                  _lockOption(300, '5 minutes', selected, (v) {
                    setDialogState(() => selected = v);
                  }),
                  _lockOption(600, '10 minutes', selected, (v) {
                    setDialogState(() => selected = v);
                  }),
                ],
              );
            },
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(ctx);
                setState(() => _autoLockSeconds = selected);
                await SupabaseService.upsertUserProfile({
                  'auto_lock_seconds': selected,
                });
                await ref.read(vaultLockProvider.notifier).loadProfile();
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }

  Widget _lockOption(
      int seconds, String label, int current, void Function(int) onChanged) {
    return RadioListTile<int>(
      title: Text(label),
      value: seconds,
      groupValue: current,
      onChanged: (v) => onChanged(v!),
    );
  }
}

/// Helper for hidden vault passcode hashing
class VaultCryptoHelper {
  static String hashPasscode(String passcode) {
    // Simple hash for hidden vault (not encryption-grade, just access control)
    final bytes = passcode.codeUnits;
    int hash = 0;
    for (final b in bytes) {
      hash = ((hash << 5) - hash + b) & 0xFFFFFFFF;
    }
    return hash.toRadixString(16);
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../../widgets/gradient_button.dart';

class VaultUnlockScreen extends ConsumerStatefulWidget {
  const VaultUnlockScreen({super.key});

  @override
  ConsumerState<VaultUnlockScreen> createState() => _VaultUnlockScreenState();
}

class _VaultUnlockScreenState extends ConsumerState<VaultUnlockScreen> {
  final _controller = TextEditingController();
  final _auth = LocalAuthentication();
  bool _obscure = true;
  bool _biometricAvailable = false;

  @override
  void initState() {
    super.initState();
    _checkBiometric();
    ref.read(vaultLockProvider.notifier).loadProfile();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _checkBiometric() async {
    try {
      final available = await _auth.canCheckBiometrics;
      final isDeviceSupported = await _auth.isDeviceSupported();
      if (mounted) {
        setState(() => _biometricAvailable = available && isDeviceSupported);
      }
    } catch (_) {
      if (mounted) setState(() => _biometricAvailable = false);
    }
  }

  Future<void> _unlock() async {
    final pw = _controller.text;
    if (pw.isEmpty) return;
    await ref.read(vaultLockProvider.notifier).unlock(pw);
  }

  Future<void> _biometricUnlock() async {
    try {
      final didAuth = await _auth.authenticate(
        localizedReason: 'Unlock your ZeroVault',
        options: const AuthenticationOptions(biometricOnly: true),
      );
      if (didAuth) {
        await ref.read(vaultLockProvider.notifier).unlockWithBiometric();
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final lock = ref.watch(vaultLockProvider);

    ref.listen(vaultLockProvider, (prev, next) {
      if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error!),
            backgroundColor: AppColors.error,
          ),
        );
      }
    });

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.authGradient),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding:
                  const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
              child: Column(
                children: [
                  _buildHero(lock.isLockedOut),
                  const SizedBox(height: 36),
                  _buildCard(lock),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHero(bool isLockedOut) {
    return Column(
      children: [
        Container(
          width: 84,
          height: 84,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: isLockedOut
                  ? [AppColors.error, Color(0xFFFF6B6B)]
                  : [AppColors.primary, AppColors.primaryLight],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: (isLockedOut ? AppColors.error : AppColors.primary)
                    .withValues(alpha: 0.45),
                blurRadius: 28,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Icon(
            isLockedOut ? Icons.lock : Icons.lock_open_outlined,
            color: Colors.white,
            size: 42,
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'ZeroVault',
          style: TextStyle(
            color: Colors.white,
            fontSize: 30,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          isLockedOut
              ? 'Vault temporarily locked'
              : 'Enter your master password',
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _buildCard(dynamic lock) {
    final isLockedOut = lock.isLockedOut as bool;
    final isLoading = lock.isLoading as bool;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border, width: 0.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 32,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isLockedOut) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.errorBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: AppColors.error.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.timer_outlined,
                      color: AppColors.error, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Too many failed attempts. Vault locked for 5 minutes.',
                      style: TextStyle(
                          color: AppColors.error.withValues(alpha: 0.9),
                          fontSize: 13,
                          height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],
          TextFormField(
            controller: _controller,
            obscureText: _obscure,
            enabled: !isLockedOut,
            style: const TextStyle(color: Colors.white),
            onFieldSubmitted: (_) => _unlock(),
            decoration: InputDecoration(
              labelText: 'Master Password',
              prefixIcon: const Icon(Icons.key_outlined),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscure
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                ),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
          ),
          const SizedBox(height: 20),
          GradientButton(
            onPressed: isLoading || isLockedOut ? null : _unlock,
            child: isLoading ? const ButtonSpinner() : const Text('Unlock Vault'),
          ),
          if (_biometricAvailable) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: OutlinedButton.icon(
                onPressed: isLockedOut ? null : _biometricUnlock,
                icon: const Icon(Icons.fingerprint, size: 22),
                label: const Text('Biometric Unlock',
                    style: TextStyle(fontWeight: FontWeight.w500)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(
                      color: AppColors.borderLight, width: 1),
                  foregroundColor: AppColors.textSecondary,
                ),
              ),
            ),
          ],
          const SizedBox(height: 20),
          Center(
            child: TextButton.icon(
              onPressed: () =>
                  ref.read(authProvider.notifier).signOut(),
              icon: const Icon(Icons.logout, size: 16),
              label: const Text('Sign out'),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.textMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

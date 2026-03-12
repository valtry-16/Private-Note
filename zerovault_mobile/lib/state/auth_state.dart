import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/encryption/vault_crypto.dart';
import '../core/supabase/supabase_service.dart';
import '../models/user_profile.dart';

// ─── Auth State ────────────────────────────────────────────────────

enum AuthStatus { initial, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final String? email;
  final String? userId;
  final String? error;
  final bool isLoading;

  const AuthState({
    this.status = AuthStatus.initial,
    this.email,
    this.userId,
    this.error,
    this.isLoading = false,
  });

  AuthState copyWith({
    AuthStatus? status,
    String? email,
    String? userId,
    String? error,
    bool? isLoading,
  }) =>
      AuthState(
        status: status ?? this.status,
        email: email ?? this.email,
        userId: userId ?? this.userId,
        error: error,
        isLoading: isLoading ?? this.isLoading,
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _checkAuth();
  }

  void _checkAuth() {
    final user = SupabaseService.currentUser;
    if (user != null) {
      state = AuthState(
        status: AuthStatus.authenticated,
        email: user.email,
        userId: user.id,
      );
    } else {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> signIn(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await SupabaseService.signIn(email, password);
      state = AuthState(
        status: AuthStatus.authenticated,
        email: email,
        userId: SupabaseService.userId,
      );
      await SupabaseService.logSecurityEvent('login');
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> signUp(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await SupabaseService.signUp(email, password);
      state = AuthState(
        status: AuthStatus.authenticated,
        email: email,
        userId: SupabaseService.userId,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> signOut() async {
    await SupabaseService.logSecurityEvent('logout');
    await SupabaseService.signOut();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  void clearError() => state = state.copyWith(error: null);
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(),
);

// ─── Vault Lock State ──────────────────────────────────────────────

class VaultLockState {
  final bool isUnlocked;
  final String? masterPassword;
  final int failedAttempts;
  final DateTime? lockoutUntil;
  final bool isLoading;
  final String? error;
  final UserProfile? userProfile;

  const VaultLockState({
    this.isUnlocked = false,
    this.masterPassword,
    this.failedAttempts = 0,
    this.lockoutUntil,
    this.isLoading = false,
    this.error,
    this.userProfile,
  });

  bool get isLockedOut =>
      lockoutUntil != null && DateTime.now().isBefore(lockoutUntil!);

  VaultLockState copyWith({
    bool? isUnlocked,
    String? masterPassword,
    int? failedAttempts,
    DateTime? lockoutUntil,
    bool? isLoading,
    String? error,
    UserProfile? userProfile,
  }) =>
      VaultLockState(
        isUnlocked: isUnlocked ?? this.isUnlocked,
        masterPassword: masterPassword ?? this.masterPassword,
        failedAttempts: failedAttempts ?? this.failedAttempts,
        lockoutUntil: lockoutUntil ?? this.lockoutUntil,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        userProfile: userProfile ?? this.userProfile,
      );
}

class VaultLockNotifier extends StateNotifier<VaultLockState> {
  static const _storage = FlutterSecureStorage();
  static const _maxAttempts = 5;
  static const _lockoutDuration = Duration(minutes: 5);

  VaultLockNotifier() : super(const VaultLockState());

  Future<void> loadProfile() async {
    final data = await SupabaseService.getUserProfile();
    if (data != null) {
      state = state.copyWith(userProfile: UserProfile.fromJson(data));
    }
  }

  Future<bool> unlock(String masterPassword) async {
    if (state.isLockedOut) {
      state = state.copyWith(error: 'Too many attempts. Please wait.');
      return false;
    }

    state = state.copyWith(isLoading: true, error: null);

    try {
      final profile = state.userProfile;
      if (profile?.encryptedVerification == null) {
        // First time — create verification
        final token = await VaultCrypto.createVerificationToken(masterPassword);
        await SupabaseService.upsertUserProfile({
          'encrypted_verification': token,
        });
        await loadProfile();
        state = state.copyWith(
          isUnlocked: true,
          masterPassword: masterPassword,
          isLoading: false,
          failedAttempts: 0,
        );
        await _saveBiometricKey(masterPassword);
        await SupabaseService.logSecurityEvent('vault_unlock');
        return true;
      }

      final valid = await VaultCrypto.verifyMasterPassword(
        masterPassword,
        profile!.encryptedVerification!,
      );

      if (valid) {
        state = state.copyWith(
          isUnlocked: true,
          masterPassword: masterPassword,
          isLoading: false,
          failedAttempts: 0,
        );
        await _saveBiometricKey(masterPassword);
        await SupabaseService.logSecurityEvent('vault_unlock');
        return true;
      } else {
        final attempts = state.failedAttempts + 1;
        await SupabaseService.logSecurityEvent('failed_attempt');
        state = state.copyWith(
          isLoading: false,
          failedAttempts: attempts,
          error: 'Invalid master password ($attempts/$_maxAttempts)',
          lockoutUntil: attempts >= _maxAttempts
              ? DateTime.now().add(_lockoutDuration)
              : null,
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> unlockWithBiometric() async {
    try {
      final saved = await _storage.read(key: 'zerovault_master_key');
      if (saved == null) return false;
      return unlock(saved);
    } catch (e) {
      debugPrint('Biometric unlock error: $e');
      return false;
    }
  }

  void lock() {
    state = VaultLockState(
      userProfile: state.userProfile,
    );
    SupabaseService.logSecurityEvent('vault_lock');
  }

  Future<void> _saveBiometricKey(String key) async {
    await _storage.write(key: 'zerovault_master_key', value: key);
  }

  Future<void> changeMasterPassword(String oldPassword, String newPassword) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final profile = state.userProfile;
      if (profile?.encryptedVerification == null) throw Exception('No profile');

      final valid = await VaultCrypto.verifyMasterPassword(
        oldPassword,
        profile!.encryptedVerification!,
      );
      if (!valid) {
        state = state.copyWith(isLoading: false, error: 'Current password is incorrect');
        return;
      }

      // Re-encrypt all vault items
      final items = await SupabaseService.getVaultItems();
      for (final item in items) {
        final decrypted = await VaultCrypto.decrypt(
          item['encrypted_data'] as String,
          oldPassword,
        );
        final reEncrypted = await VaultCrypto.encrypt(decrypted, newPassword);
        await SupabaseService.updateVaultItem(
          item['id'] as String,
          {'encrypted_data': reEncrypted},
        );
      }

      // New verification token
      final newToken = await VaultCrypto.createVerificationToken(newPassword);
      await SupabaseService.upsertUserProfile({
        'encrypted_verification': newToken,
      });
      await _saveBiometricKey(newPassword);
      await loadProfile();
      state = state.copyWith(
        isLoading: false,
        masterPassword: newPassword,
      );
      await SupabaseService.logSecurityEvent('password_change');
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

final vaultLockProvider =
    StateNotifierProvider<VaultLockNotifier, VaultLockState>(
  (ref) => VaultLockNotifier(),
);

class UserProfile {
  final String? id;
  final String userId;
  final String? encryptedVerification;
  final String? emergencyContactEmail;
  final String? hiddenVaultHash;
  final int autoLockSeconds;
  final bool deadManSwitchEnabled;
  final int deadManInactivityDays;
  final DateTime? lastActiveAt;
  final String? totpSecret;
  final bool totpEnabled;
  final String? webauthnCredentialId;
  final String? webauthnPublicKey;
  final String? recoveryMaster;
  final String? encryptedRecoveryKey;

  UserProfile({
    this.id,
    required this.userId,
    this.encryptedVerification,
    this.emergencyContactEmail,
    this.hiddenVaultHash,
    this.autoLockSeconds = 300,
    this.deadManSwitchEnabled = false,
    this.deadManInactivityDays = 30,
    this.lastActiveAt,
    this.totpSecret,
    this.totpEnabled = false,
    this.webauthnCredentialId,
    this.webauthnPublicKey,
    this.recoveryMaster,
    this.encryptedRecoveryKey,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String?,
      userId: json['user_id'] as String,
      encryptedVerification: json['encrypted_verification'] as String?,
      emergencyContactEmail: json['emergency_contact_email'] as String?,
      hiddenVaultHash: json['hidden_vault_hash'] as String?,
      autoLockSeconds: json['auto_lock_seconds'] as int? ?? 300,
      deadManSwitchEnabled: json['dead_man_switch_enabled'] as bool? ?? false,
      deadManInactivityDays: json['dead_man_inactivity_days'] as int? ?? 30,
      lastActiveAt: json['last_active_at'] != null
          ? DateTime.parse(json['last_active_at'] as String)
          : null,
      totpSecret: json['totp_secret'] as String?,
      totpEnabled: json['totp_enabled'] as bool? ?? false,
      webauthnCredentialId: json['webauthn_credential_id'] as String?,
      webauthnPublicKey: json['webauthn_public_key'] as String?,
      recoveryMaster: json['recovery_master'] as String?,
      encryptedRecoveryKey: json['encrypted_recovery_key'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'user_id': userId,
        'encrypted_verification': encryptedVerification,
        'emergency_contact_email': emergencyContactEmail,
        'hidden_vault_hash': hiddenVaultHash,
        'auto_lock_seconds': autoLockSeconds,
        'dead_man_switch_enabled': deadManSwitchEnabled,
        'dead_man_inactivity_days': deadManInactivityDays,
        if (lastActiveAt != null)
          'last_active_at': lastActiveAt!.toIso8601String(),
        'totp_secret': totpSecret,
        'totp_enabled': totpEnabled,
        'webauthn_credential_id': webauthnCredentialId,
        'webauthn_public_key': webauthnPublicKey,
        'recovery_master': recoveryMaster,
        'encrypted_recovery_key': encryptedRecoveryKey,
      };

  UserProfile copyWith({
    String? encryptedVerification,
    String? emergencyContactEmail,
    String? hiddenVaultHash,
    int? autoLockSeconds,
    bool? deadManSwitchEnabled,
    int? deadManInactivityDays,
    DateTime? lastActiveAt,
    String? totpSecret,
    bool? totpEnabled,
    String? webauthnCredentialId,
    String? webauthnPublicKey,
    String? recoveryMaster,
    String? encryptedRecoveryKey,
  }) {
    return UserProfile(
      id: id,
      userId: userId,
      encryptedVerification:
          encryptedVerification ?? this.encryptedVerification,
      emergencyContactEmail:
          emergencyContactEmail ?? this.emergencyContactEmail,
      hiddenVaultHash: hiddenVaultHash ?? this.hiddenVaultHash,
      autoLockSeconds: autoLockSeconds ?? this.autoLockSeconds,
      deadManSwitchEnabled: deadManSwitchEnabled ?? this.deadManSwitchEnabled,
      deadManInactivityDays:
          deadManInactivityDays ?? this.deadManInactivityDays,
      lastActiveAt: lastActiveAt ?? this.lastActiveAt,
      totpSecret: totpSecret ?? this.totpSecret,
      totpEnabled: totpEnabled ?? this.totpEnabled,
      webauthnCredentialId: webauthnCredentialId ?? this.webauthnCredentialId,
      webauthnPublicKey: webauthnPublicKey ?? this.webauthnPublicKey,
      recoveryMaster: recoveryMaster ?? this.recoveryMaster,
      encryptedRecoveryKey: encryptedRecoveryKey ?? this.encryptedRecoveryKey,
    );
  }
}

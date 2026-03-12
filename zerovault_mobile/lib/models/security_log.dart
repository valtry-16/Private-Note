class SecurityLog {
  final String? id;
  final String userId;
  final String eventType;
  final String? ipAddress;
  final String? userAgent;
  final DateTime createdAt;

  SecurityLog({
    this.id,
    required this.userId,
    required this.eventType,
    this.ipAddress,
    this.userAgent,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  factory SecurityLog.fromJson(Map<String, dynamic> json) {
    return SecurityLog(
      id: json['id'] as String?,
      userId: json['user_id'] as String,
      eventType: json['event_type'] as String,
      ipAddress: json['ip_address'] as String?,
      userAgent: json['user_agent'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  String get displayTitle {
    switch (eventType) {
      case 'login':
        return 'Login';
      case 'logout':
        return 'Logout';
      case 'vault_unlock':
        return 'Vault Unlocked';
      case 'vault_lock':
        return 'Vault Locked';
      case 'failed_attempt':
        return 'Failed Unlock Attempt';
      case 'password_change':
        return 'Master Password Changed';
      case 'item_create':
        return 'Item Created';
      case 'item_update':
        return 'Item Updated';
      case 'item_delete':
        return 'Item Deleted';
      case 'export':
        return 'Data Exported';
      case 'import':
        return 'Data Imported';
      case 'share_create':
        return 'Share Link Created';
      case 'biometric_auth':
        return 'Biometric Auth Used';
      default:
        return eventType;
    }
  }
}

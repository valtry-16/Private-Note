import 'dart:convert';

enum VaultItemType { note, password, document, personal }

class VaultItem {
  final String? id;
  final String userId;
  final VaultItemType type;
  final String encryptedData;
  final Map<String, dynamic>? metadata;
  final String? folderId;
  final List<String> tagIds;
  final bool isPinned;
  final bool isFavorite;
  final bool isHidden;
  final bool isDeleted;
  final DateTime? deletedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  VaultItem({
    this.id,
    required this.userId,
    required this.type,
    required this.encryptedData,
    this.metadata,
    this.folderId,
    this.tagIds = const [],
    this.isPinned = false,
    this.isFavorite = false,
    this.isHidden = false,
    this.isDeleted = false,
    this.deletedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  factory VaultItem.fromJson(Map<String, dynamic> json) {
    return VaultItem(
      id: json['id'] as String?,
      userId: json['user_id'] as String,
      type: VaultItemType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => VaultItemType.note,
      ),
      encryptedData: json['encrypted_data'] as String,
      metadata: json['metadata'] != null
          ? (json['metadata'] is String
              ? jsonDecode(json['metadata'] as String) as Map<String, dynamic>
              : json['metadata'] as Map<String, dynamic>)
          : null,
      folderId: json['folder_id'] as String?,
      tagIds: json['tag_ids'] != null
          ? List<String>.from(json['tag_ids'] as List)
          : [],
      isPinned: json['is_pinned'] as bool? ?? false,
      isFavorite: json['is_favorite'] as bool? ?? false,
      isHidden: json['is_hidden'] as bool? ?? false,
      isDeleted: json['is_deleted'] as bool? ?? false,
      deletedAt: json['deleted_at'] != null
          ? DateTime.parse(json['deleted_at'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'user_id': userId,
        'type': type.name,
        'encrypted_data': encryptedData,
        if (metadata != null) 'metadata': metadata,
        'folder_id': folderId,
        'tag_ids': tagIds,
        'is_pinned': isPinned,
        'is_favorite': isFavorite,
        'is_hidden': isHidden,
        'is_deleted': isDeleted,
        if (deletedAt != null) 'deleted_at': deletedAt!.toIso8601String(),
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
      };

  VaultItem copyWith({
    String? encryptedData,
    Map<String, dynamic>? metadata,
    String? folderId,
    List<String>? tagIds,
    bool? isPinned,
    bool? isFavorite,
    bool? isHidden,
    bool? isDeleted,
    DateTime? deletedAt,
  }) {
    return VaultItem(
      id: id,
      userId: userId,
      type: type,
      encryptedData: encryptedData ?? this.encryptedData,
      metadata: metadata ?? this.metadata,
      folderId: folderId ?? this.folderId,
      tagIds: tagIds ?? this.tagIds,
      isPinned: isPinned ?? this.isPinned,
      isFavorite: isFavorite ?? this.isFavorite,
      isHidden: isHidden ?? this.isHidden,
      isDeleted: isDeleted ?? this.isDeleted,
      deletedAt: deletedAt ?? this.deletedAt,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
    );
  }
}

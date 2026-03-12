class Folder {
  final String? id;
  final String userId;
  final String name;
  final DateTime? createdAt;

  Folder({this.id, required this.userId, required this.name, this.createdAt});

  factory Folder.fromJson(Map<String, dynamic> json) => Folder(
        id: json['id'] as String?,
        userId: json['user_id'] as String,
        name: json['name'] as String,
        createdAt: json['created_at'] != null
            ? DateTime.parse(json['created_at'] as String)
            : null,
      );

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'user_id': userId,
        'name': name,
      };
}

class Tag {
  final String? id;
  final String userId;
  final String name;
  final String color;
  final DateTime? createdAt;

  Tag({
    this.id,
    required this.userId,
    required this.name,
    this.color = '#3b82f6',
    this.createdAt,
  });

  factory Tag.fromJson(Map<String, dynamic> json) => Tag(
        id: json['id'] as String?,
        userId: json['user_id'] as String,
        name: json['name'] as String,
        color: json['color'] as String? ?? '#3b82f6',
        createdAt: json['created_at'] != null
            ? DateTime.parse(json['created_at'] as String)
            : null,
      );

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'user_id': userId,
        'name': name,
        'color': color,
      };
}

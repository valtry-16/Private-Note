import 'package:flutter/material.dart';
import '../core/encryption/vault_crypto.dart';
import '../models/vault_item.dart';
import '../screens/vault/item_detail_screen.dart';

class VaultItemCard extends StatefulWidget {
  final VaultItem item;
  final String masterPassword;

  const VaultItemCard({
    super.key,
    required this.item,
    required this.masterPassword,
  });

  @override
  State<VaultItemCard> createState() => _VaultItemCardState();
}

class _VaultItemCardState extends State<VaultItemCard> {
  String _title = '...';

  @override
  void initState() {
    super.initState();
    _decryptTitle();
  }

  Future<void> _decryptTitle() async {
    final encTitle =
        widget.item.metadata?['encrypted_title'] as String?;
    if (encTitle != null && widget.masterPassword.isNotEmpty) {
      try {
        final t = await VaultCrypto.decrypt(encTitle, widget.masterPassword);
        if (mounted) setState(() => _title = t.isEmpty ? 'Untitled' : t);
      } catch (_) {
        if (mounted) setState(() => _title = 'Untitled');
      }
    } else {
      setState(() => _title = 'Untitled');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _typeColor().withValues(alpha: 0.15),
          child: Icon(_typeIcon(), color: _typeColor(), size: 20),
        ),
        title: Text(_title,
            style: const TextStyle(fontWeight: FontWeight.w500),
            maxLines: 1,
            overflow: TextOverflow.ellipsis),
        subtitle: Row(
          children: [
            Text(
              _typeLabel(),
              style: TextStyle(
                  fontSize: 12, color: Colors.white.withValues(alpha: 0.4)),
            ),
            if (widget.item.isFavorite) ...[
              const SizedBox(width: 6),
              Icon(Icons.star, size: 14, color: Colors.amber.shade400),
            ],
            if (widget.item.isPinned) ...[
              const SizedBox(width: 4),
              const Icon(Icons.push_pin, size: 14, color: Color(0xFF6366F1)),
            ],
          ],
        ),
        trailing: Icon(Icons.chevron_right,
            color: Colors.white.withValues(alpha: 0.3)),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ItemDetailScreen(item: widget.item),
          ),
        ),
      ),
    );
  }

  IconData _typeIcon() {
    switch (widget.item.type) {
      case VaultItemType.note:
        return Icons.note_alt_outlined;
      case VaultItemType.password:
        return Icons.key;
      case VaultItemType.document:
        return Icons.description;
      case VaultItemType.personal:
        return Icons.person;
    }
  }

  Color _typeColor() {
    switch (widget.item.type) {
      case VaultItemType.note:
        return Colors.blue;
      case VaultItemType.password:
        return Colors.green;
      case VaultItemType.document:
        return Colors.orange;
      case VaultItemType.personal:
        return Colors.purple;
    }
  }

  String _typeLabel() {
    switch (widget.item.type) {
      case VaultItemType.note:
        return 'Note';
      case VaultItemType.password:
        return 'Password';
      case VaultItemType.document:
        return 'Document';
      case VaultItemType.personal:
        return 'Personal';
    }
  }
}

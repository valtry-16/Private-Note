import 'package:flutter/material.dart';
import '../core/encryption/vault_crypto.dart';
import '../core/theme.dart';
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
    final encTitle = widget.item.metadata?['encrypted_title'] as String?;
    if (encTitle != null && widget.masterPassword.isNotEmpty) {
      try {
        final t =
            await VaultCrypto.decrypt(encTitle, widget.masterPassword);
        if (mounted) {
          setState(() => _title = t.isEmpty ? 'Untitled' : t);
        }
      } catch (_) {
        if (mounted) setState(() => _title = 'Untitled');
      }
    } else {
      if (mounted) setState(() => _title = 'Untitled');
    }
  }

  Color get _typeColor {
    switch (widget.item.type) {
      case VaultItemType.note:
        return AppColors.noteColor;
      case VaultItemType.password:
        return AppColors.passwordColor;
      case VaultItemType.document:
        return AppColors.documentColor;
      case VaultItemType.personal:
        return AppColors.personalColor;
    }
  }

  IconData get _typeIcon {
    switch (widget.item.type) {
      case VaultItemType.note:
        return Icons.note_alt_outlined;
      case VaultItemType.password:
        return Icons.key_rounded;
      case VaultItemType.document:
        return Icons.description_outlined;
      case VaultItemType.personal:
        return Icons.person_outline_rounded;
    }
  }

  String get _typeLabel {
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

  @override
  Widget build(BuildContext context) {
    final color = _typeColor;
    return Material(
      color: AppColors.surfaceLight,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) => ItemDetailScreen(item: widget.item)),
        ),
        borderRadius: BorderRadius.circular(14),
        splashColor: color.withValues(alpha: 0.08),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border, width: 0.5),
          ),
          child: Row(
            children: [
              // Colored left accent bar
              Container(
                width: 4,
                height: 64,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(14),
                    bottomLeft: Radius.circular(14),
                  ),
                ),
              ),
              // Icon
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(_typeIcon, color: color, size: 20),
                ),
              ),
              // Title + subtitle
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _title,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              _typeLabel,
                              style: TextStyle(
                                fontSize: 11,
                                color: color,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (widget.item.isFavorite) ...[
                            const SizedBox(width: 6),
                            const Icon(Icons.star_rounded,
                                size: 14, color: Color(0xFFF59E0B)),
                          ],
                          if (widget.item.isPinned) ...[
                            const SizedBox(width: 4),
                            const Icon(Icons.push_pin_rounded,
                                size: 14, color: AppColors.primary),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              // Trailing arrow
              Padding(
                padding: const EdgeInsets.only(right: 14),
                child: Icon(
                  Icons.chevron_right_rounded,
                  color: AppColors.textMuted,
                  size: 20,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/encryption/vault_crypto.dart';
import '../../core/theme.dart';
import '../../models/vault_item.dart';
import '../../state/auth_state.dart';
import '../../state/vault_state.dart';
import '../../widgets/share_dialog.dart';

class ItemDetailScreen extends ConsumerStatefulWidget {
  final VaultItem item;
  const ItemDetailScreen({super.key, required this.item});

  @override
  ConsumerState<ItemDetailScreen> createState() => _ItemDetailScreenState();
}

class _ItemDetailScreenState extends ConsumerState<ItemDetailScreen> {
  Map<String, dynamic>? _decrypted;
  bool _isLoading = true;
  final Map<String, bool> _revealed = {};

  @override
  void initState() {
    super.initState();
    _decrypt();
  }

  Future<void> _decrypt() async {
    final pw = ref.read(vaultLockProvider).masterPassword;
    if (pw == null) return;
    try {
      final data = await VaultCrypto.decrypt(widget.item.encryptedData, pw);
      setState(() {
        _decrypted = jsonDecode(data) as Map<String, dynamic>;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_title()),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) => _handleAction(v),
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'edit', child: Text('Edit')),
              if (widget.item.type == VaultItemType.password ||
                  widget.item.type == VaultItemType.note)
                const PopupMenuItem(value: 'share', child: Text('Share')),
              if (!widget.item.isFavorite)
                const PopupMenuItem(
                    value: 'favorite', child: Text('Add to Favorites'))
              else
                const PopupMenuItem(
                    value: 'unfavorite', child: Text('Remove from Favorites')),
              if (!widget.item.isHidden)
                const PopupMenuItem(value: 'hide', child: Text('Hide'))
              else
                const PopupMenuItem(value: 'unhide', child: Text('Unhide')),
              if (widget.item.isDeleted)
                const PopupMenuItem(value: 'restore', child: Text('Restore'))
              else
                const PopupMenuItem(
                    value: 'trash',
                    child: Text('Move to Trash',
                        style: TextStyle(color: Colors.red))),
              if (widget.item.isDeleted)
                const PopupMenuItem(
                    value: 'delete',
                    child: Text('Delete Permanently',
                        style: TextStyle(color: Colors.red))),
            ],
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _decrypted == null
              ? const Center(child: Text('Failed to decrypt'))
              : _buildContent(),
    );
  }

  String _title() {
    switch (widget.item.type) {
      case VaultItemType.note:
        return 'Note';
      case VaultItemType.password:
        return 'Password';
      case VaultItemType.document:
        return 'Document';
      case VaultItemType.personal:
        return 'Personal Info';
    }
  }

  Widget _buildContent() {
    final data = _decrypted!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ...data.entries
              .where((e) =>
                  e.key != 'template_type' &&
                  e.key != 'encrypted_metadata' &&
                  e.key != 'fields' &&
                  e.value != null &&
                  e.value.toString().isNotEmpty)
              .map((e) => _buildField(e.key, e.value.toString())),
          // Render personal info dynamic fields nicely
          if (data['fields'] != null && data['fields'] is List)
            ...((data['fields'] as List).map((field) {
              final label = field['label']?.toString() ?? '';
              final value = field['value']?.toString() ?? '';
              if (label.isEmpty && value.isEmpty) {
                return const SizedBox.shrink();
              }
              return _buildField(label, value);
            })),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border, width: 0.5),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Created ${_formatDate(widget.item.createdAt)}',
                        style: const TextStyle(
                            color: AppColors.textMuted, fontSize: 12),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Updated ${_formatDate(widget.item.updatedAt)}',
                        style: const TextStyle(
                            color: AppColors.textMuted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.schedule_outlined,
                    size: 16, color: AppColors.textMuted),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildField(String key, String value) {
    final isSecret = _isSecretField(key);
    final revealed = _revealed[key] ?? false;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _formatLabel(key),
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textMuted,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: Text(
                    isSecret && !revealed ? '••••••••••••' : value,
                    style: TextStyle(
                      fontSize: 15,
                      color: isSecret && !revealed
                          ? AppColors.textMuted
                          : AppColors.textPrimary,
                      fontWeight: FontWeight.w500,
                      letterSpacing: isSecret && !revealed ? 2 : 0,
                    ),
                  ),
                ),
                if (isSecret)
                  IconButton(
                    icon: Icon(
                      revealed
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      size: 18,
                      color: AppColors.textSecondary,
                    ),
                    onPressed: () => setState(() => _revealed[key] = !revealed),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                        minWidth: 36, minHeight: 36),
                  ),
                IconButton(
                  icon: const Icon(Icons.copy_outlined,
                      size: 18, color: AppColors.textSecondary),
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: value));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                          content: Text('${_formatLabel(key)} copied')),
                    );
                  },
                  padding: EdgeInsets.zero,
                  constraints:
                      const BoxConstraints(minWidth: 36, minHeight: 36),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  bool _isSecretField(String key) {
    return key == 'password' ||
        key == 'cvv' ||
        key == 'pin' ||
        key == 'private_key' ||
        key == 'seed_phrase' ||
        key == 'api_key' ||
        key == 'api_secret' ||
        key == 'id_number' ||
        key == 'card_number' ||
        key == 'account_number' ||
        key == 'iban';
  }

  String _formatLabel(String key) {
    return key
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }

  String _formatDate(DateTime dt) {
    return '${dt.day}/${dt.month}/${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
  }

  void _handleAction(String action) {
    final notifier = ref.read(vaultItemsProvider.notifier);
    final id = widget.item.id!;

    switch (action) {
      case 'edit':
        _navigate(widget.item);
        break;
      case 'share':
        _showShareDialog();
        break;
      case 'favorite':
        notifier.toggleFavorite(id, true);
        break;
      case 'unfavorite':
        notifier.toggleFavorite(id, false);
        break;
      case 'hide':
        notifier.toggleHidden(id, true);
        Navigator.pop(context);
        break;
      case 'unhide':
        notifier.toggleHidden(id, false);
        break;
      case 'trash':
        notifier.moveToTrash(id);
        Navigator.pop(context);
        break;
      case 'restore':
        notifier.restoreFromTrash(id);
        Navigator.pop(context);
        break;
      case 'delete':
        _confirmDelete(id);
        break;
    }
  }

  void _navigate(VaultItem item) {
    String route;
    switch (item.type) {
      case VaultItemType.note:
        route = '/add-note';
        break;
      case VaultItemType.password:
        route = '/add-password';
        break;
      case VaultItemType.personal:
        route = '/add-personal';
        break;
      case VaultItemType.document:
        return; // Document editing not supported
    }
    Navigator.pushReplacementNamed(context, route, arguments: item);
  }

  void _showShareDialog() {
    if (_decrypted == null) return;
    showDialog(
      context: context,
      builder: (_) => ShareDialog(item: widget.item, decryptedData: _decrypted!),
    );
  }

  void _confirmDelete(String id) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Permanently?'),
        content: const Text('This cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(vaultItemsProvider.notifier).permanentDelete(id);
              Navigator.pop(context);
            },
            child:
                const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

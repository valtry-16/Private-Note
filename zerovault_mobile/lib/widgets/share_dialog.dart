import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../core/encryption/vault_crypto.dart';
import '../core/supabase/supabase_service.dart';
import '../models/vault_item.dart';

class ShareDialog extends ConsumerStatefulWidget {
  final VaultItem item;
  final Map<String, dynamic> decryptedData;

  const ShareDialog({super.key, required this.item, required this.decryptedData});

  @override
  ConsumerState<ShareDialog> createState() => _ShareDialogState();
}

class _ShareDialogState extends ConsumerState<ShareDialog> {
  final _passphraseController = TextEditingController();
  String _expiry = '24h';
  int _maxViews = 3;
  bool _isSharing = false;
  String? _shareUrl;
  bool _obscurePassphrase = true;

  @override
  void dispose() {
    _passphraseController.dispose();
    super.dispose();
  }

  Duration _expiryDuration() {
    switch (_expiry) {
      case '1h':
        return const Duration(hours: 1);
      case '24h':
        return const Duration(hours: 24);
      case '3d':
        return const Duration(days: 3);
      case '7d':
        return const Duration(days: 7);
      default:
        return const Duration(hours: 24);
    }
  }

  Future<void> _share() async {
    final pass = _passphraseController.text.trim();
    if (pass.length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Passphrase must be at least 4 characters')),
      );
      return;
    }

    setState(() => _isSharing = true);

    try {
      final plainText = jsonEncode(widget.decryptedData);
      final encrypted = await VaultCrypto.encrypt(plainText, pass);
      final shareKey = const Uuid().v4();
      final expiresAt = DateTime.now().add(_expiryDuration()).toIso8601String();

      await SupabaseService.client.from('shared_links').insert({
        'user_id': SupabaseService.userId,
        'item_id': widget.item.id,
        'encrypted_data': encrypted,
        'share_key': shareKey,
        'expires_at': expiresAt,
        'max_views': _maxViews,
        'view_count': 0,
      });

      await SupabaseService.logSecurityEvent('item_shared');

      setState(() {
        _shareUrl = 'https://zero-vault-storage.vercel.app/share/$shareKey';
        _isSharing = false;
      });
    } catch (e) {
      setState(() => _isSharing = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Share failed: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Share Item'),
      content: SingleChildScrollView(
        child: _shareUrl != null ? _buildSuccess() : _buildForm(),
      ),
      actions: _shareUrl != null
          ? [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Done'),
              ),
            ]
          : [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: _isSharing ? null : _share,
                child: _isSharing
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Share'),
              ),
            ],
    );
  }

  Widget _buildForm() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Anyone with the link and passphrase can view this item.',
            style: TextStyle(fontSize: 13)),
        const SizedBox(height: 16),
        TextField(
          controller: _passphraseController,
          obscureText: _obscurePassphrase,
          decoration: InputDecoration(
            labelText: 'Passphrase',
            hintText: 'Enter a passphrase',
            suffixIcon: IconButton(
              icon: Icon(_obscurePassphrase ? Icons.visibility : Icons.visibility_off),
              onPressed: () => setState(() => _obscurePassphrase = !_obscurePassphrase),
            ),
          ),
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          value: _expiry,
          decoration: const InputDecoration(labelText: 'Expires In'),
          items: const [
            DropdownMenuItem(value: '1h', child: Text('1 Hour')),
            DropdownMenuItem(value: '24h', child: Text('24 Hours')),
            DropdownMenuItem(value: '3d', child: Text('3 Days')),
            DropdownMenuItem(value: '7d', child: Text('7 Days')),
          ],
          onChanged: (v) => setState(() => _expiry = v!),
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<int>(
          value: _maxViews,
          decoration: const InputDecoration(labelText: 'Max Views'),
          items: const [
            DropdownMenuItem(value: 1, child: Text('1 view')),
            DropdownMenuItem(value: 3, child: Text('3 views')),
            DropdownMenuItem(value: 5, child: Text('5 views')),
            DropdownMenuItem(value: 10, child: Text('10 views')),
          ],
          onChanged: (v) => setState(() => _maxViews = v!),
        ),
      ],
    );
  }

  Widget _buildSuccess() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.check_circle, color: Colors.green, size: 48),
        const SizedBox(height: 12),
        const Text('Share link created!', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(_shareUrl!,
                    style: const TextStyle(fontSize: 12),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis),
              ),
              IconButton(
                icon: const Icon(Icons.copy, size: 20),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: _shareUrl!));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Link copied to clipboard')),
                  );
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text('Passphrase: ${_passphraseController.text}',
            style: const TextStyle(fontSize: 12, color: Colors.orange)),
        const SizedBox(height: 4),
        Text('Expires: $_expiry  •  Max views: $_maxViews',
            style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.5))),
      ],
    );
  }
}

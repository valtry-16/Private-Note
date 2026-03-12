import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/vault_item.dart';
import '../../state/auth_state.dart';
import '../../state/vault_state.dart';
import '../../widgets/password_generator_widget.dart';

class AddPasswordScreen extends ConsumerStatefulWidget {
  final VaultItem? existingItem;
  const AddPasswordScreen({super.key, this.existingItem});

  @override
  ConsumerState<AddPasswordScreen> createState() => _AddPasswordScreenState();
}

class _AddPasswordScreenState extends ConsumerState<AddPasswordScreen> {
  final _websiteController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _notesController = TextEditingController();
  bool _obscure = true;
  bool _isSaving = false;
  bool _isEditing = false;

  @override
  void initState() {
    super.initState();
    if (widget.existingItem != null) {
      _isEditing = true;
      _loadExisting();
    }
  }

  Future<void> _loadExisting() async {
    final decrypted = await ref
        .read(vaultItemsProvider.notifier)
        .decryptItemData(widget.existingItem!.encryptedData);
    if (decrypted != null) {
      final data = jsonDecode(decrypted) as Map<String, dynamic>;
      _websiteController.text = data['website'] as String? ?? '';
      _usernameController.text = data['username'] as String? ?? '';
      _passwordController.text = data['password'] as String? ?? '';
      _notesController.text = data['notes'] as String? ?? '';
      if (mounted) setState(() {});
    }
  }

  @override
  void dispose() {
    _websiteController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_websiteController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Website / name is required')),
      );
      return;
    }
    setState(() => _isSaving = true);

    final data = {
      'website': _websiteController.text,
      'username': _usernameController.text,
      'password': _passwordController.text,
      'notes': _notesController.text,
    };

    bool success;
    if (_isEditing) {
      success = await ref
          .read(vaultItemsProvider.notifier)
          .updateItem(widget.existingItem!.id!, data);
    } else {
      final item = await ref
          .read(vaultItemsProvider.notifier)
          .createItem(type: VaultItemType.password, data: data);
      success = item != null;
    }

    setState(() => _isSaving = false);
    if (success && mounted) Navigator.pop(context);
  }

  void _showGenerator() async {
    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => const PasswordGeneratorWidget(),
    );
    if (result != null) {
      _passwordController.text = result;
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Password' : 'New Password'),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextFormField(
              controller: _websiteController,
              decoration: const InputDecoration(
                labelText: 'Website / Service',
                prefixIcon: Icon(Icons.language),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _usernameController,
              decoration: const InputDecoration(
                labelText: 'Username / Email',
                prefixIcon: Icon(Icons.person_outline),
              ),
              autocorrect: false,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _passwordController,
              obscureText: _obscure,
              decoration: InputDecoration(
                labelText: 'Password',
                prefixIcon: const Icon(Icons.key),
                suffixIcon: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: Icon(_obscure
                          ? Icons.visibility_off
                          : Icons.visibility),
                      onPressed: () =>
                          setState(() => _obscure = !_obscure),
                    ),
                    IconButton(
                      icon: const Icon(Icons.copy, size: 20),
                      onPressed: () {
                        Clipboard.setData(
                            ClipboardData(text: _passwordController.text));
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Copied!')));
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _showGenerator,
                icon: const Icon(Icons.auto_fix_high),
                label: const Text('Generate Password'),
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'Notes',
                prefixIcon: Icon(Icons.note_outlined),
              ),
              maxLines: 3,
            ),
          ],
        ),
      ),
    );
  }
}

import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/encryption/vault_crypto.dart';
import '../../core/supabase/supabase_service.dart';
import '../../models/vault_item.dart';
import '../../state/auth_state.dart';
import '../../state/vault_state.dart';
import '../../core/theme.dart';

class AddDocumentScreen extends ConsumerStatefulWidget {
  const AddDocumentScreen({super.key});

  @override
  ConsumerState<AddDocumentScreen> createState() => _AddDocumentScreenState();
}

class _AddDocumentScreenState extends ConsumerState<AddDocumentScreen> {
  final _titleController = TextEditingController();
  PlatformFile? _pickedFile;
  bool _isSaving = false;

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(withData: true);
    if (result != null && result.files.isNotEmpty) {
      setState(() => _pickedFile = result.files.first);
      if (_titleController.text.isEmpty) {
        _titleController.text = _pickedFile!.name;
      }
    }
  }

  Future<void> _save() async {
    if (_pickedFile == null || _pickedFile!.bytes == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a file')),
      );
      return;
    }

    final pw = ref.read(vaultLockProvider).masterPassword;
    if (pw == null) return;

    setState(() => _isSaving = true);

    try {
      final encrypted = await VaultCrypto.encryptFile(
        Uint8List.fromList(_pickedFile!.bytes!),
        pw,
        _pickedFile!.name,
        _pickedFile!.extension ?? 'bin',
      );

      // Upload encrypted file
      final uid = SupabaseService.userId!;
      final path = '$uid/${DateTime.now().millisecondsSinceEpoch}_${_pickedFile!.name}';
      await SupabaseService.uploadFile(path, encrypted.encryptedData);

      // Store metadata in vault item
      final data = {
        'title': _titleController.text,
        'file_path': path,
        'file_name': _pickedFile!.name,
        'file_size': _pickedFile!.bytes!.length,
        'file_type': _pickedFile!.extension ?? 'bin',
        'encrypted_metadata': encrypted.metadata,
      };

      final item = await ref.read(vaultItemsProvider.notifier).createItem(
            type: VaultItemType.document,
            data: data,
          );

      setState(() => _isSaving = false);
      if (item != null && mounted) Navigator.pop(context);
    } catch (e) {
      setState(() => _isSaving = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    }
  }

  String _formatSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Upload Document'),
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
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Document Title',
                prefixIcon: Icon(Icons.title),
              ),
            ),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: _pickFile,
              child: Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: Colors.white24,
                    style: BorderStyle.solid,
                    width: 2,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  color: Colors.white.withValues(alpha: 0.03),
                ),
                child: Column(
                  children: [
                    Icon(
                      _pickedFile != null
                          ? Icons.check_circle
                          : Icons.cloud_upload_outlined,
                      size: 48,
                      color: _pickedFile != null
                          ? Colors.green
                          : Colors.white38,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _pickedFile != null
                          ? _pickedFile!.name
                          : 'Tap to select file',
                      style: TextStyle(
                        color: _pickedFile != null
                            ? Colors.white
                            : Colors.white54,
                        fontSize: 15,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (_pickedFile != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        _formatSize(_pickedFile!.size),
                        style: const TextStyle(
                            color: Colors.white38, fontSize: 13),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(Icons.shield, color: AppColors.primary, size: 20),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Files are encrypted with AES-256-GCM before upload. '
                      'Only you can decrypt them.',
                      style: TextStyle(fontSize: 12, color: Colors.white70),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

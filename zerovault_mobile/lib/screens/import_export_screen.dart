import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../core/encryption/vault_crypto.dart';
import '../core/supabase/supabase_service.dart';
import '../models/vault_item.dart';
import '../state/auth_state.dart';
import '../state/vault_state.dart';

class ImportExportScreen extends ConsumerStatefulWidget {
  const ImportExportScreen({super.key});

  @override
  ConsumerState<ImportExportScreen> createState() => _ImportExportScreenState();
}

class _ImportExportScreenState extends ConsumerState<ImportExportScreen> {
  bool _isExporting = false;
  bool _isImporting = false;

  Future<void> _export() async {
    final pw = ref.read(vaultLockProvider).masterPassword;
    if (pw == null) return;

    setState(() => _isExporting = true);
    try {
      final items = await SupabaseService.getVaultItems();
      final decryptedItems = <Map<String, dynamic>>[];

      for (final item in items) {
        try {
          final data =
              await VaultCrypto.decrypt(item['encrypted_data'] as String, pw);
          decryptedItems.add({
            'type': item['type'],
            'data': jsonDecode(data),
            'folder_id': item['folder_id'],
            'is_favorite': item['is_favorite'],
            'created_at': item['created_at'],
          });
        } catch (_) {
          // Skip items that fail to decrypt
        }
      }

      final zvault = jsonEncode({
        'version': '1.0',
        'app': 'ZeroVault Mobile',
        'timestamp': DateTime.now().toIso8601String(),
        'items': decryptedItems,
      });

      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/zerovault_export.zvault');
      await file.writeAsString(zvault);

      await Share.shareXFiles([XFile(file.path)],
          text: 'ZeroVault Export');

      await SupabaseService.logSecurityEvent('export');
      setState(() => _isExporting = false);
    } catch (e) {
      setState(() => _isExporting = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: $e')),
        );
      }
    }
  }

  Future<void> _import() async {
    final pw = ref.read(vaultLockProvider).masterPassword;
    if (pw == null) return;

    final result = await FilePicker.platform.pickFiles(
      type: FileType.any,
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;

    setState(() => _isImporting = true);
    try {
      final content = utf8.decode(result.files.first.bytes!);
      final parsed = jsonDecode(content);

      List<dynamic> items;
      if (parsed is Map && parsed.containsKey('items')) {
        items = parsed['items'] as List<dynamic>;
      } else if (parsed is List) {
        items = parsed;
      } else {
        throw const FormatException('Invalid import format');
      }

      int imported = 0;
      for (final raw in items) {
        final item = raw as Map<String, dynamic>;
        final type = VaultItemType.values.firstWhere(
          (t) => t.name == item['type'],
          orElse: () => VaultItemType.note,
        );
        final data = item['data'] as Map<String, dynamic>? ?? item;
        await ref.read(vaultItemsProvider.notifier).createItem(
              type: type,
              data: data,
            );
        imported++;
      }

      await SupabaseService.logSecurityEvent('import');
      setState(() => _isImporting = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Imported $imported items')),
        );
      }
    } catch (e) {
      setState(() => _isImporting = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Import failed: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Import / Export')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.upload, color: Color(0xFF6366F1)),
                        SizedBox(width: 8),
                        Text('Export',
                            style: TextStyle(
                                fontSize: 18, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Export all vault items as a .zvault file. '
                      'Data is decrypted for portability.',
                      style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.6), fontSize: 13),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _isExporting ? null : _export,
                      child: _isExporting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Text('Export .zvault'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.download, color: Color(0xFF6366F1)),
                        SizedBox(width: 8),
                        Text('Import',
                            style: TextStyle(
                                fontSize: 18, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Import from a .zvault export file or compatible JSON. '
                      'Items will be encrypted with your current master password.',
                      style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.6), fontSize: 13),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _isImporting ? null : _import,
                      child: _isImporting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Text('Import File'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(Icons.warning_amber, color: Colors.orange, size: 20),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Exported files contain decrypted data. '
                      'Handle with care and delete after use.',
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

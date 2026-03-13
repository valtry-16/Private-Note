import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../core/encryption/vault_crypto.dart';
import '../core/supabase/supabase_service.dart';
import '../core/theme.dart';
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

      await Share.shareXFiles(
        [XFile(file.path)],
        text: 'ZeroVault Export',
      );

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
      appBar: AppBar(
        title: const Text('Import / Export'),
        backgroundColor: AppColors.surface,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: AppColors.border),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildActionCard(
              icon: Icons.upload_rounded,
              iconColor: AppColors.primary,
              title: 'Export Vault',
              description:
                  'Export all vault items as a .zvault file. Data is decrypted for portability — handle with care.',
              buttonLabel: 'Export .zvault',
              isLoading: _isExporting,
              onPressed: _export,
            ),
            const SizedBox(height: 16),
            _buildActionCard(
              icon: Icons.download_rounded,
              iconColor: AppColors.success,
              title: 'Import Items',
              description:
                  'Import from a .zvault export file or compatible JSON. Items will be encrypted with your current master password.',
              buttonLabel: 'Import File',
              isLoading: _isImporting,
              onPressed: _import,
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.warningBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: AppColors.warning.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded,
                      color: AppColors.warning, size: 22),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Exported files contain decrypted data. '
                      'Handle with care and delete after transferring.',
                      style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                          height: 1.4),
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

  Widget _buildActionCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String description,
    required String buttonLabel,
    required bool isLoading,
    required VoidCallback onPressed,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(icon, color: iconColor, size: 22),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            description,
            style: const TextStyle(
                color: AppColors.textSecondary, fontSize: 13, height: 1.5),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: isLoading ? null : onPressed,
              style: ElevatedButton.styleFrom(
                backgroundColor: iconColor,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
              ),
              child: isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : Text(buttonLabel),
            ),
          ),
        ],
      ),
    );
  }
}

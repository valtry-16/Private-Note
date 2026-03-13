import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/supabase/supabase_service.dart';
import '../core/theme.dart';
import '../models/security_log.dart';

class SecurityLogsScreen extends ConsumerWidget {
  const SecurityLogsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Security Logs'),
        backgroundColor: AppColors.surface,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: AppColors.border),
        ),
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: SupabaseService.getSecurityLogs(limit: 100),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
                child: CircularProgressIndicator(color: AppColors.primary));
          }
          if (snapshot.hasError) {
            return Center(
              child: Text('Error: ${snapshot.error}',
                  style: const TextStyle(color: AppColors.textSecondary)),
            );
          }
          final logs = snapshot.data!
              .map((e) => SecurityLog.fromJson(e))
              .toList();
          if (logs.isEmpty) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.history_toggle_off,
                      size: 48, color: AppColors.textMuted),
                  SizedBox(height: 12),
                  Text('No security logs yet',
                      style: TextStyle(color: AppColors.textSecondary)),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: logs.length,
            itemBuilder: (ctx, i) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _LogCard(log: logs[i]),
            ),
          );
        },
      ),
    );
  }
}

class _LogCard extends StatelessWidget {
  final SecurityLog log;
  const _LogCard({required this.log});

  @override
  Widget build(BuildContext context) {
    final color = _eventColor();
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(_eventIcon(), color: color, size: 20),
        ),
        title: Text(
          log.displayTitle,
          style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary),
        ),
        subtitle: Text(
          _formatDate(log.createdAt),
          style: const TextStyle(
              fontSize: 12, color: AppColors.textMuted),
        ),
        trailing: log.ipAddress != null && log.ipAddress!.isNotEmpty
            ? Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  log.ipAddress!,
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textMuted),
                ),
              )
            : null,
      ),
    );
  }

  IconData _eventIcon() {
    switch (log.eventType) {
      case 'login':
        return Icons.login_rounded;
      case 'logout':
        return Icons.logout_rounded;
      case 'vault_unlock':
        return Icons.lock_open_rounded;
      case 'vault_lock':
        return Icons.lock_rounded;
      case 'failed_attempt':
        return Icons.error_outline_rounded;
      case 'password_change':
        return Icons.key_rounded;
      case 'item_create':
        return Icons.add_circle_outline_rounded;
      case 'item_update':
        return Icons.edit_outlined;
      case 'item_delete':
        return Icons.delete_outline_rounded;
      case 'export':
        return Icons.upload_rounded;
      case 'import':
        return Icons.download_rounded;
      default:
        return Icons.info_outline_rounded;
    }
  }

  Color _eventColor() {
    switch (log.eventType) {
      case 'failed_attempt':
        return AppColors.error;
      case 'item_delete':
        return AppColors.warning;
      case 'login':
      case 'vault_unlock':
        return AppColors.success;
      default:
        return AppColors.primary;
    }
  }

  String _formatDate(DateTime dt) {
    return '${dt.day}/${dt.month}/${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

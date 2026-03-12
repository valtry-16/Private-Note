import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/supabase/supabase_service.dart';
import '../models/security_log.dart';

class SecurityLogsScreen extends ConsumerWidget {
  const SecurityLogsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Security Logs')),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: SupabaseService.getSecurityLogs(limit: 100),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final logs =
              snapshot.data!.map((e) => SecurityLog.fromJson(e)).toList();
          if (logs.isEmpty) {
            return Center(
              child: Text('No security logs yet',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.4))),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: logs.length,
            itemBuilder: (ctx, i) => _LogCard(log: logs[i]),
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
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _eventColor().withValues(alpha: 0.15),
          child: Icon(_eventIcon(), color: _eventColor(), size: 20),
        ),
        title: Text(log.displayTitle, style: const TextStyle(fontSize: 14)),
        subtitle: Text(
          _formatDate(log.createdAt),
          style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.4)),
        ),
        trailing: Text(
          log.ipAddress ?? '',
          style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.3)),
        ),
      ),
    );
  }

  IconData _eventIcon() {
    switch (log.eventType) {
      case 'login':
        return Icons.login;
      case 'logout':
        return Icons.logout;
      case 'vault_unlock':
        return Icons.lock_open;
      case 'vault_lock':
        return Icons.lock;
      case 'failed_attempt':
        return Icons.error_outline;
      case 'password_change':
        return Icons.key;
      case 'item_create':
        return Icons.add_circle_outline;
      case 'item_update':
        return Icons.edit;
      case 'item_delete':
        return Icons.delete_outline;
      case 'export':
        return Icons.upload;
      case 'import':
        return Icons.download;
      default:
        return Icons.info_outline;
    }
  }

  Color _eventColor() {
    switch (log.eventType) {
      case 'failed_attempt':
        return Colors.red;
      case 'item_delete':
        return Colors.orange;
      case 'login':
      case 'vault_unlock':
        return Colors.green;
      default:
        return const Color(0xFF6366F1);
    }
  }

  String _formatDate(DateTime dt) {
    return '${dt.day}/${dt.month}/${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

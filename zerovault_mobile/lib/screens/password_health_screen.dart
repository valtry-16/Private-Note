import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/encryption/vault_crypto.dart';
import '../models/vault_item.dart';
import '../state/auth_state.dart';
import '../state/vault_state.dart';

class PasswordHealthScreen extends ConsumerStatefulWidget {
  const PasswordHealthScreen({super.key});

  @override
  ConsumerState<PasswordHealthScreen> createState() => _PasswordHealthScreenState();
}

class _PasswordHealthScreenState extends ConsumerState<PasswordHealthScreen> {
  bool _isLoading = true;
  int _healthScore = 100;
  final List<_PasswordIssue> _weak = [];
  final List<_PasswordIssue> _reused = [];
  final List<_PasswordIssue> _old = [];

  @override
  void initState() {
    super.initState();
    _analyze();
  }

  Future<void> _analyze() async {
    final pw = ref.read(vaultLockProvider).masterPassword;
    if (pw == null) return;

    final items = ref.read(vaultItemsProvider).items;
    final passwords = items.where((i) => i.type == VaultItemType.password && !i.isDeleted).toList();

    final Map<String, List<String>> passwordMap = {};

    for (final item in passwords) {
      try {
        final data = jsonDecode(await VaultCrypto.decrypt(item.encryptedData, pw));
        final title = data['title']?.toString() ?? 'Untitled';
        final password = data['password']?.toString() ?? '';
        if (password.isEmpty) continue;

        final strength = _calculateStrength(password);
        if (strength <= 2) {
          _weak.add(_PasswordIssue(title: title, detail: 'Strength: ${_strengthLabel(strength)}', itemId: item.id!));
        }

        passwordMap.putIfAbsent(password, () => []).add(title);

        final daysSinceUpdate = DateTime.now().difference(item.updatedAt).inDays;
        if (daysSinceUpdate > 180) {
          _old.add(_PasswordIssue(title: title, detail: '${daysSinceUpdate} days old', itemId: item.id!));
        }
      } catch (_) {}
    }

    for (final entry in passwordMap.entries) {
      if (entry.value.length > 1) {
        for (final title in entry.value) {
          _reused.add(_PasswordIssue(title: title, detail: 'Used in ${entry.value.length} entries', itemId: ''));
        }
      }
    }

    final totalPasswords = passwords.length;
    if (totalPasswords > 0) {
      final issues = _weak.length + _reused.length + _old.length;
      _healthScore = ((1 - (issues / (totalPasswords * 3))) * 100).clamp(0, 100).round();
    }

    setState(() => _isLoading = false);
  }

  int _calculateStrength(String password) {
    int score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (RegExp(r'[a-z]').hasMatch(password)) score++;
    if (RegExp(r'[A-Z]').hasMatch(password)) score++;
    if (RegExp(r'[0-9]').hasMatch(password)) score++;
    if (RegExp(r'[^a-zA-Z0-9]').hasMatch(password)) score++;
    return score;
  }

  String _strengthLabel(int score) {
    if (score <= 2) return 'Weak';
    if (score <= 4) return 'Fair';
    if (score <= 5) return 'Strong';
    return 'Very Strong';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Password Health')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildScoreCard(),
                const SizedBox(height: 20),
                if (_weak.isNotEmpty) _buildSection('Weak Passwords', _weak, Colors.red, Icons.warning_amber),
                if (_reused.isNotEmpty) _buildSection('Reused Passwords', _reused, Colors.orange, Icons.copy),
                if (_old.isNotEmpty) _buildSection('Old Passwords', _old, Colors.amber, Icons.schedule),
                if (_weak.isEmpty && _reused.isEmpty && _old.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          const Icon(Icons.check_circle, color: Colors.green, size: 48),
                          const SizedBox(height: 12),
                          Text('All passwords look healthy!',
                              style: Theme.of(context).textTheme.titleMedium),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
    );
  }

  Widget _buildScoreCard() {
    final color = _healthScore >= 80
        ? Colors.green
        : _healthScore >= 50
            ? Colors.orange
            : Colors.red;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 120,
                  height: 120,
                  child: CircularProgressIndicator(
                    value: _healthScore / 100,
                    strokeWidth: 10,
                    backgroundColor: color.withValues(alpha: 0.15),
                    valueColor: AlwaysStoppedAnimation(color),
                  ),
                ),
                Column(
                  children: [
                    Text('$_healthScore',
                        style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: color)),
                    Text('/ 100', style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.5))),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text('Password Health Score',
                style: TextStyle(fontSize: 16, color: Colors.white.withValues(alpha: 0.7))),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _statChip('${_weak.length}', 'Weak', Colors.red),
                _statChip('${_reused.length}', 'Reused', Colors.orange),
                _statChip('${_old.length}', 'Old', Colors.amber),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _statChip(String count, String label, Color color) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(count, style: TextStyle(fontWeight: FontWeight.bold, color: color)),
        ),
        const SizedBox(height: 4),
        Text(label, style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.5))),
      ],
    );
  }

  Widget _buildSection(String title, List<_PasswordIssue> issues, Color color, IconData icon) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8, left: 4),
          child: Row(
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 6),
              Text(title,
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: color)),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('${issues.length}', style: TextStyle(fontSize: 12, color: color)),
              ),
            ],
          ),
        ),
        ...issues.map((issue) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: Icon(Icons.key, color: color),
                title: Text(issue.title),
                subtitle: Text(issue.detail, style: TextStyle(color: color, fontSize: 12)),
              ),
            )),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _PasswordIssue {
  final String title;
  final String detail;
  final String itemId;

  _PasswordIssue({required this.title, required this.detail, required this.itemId});
}

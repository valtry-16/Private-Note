import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/encryption/vault_crypto.dart';
import '../core/theme.dart';
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
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildScoreCard(),
                const SizedBox(height: 20),
                if (_weak.isNotEmpty)
                  _buildSection('Weak Passwords', _weak, AppColors.error, Icons.warning_amber_rounded),
                if (_reused.isNotEmpty)
                  _buildSection('Reused Passwords', _reused, AppColors.warning, Icons.copy_rounded),
                if (_old.isNotEmpty)
                  _buildSection('Old Passwords', _old, const Color(0xFFF59E0B), Icons.schedule_rounded),
                if (_weak.isEmpty && _reused.isEmpty && _old.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(28),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border, width: 0.5),
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: AppColors.success.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Icon(Icons.verified_rounded, color: AppColors.success, size: 34),
                        ),
                        const SizedBox(height: 14),
                        Text('All passwords look healthy!',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: Colors.white, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 6),
                        const Text(
                          'Keep it up — your vault is in great shape.',
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
              ],
            ),
    );
  }

  Widget _buildScoreCard() {
    final color = _healthScore >= 80 ? AppColors.success : _healthScore >= 50 ? AppColors.warning : AppColors.error;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
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
                  backgroundColor: color.withValues(alpha: 0.12),
                  valueColor: AlwaysStoppedAnimation(color),
                ),
              ),
              Column(
                children: [
                  Text('$_healthScore',
                      style: TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: color)),
                  const Text('/ 100', style: TextStyle(fontSize: 14, color: AppColors.textMuted)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text('Password Health Score',
              style: TextStyle(fontSize: 15, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _statChip('${_weak.length}', 'Weak', AppColors.error),
              _statChip('${_reused.length}', 'Reused', AppColors.warning),
              _statChip('${_old.length}', 'Old', const Color(0xFFF59E0B)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statChip(String count, String label, Color color) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: color.withValues(alpha: 0.2)),
          ),
          child: Text(count, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18, color: color)),
        ),
        const SizedBox(height: 5),
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
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
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: color)),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
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

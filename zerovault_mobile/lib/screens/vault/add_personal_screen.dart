import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/vault_item.dart';
import '../../models/templates.dart';
import '../../state/auth_state.dart';
import '../../state/vault_state.dart';
import '../../core/theme.dart';

class AddPersonalScreen extends ConsumerStatefulWidget {
  final VaultItem? existingItem;
  const AddPersonalScreen({super.key, this.existingItem});

  @override
  ConsumerState<AddPersonalScreen> createState() => _AddPersonalScreenState();
}

class _AddPersonalScreenState extends ConsumerState<AddPersonalScreen> {
  TemplateType? _selectedType;
  final Map<String, TextEditingController> _controllers = {};
  final Map<String, bool> _obscured = {};
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
      final typeStr = data['template_type'] as String?;
      if (typeStr != null) {
        _selectedType = TemplateType.values.firstWhere(
          (t) => t.name == typeStr,
          orElse: () => TemplateType.other,
        );
        _initControllers();
        for (final entry in data.entries) {
          if (_controllers.containsKey(entry.key)) {
            _controllers[entry.key]!.text = entry.value?.toString() ?? '';
          }
        }
      }
      if (mounted) setState(() {});
    }
  }

  void _initControllers() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    _controllers.clear();
    _obscured.clear();
    if (_selectedType == null) return;
    final template = getTemplate(_selectedType!);
    for (final field in template.fields) {
      _controllers[field.key] = TextEditingController();
      if (field.isSecret) _obscured[field.key] = true;
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (_selectedType == null) return;
    setState(() => _isSaving = true);

    final data = <String, dynamic>{
      'template_type': _selectedType!.name,
      'name': getTemplate(_selectedType!).name,
    };
    for (final entry in _controllers.entries) {
      data[entry.key] = entry.value.text;
    }

    bool success;
    if (_isEditing) {
      success = await ref
          .read(vaultItemsProvider.notifier)
          .updateItem(widget.existingItem!.id!, data);
    } else {
      final item = await ref
          .read(vaultItemsProvider.notifier)
          .createItem(type: VaultItemType.personal, data: data);
      success = item != null;
    }

    setState(() => _isSaving = false);
    if (success && mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Personal Info' : 'New Personal Info'),
        actions: [
          if (_selectedType != null)
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
      body: _selectedType == null ? _buildTemplateSelector() : _buildForm(),
    );
  }

  Widget _buildTemplateSelector() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Select Template',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        ...personalTemplates.map((t) => Card(
              child: ListTile(
                leading: _templateIcon(t.icon),
                title: Text(t.name),
                subtitle: Text('${t.fields.length} fields'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  setState(() {
                    _selectedType = t.type;
                    _initControllers();
                  });
                },
              ),
            )),
      ],
    );
  }

  Widget _buildForm() {
    final template = getTemplate(_selectedType!);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _templateIcon(template.icon),
              const SizedBox(width: 12),
              Text(template.name,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.bold)),
              const Spacer(),
              if (!_isEditing)
                TextButton(
                  onPressed: () => setState(() {
                    _selectedType = null;
                    _initControllers();
                  }),
                  child: const Text('Change'),
                ),
            ],
          ),
          const SizedBox(height: 20),
          ...template.fields.map((field) {
            final obscured = _obscured[field.key] ?? false;
            return Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextFormField(
                controller: _controllers[field.key],
                obscureText: obscured,
                maxLines: field.multiline && !obscured ? 3 : 1,
                decoration: InputDecoration(
                  labelText: field.label,
                  hintText: field.hint.isNotEmpty ? field.hint : null,
                  suffixIcon: field.isSecret
                      ? IconButton(
                          icon: Icon(obscured
                              ? Icons.visibility_off
                              : Icons.visibility),
                          onPressed: () => setState(
                              () => _obscured[field.key] = !obscured),
                        )
                      : null,
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _templateIcon(String iconName) {
    final icons = {
      'badge': Icons.badge,
      'credit_card': Icons.credit_card,
      'account_balance': Icons.account_balance,
      'currency_bitcoin': Icons.currency_bitcoin,
      'wifi': Icons.wifi,
      'vpn_key': Icons.vpn_key,
      'description': Icons.description,
      'more_horiz': Icons.more_horiz,
    };
    return CircleAvatar(
      backgroundColor: AppColors.primary.withValues(alpha: 0.15),
      child: Icon(
        icons[iconName] ?? Icons.more_horiz,
        color: AppColors.primary,
      ),
    );
  }
}

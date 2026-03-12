import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/encryption/vault_crypto.dart';
import '../../state/auth_state.dart';
import '../../state/vault_state.dart';
import '../../widgets/vault_item_card.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  final Map<String, String> _titleCache = {};
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final vaultState = ref.watch(vaultItemsProvider);
    final pw = ref.read(vaultLockProvider).masterPassword ?? '';

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Search vault...',
            border: InputBorder.none,
            filled: false,
          ),
          onChanged: (v) => setState(() => _query = v.toLowerCase()),
        ),
        actions: [
          if (_controller.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _controller.clear();
                setState(() => _query = '');
              },
            ),
        ],
      ),
      body: _query.isEmpty
          ? Center(
              child: Text(
                'Type to search your vault',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.4)),
              ),
            )
          : FutureBuilder(
              future: _searchItems(vaultState, pw),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                final results = snapshot.data!;
                if (results.isEmpty) {
                  return Center(
                    child: Text(
                      'No results for "$_query"',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.4)),
                    ),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: results.length,
                  itemBuilder: (ctx, i) => VaultItemCard(
                    item: results[i],
                    masterPassword: pw,
                  ),
                );
              },
            ),
    );
  }

  Future<List<dynamic>> _searchItems(VaultItemsState state, String pw) async {
    final items = state.items.where((i) => !i.isDeleted).toList();
    final matches = <dynamic>[];

    for (final item in items) {
      // Check cached title
      if (!_titleCache.containsKey(item.id)) {
        try {
          final titleEnc = item.metadata?['encrypted_title'] as String?;
          if (titleEnc != null) {
            _titleCache[item.id!] = await VaultCrypto.decrypt(titleEnc, pw);
          } else {
            _titleCache[item.id!] = '';
          }
        } catch (_) {
          _titleCache[item.id!] = '';
        }
      }

      final title = _titleCache[item.id!] ?? '';
      if (title.toLowerCase().contains(_query) ||
          item.type.name.contains(_query)) {
        matches.add(item);
      }
    }
    return matches;
  }
}

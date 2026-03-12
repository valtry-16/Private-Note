import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/vault_item.dart';
import '../../state/auth_state.dart';
import '../../state/vault_state.dart';
import '../../widgets/vault_item_card.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(vaultItemsProvider.notifier).loadItems();
    });
  }

  @override
  Widget build(BuildContext context) {
    final vaultState = ref.watch(vaultItemsProvider);
    final items = vaultState.filtered;

    return Scaffold(
      appBar: AppBar(
        title: const Text('ZeroVault'),
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => Scaffold.of(ctx).openDrawer(),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => Navigator.of(context).pushNamed('/search'),
          ),
          IconButton(
            icon: const Icon(Icons.lock_outline),
            onPressed: () => ref.read(vaultLockProvider.notifier).lock(),
          ),
        ],
      ),
      drawer: _buildDrawer(context),
      body: vaultState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : items.isEmpty
              ? _buildEmpty()
              : RefreshIndicator(
                  onRefresh: () =>
                      ref.read(vaultItemsProvider.notifier).loadItems(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    itemBuilder: (context, index) => VaultItemCard(
                      item: items[index],
                      masterPassword:
                          ref.read(vaultLockProvider).masterPassword ?? '',
                    ),
                  ),
                ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) {
          setState(() => _currentIndex = i);
          switch (i) {
            case 0:
              ref.read(vaultItemsProvider.notifier).setFilter();
              break;
            case 1:
              ref
                  .read(vaultItemsProvider.notifier)
                  .setFilter(type: VaultItemType.note);
              break;
            case 2:
              ref
                  .read(vaultItemsProvider.notifier)
                  .setFilter(type: VaultItemType.password);
              break;
            case 3:
              ref
                  .read(vaultItemsProvider.notifier)
                  .setFilter(type: VaultItemType.document);
              break;
            case 4:
              ref
                  .read(vaultItemsProvider.notifier)
                  .setFilter(type: VaultItemType.personal);
              break;
          }
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'All'),
          BottomNavigationBarItem(
              icon: Icon(Icons.note_alt_outlined), label: 'Notes'),
          BottomNavigationBarItem(icon: Icon(Icons.key), label: 'Passwords'),
          BottomNavigationBarItem(
              icon: Icon(Icons.folder_outlined), label: 'Docs'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Personal'),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddMenu(context),
        backgroundColor: const Color(0xFF6366F1),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.inbox, size: 64, color: Colors.white.withValues(alpha: 0.2)),
          const SizedBox(height: 16),
          Text(
            'No items yet',
            style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            'Tap + to add your first item',
            style: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 14),
          ),
        ],
      ),
    );
  }

  Drawer _buildDrawer(BuildContext context) {
    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
              decoration: const BoxDecoration(color: Color(0xFF6366F1)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.shield_outlined, color: Colors.white, size: 28),
                  ),
                  const SizedBox(height: 12),
                  const Text('ZeroVault',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text(
                    ref.read(authProvider).email ?? 'Zero-Knowledge Vault',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  _drawerItem(Icons.home, 'All Items', () {
                    ref.read(vaultItemsProvider.notifier).setFilter();
                    Navigator.pop(context);
                  }),
                  _drawerItem(Icons.star_outline, 'Favorites', () {
                    ref.read(vaultItemsProvider.notifier).setFilter(favorites: true);
                    Navigator.pop(context);
                  }),
                  _drawerItem(Icons.folder_outlined, 'Folders', () {
                    Navigator.pop(context);
                    Navigator.pushNamed(context, '/folders');
                  }),
                  _drawerItem(Icons.label_outline, 'Tags', () {
                    Navigator.pop(context);
                    Navigator.pushNamed(context, '/tags');
                  }),
                  _drawerItem(Icons.health_and_safety_outlined, 'Password Health', () {
                    Navigator.pop(context);
                    Navigator.pushNamed(context, '/password-health');
                  }),
                  _drawerItem(Icons.visibility_off_outlined, 'Hidden Vault', () {
                    ref.read(vaultItemsProvider.notifier).setFilter(hidden: true);
                    Navigator.pop(context);
                  }),
                  _drawerItem(Icons.delete_outline, 'Trash', () {
                    ref.read(vaultItemsProvider.notifier).setFilter(trash: true);
                    Navigator.pop(context);
                  }),
                  const Divider(),
                  _drawerItem(Icons.import_export, 'Import / Export', () {
                    Navigator.pop(context);
                    Navigator.pushNamed(context, '/import-export');
                  }),
                  _drawerItem(Icons.security, 'Security Logs', () {
                    Navigator.pop(context);
                    Navigator.pushNamed(context, '/security-logs');
                  }),
                  _drawerItem(Icons.settings_outlined, 'Settings', () {
                    Navigator.pop(context);
                    Navigator.pushNamed(context, '/settings');
                  }),
                ],
              ),
            ),
            const Divider(height: 1),
            _drawerItem(Icons.logout, 'Sign Out', () {
              ref.read(authProvider.notifier).signOut();
              Navigator.pop(context);
            }),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _drawerItem(IconData icon, String label, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, size: 22),
      title: Text(label),
      onTap: onTap,
      dense: true,
    );
  }

  void _showAddMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Add New Item',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            _addOption(ctx, Icons.note_alt_outlined, 'Note', '/add-note'),
            _addOption(ctx, Icons.key, 'Password', '/add-password'),
            _addOption(ctx, Icons.upload_file, 'Document', '/add-document'),
            _addOption(ctx, Icons.person, 'Personal Info', '/add-personal'),
          ],
        ),
      ),
    );
  }

  Widget _addOption(
      BuildContext ctx, IconData icon, String label, String route) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.15),
        child: Icon(icon, color: const Color(0xFF6366F1)),
      ),
      title: Text(label),
      onTap: () {
        Navigator.pop(ctx);
        Navigator.pushNamed(ctx, route);
      },
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    );
  }
}

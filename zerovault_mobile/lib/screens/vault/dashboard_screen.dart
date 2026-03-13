import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
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
    final allItems = vaultState.items
        .where((i) => !i.isDeleted && !i.isHidden)
        .toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: _buildAppBar(context, allItems),
      drawer: _buildDrawer(context),
      body: vaultState.isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                if (_currentIndex == 0) _buildStatsRow(allItems),
                Expanded(
                  child: items.isEmpty
                      ? _buildEmpty()
                      : RefreshIndicator(
                          color: AppColors.primary,
                          onRefresh: () =>
                              ref.read(vaultItemsProvider.notifier).loadItems(),
                          child: ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                            itemCount: items.length,
                            itemBuilder: (context, index) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: VaultItemCard(
                                item: items[index],
                                masterPassword:
                                    ref.read(vaultLockProvider).masterPassword ??
                                        '',
                              ),
                            ),
                          ),
                        ),
                ),
              ],
            ),
      bottomNavigationBar: _buildBottomNav(),
      floatingActionButton: _buildFab(context),
    );
  }

  PreferredSizeWidget _buildAppBar(
      BuildContext context, List<VaultItem> allItems) {
    return AppBar(
      backgroundColor: AppColors.surface,
      title: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.primary, AppColors.primaryLight],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(9),
            ),
            child: const Icon(Icons.shield_outlined,
                color: Colors.white, size: 18),
          ),
          const SizedBox(width: 10),
          const Text('ZeroVault'),
        ],
      ),
      leading: Builder(
        builder: (ctx) => IconButton(
          icon: const Icon(Icons.menu_rounded),
          onPressed: () => Scaffold.of(ctx).openDrawer(),
          tooltip: 'Menu',
        ),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.search_rounded),
          onPressed: () => Navigator.of(context).pushNamed('/search'),
          tooltip: 'Search',
        ),
        IconButton(
          icon: const Icon(Icons.lock_outline_rounded),
          onPressed: () => ref.read(vaultLockProvider.notifier).lock(),
          tooltip: 'Lock vault',
        ),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1),
        child: Container(height: 1, color: AppColors.border),
      ),
    );
  }

  Widget _buildStatsRow(List<VaultItem> allItems) {
    final counts = {
      VaultItemType.password:
          allItems.where((i) => i.type == VaultItemType.password).length,
      VaultItemType.note:
          allItems.where((i) => i.type == VaultItemType.note).length,
      VaultItemType.document:
          allItems.where((i) => i.type == VaultItemType.document).length,
      VaultItemType.personal:
          allItems.where((i) => i.type == VaultItemType.personal).length,
    };

    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Row(
        children: [
          _StatChip(
            label: 'All',
            count: allItems.length,
            color: AppColors.primary,
          ),
          const SizedBox(width: 8),
          _StatChip(
            label: 'Passwords',
            count: counts[VaultItemType.password]!,
            color: AppColors.passwordColor,
          ),
          const SizedBox(width: 8),
          _StatChip(
            label: 'Notes',
            count: counts[VaultItemType.note]!,
            color: AppColors.noteColor,
          ),
          const SizedBox(width: 8),
          _StatChip(
            label: 'Docs',
            count: counts[VaultItemType.document]!,
            color: AppColors.documentColor,
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    final labels = ['All items', 'Notes', 'Passwords', 'Documents', 'Personal'];
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
            ),
            child: const Icon(Icons.inbox_outlined,
                size: 36, color: AppColors.textMuted),
          ),
          const SizedBox(height: 16),
          Text(
            'No ${labels[_currentIndex].toLowerCase()}',
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Tap + to add your first item',
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: BottomNavigationBar(
        currentIndex: _currentIndex,
        backgroundColor: Colors.transparent,
        elevation: 0,
        onTap: (i) {
          setState(() => _currentIndex = i);
          final notifier = ref.read(vaultItemsProvider.notifier);
          switch (i) {
            case 0:
              notifier.setFilter();
              break;
            case 1:
              notifier.setFilter(type: VaultItemType.note);
              break;
            case 2:
              notifier.setFilter(type: VaultItemType.password);
              break;
            case 3:
              notifier.setFilter(type: VaultItemType.document);
              break;
            case 4:
              notifier.setFilter(type: VaultItemType.personal);
              break;
          }
        },
        items: const [
          BottomNavigationBarItem(
              icon: Icon(Icons.home_rounded), label: 'All'),
          BottomNavigationBarItem(
              icon: Icon(Icons.note_alt_outlined), label: 'Notes'),
          BottomNavigationBarItem(
              icon: Icon(Icons.key_rounded), label: 'Passwords'),
          BottomNavigationBarItem(
              icon: Icon(Icons.folder_outlined), label: 'Docs'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outline_rounded), label: 'Personal'),
        ],
      ),
    );
  }

  Widget _buildFab(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.4),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: FloatingActionButton(
        onPressed: () => _showAddMenu(context),
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        elevation: 0,
        child: const Icon(Icons.add_rounded, size: 28),
      ),
    );
  }

  Drawer _buildDrawer(BuildContext context) {
    final email = ref.read(authProvider).email ?? '';
    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.primaryDark, AppColors.primary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.shield_outlined,
                        color: Colors.white, size: 28),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'ZeroVault',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    email,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.75),
                      fontSize: 13,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8),
                children: [
                  _DrawerSection(title: 'VAULT'),
                  _drawerItem(
                    icon: Icons.home_rounded,
                    label: 'All Items',
                    onTap: () {
                      ref.read(vaultItemsProvider.notifier).setFilter();
                      setState(() => _currentIndex = 0);
                      Navigator.pop(context);
                    },
                  ),
                  _drawerItem(
                    icon: Icons.star_outline_rounded,
                    label: 'Favorites',
                    onTap: () {
                      ref
                          .read(vaultItemsProvider.notifier)
                          .setFilter(favorites: true);
                      Navigator.pop(context);
                    },
                  ),
                  _drawerItem(
                    icon: Icons.visibility_off_outlined,
                    label: 'Hidden Vault',
                    onTap: () {
                      ref
                          .read(vaultItemsProvider.notifier)
                          .setFilter(hidden: true);
                      Navigator.pop(context);
                    },
                  ),
                  _drawerItem(
                    icon: Icons.delete_outline_rounded,
                    label: 'Trash',
                    onTap: () {
                      ref
                          .read(vaultItemsProvider.notifier)
                          .setFilter(trash: true);
                      Navigator.pop(context);
                    },
                  ),
                  Divider(color: AppColors.border, height: 24),
                  _DrawerSection(title: 'TOOLS'),
                  _drawerItem(
                    icon: Icons.health_and_safety_outlined,
                    label: 'Password Health',
                    badge: 'NEW',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.pushNamed(context, '/password-health');
                    },
                  ),
                  _drawerItem(
                    icon: Icons.import_export_rounded,
                    label: 'Import / Export',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.pushNamed(context, '/import-export');
                    },
                  ),
                  _drawerItem(
                    icon: Icons.security_rounded,
                    label: 'Security Logs',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.pushNamed(context, '/security-logs');
                    },
                  ),
                  Divider(color: AppColors.border, height: 24),
                  _DrawerSection(title: 'ACCOUNT'),
                  _drawerItem(
                    icon: Icons.settings_outlined,
                    label: 'Settings',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.pushNamed(context, '/settings');
                    },
                  ),
                ],
              ),
            ),
            Divider(color: AppColors.border, height: 1),
            _drawerItem(
              icon: Icons.logout_rounded,
              label: 'Sign Out',
              color: AppColors.error,
              onTap: () {
                ref.read(authProvider.notifier).signOut();
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _drawerItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color? color,
    String? badge,
  }) {
    final itemColor = color ?? AppColors.textSecondary;
    return ListTile(
      leading: Icon(icon, size: 21, color: itemColor),
      title: Row(
        children: [
          Text(
            label,
            style: TextStyle(
              color: color ?? AppColors.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          if (badge != null) ...[
            const SizedBox(width: 8),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                badge,
                style: const TextStyle(
                  color: AppColors.primaryLight,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ],
      ),
      onTap: onTap,
      dense: true,
      visualDensity: const VisualDensity(vertical: -1),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
    );
  }

  void _showAddMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Add New Item',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 16),
            _addOption(ctx, Icons.key_rounded, 'Password',
                AppColors.passwordColor, '/add-password'),
            const SizedBox(height: 8),
            _addOption(ctx, Icons.note_alt_outlined, 'Note',
                AppColors.noteColor, '/add-note'),
            const SizedBox(height: 8),
            _addOption(ctx, Icons.upload_file_rounded, 'Document',
                AppColors.documentColor, '/add-document'),
            const SizedBox(height: 8),
            _addOption(ctx, Icons.person_outline_rounded, 'Personal Info',
                AppColors.personalColor, '/add-personal'),
          ],
        ),
      ),
    );
  }

  Widget _addOption(BuildContext ctx, IconData icon, String label,
      Color color, String route) {
    return Material(
      color: color.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: () {
          Navigator.pop(ctx);
          Navigator.pushNamed(ctx, route);
        },
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 14),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              Icon(Icons.arrow_forward_ios_rounded,
                  size: 14, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _StatChip({
    required this.label,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Text(
              '$count',
              style: TextStyle(
                color: color,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 10,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class _DrawerSection extends StatelessWidget {
  final String title;
  const _DrawerSection({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
      child: Text(
        title,
        style: const TextStyle(
          color: AppColors.textMuted,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.0,
        ),
      ),
    );
  }
}

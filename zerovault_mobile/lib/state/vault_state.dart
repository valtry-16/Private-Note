import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/encryption/vault_crypto.dart';
import '../core/supabase/supabase_service.dart';
import '../models/vault_item.dart';
import '../models/folder_tag.dart';
import 'auth_state.dart';

// ─── Vault Items State ─────────────────────────────────────────────

class VaultItemsState {
  final List<VaultItem> items;
  final bool isLoading;
  final String? error;
  final String searchQuery;
  final VaultItemType? filterType;
  final String? filterFolderId;
  final bool showFavoritesOnly;
  final bool showHiddenOnly;
  final bool showTrashOnly;

  const VaultItemsState({
    this.items = const [],
    this.isLoading = false,
    this.error,
    this.searchQuery = '',
    this.filterType,
    this.filterFolderId,
    this.showFavoritesOnly = false,
    this.showHiddenOnly = false,
    this.showTrashOnly = false,
  });

  VaultItemsState copyWith({
    List<VaultItem>? items,
    bool? isLoading,
    String? error,
    String? searchQuery,
    VaultItemType? filterType,
    String? filterFolderId,
    bool? showFavoritesOnly,
    bool? showHiddenOnly,
    bool? showTrashOnly,
    bool clearFilterType = false,
    bool clearFolderId = false,
  }) =>
      VaultItemsState(
        items: items ?? this.items,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        searchQuery: searchQuery ?? this.searchQuery,
        filterType: clearFilterType ? null : (filterType ?? this.filterType),
        filterFolderId:
            clearFolderId ? null : (filterFolderId ?? this.filterFolderId),
        showFavoritesOnly: showFavoritesOnly ?? this.showFavoritesOnly,
        showHiddenOnly: showHiddenOnly ?? this.showHiddenOnly,
        showTrashOnly: showTrashOnly ?? this.showTrashOnly,
      );

  List<VaultItem> get filtered {
    var result = items.where((item) {
      if (showTrashOnly) return item.isDeleted;
      if (item.isDeleted) return false;
      if (showHiddenOnly) return item.isHidden;
      if (item.isHidden) return false;
      if (showFavoritesOnly && !item.isFavorite) return false;
      if (filterType != null && item.type != filterType) return false;
      if (filterFolderId != null && item.folderId != filterFolderId) {
        return false;
      }
      return true;
    }).toList();

    // Search is applied on encrypted_title in metadata (decrypted separately)
    return result;
  }
}

class VaultItemsNotifier extends StateNotifier<VaultItemsState> {
  final Ref ref;

  VaultItemsNotifier(this.ref) : super(const VaultItemsState());

  String? get _masterPassword => ref.read(vaultLockProvider).masterPassword;

  Future<void> loadItems() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final raw = await SupabaseService.getVaultItems(
        includeDeleted: true,
      );
      final items = raw.map((e) => VaultItem.fromJson(e)).toList();
      state = state.copyWith(items: items, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<String?> decryptItemData(String encryptedData) async {
    final pw = _masterPassword;
    if (pw == null) return null;
    try {
      return await VaultCrypto.decrypt(encryptedData, pw);
    } catch (_) {
      return null;
    }
  }

  Future<VaultItem?> createItem({
    required VaultItemType type,
    required Map<String, dynamic> data,
    String? folderId,
    List<String> tagIds = const [],
  }) async {
    final pw = _masterPassword;
    if (pw == null) return null;
    try {
      final encrypted = await VaultCrypto.encrypt(jsonEncode(data), pw);

      // Create title preview metadata
      String title = '';
      if (data['title'] != null) title = data['title'] as String;
      if (data['name'] != null) title = data['name'] as String;
      if (data['website'] != null && title.isEmpty) {
        title = data['website'] as String;
      }

      final encryptedTitle = await VaultCrypto.encrypt(title, pw);

      final itemData = {
        'type': type.name,
        'encrypted_data': encrypted,
        'metadata': {'encrypted_title': encryptedTitle},
        'folder_id': folderId,
        'tag_ids': tagIds,
      };

      final result = await SupabaseService.createVaultItem(itemData);
      final item = VaultItem.fromJson(result);
      state = state.copyWith(items: [item, ...state.items]);
      await SupabaseService.logSecurityEvent('item_create');
      return item;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }

  Future<bool> updateItem(String id, Map<String, dynamic> data) async {
    final pw = _masterPassword;
    if (pw == null) return false;
    try {
      final encrypted = await VaultCrypto.encrypt(jsonEncode(data), pw);

      String title = '';
      if (data['title'] != null) title = data['title'] as String;
      if (data['name'] != null) title = data['name'] as String;
      if (data['website'] != null && title.isEmpty) {
        title = data['website'] as String;
      }
      final encryptedTitle = await VaultCrypto.encrypt(title, pw);

      await SupabaseService.updateVaultItem(id, {
        'encrypted_data': encrypted,
        'metadata': {'encrypted_title': encryptedTitle},
      });

      await loadItems();
      await SupabaseService.logSecurityEvent('item_update');
      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }

  Future<void> toggleFavorite(String id, bool value) async {
    await SupabaseService.updateVaultItem(id, {'is_favorite': value});
    await loadItems();
  }

  Future<void> togglePin(String id, bool value) async {
    await SupabaseService.updateVaultItem(id, {'is_pinned': value});
    await loadItems();
  }

  Future<void> moveToTrash(String id) async {
    await SupabaseService.softDeleteVaultItem(id);
    await loadItems();
    await SupabaseService.logSecurityEvent('item_delete');
  }

  Future<void> restoreFromTrash(String id) async {
    await SupabaseService.restoreVaultItem(id);
    await loadItems();
  }

  Future<void> permanentDelete(String id) async {
    await SupabaseService.deleteVaultItem(id);
    await loadItems();
  }

  Future<void> moveToFolder(String id, String? folderId) async {
    await SupabaseService.updateVaultItem(id, {'folder_id': folderId});
    await loadItems();
  }

  Future<void> toggleHidden(String id, bool value) async {
    await SupabaseService.updateVaultItem(id, {'is_hidden': value});
    await loadItems();
  }

  void setFilter({
    VaultItemType? type,
    String? folderId,
    bool? favorites,
    bool? hidden,
    bool? trash,
  }) {
    state = state.copyWith(
      filterType: type,
      filterFolderId: folderId,
      showFavoritesOnly: favorites,
      showHiddenOnly: hidden,
      showTrashOnly: trash,
      clearFilterType: type == null,
      clearFolderId: folderId == null,
    );
  }

  void setSearch(String query) {
    state = state.copyWith(searchQuery: query);
  }
}

final vaultItemsProvider =
    StateNotifierProvider<VaultItemsNotifier, VaultItemsState>(
  (ref) => VaultItemsNotifier(ref),
);

// ─── Folders & Tags ────────────────────────────────────────────────

final foldersProvider = FutureProvider<List<Folder>>((ref) async {
  final data = await SupabaseService.getFolders();
  return data.map((e) => Folder.fromJson(e)).toList();
});

final tagsProvider = FutureProvider<List<Tag>>((ref) async {
  final data = await SupabaseService.getTags();
  return data.map((e) => Tag.fromJson(e)).toList();
});

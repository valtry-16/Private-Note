import 'package:supabase_flutter/supabase_flutter.dart';
import '../env.dart';

class SupabaseService {
  static SupabaseClient get client => Supabase.instance.client;

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: Env.supabaseUrl,
      anonKey: Env.supabaseAnonKey,
    );
  }

  // ─── Auth ────────────────────────────────────────────────────────

  static GoTrueClient get auth => client.auth;
  static User? get currentUser => auth.currentUser;
  static String? get userId => currentUser?.id;

  static Future<AuthResponse> signUp(String email, String password) =>
      auth.signUp(email: email, password: password);

  static Future<AuthResponse> signIn(String email, String password) =>
      auth.signInWithPassword(email: email, password: password);

  static Future<void> signOut() => auth.signOut();

  static Future<UserResponse> updateUser({String? email, String? password}) =>
      auth.updateUser(UserAttributes(email: email, password: password));

  static Future<void> resetPassword(String email) =>
      auth.resetPasswordForEmail(email);

  // ─── User Profile ────────────────────────────────────────────────

  static Future<Map<String, dynamic>?> getUserProfile() async {
    final uid = userId;
    if (uid == null) return null;
    final result = await client
        .from('user_profiles')
        .select()
        .eq('user_id', uid)
        .maybeSingle();
    return result;
  }

  static Future<void> upsertUserProfile(Map<String, dynamic> data) async {
    final uid = userId;
    if (uid == null) return;
    await client.from('user_profiles').upsert({
      ...data,
      'user_id': uid,
    });
  }

  // ─── Vault Items ────────────────────────────────────────────────

  static Future<List<Map<String, dynamic>>> getVaultItems({
    String? type,
    bool includeDeleted = false,
  }) async {
    final uid = userId;
    if (uid == null) return [];
    var query = client.from('vault_items').select().eq('user_id', uid);
    if (type != null) query = query.eq('type', type);
    if (!includeDeleted) query = query.eq('is_deleted', false);
    final result = await query.order('updated_at', ascending: false);
    return List<Map<String, dynamic>>.from(result);
  }

  static Future<Map<String, dynamic>?> getVaultItem(String id) async {
    final result = await client
        .from('vault_items')
        .select()
        .eq('id', id)
        .maybeSingle();
    return result;
  }

  static Future<Map<String, dynamic>> createVaultItem(Map<String, dynamic> data) async {
    final uid = userId;
    if (uid == null) throw Exception('Not authenticated');
    final result = await client
        .from('vault_items')
        .insert({...data, 'user_id': uid})
        .select()
        .single();
    return result;
  }

  static Future<void> updateVaultItem(String id, Map<String, dynamic> data) async {
    await client.from('vault_items').update({
      ...data,
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', id);
  }

  static Future<void> deleteVaultItem(String id) async {
    await client.from('vault_items').delete().eq('id', id);
  }

  static Future<void> softDeleteVaultItem(String id) async {
    await updateVaultItem(id, {
      'is_deleted': true,
      'deleted_at': DateTime.now().toIso8601String(),
    });
  }

  static Future<void> restoreVaultItem(String id) async {
    await updateVaultItem(id, {
      'is_deleted': false,
      'deleted_at': null,
    });
  }

  // ─── Folders ────────────────────────────────────────────────────

  static Future<List<Map<String, dynamic>>> getFolders() async {
    final uid = userId;
    if (uid == null) return [];
    final result = await client
        .from('folders')
        .select()
        .eq('user_id', uid)
        .order('name');
    return List<Map<String, dynamic>>.from(result);
  }

  static Future<Map<String, dynamic>> createFolder(String name) async {
    final uid = userId;
    if (uid == null) throw Exception('Not authenticated');
    return await client
        .from('folders')
        .insert({'user_id': uid, 'name': name})
        .select()
        .single();
  }

  static Future<void> deleteFolder(String id) async {
    await client.from('folders').delete().eq('id', id);
  }

  // ─── Tags ──────────────────────────────────────────────────────

  static Future<List<Map<String, dynamic>>> getTags() async {
    final uid = userId;
    if (uid == null) return [];
    final result = await client
        .from('tags')
        .select()
        .eq('user_id', uid)
        .order('name');
    return List<Map<String, dynamic>>.from(result);
  }

  static Future<Map<String, dynamic>> createTag(String name, String color) async {
    final uid = userId;
    if (uid == null) throw Exception('Not authenticated');
    return await client
        .from('tags')
        .insert({'user_id': uid, 'name': name, 'color': color})
        .select()
        .single();
  }

  static Future<void> deleteTag(String id) async {
    await client.from('tags').delete().eq('id', id);
  }

  // ─── Security Logs ──────────────────────────────────────────────

  static Future<List<Map<String, dynamic>>> getSecurityLogs({int limit = 50}) async {
    final uid = userId;
    if (uid == null) return [];
    final result = await client
        .from('security_logs')
        .select()
        .eq('user_id', uid)
        .order('created_at', ascending: false)
        .limit(limit);
    return List<Map<String, dynamic>>.from(result);
  }

  static Future<void> logSecurityEvent(String eventType, {Map<String, dynamic>? extra}) async {
    final uid = userId;
    if (uid == null) return;
    await client.from('security_logs').insert({
      'user_id': uid,
      'event_type': eventType,
      'ip_address': extra?['ip_address'] ?? 'mobile',
      'user_agent': extra?['user_agent'] ?? 'ZeroVault Mobile',
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  // ─── Sharing ────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> createSharedItem(Map<String, dynamic> data) async {
    return await client.from('shared_items').insert(data).select().single();
  }

  static Future<Map<String, dynamic>?> getSharedItem(String shareId) async {
    return await client
        .from('shared_items')
        .select()
        .eq('share_id', shareId)
        .maybeSingle();
  }

  // ─── Storage (Documents) ────────────────────────────────────────

  static Future<String> uploadFile(String path, List<int> bytes) async {
    await client.storage.from('vault-files').uploadBinary(path, bytes as dynamic);
    return path;
  }

  static Future<List<int>> downloadFile(String path) async {
    return await client.storage.from('vault-files').download(path);
  }

  static Future<void> deleteFile(String path) async {
    await client.storage.from('vault-files').remove([path]);
  }
}

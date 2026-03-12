/// Environment configuration for ZeroVault Mobile.
///
/// Replace these values with your own Supabase project credentials.
/// In production, use --dart-define or a .env approach.
class Env {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://gcsbazzmtivhmuietajs.supabase.co',
  );
  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );
}

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
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdjc2JhenptdGl2aG11aWV0YWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjE3MDIsImV4cCI6MjA4ODUzNzcwMn0.g3ciFwNv6ei6BMsyWTCgsJqgQcqKIqaKhqK4GCAL5_E',
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/supabase/supabase_service.dart';
import 'core/theme.dart';
import 'models/vault_item.dart';
import 'state/auth_state.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/signup_screen.dart';
import 'screens/auth/vault_unlock_screen.dart';
import 'screens/vault/dashboard_screen.dart';
import 'screens/vault/add_note_screen.dart';
import 'screens/vault/add_password_screen.dart';
import 'screens/vault/add_document_screen.dart';
import 'screens/vault/add_personal_screen.dart';
import 'screens/vault/search_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/change_password_screen.dart';
import 'screens/security_logs_screen.dart';
import 'screens/import_export_screen.dart';
import 'screens/password_health_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseService.initialize();
  runApp(const ProviderScope(child: ZeroVaultApp()));
}

class ZeroVaultApp extends ConsumerWidget {
  const ZeroVaultApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final lock = ref.watch(vaultLockProvider);

    return MaterialApp(
      title: 'ZeroVault',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.dark,
      home: _resolveHome(auth, lock),
      onGenerateRoute: (settings) {
        final routes = <String, WidgetBuilder>{
          '/login': (_) => const LoginScreen(),
          '/signup': (_) => const SignupScreen(),
          '/unlock': (_) => const VaultUnlockScreen(),
          '/dashboard': (_) => const DashboardScreen(),
          '/add-note': (_) => AddNoteScreen(
                existingItem: settings.arguments as VaultItem?,
              ),
          '/add-password': (_) => AddPasswordScreen(
                existingItem: settings.arguments as VaultItem?,
              ),
          '/add-document': (_) => const AddDocumentScreen(),
          '/add-personal': (_) => AddPersonalScreen(
                existingItem: settings.arguments as VaultItem?,
              ),
          '/search': (_) => const SearchScreen(),
          '/settings': (_) => const SettingsScreen(),
          '/change-password': (_) => const ChangePasswordScreen(),
          '/security-logs': (_) => const SecurityLogsScreen(),
          '/import-export': (_) => const ImportExportScreen(),
          '/password-health': (_) => const PasswordHealthScreen(),
        };

        final builder = routes[settings.name];
        if (builder != null) {
          return MaterialPageRoute(builder: builder, settings: settings);
        }
        return null;
      },
    );
  }

  Widget _resolveHome(AuthState auth, VaultLockState lock) {
    if (auth.status == AuthStatus.unauthenticated ||
        auth.status == AuthStatus.initial) {
      return const LoginScreen();
    }
    if (!lock.isUnlocked) {
      return const VaultUnlockScreen();
    }
    return const DashboardScreen();
  }
}

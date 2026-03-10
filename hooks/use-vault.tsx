"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { createClient } from "@/supabase/client";
import { verifyMasterPassword, decrypt } from "@/encryption";
import type { User } from "@supabase/supabase-js";

interface VaultContextType {
  user: User | null;
  isAuthenticated: boolean;
  isVaultUnlocked: boolean;
  masterPassword: string | null;
  unlockVault: (password: string) => Promise<boolean>;
  lockVault: () => void;
  signOut: () => Promise<void>;
  failedAttempts: number;
  isLocked: boolean;
  // Hidden vault
  isHiddenVaultSetup: boolean;
  isHiddenVaultUnlocked: boolean;
  unlockHiddenVault: (passcode: string) => Promise<boolean>;
  lockHiddenVault: () => void;
  refreshHiddenVaultStatus: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | null>(null);

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function VaultProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [hiddenVaultHash, setHiddenVaultHash] = useState<string | null>(null);
  const [isHiddenVaultUnlocked, setIsHiddenVaultUnlocked] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: any }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setMasterPassword(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const unlockVault = useCallback(
    async (password: string): Promise<boolean> => {
      if (isLocked) return false;
      if (!user) return false;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("encrypted_verification")
        .eq("user_id", user.id)
        .single();

      if (!profile) return false;

      const valid = await verifyMasterPassword(
        password,
        profile.encrypted_verification
      );

      if (valid) {
        setMasterPassword(password);
        setFailedAttempts(0);
        setLockedUntil(null);
        // Load hidden vault setup status
        const { data: fullProfile } = await supabase
          .from("user_profiles")
          .select("hidden_vault_hash")
          .eq("user_id", user.id)
          .single();
        setHiddenVaultHash(fullProfile?.hidden_vault_hash ?? null);
        // Log successful unlock
        await supabase.from("security_logs").insert({
          user_id: user.id,
          event_type: "vault_unlock",
          user_agent: navigator.userAgent,
        });
        // Track activity for dead man's switch
        await supabase
          .from("user_profiles")
          .update({ last_active_at: new Date().toISOString() })
          .eq("user_id", user.id);
        return true;
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_DURATION_MS);
          await supabase.from("security_logs").insert({
            user_id: user.id,
            event_type: "vault_lockout",
            user_agent: navigator.userAgent,
          });
        }
        return false;
      }
    },
    [user, failedAttempts, isLocked]
  );

  const lockVault = useCallback(() => {
    setMasterPassword(null);
    setIsHiddenVaultUnlocked(false);
  }, []);

  const unlockHiddenVault = useCallback(
    async (passcode: string): Promise<boolean> => {
      if (!masterPassword || !hiddenVaultHash) return false;
      try {
        const stored = await decrypt(hiddenVaultHash, masterPassword);
        if (stored === passcode) {
          setIsHiddenVaultUnlocked(true);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [masterPassword, hiddenVaultHash]
  );

  const lockHiddenVault = useCallback(() => {
    setIsHiddenVaultUnlocked(false);
  }, []);

  const refreshHiddenVaultStatus = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_profiles")
      .select("hidden_vault_hash")
      .eq("user_id", user.id)
      .single();
    setHiddenVaultHash(data?.hidden_vault_hash ?? null);
  }, [user]);

  const signOut = useCallback(async () => {
    setMasterPassword(null);
    await supabase.auth.signOut();
  }, []);

  return (
    <VaultContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isVaultUnlocked: !!masterPassword,
        masterPassword,
        unlockVault,
        lockVault,
        signOut,
        failedAttempts,
        isLocked,
        isHiddenVaultSetup: !!hiddenVaultHash,
        isHiddenVaultUnlocked,
        unlockHiddenVault,
        lockHiddenVault,
        refreshHiddenVaultStatus,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) throw new Error("useVault must be used within VaultProvider");
  return context;
}

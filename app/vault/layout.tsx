"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/hooks/use-vault";
import { useAutoLock } from "@/hooks/use-auto-lock";
import { Sidebar } from "@/components/vault/sidebar";
import { VaultLockScreen } from "@/components/vault/lock-screen";

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isVaultUnlocked } = useVault();
  useAutoLock(60_000);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  if (!isVaultUnlocked) {
    return <VaultLockScreen />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}

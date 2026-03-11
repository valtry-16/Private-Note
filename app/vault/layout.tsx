"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
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

  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="flex-1 overflow-auto">
        <div className="flex h-14 items-center px-3 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md bg-card p-2 shadow-md"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}

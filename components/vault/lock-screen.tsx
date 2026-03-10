"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVault } from "@/hooks/use-vault";

export function VaultLockScreen() {
  const { unlockVault, signOut, failedAttempts, isLocked } = useVault();
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const success = await unlockVault(masterPassword);
    if (!success) {
      if (isLocked) {
        setError("Temporarily locked due to too many failed attempts.");
      } else {
        setError("Incorrect master password.");
      }
      setMasterPassword("");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Lock className="mx-auto mb-2 h-10 w-10 text-primary" />
          <CardTitle>Vault Locked</CardTitle>
          <CardDescription>Enter your master password to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUnlock} className="space-y-4">
            <Input
              type="password"
              placeholder="Master password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              required
              autoComplete="off"
              disabled={isLocked}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading || isLocked}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unlock
            </Button>
            <Button variant="ghost" className="w-full" onClick={signOut}>
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

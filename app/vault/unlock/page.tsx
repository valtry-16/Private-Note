"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, AlertTriangle, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVault } from "@/hooks/use-vault";

export default function UnlockPage() {
  const router = useRouter();
  const { isAuthenticated, isVaultUnlocked, unlockVault, signOut, failedAttempts, isLocked } = useVault();
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  if (isVaultUnlocked) {
    router.push("/vault");
    return null;
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const success = await unlockVault(masterPassword);
    if (success) {
      router.push("/vault");
    } else {
      if (isLocked) {
        setError("Too many failed attempts. Access temporarily locked for 5 minutes.");
      } else {
        setError(`Incorrect master password. ${5 - failedAttempts - 1} attempts remaining.`);
      }
      setMasterPassword("");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Unlock Your Vault</CardTitle>
          <CardDescription>Enter your master password to decrypt your data</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="masterPassword">Master Password</Label>
              <div className="relative">
                <Input
                  id="masterPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your master password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  required
                  autoComplete="off"
                  disabled={isLocked}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {isLocked && (
              <div className="rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
                <div className="flex items-center gap-2 font-medium">
                  <Shield className="h-4 w-4" />
                  Temporarily Locked
                </div>
                <p className="mt-1 text-xs">
                  Too many incorrect attempts. Please wait 5 minutes before trying again.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || isLocked}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unlock Vault
            </Button>
          </form>

          <Button
            variant="ghost"
            className="mt-4 w-full text-muted-foreground"
            onClick={signOut}
          >
            Sign out and use a different account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

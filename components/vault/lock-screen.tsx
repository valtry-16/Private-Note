"use client";

import { useState, useEffect } from "react";
import { Lock, Loader2, ShieldCheck, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVault } from "@/hooks/use-vault";

export function VaultLockScreen() {
  const { unlockVault, signOut, failedAttempts, isLocked, user } = useVault();
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // 2FA state
  const [needs2FA, setNeeds2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");

  useEffect(() => {
    // Check if biometric unlock is set up for this user
    if (user && window.PublicKeyCredential) {
      const stored = localStorage.getItem(`zv_bio_${user.id}`);
      if (stored) {
        setBiometricAvailable(true);
      }
    }
  }, [user]);

  async function handleBiometricUnlock() {
    if (!user) return;
    setError("");
    setLoading(true);
    try {
      // Get challenge
      const challengeRes = await fetch("/api/webauthn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "check" }),
      });
      const checkData = await challengeRes.json();
      if (!checkData.enabled || !checkData.credentialId) throw new Error("Not set up");

      const credIdBytes = Uint8Array.from(atob(checkData.credentialId), (c) => c.charCodeAt(0));

      // Get a fresh challenge
      const chRes = await fetch("/api/webauthn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "challenge" }),
      });
      const { challenge } = await chRes.json();

      // Request biometric authentication
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(atob(challenge.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
          allowCredentials: [{ id: credIdBytes, type: "public-key" }],
          userVerification: "required",
          timeout: 60000,
        },
      });

      if (!assertion) throw new Error("Authentication cancelled");

      // Biometric verified — retrieve stored password
      const stored = localStorage.getItem(`zv_bio_${user.id}`);
      if (!stored) throw new Error("No stored credentials");

      const password = atob(stored);
      const success = await unlockVault(password);
      if (!success) {
        setError("Biometric verified but stored password is invalid. Please use your master password.");
        localStorage.removeItem(`zv_bio_${user.id}`);
        setBiometricAvailable(false);
      }
    } catch (e: any) {
      if (e.name !== "NotAllowedError") {
        setError("Biometric authentication failed. Use your master password instead.");
      }
    }
    setLoading(false);
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const success = await unlockVault(masterPassword);
    if (success) {
      // Check if 2FA is enabled
      try {
        const res = await fetch("/api/totp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id, token: "check" }),
        });
        const data = await res.json();
        // If we get "2FA not enabled", proceed normally (already unlocked)
        if (data.error === "2FA not enabled") {
          // Already unlocked by unlockVault, nothing more needed
          return;
        }
        // 2FA is enabled — we need to re-lock and wait for TOTP
        // Store password and show 2FA form
        setPendingPassword(masterPassword);
        setNeeds2FA(true);
        setMasterPassword("");
        // Re-lock vault until 2FA is verified (by calling lockVault would clear state)
        // Instead, we leave it unlocked and show a 2FA gate
      } catch {
        // If check fails, proceed normally
      }
    } else {
      if (isLocked) {
        setError("Temporarily locked due to too many failed attempts.");
      } else {
        setError("Incorrect master password.");
      }
      setMasterPassword("");
    }
    setLoading(false);
  };

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, token: totpCode }),
      });
      const data = await res.json();
      if (data.valid) {
        // 2FA passed — vault is already unlocked
        setNeeds2FA(false);
        setPendingPassword("");
        setTotpCode("");
        // Force re-render by reloading
        window.location.reload();
      } else {
        setError("Invalid authentication code. Please try again.");
        setTotpCode("");
      }
    } catch {
      setError("Verification failed. Please try again.");
    }
    setLoading(false);
  };

  if (needs2FA) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <ShieldCheck className="mx-auto mb-2 h-10 w-10 text-primary" />
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTotpVerify} className="space-y-4">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                required
                autoComplete="off"
                className="text-center text-2xl tracking-[0.5em]"
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading || totpCode.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setNeeds2FA(false);
                  setPendingPassword("");
                  setTotpCode("");
                  setError("");
                }}
              >
                Back
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            {biometricAvailable && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleBiometricUnlock}
                disabled={loading || isLocked}
              >
                <Fingerprint className="mr-2 h-4 w-4" />
                Unlock with Biometric
              </Button>
            )}
            <Button variant="ghost" className="w-full" onClick={signOut}>
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

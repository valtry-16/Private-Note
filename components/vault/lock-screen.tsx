"use client";

import { useState, useEffect } from "react";
import { Lock, Loader2, ShieldCheck, Fingerprint, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVault } from "@/hooks/use-vault";

export function VaultLockScreen() {
  const {
    unlockVault,
    signOut,
    failedAttempts,
    isLocked,
    user,
    needs2FA,
    verify2FA,
    cancel2FA,
    recoverWithKey,
  } = useVault();
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 2FA state
  const [totpCode, setTotpCode] = useState("");

  // Recovery state
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");

  useEffect(() => {
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
      const challengeRes = await fetch("/api/webauthn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "check" }),
      });
      const checkData = await challengeRes.json();
      if (!checkData.enabled || !checkData.credentialId) throw new Error("Not set up");

      const credIdBytes = Uint8Array.from(atob(checkData.credentialId), (c) => c.charCodeAt(0));

      const chRes = await fetch("/api/webauthn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "challenge" }),
      });
      const { challenge } = await chRes.json();

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(atob(challenge.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
          allowCredentials: [{ id: credIdBytes, type: "public-key" }],
          userVerification: "required",
          timeout: 60000,
        },
      });

      if (!assertion) throw new Error("Authentication cancelled");

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
    if (!success) {
      if (isLocked) {
        setError("Temporarily locked due to too many failed attempts.");
      } else {
        setError("Incorrect master password.");
      }
      setMasterPassword("");
    } else {
      setMasterPassword("");
    }
    setLoading(false);
  };

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const success = await verify2FA(totpCode);
    if (!success) {
      setError("Invalid authentication code. Please try again.");
      setTotpCode("");
    }
    setLoading(false);
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const success = await recoverWithKey(recoveryKey.trim());
    if (!success) {
      setError("Invalid recovery key. Please check and try again.");
    }
    setLoading(false);
  };

  // 2FA form
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
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || totpCode.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  cancel2FA();
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

  // Recovery key form
  if (showRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <KeyRound className="mx-auto mb-2 h-10 w-10 text-primary" />
            <CardTitle>Recovery Key</CardTitle>
            <CardDescription>
              Enter the recovery key you saved when creating your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRecover} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your recovery key"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                required
                autoComplete="off"
                className="font-mono text-sm"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !recoveryKey.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Recover Vault
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowRecovery(false);
                  setRecoveryKey("");
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

  // Master password form
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
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Master password"
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
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
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
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 text-xs"
                onClick={() => {
                  setShowRecovery(true);
                  setError("");
                }}
              >
                <KeyRound className="mr-1 h-3 w-3" />
                Forgot Password?
              </Button>
              <Button variant="ghost" className="flex-1 text-xs" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

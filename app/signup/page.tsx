"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, AlertTriangle, Loader2, Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/supabase/client";
import { generateVerificationToken, generateRecoveryKey, encrypt } from "@/encryption";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmMaster, setConfirmMaster] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showMaster, setShowMaster] = useState(false);
  const [showConfirmMaster, setShowConfirmMaster] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Account password must be at least 8 characters.");
      return;
    }
    if (masterPassword !== confirmMaster) {
      setError("Master passwords do not match.");
      return;
    }
    if (masterPassword.length < 12) {
      setError("Master password must be at least 12 characters for strong encryption.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const encryptedVerification = await generateVerificationToken(masterPassword);
        const recKey = generateRecoveryKey();
        const recoveryMaster = await encrypt(masterPassword, recKey);
        const encryptedRecoveryKey = await encrypt(recKey, masterPassword);

        const { error: profileError } = await supabase.from("user_profiles").insert({
          user_id: data.user.id,
          encrypted_verification: encryptedVerification,
          auto_lock_seconds: 60,
          recovery_master: recoveryMaster,
          encrypted_recovery_key: encryptedRecoveryKey,
        });

        if (profileError) {
          setError("Account created but profile setup failed. Please contact support.");
          setLoading(false);
          return;
        }

        await supabase.from("security_logs").insert({
          user_id: data.user.id,
          event_type: "account_created",
          user_agent: navigator.userAgent,
        });

        // Show recovery key before proceeding
        setRecoveryKey(recKey);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }
    setLoading(false);
  };

  function handleCopyRecovery() {
    navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleContinue() {
    router.refresh();
    router.push("/vault/unlock");
  }

  // Show recovery key after successful signup
  if (recoveryKey) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <Shield className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Save Your Recovery Key</CardTitle>
            <CardDescription>
              This is the <strong>only way</strong> to recover your vault if you forget your master
              password. Write it down and store it somewhere safe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/50 p-4">
              <p className="break-all text-center font-mono text-sm tracking-wider">
                {recoveryKey}
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleCopyRecovery}>
              {copied ? (
                <><Check className="mr-2 h-4 w-4" /> Copied!</>
              ) : (
                <><Copy className="mr-2 h-4 w-4" /> Copy Recovery Key</>
              )}
            </Button>
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
              <strong>Warning:</strong> This key will NOT be shown again. If you lose it and forget 
              your master password, your encrypted data cannot be recovered.
            </div>
            <Button className="w-full" onClick={handleContinue}>
              I&apos;ve Saved My Recovery Key — Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create Your Vault</CardTitle>
          <CardDescription>Set up your zero-knowledge encrypted vault</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Account Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Account Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter account password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>

            <div className="my-4 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                Master Password Warning
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Your master password encrypts all vault data. If you forget your master password,
                your encrypted data <strong>cannot be recovered</strong>. We do not store it and
                cannot reset it.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="masterPassword">Master Password</Label>
              <div className="relative">
                <Input
                  id="masterPassword"
                  type={showMaster ? "text" : "password"}
                  placeholder="Min 12 characters — used for encryption"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  required
                  autoComplete="off"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowMaster(!showMaster)}
                  tabIndex={-1}
                >
                  {showMaster ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmMaster">Confirm Master Password</Label>
              <div className="relative">
                <Input
                  id="confirmMaster"
                  type={showConfirmMaster ? "text" : "password"}
                  placeholder="Re-enter master password"
                  value={confirmMaster}
                  onChange={(e) => setConfirmMaster(e.target.value)}
                  required
                  autoComplete="off"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmMaster(!showConfirmMaster)}
                  tabIndex={-1}
                >
                  {showConfirmMaster ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Vault
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

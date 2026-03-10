"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/supabase/client";
import { generateVerificationToken } from "@/encryption";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmMaster, setConfirmMaster] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        const { error: profileError } = await supabase.from("user_profiles").insert({
          user_id: data.user.id,
          encrypted_verification: encryptedVerification,
          auto_lock_seconds: 60,
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

        // If session exists, user is auto-confirmed — go straight to unlock
        if (data.session) {
          router.refresh();
          router.push("/vault/unlock");
        } else {
          // Email confirmation required
          router.push("/login?registered=true");
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }
    setLoading(false);
  };

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
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Account Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter account password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
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
              <Input
                id="masterPassword"
                type="password"
                placeholder="Min 12 characters — used for encryption"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmMaster">Confirm Master Password</Label>
              <Input
                id="confirmMaster"
                type="password"
                placeholder="Re-enter master password"
                value={confirmMaster}
                onChange={(e) => setConfirmMaster(e.target.value)}
                required
                autoComplete="off"
              />
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

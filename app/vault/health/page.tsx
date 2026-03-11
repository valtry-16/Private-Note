"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Shield,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useVault } from "@/hooks/use-vault";
import { createClient } from "@/supabase/client";
import { decrypt, calculatePasswordStrength } from "@/encryption";
import { checkPasswordBreach } from "@/utils/breach-check";
import type { DecryptedPassword } from "@/types";

interface PasswordHealth {
  id: string;
  title: string;
  website: string;
  username: string;
  password: string;
  strength: { score: number; label: string; color: string };
  age: number; // days
  breached: boolean | null;
  breachCount: number;
  reusedWith: string[];
}

export default function PasswordHealthPage() {
  const { user, masterPassword } = useVault();
  const supabase = createClient();

  const [passwords, setPasswords] = useState<PasswordHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingBreaches, setCheckingBreaches] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const loadPasswords = useCallback(async () => {
    if (!user || !masterPassword) return;
    setLoading(true);

    const { data: items } = await supabase
      .from("vault_items")
      .select("id, encrypted_data, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("type", "password")
      .eq("is_deleted", false);

    if (!items) {
      setLoading(false);
      return;
    }

    const decrypted: PasswordHealth[] = [];
    for (const item of items) {
      try {
        const data = JSON.parse(
          await decrypt(item.encrypted_data, masterPassword)
        ) as DecryptedPassword;

        const age = Math.floor(
          (Date.now() - new Date(item.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        decrypted.push({
          id: item.id,
          title: data.title || data.website || "Untitled",
          website: data.website,
          username: data.username,
          password: data.password,
          strength: calculatePasswordStrength(data.password),
          age,
          breached: null,
          breachCount: 0,
          reusedWith: [],
        });
      } catch {
        // Skip
      }
    }

    // Find reused passwords
    const pwMap = new Map<string, string[]>();
    for (const pw of decrypted) {
      const existing = pwMap.get(pw.password) || [];
      existing.push(pw.title);
      pwMap.set(pw.password, existing);
    }
    for (const pw of decrypted) {
      const reused = pwMap.get(pw.password) || [];
      pw.reusedWith = reused.filter((t) => t !== pw.title);
    }

    setPasswords(decrypted);
    setLoading(false);
  }, [user, masterPassword]);

  useEffect(() => {
    loadPasswords();
  }, [loadPasswords]);

  async function checkAllBreaches() {
    setCheckingBreaches(true);
    const updated = [...passwords];

    for (let i = 0; i < updated.length; i++) {
      try {
        const count = await checkPasswordBreach(updated[i].password);
        updated[i].breached = count > 0;
        updated[i].breachCount = count;
      } catch {
        updated[i].breached = null;
      }
      // Rate limit: small delay between checks
      if (i < updated.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    setPasswords(updated);
    setCheckingBreaches(false);
  }

  const weakPasswords = passwords.filter((p) => p.strength.score <= 2);
  const reusedPasswords = passwords.filter((p) => p.reusedWith.length > 0);
  const oldPasswords = passwords.filter((p) => p.age > 180);
  const breachedPasswords = passwords.filter((p) => p.breached === true);

  const totalIssues = weakPasswords.length + reusedPasswords.length + oldPasswords.length + breachedPasswords.length;
  const healthScore = passwords.length > 0
    ? Math.max(0, Math.round(100 - (totalIssues / passwords.length) * 25))
    : 100;

  const healthColor =
    healthScore >= 80 ? "text-green-500" :
    healthScore >= 50 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Password Health</h1>
          <p className="text-sm text-muted-foreground">
            Analyze the strength and security of your passwords
          </p>
        </div>
        <Button
          variant="outline"
          onClick={checkAllBreaches}
          disabled={checkingBreaches || loading}
        >
          {checkingBreaches ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Shield className="mr-2 h-4 w-4" />
          )}
          Check for Breaches
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <>
          {/* Health Score */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className={`text-5xl font-bold ${healthColor}`}>
                  {healthScore}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold">
                    {healthScore >= 80 ? "Good" : healthScore >= 50 ? "Needs Improvement" : "Critical"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {passwords.length} passwords analyzed, {totalIssues} issue(s) found
                  </p>
                  <Progress value={healthScore} className="mt-2 h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{weakPasswords.length}</p>
                    <p className="text-xs text-muted-foreground">Weak</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                    <Copy className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reusedPasswords.length}</p>
                    <p className="text-xs text-muted-foreground">Reused</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
                    <RefreshCw className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{oldPasswords.length}</p>
                    <p className="text-xs text-muted-foreground">Old (&gt;180d)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                    <Shield className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{breachedPasswords.length}</p>
                    <p className="text-xs text-muted-foreground">Breached</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Password List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Passwords</CardTitle>
            </CardHeader>
            <CardContent>
              {passwords.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No passwords to analyze
                </p>
              ) : (
                <div className="space-y-3">
                  {passwords.map((pw) => {
                    const issues: string[] = [];
                    if (pw.strength.score <= 2) issues.push("Weak");
                    if (pw.reusedWith.length > 0) issues.push("Reused");
                    if (pw.age > 180) issues.push("Old");
                    if (pw.breached) issues.push("Breached");

                    return (
                      <div
                        key={pw.id}
                        className="flex items-center gap-4 rounded-md border p-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                          <Key className="h-5 w-5 text-green-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{pw.title}</p>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <Badge
                              variant="secondary"
                              className={pw.strength.color.replace("bg-", "text-").replace("500", "600")}
                            >
                              {pw.strength.label}
                            </Badge>
                            {pw.reusedWith.length > 0 && (
                              <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                                Reused ({pw.reusedWith.length + 1}x)
                              </Badge>
                            )}
                            {pw.age > 180 && (
                              <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                                {pw.age}d old
                              </Badge>
                            )}
                            {pw.breached && (
                              <Badge variant="destructive">
                                Breached ({pw.breachCount.toLocaleString()}x)
                              </Badge>
                            )}
                            {pw.breached === false && (
                              <Badge variant="outline" className="text-green-500 border-green-500/30">
                                <Check className="mr-1 h-3 w-3" /> Safe
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Progress
                            value={(pw.strength.score / 7) * 100}
                            className="h-1.5 w-16"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

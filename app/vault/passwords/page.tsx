"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Key,
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Edit3,
  Star,
  Globe,
  AlertTriangle,
  RefreshCw,
  Shield,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useVaultItems } from "@/hooks/use-vault-items";
import { useSearch } from "@/hooks/use-search";
import { useVault } from "@/hooks/use-vault";
import { useClipboard } from "@/hooks/use-clipboard";
import { createClient } from "@/supabase/client";
import { encrypt, decrypt, generatePassword, calculatePasswordStrength } from "@/encryption";
import { checkPasswordBreach } from "@/utils/breach-check";
import type { DecryptedPassword } from "@/types";

export default function PasswordsPage() {
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "true";
  const router = useRouter();
  const { user, masterPassword } = useVault();
  const { copyToClipboard } = useClipboard();
  const { items, loading, refetch } = useVaultItems("password");
  const { query, setQuery, filteredItems } = useSearch(items);
  const supabase = createClient();

  const [dialogOpen, setDialogOpen] = useState(isNew);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DecryptedPassword>({
    title: "",
    website: "",
    username: "",
    password: "",
    notes: "",
  });
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [decryptedPasswords, setDecryptedPasswords] = useState<
    Record<string, DecryptedPassword>
  >({});
  const [saving, setSaving] = useState(false);
  const [breachCount, setBreachCount] = useState<number | null>(null);
  const [checkingBreach, setCheckingBreach] = useState(false);

  // Password generator settings
  const [genLength, setGenLength] = useState(20);
  const [genUppercase, setGenUppercase] = useState(true);
  const [genLowercase, setGenLowercase] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);

  const passwordStrength = calculatePasswordStrength(formData.password);

  async function loadPassword(id: string) {
    if (decryptedPasswords[id]) return decryptedPasswords[id];
    
    const { data } = await supabase
      .from("vault_items")
      .select("encrypted_data")
      .eq("id", id)
      .single();

    if (data && masterPassword) {
      try {
        const decrypted = JSON.parse(
          await decrypt(data.encrypted_data, masterPassword)
        ) as DecryptedPassword;
        setDecryptedPasswords((prev) => ({ ...prev, [id]: decrypted }));
        return decrypted;
      } catch {
        return null;
      }
    }
    return null;
  }

  async function handleSave() {
    if (!user || !masterPassword) return;
    setSaving(true);

    const encryptedData = await encrypt(JSON.stringify(formData), masterPassword);
    const encryptedTitle = await encrypt(
      formData.title || formData.website,
      masterPassword
    );

    if (editingId) {
      await supabase
        .from("vault_items")
        .update({
          encrypted_data: encryptedData,
          metadata: { encrypted_title: encryptedTitle },
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);
      setDecryptedPasswords((prev) => ({ ...prev, [editingId]: formData }));
    } else {
      await supabase.from("vault_items").insert({
        user_id: user.id,
        type: "password",
        encrypted_data: encryptedData,
        metadata: { encrypted_title: encryptedTitle },
      });
    }

    resetForm();
    refetch();
  }

  function resetForm() {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({ title: "", website: "", username: "", password: "", notes: "" });
    setBreachCount(null);
    if (isNew) router.replace("/vault/passwords");
  }

  async function handleEdit(id: string) {
    const pw = await loadPassword(id);
    if (pw) {
      setFormData(pw);
      setEditingId(id);
      setDialogOpen(true);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("vault_items").delete().eq("id", id);
    setDecryptedPasswords((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    refetch();
  }

  async function toggleHidden(id: string) {
    await supabase.from("vault_items").update({ is_hidden: true, updated_at: new Date().toISOString() }).eq("id", id);
    refetch();
  }

  async function handleGeneratePassword() {
    const pw = generatePassword(genLength, {
      uppercase: genUppercase,
      lowercase: genLowercase,
      numbers: genNumbers,
      symbols: genSymbols,
    });
    setFormData((f) => ({ ...f, password: pw }));
  }

  async function handleCheckBreach() {
    if (!formData.password) return;
    setCheckingBreach(true);
    const count = await checkPasswordBreach(formData.password);
    setBreachCount(count);
    setCheckingBreach(false);
  }

  function togglePasswordVisibility(id: string) {
    const willShow = !showPasswords[id];
    setShowPasswords((prev) => ({ ...prev, [id]: willShow }));
    if (willShow) {
      loadPassword(id);
    } else {
      setDecryptedPasswords((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  async function handleCopyPassword(id: string) {
    const pw = await loadPassword(id);
    if (pw) {
      await copyToClipboard(pw.password);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Password Vault</h1>
          <p className="text-sm text-muted-foreground">
            All passwords are encrypted with AES-256-GCM
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Password
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search passwords..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Password List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Key className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {query ? "No matching passwords" : "No passwords saved yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems
            .filter((i) => !i.is_hidden)
            .map((item) => {
              const pw = decryptedPasswords[item.id];
              const isVisible = showPasswords[item.id];

              return (
                <Card key={item.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                        <Globe className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.title}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePasswordVisibility(item.id)}
                        >
                          {isVisible ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyPassword(item.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item.id)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Hide"
                          onClick={() => toggleHidden(item.id)}
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {isVisible && pw && (
                      <div className="mt-3 ml-14 space-y-2 rounded-md bg-muted/50 p-3 text-sm">
                        {pw.username && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="text-muted-foreground text-xs uppercase tracking-wide shrink-0 w-20">Username</span>
                            <span className="truncate">{pw.username}</span>
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="text-muted-foreground text-xs uppercase tracking-wide shrink-0 w-20">Password</span>
                          <span className="font-mono break-all">{pw.password}</span>
                        </div>
                        {pw.website && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="text-muted-foreground text-xs uppercase tracking-wide shrink-0 w-20">Website</span>
                            <span className="truncate">{pw.website}</span>
                          </div>
                        )}
                        {pw.notes && (
                          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                            <span className="text-muted-foreground text-xs uppercase tracking-wide shrink-0 w-20">Notes</span>
                            <span className="whitespace-pre-wrap">{pw.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Password" : "Add Password"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g. Gmail, Netflix"
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                placeholder="https://example.com"
                value={formData.website}
                onChange={(e) => setFormData((f) => ({ ...f, website: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Username / Email</Label>
              <Input
                placeholder="user@example.com"
                value={formData.username}
                onChange={(e) => setFormData((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  className="font-mono"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGeneratePassword}
                  title="Generate password"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(passwordStrength.score / 7) * 100}
                      className="h-2 flex-1"
                    />
                    <Badge
                      variant="secondary"
                      className={passwordStrength.color.replace("bg-", "text-").replace("500", "600")}
                    >
                      {passwordStrength.label}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={handleCheckBreach}
                    disabled={checkingBreach}
                  >
                    {checkingBreach ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Shield className="mr-1 h-3 w-3" />
                    )}
                    Check if password has been breached
                  </Button>
                  {breachCount !== null && (
                    <div
                      className={`flex items-center gap-2 rounded-md p-2 text-xs ${
                        breachCount > 0
                          ? "bg-destructive/10 text-destructive"
                          : "bg-green-500/10 text-green-600"
                      }`}
                    >
                      {breachCount > 0 ? (
                        <>
                          <AlertTriangle className="h-3 w-3" />
                          Found in {breachCount.toLocaleString()} data breaches. Choose a different password.
                        </>
                      ) : (
                        <>
                          <Shield className="h-3 w-3" />
                          No breaches found for this password.
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Password Generator Settings */}
            <div className="rounded-md border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Generator Settings</p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Length: {genLength}</Label>
                  <input
                    type="range"
                    min={8}
                    max={64}
                    value={genLength}
                    onChange={(e) => setGenLength(Number(e.target.value))}
                    className="w-20"
                  />
                </div>
                <label className="flex items-center gap-1 text-xs">
                  <Switch
                    checked={genUppercase}
                    onCheckedChange={setGenUppercase}
                    className="scale-75"
                  />
                  ABC
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <Switch
                    checked={genLowercase}
                    onCheckedChange={setGenLowercase}
                    className="scale-75"
                  />
                  abc
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <Switch
                    checked={genNumbers}
                    onCheckedChange={setGenNumbers}
                    className="scale-75"
                  />
                  123
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <Switch
                    checked={genSymbols}
                    onCheckedChange={setGenSymbols}
                    className="scale-75"
                  />
                  !@#
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

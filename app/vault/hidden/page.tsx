"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  FileText,
  Key,
  Upload,
  User,
  Trash2,
  Settings,
  Loader2,
  Undo2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVault } from "@/hooks/use-vault";
import { useVaultItems } from "@/hooks/use-vault-items";
import { createClient } from "@/supabase/client";
import { decrypt } from "@/encryption";
import type {
  DecryptedNote,
  DecryptedPassword,
  DecryptedDocument,
  DecryptedPersonalInfo,
} from "@/types/database";

const typeIcons: Record<string, typeof FileText> = {
  note: FileText,
  password: Key,
  document: Upload,
  personal: User,
};

const typeLabels: Record<string, string> = {
  note: "Note",
  password: "Password",
  document: "Document",
  personal: "Personal Info",
};

type DecryptedContent =
  | { type: "note"; data: DecryptedNote }
  | { type: "password"; data: DecryptedPassword }
  | { type: "document"; data: DecryptedDocument }
  | { type: "personal"; data: DecryptedPersonalInfo };

export default function HiddenVaultPage() {
  const router = useRouter();
  const {
    masterPassword,
    isHiddenVaultSetup,
    isHiddenVaultUnlocked,
    unlockHiddenVault,
    lockHiddenVault,
  } = useVault();
  const { items, refetch } = useVaultItems();
  const supabase = createClient();

  const [passcode, setPasscode] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);

  // Content viewing state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<Record<string, DecryptedContent>>({});
  const [loadingContent, setLoadingContent] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string>("");
  const [showPasswordFields, setShowPasswordFields] = useState<Record<string, boolean>>({});

  const hiddenItems = items.filter((i) => i.is_hidden);

  async function handleUnlock() {
    setError("");
    setUnlocking(true);
    const success = await unlockHiddenVault(passcode);
    if (!success) {
      setError("Incorrect passcode");
    }
    setPasscode("");
    setUnlocking(false);
  }

  async function loadContent(itemId: string, itemType: string) {
    if (decryptedContent[itemId]) {
      setExpandedId(expandedId === itemId ? null : itemId);
      return;
    }
    if (!masterPassword) return;
    setLoadingContent(itemId);
    try {
      const { data } = await supabase
        .from("vault_items")
        .select("encrypted_data, type")
        .eq("id", itemId)
        .single();
      if (data) {
        const decrypted = JSON.parse(await decrypt(data.encrypted_data, masterPassword));
        setDecryptedContent((prev) => ({
          ...prev,
          [itemId]: { type: data.type, data: decrypted },
        }));
        setExpandedId(itemId);
      }
    } catch {
      setError("Failed to decrypt item");
    }
    setLoadingContent(null);
  }

  async function unhideItem(id: string) {
    await supabase
      .from("vault_items")
      .update({ is_hidden: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    setDecryptedContent((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (expandedId === id) setExpandedId(null);
    refetch();
  }

  async function deleteItem(id: string) {
    await supabase.from("vault_items").delete().eq("id", id);
    setDecryptedContent((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (expandedId === id) setExpandedId(null);
    refetch();
  }

  function copyToClipboard(text: string, fieldKey: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(""), 2000);
  }

  function togglePasswordVisibility(key: string) {
    setShowPasswordFields((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Not set up yet
  if (!isHiddenVaultSetup) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <EyeOff className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
            <CardTitle>Hidden Vault Not Set Up</CardTitle>
            <CardDescription>
              You need to create a hidden vault passcode first. Go to Settings &gt; Advanced to set
              it up.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => router.push("/vault/settings")}>
              <Settings className="mr-2 h-4 w-4" /> Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Locked — show passcode entry
  if (!isHiddenVaultUnlocked) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Lock className="mx-auto mb-2 h-12 w-12 text-primary" />
            <CardTitle>Hidden Vault</CardTitle>
            <CardDescription>Enter your hidden vault passcode to reveal hidden items</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUnlock();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="passcode">Passcode</Label>
                <div className="relative">
                  <Input
                    id="passcode"
                    type={showPasscode ? "text" : "password"}
                    placeholder="Enter passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    autoComplete="off"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPasscode(!showPasscode)}
                    tabIndex={-1}
                  >
                    {showPasscode ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={!passcode || unlocking}>
                {unlocking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unlock className="mr-2 h-4 w-4" />
                )}
                Unlock
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render decrypted content based on type
  function renderContent(itemId: string) {
    const content = decryptedContent[itemId];
    if (!content) return null;

    switch (content.type) {
      case "note": {
        const note = content.data as DecryptedNote;
        return (
          <div className="space-y-2 pt-3">
            <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
              {note.content || "No content"}
            </div>
          </div>
        );
      }
      case "password": {
        const pw = content.data as DecryptedPassword;
        const pwKey = `${itemId}-password`;
        return (
          <div className="space-y-3 pt-3">
            {pw.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{pw.website}</span>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md bg-muted/50 p-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Username</p>
                  <p className="truncate text-sm font-mono">{pw.username}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => copyToClipboard(pw.username, `${itemId}-user`)}
                >
                  {copiedField === `${itemId}-user` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-md bg-muted/50 p-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Password</p>
                  <p className="truncate text-sm font-mono">
                    {showPasswordFields[pwKey] ? pw.password : "••••••••••"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => togglePasswordVisibility(pwKey)}
                  >
                    {showPasswordFields[pwKey] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => copyToClipboard(pw.password, `${itemId}-pass`)}
                  >
                    {copiedField === `${itemId}-pass` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>
            {pw.notes && (
              <p className="text-xs text-muted-foreground">{pw.notes}</p>
            )}
          </div>
        );
      }
      case "document": {
        const doc = content.data as DecryptedDocument;
        return (
          <div className="space-y-2 pt-3">
            <div className="rounded-md bg-muted/50 p-2 text-sm">
              <p><span className="text-muted-foreground">File:</span> {doc.fileName}</p>
              <p><span className="text-muted-foreground">Type:</span> {doc.fileType}</p>
              <p><span className="text-muted-foreground">Size:</span> {(doc.fileSize / 1024).toFixed(1)} KB</p>
            </div>
            {doc.notes && <p className="text-xs text-muted-foreground">{doc.notes}</p>}
          </div>
        );
      }
      case "personal": {
        const info = content.data as DecryptedPersonalInfo;
        return (
          <div className="space-y-2 pt-3">
            <Badge variant="secondary" className="text-[10px]">{info.category}</Badge>
            <div className="space-y-1">
              {info.fields.map((field, i) => {
                const fKey = `${itemId}-field-${i}`;
                return (
                  <div key={i} className="flex items-center justify-between rounded-md bg-muted/50 p-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{field.label}</p>
                      <p className="truncate text-sm font-mono">
                        {showPasswordFields[fKey] ? field.value : "••••••••"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePasswordVisibility(fKey)}>
                        {showPasswordFields[fKey] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(field.value, fKey)}>
                        {copiedField === fKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {info.notes && <p className="text-xs text-muted-foreground">{info.notes}</p>}
          </div>
        );
      }
      default:
        return null;
    }
  }

  // Unlocked — show hidden items
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <EyeOff className="h-6 w-6" /> Hidden Vault
          </h1>
          <p className="text-sm text-muted-foreground">
            {hiddenItems.length} hidden item{hiddenItems.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" onClick={lockHiddenVault}>
          <Lock className="mr-2 h-4 w-4" /> Lock
        </Button>
      </div>

      {hiddenItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <EyeOff className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No hidden items yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use the ⋮ menu on any item in your vault to hide it here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {hiddenItems.map((item) => {
            const Icon = typeIcons[item.type] || FileText;
            const isExpanded = expandedId === item.id;
            const isLoading = loadingContent === item.id;
            return (
              <Card key={item.id} className="transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => loadContent(item.id, item.type)}
                    >
                      <p className="truncate font-medium">{item.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px]">
                          {typeLabels[item.type]}
                        </Badge>
                        <span>{new Date(item.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="View content"
                        onClick={() => loadContent(item.id, item.type)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Move back to main vault"
                        onClick={() => unhideItem(item.id)}
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        title="Delete"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {isExpanded && renderContent(item.id)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

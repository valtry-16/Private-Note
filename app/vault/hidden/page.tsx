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
  Star,
  Trash2,
  Settings,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVault } from "@/hooks/use-vault";
import { useVaultItems } from "@/hooks/use-vault-items";
import { createClient } from "@/supabase/client";
import { cn } from "@/lib/utils";

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

const typeRoutes: Record<string, string> = {
  note: "notes",
  password: "passwords",
  document: "documents",
  personal: "personal",
};

export default function HiddenVaultPage() {
  const router = useRouter();
  const {
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

  async function unhideItem(id: string) {
    await supabase
      .from("vault_items")
      .update({ is_hidden: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    refetch();
  }

  async function deleteItem(id: string) {
    await supabase.from("vault_items").delete().eq("id", id);
    refetch();
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
                <Input
                  id="passcode"
                  type="password"
                  placeholder="Enter passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  autoFocus
                  autoComplete="off"
                />
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
              Use the eye icon on any item in your vault to move it here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {hiddenItems.map((item) => {
            const Icon = typeIcons[item.type] || FileText;
            return (
              <Card key={item.id} className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() =>
                      router.push(`/vault/${typeRoutes[item.type]}?id=${item.id}`)
                    }
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
                      title="Unhide — move back to main vault"
                      onClick={() => unhideItem(item.id)}
                    >
                      <Eye className="h-4 w-4" />
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

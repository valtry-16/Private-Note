"use client";

import { useState } from "react";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  FileText,
  Key,
  Upload,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useVaultItems } from "@/hooks/use-vault-items";
import { useVault } from "@/hooks/use-vault";
import { createClient } from "@/supabase/client";
import type { VaultItemType } from "@/types";

const typeIcons: Record<VaultItemType, any> = {
  note: FileText,
  password: Key,
  document: Upload,
  personal: User,
};

const typeColors: Record<VaultItemType, string> = {
  note: "bg-blue-500/10 text-blue-500",
  password: "bg-green-500/10 text-green-500",
  document: "bg-purple-500/10 text-purple-500",
  personal: "bg-orange-500/10 text-orange-500",
};

export default function TrashPage() {
  const { user } = useVault();
  const { items, loading, refetch } = useVaultItems();
  const supabase = createClient();
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [emptyingTrash, setEmptyingTrash] = useState(false);

  const deletedItems = items.filter((i) => i.is_deleted);

  async function handleRestore(id: string) {
    setRestoring(id);
    await supabase
      .from("vault_items")
      .update({ is_deleted: false, deleted_at: null, updated_at: new Date().toISOString() })
      .eq("id", id);
    refetch();
    setRestoring(null);
  }

  async function handlePermanentDelete(id: string) {
    setDeleting(id);
    // Also delete from storage if it's a document
    const { data: item } = await supabase
      .from("vault_items")
      .select("metadata, type")
      .eq("id", id)
      .single();

    if (item?.type === "document") {
      const metadata = item.metadata as any;
      if (metadata?.file_path) {
        await supabase.storage.from("vault-documents").remove([metadata.file_path]);
      }
    }

    await supabase.from("vault_items").delete().eq("id", id);
    refetch();
    setDeleting(null);
  }

  async function handleEmptyTrash() {
    if (!user) return;
    setEmptyingTrash(true);

    // Delete storage files for documents
    for (const item of deletedItems) {
      if (item.type === "document") {
        const { data } = await supabase
          .from("vault_items")
          .select("metadata")
          .eq("id", item.id)
          .single();
        const metadata = data?.metadata as any;
        if (metadata?.file_path) {
          await supabase.storage.from("vault-documents").remove([metadata.file_path]);
        }
      }
    }

    await supabase
      .from("vault_items")
      .delete()
      .eq("user_id", user.id)
      .eq("is_deleted", true);

    refetch();
    setEmptyingTrash(false);
  }

  function getDaysRemaining(deletedAt: string | null) {
    if (!deletedAt) return 30;
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const remaining = Math.ceil((expiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, remaining);
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Trash</h1>
          <p className="text-sm text-muted-foreground">
            Items are permanently deleted after 30 days
          </p>
        </div>
        {deletedItems.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={emptyingTrash}>
                {emptyingTrash && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                <Trash2 className="mr-1 h-4 w-4" /> Empty Trash
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Empty Trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {deletedItems.length} item(s). This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleEmptyTrash}>
                  Delete Permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : deletedItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Trash2 className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Trash is empty</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {deletedItems.map((item) => {
            const Icon = typeIcons[item.type];
            const color = typeColors[item.type];
            const daysLeft = getDaysRemaining(item.deleted_at);

            return (
              <Card key={item.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{item.type}</span>
                        <span>•</span>
                        <span className={daysLeft <= 7 ? "text-destructive" : ""}>
                          {daysLeft} days remaining
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(item.id)}
                        disabled={restoring === item.id}
                      >
                        {restoring === item.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-1 h-3 w-3" />
                        )}
                        Restore
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            disabled={deleting === item.id}
                          >
                            {deleting === item.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="mr-1 h-3 w-3" />
                            )}
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
                            <AlertDialogDescription>
                              &quot;{item.title}&quot; will be permanently deleted. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handlePermanentDelete(item.id)}>
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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

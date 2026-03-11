"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderClosed,
  FolderOpen,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  FileText,
  Key,
  Upload,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useVault } from "@/hooks/use-vault";
import { useVaultItems } from "@/hooks/use-vault-items";
import { createClient } from "@/supabase/client";
import type { VaultItemType } from "@/types";

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
}

const typeIcons: Record<VaultItemType, any> = {
  note: FileText,
  password: Key,
  document: Upload,
  personal: User,
};

export default function FoldersPage() {
  const { user } = useVault();
  const { items } = useVaultItems();
  const supabase = createClient();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("folders")
      .select("id, name, parent_id")
      .eq("user_id", user.id)
      .order("name");
    setFolders((data as Folder[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  async function handleSave() {
    if (!user || !folderName.trim()) return;
    setSaving(true);

    if (editingId) {
      await supabase
        .from("folders")
        .update({ name: folderName.trim() })
        .eq("id", editingId);
    } else {
      await supabase.from("folders").insert({
        user_id: user.id,
        name: folderName.trim(),
      });
    }

    setDialogOpen(false);
    setEditingId(null);
    setFolderName("");
    setSaving(false);
    loadFolders();
  }

  async function handleDelete(folderId: string) {
    // Unassign items from this folder first
    await supabase
      .from("vault_items")
      .update({ folder_id: null })
      .eq("folder_id", folderId);

    await supabase.from("folders").delete().eq("id", folderId);
    loadFolders();
  }

  function handleEdit(folder: Folder) {
    setEditingId(folder.id);
    setFolderName(folder.name);
    setDialogOpen(true);
  }

  const activeItems = items.filter((i) => !i.is_deleted && !i.is_hidden);

  function getItemsInFolder(folderId: string) {
    return activeItems.filter((i) => i.folder_id === folderId);
  }

  const unfolderedItems = activeItems.filter((i) => !i.folder_id);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Folders</h1>
          <p className="text-sm text-muted-foreground">
            Organize your vault items into folders
          </p>
        </div>
        <Button onClick={() => { setEditingId(null); setFolderName(""); setDialogOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> New Folder
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {folders.map((folder) => {
            const folderItems = getItemsInFolder(folder.id);
            const isExpanded = expandedFolder === folder.id;

            return (
              <Card key={folder.id}>
                <CardContent className="p-0">
                  <div
                    className="flex cursor-pointer items-center gap-3 p-4"
                    onClick={() => setExpandedFolder(isExpanded ? null : folder.id)}
                  >
                    {isExpanded ? (
                      <FolderOpen className="h-5 w-5 text-primary" />
                    ) : (
                      <FolderClosed className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{folder.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {folderItems.length} item(s)
                      </p>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(folder)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(folder.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {isExpanded && folderItems.length > 0 && (
                    <div className="border-t px-4 py-2">
                      {folderItems.map((item) => {
                        const Icon = typeIcons[item.type];
                        return (
                          <div key={item.id} className="flex items-center gap-3 py-2 text-sm">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{item.title}</span>
                            <span className="ml-auto text-xs capitalize text-muted-foreground">{item.type}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {isExpanded && folderItems.length === 0 && (
                    <div className="border-t px-4 py-4 text-center text-sm text-muted-foreground">
                      No items in this folder
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Unfoldered items */}
          {unfolderedItems.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div
                  className="flex cursor-pointer items-center gap-3 p-4"
                  onClick={() => setExpandedFolder(expandedFolder === "__none" ? null : "__none")}
                >
                  <FolderClosed className="h-5 w-5 text-muted-foreground opacity-50" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-muted-foreground">Unorganized</p>
                    <p className="text-xs text-muted-foreground">
                      {unfolderedItems.length} item(s) without a folder
                    </p>
                  </div>
                </div>
                {expandedFolder === "__none" && (
                  <div className="border-t px-4 py-2">
                    {unfolderedItems.slice(0, 20).map((item) => {
                      const Icon = typeIcons[item.type];
                      return (
                        <div key={item.id} className="flex items-center gap-3 py-2 text-sm">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{item.title}</span>
                          <span className="ml-auto text-xs capitalize text-muted-foreground">{item.type}</span>
                        </div>
                      );
                    })}
                    {unfolderedItems.length > 20 && (
                      <p className="py-2 text-xs text-muted-foreground">
                        ...and {unfolderedItems.length - 20} more
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {folders.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <FolderClosed className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No folders yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditingId(null); setFolderName(""); setDialogOpen(true); }}
                >
                  <Plus className="mr-1 h-4 w-4" /> Create your first folder
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create/Edit Folder Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditingId(null); setFolderName(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Rename Folder" : "New Folder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Folder name</Label>
              <Input
                placeholder="e.g. Work, Personal, Finance"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !folderName.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Rename" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

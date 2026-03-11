"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Tag,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  FileText,
  Key,
  Upload,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface TagItem {
  id: string;
  name: string;
  color: string;
}

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

const tagColors = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4",
];

export default function TagsPage() {
  const { user } = useVault();
  const { items } = useVaultItems();
  const supabase = createClient();

  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(tagColors[0]);
  const [saving, setSaving] = useState(false);
  const [expandedTag, setExpandedTag] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("tags")
      .select("id, name, color")
      .eq("user_id", user.id)
      .order("name");
    setTags((data as TagItem[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  async function handleSave() {
    if (!user || !tagName.trim()) return;
    setSaving(true);

    if (editingId) {
      await supabase
        .from("tags")
        .update({ name: tagName.trim(), color: tagColor })
        .eq("id", editingId);
    } else {
      await supabase.from("tags").insert({
        user_id: user.id,
        name: tagName.trim(),
        color: tagColor,
      });
    }

    setDialogOpen(false);
    setEditingId(null);
    setTagName("");
    setTagColor(tagColors[0]);
    setSaving(false);
    loadTags();
  }

  async function handleDelete(tagId: string) {
    await supabase.from("item_tags").delete().eq("tag_id", tagId);
    await supabase.from("tags").delete().eq("id", tagId);
    if (expandedTag === tagId) setExpandedTag(null);
    loadTags();
  }

  function handleEdit(tag: TagItem) {
    setEditingId(tag.id);
    setTagName(tag.name);
    setTagColor(tag.color);
    setDialogOpen(true);
  }

  function getItemsForTag(tagName: string) {
    return items.filter((i) => !i.is_deleted && i.tags.includes(tagName));
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tags</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage tags to categorize your vault items
          </p>
        </div>
        <Button onClick={() => { setEditingId(null); setTagName(""); setTagColor(tagColors[0]); setDialogOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> New Tag
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Tag className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No tags yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setEditingId(null); setTagName(""); setDialogOpen(true); }}
            >
              <Plus className="mr-1 h-4 w-4" /> Create your first tag
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tags.map((tag) => {
            const tagItems = getItemsForTag(tag.name);
            const isExpanded = expandedTag === tag.id;
            return (
              <Card key={tag.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => setExpandedTag(isExpanded ? null : tag.id)}
                    >
                      <p className="truncate font-medium">{tag.name}</p>
                      <p className="text-xs text-muted-foreground">{tagItems.length} item(s)</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setExpandedTag(isExpanded ? null : tag.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(tag)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(tag.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded: show items in this tag */}
                  {isExpanded && (
                    <div className="mt-3 border-t pt-3">
                      {tagItems.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-3">
                          No items with this tag
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {tagItems.map((item) => {
                            const Icon = typeIcons[item.type] || FileText;
                            return (
                              <a
                                key={item.id}
                                href={`/vault/${typeRoutes[item.type]}?id=${item.id}`}
                                className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent/50"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
                                  <Icon className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">{item.title}</p>
                                  {item.preview && (
                                    <p className="truncate text-xs text-muted-foreground">
                                      {item.preview}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="secondary" className="shrink-0 text-[10px]">
                                  {typeLabels[item.type]}
                                </Badge>
                              </a>
                            );
                          })}
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

      {/* Create/Edit Tag Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditingId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Tag" : "New Tag"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tag name</Label>
              <Input
                placeholder="e.g. Finance, Important, Work"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {tagColors.map((color) => (
                  <button
                    key={color}
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${
                      tagColor === color ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setTagColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !tagName.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

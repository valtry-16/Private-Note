"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MoreVertical,
  Star,
  Pin,
  FolderClosed,
  Tag,
  Share2,
  EyeOff,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useVault } from "@/hooks/use-vault";
import { createClient } from "@/supabase/client";

interface Folder {
  id: string;
  name: string;
}

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface ItemActionsMenuProps {
  itemId: string;
  isPinned: boolean;
  isFavorite: boolean;
  folderId: string | null;
  itemTags: string[];
  onRefetch: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  showShare?: boolean;
  compact?: boolean;
}

export function ItemActionsMenu({
  itemId,
  isPinned,
  isFavorite,
  folderId,
  itemTags,
  onRefetch,
  onShare,
  onDelete,
  showShare = true,
  compact = false,
}: ItemActionsMenuProps) {
  const { user } = useVault();
  const supabase = createClient();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [itemTagIds, setItemTagIds] = useState<string[]>([]);

  const loadFoldersAndTags = useCallback(async () => {
    if (!user) return;
    const [foldersRes, tagsRes, itemTagsRes] = await Promise.all([
      supabase.from("folders").select("id, name").eq("user_id", user.id).order("name"),
      supabase.from("tags").select("id, name, color").eq("user_id", user.id).order("name"),
      supabase.from("item_tags").select("tag_id").eq("item_id", itemId),
    ]);
    setFolders((foldersRes.data as Folder[]) || []);
    setTags((tagsRes.data as TagItem[]) || []);
    setItemTagIds((itemTagsRes.data || []).map((t: any) => t.tag_id));
  }, [user, itemId]);

  async function togglePin() {
    await supabase.from("vault_items").update({ is_pinned: !isPinned }).eq("id", itemId);
    onRefetch();
  }

  async function toggleFavorite() {
    await supabase.from("vault_items").update({ is_favorite: !isFavorite }).eq("id", itemId);
    onRefetch();
  }

  async function moveToFolder(newFolderId: string | null) {
    await supabase.from("vault_items").update({ folder_id: newFolderId }).eq("id", itemId);
    onRefetch();
  }

  async function toggleTag(tagId: string) {
    if (itemTagIds.includes(tagId)) {
      await supabase.from("item_tags").delete().eq("item_id", itemId).eq("tag_id", tagId);
      setItemTagIds((prev) => prev.filter((id) => id !== tagId));
    } else {
      await supabase.from("item_tags").insert({ item_id: itemId, tag_id: tagId });
      setItemTagIds((prev) => [...prev, tagId]);
    }
    onRefetch();
  }

  async function handleHide() {
    await supabase.from("vault_items").update({ is_hidden: true, updated_at: new Date().toISOString() }).eq("id", itemId);
    onRefetch();
  }

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) loadFoldersAndTags(); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={compact ? "h-6 w-6" : "h-8 w-8"}>
          <MoreVertical className={compact ? "h-3 w-3" : "h-4 w-4"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={togglePin}>
          <Pin className={`mr-2 h-4 w-4 ${isPinned ? "fill-current" : ""}`} />
          {isPinned ? "Unpin" : "Pin"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleFavorite}>
          <Star className={`mr-2 h-4 w-4 ${isFavorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
          {isFavorite ? "Remove from favorites" : "Add to favorites"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Move to folder */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderClosed className="mr-2 h-4 w-4" />
            Move to folder
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => moveToFolder(null)}>
                <span className={!folderId ? "font-semibold" : ""}>No folder</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {folders.length === 0 ? (
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  No folders created yet
                </DropdownMenuLabel>
              ) : (
                folders.map((folder) => (
                  <DropdownMenuItem key={folder.id} onClick={() => moveToFolder(folder.id)}>
                    <FolderClosed className="mr-2 h-3 w-3" />
                    <span className={folderId === folder.id ? "font-semibold" : ""}>{folder.name}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        {/* Tags */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Tag className="mr-2 h-4 w-4" />
            Tags
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {tags.length === 0 ? (
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  No tags created yet
                </DropdownMenuLabel>
              ) : (
                tags.map((tag) => (
                  <DropdownMenuItem key={tag.id} onClick={() => toggleTag(tag.id)}>
                    <span
                      className="mr-2 inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className={itemTagIds.includes(tag.id) ? "font-semibold" : ""}>{tag.name}</span>
                    {itemTagIds.includes(tag.id) && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {showShare && onShare && (
          <DropdownMenuItem onClick={onShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={handleHide}>
          <EyeOff className="mr-2 h-4 w-4" />
          Hide
        </DropdownMenuItem>

        {onDelete && (
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

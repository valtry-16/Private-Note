"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/supabase/client";
import { decrypt } from "@/encryption";
import { useVault } from "./use-vault";
import type { VaultItemType, VaultItemListEntry, VaultItemMetadata } from "@/types";

export function useVaultItems(type?: VaultItemType) {
  const { user, masterPassword, isVaultUnlocked } = useVault();
  const [items, setItems] = useState<VaultItemListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    if (!user || !masterPassword || !isVaultUnlocked) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let query = supabase
      .from("vault_items")
      .select("id, type, metadata, folder_id, is_pinned, is_favorite, is_hidden, is_deleted, deleted_at, created_at, updated_at")
      .eq("user_id", user.id)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;
    if (error || !data) {
      setLoading(false);
      return;
    }

    const decryptedItems: VaultItemListEntry[] = await Promise.all(
      data.map(async (item: any) => {
        const metadata = item.metadata as unknown as VaultItemMetadata;
        let title = "Untitled";
        let preview: string | undefined;

        try {
          title = await decrypt(metadata.encrypted_title, masterPassword);
          if (metadata.encrypted_preview) {
            preview = await decrypt(metadata.encrypted_preview, masterPassword);
          }
        } catch {
          title = "Failed to decrypt";
        }

        // Fetch tags
        const { data: tagData } = await supabase
          .from("item_tags")
          .select("tag_id, tags(name)")
          .eq("item_id", item.id);

        const tags = tagData?.map((t: any) => t.tags?.name).filter(Boolean) || [];

        return {
          id: item.id,
          type: item.type as VaultItemType,
          title,
          preview,
          folder_id: item.folder_id,
          is_pinned: item.is_pinned,
          is_favorite: item.is_favorite,
          is_hidden: item.is_hidden,
          is_deleted: item.is_deleted ?? false,
          deleted_at: item.deleted_at ?? null,
          created_at: item.created_at,
          updated_at: item.updated_at,
          tags,
        };
      })
    );

    setItems(decryptedItems);
    setLoading(false);
  }, [user, masterPassword, isVaultUnlocked, type]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, refetch: fetchItems };
}

"use client";

import { useState, useMemo } from "react";
import type { VaultItemListEntry } from "@/types";

export function useSearch(items: VaultItemListEntry[]) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const lowerQuery = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.preview?.toLowerCase().includes(lowerQuery) ||
        item.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }, [items, query]);

  return { query, setQuery, filteredItems };
}

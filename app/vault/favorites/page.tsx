"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  StarOff,
  FileText,
  Key,
  Upload,
  User,
  Pin,
  PinOff,
  ExternalLink,
  Search,
  LayoutGrid,
  List,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultItems } from "@/hooks/use-vault-items";
import { createClient } from "@/supabase/client";

const typeIcons: Record<string, any> = {
  note: FileText,
  password: Key,
  document: Upload,
  personal: User,
};

const typeColors: Record<string, string> = {
  note: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  password: "bg-green-500/10 text-green-500 border-green-500/20",
  document: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  personal: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

const typeLabels: Record<string, string> = {
  note: "Notes",
  password: "Passwords",
  document: "Documents",
  personal: "Personal Info",
};

const typeRoutes: Record<string, string> = {
  note: "notes",
  password: "passwords",
  document: "documents",
  personal: "personal",
};

const typeOrder = ["note", "password", "document", "personal"];

export default function FavoritesPage() {
  const router = useRouter();
  const { items, loading, refetch } = useVaultItems();
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");

  const favorites = useMemo(() => {
    const favs = items.filter((i) => i.is_favorite && !i.is_hidden && !i.is_deleted);
    if (!search.trim()) return favs;
    const q = search.toLowerCase();
    return favs.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.preview?.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q)
    );
  }, [items, search]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof favorites> = {};
    for (const item of favorites) {
      if (!map[item.type]) map[item.type] = [];
      map[item.type].push(item);
    }
    return map;
  }, [favorites]);

  const pinnedFirst = (a: (typeof favorites)[0], b: (typeof favorites)[0]) =>
    a.is_pinned === b.is_pinned ? 0 : a.is_pinned ? -1 : 1;

  async function toggleFavorite(id: string) {
    const { error } = await supabase
      .from("vault_items")
      .update({ is_favorite: false })
      .eq("id", id);
    if (!error) refetch();
  }

  async function togglePin(id: string, currentlyPinned: boolean) {
    const { error } = await supabase
      .from("vault_items")
      .update({ is_pinned: !currentlyPinned })
      .eq("id", id);
    if (!error) refetch();
  }

  function renderItem(item: (typeof favorites)[0]) {
    const Icon = typeIcons[item.type] || FileText;
    return (
      <Card
        key={item.id}
        className="group cursor-pointer transition-all hover:shadow-md"
        onClick={() =>
          router.push(`/vault/${typeRoutes[item.type] || item.type}?id=${item.id}`)
        }
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div className={`rounded-md border p-2 ${typeColors[item.type]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{item.title}</p>
              {item.is_pinned && (
                <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
            </div>
            {item.preview && (
              <p className="truncate text-sm text-muted-foreground">{item.preview}</p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              Updated {new Date(item.updated_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={item.is_pinned ? "Unpin" : "Pin to top"}
              onClick={(e) => {
                e.stopPropagation();
                togglePin(item.id, item.is_pinned);
              }}
            >
              {item.is_pinned ? (
                <PinOff className="h-4 w-4" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Open"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/vault/${typeRoutes[item.type] || item.type}?id=${item.id}`);
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-yellow-500 hover:text-yellow-600"
              title="Remove from favorites"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(item.id);
              }}
            >
              <StarOff className="h-4 w-4" />
            </Button>
          </div>
          {viewMode === "list" && (
            <Badge variant="secondary" className="shrink-0">
              {item.type}
            </Badge>
          )}
          <Star className="h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Star className="h-6 w-6 text-yellow-500" /> Favorites
          </h1>
          <p className="text-sm text-muted-foreground">
            {favorites.length} starred item{favorites.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search favorites..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-60 pl-9"
            />
          </div>
          <Button
            variant={viewMode === "grouped" ? "default" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode("grouped")}
            title="Grouped view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Star className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {search ? "No favorites match your search." : "No favorites yet. Star items to see them here."}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grouped" ? (
        <div className="space-y-8">
          {typeOrder
            .filter((t) => grouped[t]?.length)
            .map((type) => {
              const Icon = typeIcons[type] || FileText;
              const sortedItems = [...grouped[type]].sort(pinnedFirst);
              return (
                <section key={type}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className={`rounded-md p-1.5 ${typeColors[type]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-semibold">{typeLabels[type] || type}</h2>
                    <Badge variant="secondary" className="ml-1">
                      {sortedItems.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {sortedItems.map(renderItem)}
                  </div>
                </section>
              );
            })}
        </div>
      ) : (
        <div className="space-y-2">
          {[...favorites].sort(pinnedFirst).map(renderItem)}
        </div>
      )}
    </div>
  );
}

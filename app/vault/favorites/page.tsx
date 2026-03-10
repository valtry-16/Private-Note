"use client";

import { useRouter } from "next/navigation";
import { Star, FileText, Key, Upload, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVaultItems } from "@/hooks/use-vault-items";

const typeIcons: Record<string, any> = {
  note: FileText,
  password: Key,
  document: Upload,
  personal: User,
};

const typeColors: Record<string, string> = {
  note: "bg-blue-500/10 text-blue-500",
  password: "bg-green-500/10 text-green-500",
  document: "bg-purple-500/10 text-purple-500",
  personal: "bg-orange-500/10 text-orange-500",
};

const typeRoutes: Record<string, string> = {
  note: "notes",
  password: "passwords",
  document: "documents",
  personal: "personal",
};

export default function FavoritesPage() {
  const router = useRouter();
  const { items, loading } = useVaultItems();
  const favorites = items.filter((i) => i.is_favorite && !i.is_hidden);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Star className="h-6 w-6 text-yellow-500" /> Favorites
        </h1>
        <p className="text-sm text-muted-foreground">Your starred vault items</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Star className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No favorites yet. Star items to see them here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {favorites.map((item) => {
            const Icon = typeIcons[item.type] || FileText;
            return (
              <Card
                key={item.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/vault/${typeRoutes[item.type] || item.type}?id=${item.id}`)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`rounded-md p-2 ${typeColors[item.type]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.title}</p>
                    {item.preview && (
                      <p className="truncate text-sm text-muted-foreground">{item.preview}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.type}</Badge>
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
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

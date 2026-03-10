"use client";

import { useRouter } from "next/navigation";
import {
  FileText,
  Key,
  Upload,
  User,
  Search,
  Plus,
  Star,
  Clock,
  Shield,
  Pin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVaultItems } from "@/hooks/use-vault-items";
import { useSearch } from "@/hooks/use-search";

const quickActions = [
  { label: "New Note", icon: FileText, href: "/vault/notes?new=true", color: "text-blue-500" },
  { label: "New Password", icon: Key, href: "/vault/passwords?new=true", color: "text-green-500" },
  { label: "Upload File", icon: Upload, href: "/vault/documents?new=true", color: "text-purple-500" },
  { label: "Personal Info", icon: User, href: "/vault/personal?new=true", color: "text-orange-500" },
];

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

export default function DashboardPage() {
  const router = useRouter();
  const { items, loading } = useVaultItems();
  const { query, setQuery, filteredItems } = useSearch(items);

  const recentItems = filteredItems.filter((i) => !i.is_hidden).slice(0, 10);
  const favoriteItems = items.filter((i) => i.is_favorite && !i.is_hidden).slice(0, 5);

  const stats = {
    notes: items.filter((i) => i.type === "note").length,
    passwords: items.filter((i) => i.type === "password").length,
    documents: items.filter((i) => i.type === "document").length,
    personal: items.filter((i) => i.type === "personal").length,
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your encrypted vault overview</p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search across all vault items..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Notes", count: stats.notes, icon: FileText, color: "text-blue-500" },
          { label: "Passwords", count: stats.passwords, icon: Key, color: "text-green-500" },
          { label: "Documents", count: stats.documents, icon: Upload, color: "text-purple-500" },
          { label: "Personal", count: stats.personal, icon: User, color: "text-orange-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`rounded-lg bg-muted p-2 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.count}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className="h-auto justify-start gap-3 p-4"
              onClick={() => router.push(action.href)}
            >
              <Plus className={`h-4 w-4 ${action.color}`} />
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Favorites */}
      {favoriteItems.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Star className="h-5 w-5 text-yellow-500" /> Favorites
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteItems.map((item) => {
              const Icon = typeIcons[item.type] || FileText;
              return (
                <Card
                  key={item.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => router.push(`/vault/${typeRoutes[item.type] || item.type}?id=${item.id}`)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`rounded-md p-2 ${typeColors[item.type]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                    </div>
                    <Star className="h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Items */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Clock className="h-5 w-5" /> Recent Items
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : recentItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground/50" />
              <div>
                <p className="font-medium">No items yet</p>
                <p className="text-sm text-muted-foreground">
                  Start by creating a note, saving a password, or uploading a document.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentItems.map((item) => {
              const Icon = typeIcons[item.type] || FileText;
              return (
                <Card
                  key={item.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => router.push(`/vault/${typeRoutes[item.type] || item.type}?id=${item.id}`)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`rounded-md p-2 ${typeColors[item.type]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{item.title}</p>
                        {item.is_pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      {item.preview && (
                        <p className="truncate text-sm text-muted-foreground">
                          {item.preview}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

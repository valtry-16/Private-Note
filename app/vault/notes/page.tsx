"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  Pin,
  Star,
  Trash2,
  Edit3,
  FolderClosed,
  Tag,
  MoreVertical,
  ChevronLeft,
  EyeOff,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NoteEditor } from "@/components/vault/note-editor";
import { useVaultItems } from "@/hooks/use-vault-items";
import { useSearch } from "@/hooks/use-search";
import { useVault } from "@/hooks/use-vault";
import { createClient } from "@/supabase/client";
import { encrypt, decrypt } from "@/encryption";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { ShareDialog } from "@/components/vault/share-dialog";
import type { DecryptedNote } from "@/types";

export default function NotesPage() {
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "true";
  const selectedId = searchParams.get("id");
  const router = useRouter();
  const { user, masterPassword } = useVault();
  const { items, loading, refetch } = useVaultItems("note");
  const { query, setQuery, filteredItems } = useSearch(items);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(selectedId);
  const [noteData, setNoteData] = useState<DecryptedNote | null>(null);
  const [isEditing, setIsEditing] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [shareItemId, setShareItemId] = useState<string | null>(null);
  const supabase = createClient();

  const visibleItems = filteredItems.filter((i) => !i.is_hidden && !i.is_deleted);

  useEffect(() => {
    if (selectedId) setActiveNoteId(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!activeNoteId || !masterPassword) {
      setNoteData(null);
      return;
    }
    loadNote(activeNoteId);
  }, [activeNoteId]);

  async function loadNote(id: string) {
    const { data } = await supabase
      .from("vault_items")
      .select("encrypted_data")
      .eq("id", id)
      .single();

    if (data && masterPassword) {
      try {
        const decrypted = await decrypt(data.encrypted_data, masterPassword);
        setNoteData(JSON.parse(decrypted));
      } catch {
        setNoteData({ title: "Failed to decrypt", content: "", format: "markdown" });
      }
    }
  }

  async function handleSave(note: DecryptedNote) {
    if (!user || !masterPassword) return;
    setSaving(true);

    const encryptedData = await encrypt(JSON.stringify(note), masterPassword);
    const encryptedTitle = await encrypt(note.title, masterPassword);
    const encryptedPreview = await encrypt(
      note.content.substring(0, 100),
      masterPassword
    );

    if (activeNoteId && !isNew) {
      await supabase
        .from("vault_items")
        .update({
          encrypted_data: encryptedData,
          metadata: { encrypted_title: encryptedTitle, encrypted_preview: encryptedPreview },
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeNoteId);
    } else {
      const { data } = await supabase
        .from("vault_items")
        .insert({
          user_id: user.id,
          type: "note",
          encrypted_data: encryptedData,
          metadata: { encrypted_title: encryptedTitle, encrypted_preview: encryptedPreview },
        })
        .select("id")
        .single();

      if (data) setActiveNoteId(data.id);
    }

    setIsEditing(false);
    setSaving(false);
    refetch();
    router.replace("/vault/notes");
  }

  async function handleDelete(id: string) {
    await supabase
      .from("vault_items")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (activeNoteId === id) {
      setActiveNoteId(null);
      setNoteData(null);
    }
    refetch();
  }

  async function togglePin(id: string, current: boolean) {
    await supabase.from("vault_items").update({ is_pinned: !current }).eq("id", id);
    refetch();
  }

  async function toggleFavorite(id: string, current: boolean) {
    await supabase.from("vault_items").update({ is_favorite: !current }).eq("id", id);
    refetch();
  }

  async function toggleHidden(id: string) {
    await supabase.from("vault_items").update({ is_hidden: true, updated_at: new Date().toISOString() }).eq("id", id);
    refetch();
  }

  // On mobile, show either the list or the detail, not both
  const showingNote = activeNoteId || isEditing || isNew;

  return (
    <div className="flex h-full">
      {/* Notes List */}
      <div
        className={cn(
          "flex w-full flex-col border-r md:w-80",
          showingNote ? "hidden md:flex" : "flex"
        )}
      >
        <div className="border-b p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Notes</h2>
            <Button
              size="sm"
              onClick={() => {
                setActiveNoteId(null);
                setNoteData({ title: "", content: "", format: "markdown" });
                setIsEditing(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> New
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {visibleItems.map((item) => (
              <div
                key={item.id}
                className={`group cursor-pointer rounded-md p-3 transition-colors ${
                  activeNoteId === item.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent"
                }`}
                onClick={() => {
                  setActiveNoteId(item.id);
                  setIsEditing(false);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      {item.is_pinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />}
                      <p className="truncate text-sm font-medium">{item.title}</p>
                    </div>
                    {item.preview && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {item.preview}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(item.id, item.is_pinned);
                      }}
                    >
                      <Pin className={`h-3 w-3 ${item.is_pinned ? "fill-current" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id, item.is_favorite);
                      }}
                    >
                      <Star
                        className={`h-3 w-3 ${
                          item.is_favorite ? "fill-yellow-500 text-yellow-500" : ""
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Hide"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleHidden(item.id);
                      }}
                    >
                      <EyeOff className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {item.tags.length > 0 && (
                  <div className="mt-1 flex gap-1">
                    {item.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {visibleItems.length === 0 && !loading && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {query ? "No matching notes" : "No notes yet"}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Note Content */}
      <div
        className={cn(
          "flex-1",
          showingNote ? "flex flex-col" : "hidden md:flex md:flex-col"
        )}
      >
        {/* Mobile back button */}
        {showingNote && (
          <div className="flex items-center border-b px-4 py-2 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveNoteId(null);
                setNoteData(null);
                setIsEditing(false);
                router.replace("/vault/notes");
              }}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Notes
            </Button>
          </div>
        )}

        {isEditing || isNew ? (
          <NoteEditor
            initialData={noteData || { title: "", content: "", format: "markdown" }}
            onSave={handleSave}
            onCancel={() => {
              setIsEditing(false);
              if (isNew) router.replace("/vault/notes");
            }}
            saving={saving}
          />
        ) : noteData ? (
          <div className="p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h1 className="min-w-0 truncate text-xl font-bold sm:text-2xl">{noteData.title}</h1>
              <div className="flex gap-2 shrink-0">
                {activeNoteId && (
                  <Button onClick={() => setShareItemId(activeNoteId)} variant="outline" size="sm">
                    <Share2 className="mr-1 h-4 w-4" /> Share
                  </Button>
                )}
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  <Edit3 className="mr-1 h-4 w-4" /> Edit
                </Button>
              </div>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{noteData.content}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p>Select a note or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {shareItemId && (
        <ShareDialog
          itemId={shareItemId}
          itemType="note"
          open={!!shareItemId}
          onOpenChange={(open) => !open && setShareItemId(null)}
        />
      )}
    </div>
  );
}

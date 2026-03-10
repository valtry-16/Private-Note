"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import type { DecryptedNote } from "@/types";

interface NoteEditorProps {
  initialData: DecryptedNote;
  onSave: (note: DecryptedNote) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export function NoteEditor({ initialData, onSave, onCancel, saving }: NoteEditorProps) {
  const [title, setTitle] = useState(initialData.title);
  const [content, setContent] = useState(initialData.content);
  const [format] = useState<"markdown" | "richtext">(initialData.format || "markdown");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ title, content, format });
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {initialData.title ? "Edit Note" : "New Note"}
        </h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !title.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Note
          </Button>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <Label htmlFor="noteTitle">Title</Label>
        <Input
          id="noteTitle"
          placeholder="Note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <Tabs defaultValue="write" className="flex flex-1 flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="write" className="flex-1">
          <Textarea
            placeholder="Write your note here... (Markdown supported)"
            className="h-full min-h-[400px] resize-none font-mono text-sm"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </TabsContent>
        <TabsContent value="preview" className="flex-1">
          <div className="prose prose-sm dark:prose-invert h-full min-h-[400px] overflow-auto rounded-md border p-4">
            {content ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">Nothing to preview</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </form>
  );
}

"use client";

import { useState, useRef, useCallback } from "react";
import {
  Loader2,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Link,
  Quote,
  Strikethrough,
  Minus,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = useCallback(
    (before: string, after: string = "", placeholder: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.substring(start, end);
      const text = selected || placeholder;
      const newContent =
        content.substring(0, start) + before + text + after + content.substring(end);
      setContent(newContent);
      // Restore cursor position after state update
      requestAnimationFrame(() => {
        textarea.focus();
        const cursorPos = start + before.length + text.length;
        textarea.setSelectionRange(
          start + before.length,
          start + before.length + text.length
        );
      });
    },
    [content]
  );

  const insertLinePrefix = useCallback(
    (prefix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      // Find the start of the current line
      const lineStart = content.lastIndexOf("\n", start - 1) + 1;
      const newContent =
        content.substring(0, lineStart) + prefix + content.substring(lineStart);
      setContent(newContent);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      });
    },
    [content]
  );

  const toolbarButtons = [
    { icon: Bold, label: "Bold", action: () => insertMarkdown("**", "**", "bold") },
    { icon: Italic, label: "Italic", action: () => insertMarkdown("*", "*", "italic") },
    { icon: Strikethrough, label: "Strikethrough", action: () => insertMarkdown("~~", "~~", "text") },
    "separator",
    { icon: Heading1, label: "Heading 1", action: () => insertLinePrefix("# ") },
    { icon: Heading2, label: "Heading 2", action: () => insertLinePrefix("## ") },
    "separator",
    { icon: List, label: "Bullet List", action: () => insertLinePrefix("- ") },
    { icon: ListOrdered, label: "Numbered List", action: () => insertLinePrefix("1. ") },
    { icon: CheckSquare, label: "Task List", action: () => insertLinePrefix("- [ ] ") },
    "separator",
    { icon: Code, label: "Code", action: () => insertMarkdown("`", "`", "code") },
    { icon: Quote, label: "Quote", action: () => insertLinePrefix("> ") },
    { icon: Link, label: "Link", action: () => insertMarkdown("[", "](url)", "text") },
    { icon: Minus, label: "Horizontal Rule", action: () => insertMarkdown("\n---\n", "") },
  ];

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
          <div className="mb-2 flex flex-wrap items-center gap-0.5 rounded-md border bg-muted/50 p-1">
            {toolbarButtons.map((btn, i) =>
              btn === "separator" ? (
                <Separator key={i} orientation="vertical" className="mx-1 h-6" />
              ) : (
                <Button
                  key={i}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title={(btn as any).label}
                  onClick={(btn as any).action}
                >
                  {(() => { const Icon = (btn as any).icon; return <Icon className="h-4 w-4" />; })()}
                </Button>
              )
            )}
          </div>
          <Textarea
            ref={textareaRef}
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

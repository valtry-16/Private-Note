"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Loader2,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Link,
  Quote,
  Strikethrough,
  Minus,
  CheckSquare,
  Table,
  Image,
  Undo2,
  Redo2,
  Superscript,
  Highlighter,
  WrapText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const contentRef = useRef(content);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Keep contentRef in sync
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-50), contentRef.current]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, contentRef.current]);
      setContent(last);
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setUndoStack((u) => [...u, contentRef.current]);
      setContent(last);
      return prev.slice(0, -1);
    });
  }, []);

  const applyEdit = useCallback(
    (editFn: (text: string, start: number, end: number) => { newText: string; cursorStart: number; cursorEnd: number }) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const current = contentRef.current;

      pushUndo();

      const { newText, cursorStart, cursorEnd } = editFn(current, start, end);
      setContent(newText);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorStart, cursorEnd);
      });
    },
    [pushUndo]
  );

  const insertMarkdown = useCallback(
    (before: string, after: string = "", placeholder: string = "") => {
      applyEdit((text, start, end) => {
        const selected = text.substring(start, end);
        const insert = selected || placeholder;
        const newText = text.substring(0, start) + before + insert + after + text.substring(end);
        return {
          newText,
          cursorStart: start + before.length,
          cursorEnd: start + before.length + insert.length,
        };
      });
    },
    [applyEdit]
  );

  const insertLinePrefix = useCallback(
    (prefix: string) => {
      applyEdit((text, start) => {
        const lineStart = text.lastIndexOf("\n", start - 1) + 1;
        const lineEnd = text.indexOf("\n", start);
        const currentLine = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);

        // Toggle: if line already has this prefix, remove it
        if (currentLine.startsWith(prefix)) {
          const newText = text.substring(0, lineStart) + currentLine.substring(prefix.length) + text.substring(lineEnd === -1 ? text.length : lineEnd);
          return { newText, cursorStart: start - prefix.length, cursorEnd: start - prefix.length };
        }

        const newText = text.substring(0, lineStart) + prefix + text.substring(lineStart);
        return { newText, cursorStart: start + prefix.length, cursorEnd: start + prefix.length };
      });
    },
    [applyEdit]
  );

  const insertBlock = useCallback(
    (block: string) => {
      applyEdit((text, start, end) => {
        // Insert with blank lines around
        const before = start > 0 && text[start - 1] !== "\n" ? "\n" : "";
        const after = end < text.length && text[end] !== "\n" ? "\n" : "";
        const newText = text.substring(0, start) + before + block + after + text.substring(end);
        const cursorPos = start + before.length + block.length;
        return { newText, cursorStart: cursorPos, cursorEnd: cursorPos };
      });
    },
    [applyEdit]
  );

  const insertTable = useCallback(() => {
    const table = "\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n";
    insertBlock(table);
  }, [insertBlock]);

  const insertCodeBlock = useCallback(() => {
    applyEdit((text, start, end) => {
      const selected = text.substring(start, end);
      const code = selected || "code here";
      const block = "\n```\n" + code + "\n```\n";
      const newText = text.substring(0, start) + block + text.substring(end);
      const codeStart = start + 5; // after ```\n
      return { newText, cursorStart: codeStart, cursorEnd: codeStart + code.length };
    });
  }, [applyEdit]);

  // Keyboard shortcuts
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "b":
            e.preventDefault();
            insertMarkdown("**", "**", "bold");
            break;
          case "i":
            e.preventDefault();
            insertMarkdown("*", "*", "italic");
            break;
          case "k":
            e.preventDefault();
            insertMarkdown("[", "](url)", "text");
            break;
          case "z":
            if (e.shiftKey) {
              e.preventDefault();
              handleRedo();
            } else {
              e.preventDefault();
              handleUndo();
            }
            break;
          case "y":
            e.preventDefault();
            handleRedo();
            break;
        }
      }
      // Tab key for indentation
      if (e.key === "Tab") {
        e.preventDefault();
        insertMarkdown("  ", "");
      }
    };

    textarea.addEventListener("keydown", handleKeyDown);
    return () => textarea.removeEventListener("keydown", handleKeyDown);
  }, [insertMarkdown, handleUndo, handleRedo]);

  const toolbarButtons = [
    { icon: Undo2, label: "Undo (Ctrl+Z)", action: handleUndo },
    { icon: Redo2, label: "Redo (Ctrl+Y)", action: handleRedo },
    "separator",
    { icon: Bold, label: "Bold (Ctrl+B)", action: () => insertMarkdown("**", "**", "bold") },
    { icon: Italic, label: "Italic (Ctrl+I)", action: () => insertMarkdown("*", "*", "italic") },
    { icon: Strikethrough, label: "Strikethrough", action: () => insertMarkdown("~~", "~~", "text") },
    { icon: Highlighter, label: "Highlight", action: () => insertMarkdown("==", "==", "highlighted") },
    "separator",
    { icon: Heading1, label: "Heading 1", action: () => insertLinePrefix("# ") },
    { icon: Heading2, label: "Heading 2", action: () => insertLinePrefix("## ") },
    { icon: Heading3, label: "Heading 3", action: () => insertLinePrefix("### ") },
    "separator",
    { icon: List, label: "Bullet List", action: () => insertLinePrefix("- ") },
    { icon: ListOrdered, label: "Numbered List", action: () => insertLinePrefix("1. ") },
    { icon: CheckSquare, label: "Task List", action: () => insertLinePrefix("- [ ] ") },
    "separator",
    { icon: Code, label: "Inline Code", action: () => insertMarkdown("`", "`", "code") },
    { icon: WrapText, label: "Code Block", action: insertCodeBlock },
    { icon: Quote, label: "Quote", action: () => insertLinePrefix("> ") },
    { icon: Link, label: "Link (Ctrl+K)", action: () => insertMarkdown("[", "](url)", "text") },
    { icon: Image, label: "Image", action: () => insertMarkdown("![", "](url)", "alt text") },
    { icon: Table, label: "Table", action: insertTable },
    { icon: Minus, label: "Horizontal Rule", action: () => insertBlock("\n---\n") },
    { icon: Superscript, label: "Superscript", action: () => insertMarkdown("<sup>", "</sup>", "text") },
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
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(btn as any).action}
                    >
                      {(() => { const Icon = (btn as any).icon; return <Icon className="h-4 w-4" />; })()}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {(btn as any).label}
                  </TooltipContent>
                </Tooltip>
              )
            )}
          </div>
          <Textarea
            ref={textareaRef}
            placeholder="Write your note here... (Markdown supported)"
            className="h-full min-h-[400px] resize-none font-mono text-sm"
            value={content}
            onChange={(e) => {
              pushUndo();
              setContent(e.target.value);
            }}
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

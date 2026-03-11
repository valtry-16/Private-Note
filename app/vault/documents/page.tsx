"use client";

import { useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Image,
  File,
  Download,
  Trash2,
  Search,
  Plus,
  Loader2,
  HardDrive,
  EyeOff,
  Eye,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVaultItems } from "@/hooks/use-vault-items";
import { useSearch } from "@/hooks/use-search";
import { useVault } from "@/hooks/use-vault";
import { createClient } from "@/supabase/client";
import { encrypt, decrypt, encryptFile, decryptFile } from "@/encryption";
import { ItemActionsMenu } from "@/components/vault/item-actions-menu";
import type { DecryptedDocument } from "@/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image;
  if (type === "application/pdf") return FileText;
  return File;
}

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "true";
  const router = useRouter();
  const { user, masterPassword } = useVault();
  const { items, loading, refetch } = useVaultItems("document");
  const { query, setQuery, filteredItems } = useSearch(items);
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(isNew);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>("");
  const [previewName, setPreviewName] = useState<string>("");
  const [previewError, setPreviewError] = useState<string>("");
  const [previewing, setPreviewing] = useState<string | null>(null);

  async function handleUpload() {
    if (!selectedFile || !user || !masterPassword) return;
    setUploading(true);

    try {
      const { encryptedData, metadata: encryptedMetadataStr } = await encryptFile(
        selectedFile,
        masterPassword
      );

      // Upload encrypted file to Supabase Storage
      const filePath = `${user.id}/${crypto.randomUUID()}`;
      const { error: storageError } = await supabase.storage
        .from("vault-documents")
        .upload(filePath, encryptedData);

      if (storageError) throw storageError;

      const docData: DecryptedDocument = {
        title: selectedFile.name,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        notes,
      };

      const encryptedData2 = await encrypt(JSON.stringify(docData), masterPassword);
      const encryptedTitle = await encrypt(selectedFile.name, masterPassword);

      await supabase.from("vault_items").insert({
        user_id: user.id,
        type: "document",
        encrypted_data: encryptedData2,
        metadata: {
          encrypted_title: encryptedTitle,
          file_path: filePath,
          file_size: selectedFile.size,
          encrypted_file_metadata: encryptedMetadataStr,
        },
      });

      resetForm();
      refetch();
    } catch (err) {
      console.error("Upload failed:", err);
    }

    setUploading(false);
  }

  async function handleDownload(itemId: string) {
    if (!masterPassword) return;
    setDownloading(itemId);

    try {
      const { data: item } = await supabase
        .from("vault_items")
        .select("encrypted_data, metadata")
        .eq("id", itemId)
        .single();

      if (!item) return;

      const metadata = item.metadata as any;
      const filePath = metadata.file_path;

      const { data: fileData } = await supabase.storage
        .from("vault-documents")
        .download(filePath);

      if (!fileData) return;

      const docInfo = JSON.parse(
        await decrypt(item.encrypted_data, masterPassword)
      ) as DecryptedDocument;

      // Decrypt the file if encrypted metadata is available
      let downloadBlob: Blob;
      if (metadata.encrypted_file_metadata) {
        const decryptedFile = await decryptFile(
          fileData,
          metadata.encrypted_file_metadata,
          masterPassword
        );
        downloadBlob = new Blob([await decryptedFile.arrayBuffer()], { type: decryptedFile.type });
      } else {
        // Legacy files — encryption metadata was lost, cannot decrypt
        alert("This file was uploaded before decryption metadata was stored. Please delete and re-upload the file.");
        setDownloading(null);
        return;
      }

      const url = URL.createObjectURL(downloadBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = docInfo.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }

    setDownloading(null);
  }

  async function handlePreview(itemId: string) {
    if (!masterPassword) return;
    setPreviewing(itemId);
    setPreviewError("");

    try {
      const { data: item } = await supabase
        .from("vault_items")
        .select("encrypted_data, metadata")
        .eq("id", itemId)
        .single();

      if (!item) return;

      const metadata = item.metadata as any;
      const { data: fileData } = await supabase.storage
        .from("vault-documents")
        .download(metadata.file_path);

      if (!fileData) return;

      const docInfo = JSON.parse(
        await decrypt(item.encrypted_data, masterPassword)
      ) as DecryptedDocument;

      if (previewUrl) URL.revokeObjectURL(previewUrl);

      if (!metadata.encrypted_file_metadata) {
        // Legacy file — encryption metadata was lost, cannot decrypt
        setPreviewName(docInfo.fileName);
        setPreviewType(docInfo.fileType);
        setPreviewError("This file was uploaded before decryption metadata was stored. Please delete and re-upload the file.");
        setPreviewing(null);
        return;
      }

      const decryptedFile = await decryptFile(
        fileData,
        metadata.encrypted_file_metadata,
        masterPassword
      );
      const previewBlob = new Blob([await decryptedFile.arrayBuffer()], { type: decryptedFile.type });

      const url = URL.createObjectURL(previewBlob);
      setPreviewUrl(url);
      setPreviewType(docInfo.fileType);
      setPreviewName(docInfo.fileName);
    } catch (err) {
      console.error("Preview failed:", err);
      setPreviewError("Failed to preview file.");
    }

    setPreviewing(null);
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewType("");
    setPreviewName("");
    setPreviewError("");
  }

  async function handleDelete(itemId: string) {
    await supabase
      .from("vault_items")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", itemId);
    refetch();
  }

  async function toggleHidden(id: string) {
    await supabase.from("vault_items").update({ is_hidden: true, updated_at: new Date().toISOString() }).eq("id", id);
    refetch();
  }

  function resetForm() {
    setDialogOpen(false);
    setSelectedFile(null);
    setNotes("");
    if (isNew) router.replace("/vault/documents");
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Encrypted Documents</h1>
          <p className="text-sm text-muted-foreground">
            Files are encrypted in your browser before upload
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Upload className="mr-1 h-4 w-4" /> Upload
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Document List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <HardDrive className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {query ? "No matching documents" : "No documents uploaded yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems
            .filter((i) => !i.is_hidden && !i.is_deleted)
            .map((item) => {
              const metadata = item as any;
              const FileIcon = File;

              return (
                <Card key={item.id} className="min-w-0 transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                        <FileIcon className="h-5 w-5 text-purple-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-0"
                        onClick={() => handlePreview(item.id)}
                        disabled={previewing === item.id}
                      >
                        {previewing === item.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Eye className="mr-1 h-3 w-3" />
                        )}
                        <span className="truncate">Preview</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 h-8 w-8"
                        onClick={() => handleDownload(item.id)}
                        disabled={downloading === item.id}
                        title="Download"
                      >
                        {downloading === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                      </Button>
                      <ItemActionsMenu
                        itemId={item.id}
                        isPinned={item.is_pinned}
                        isFavorite={item.is_favorite}
                        folderId={item.folder_id}
                        itemTags={item.tags}
                        onRefetch={refetch}
                        onDelete={() => handleDelete(item.id)}
                        showShare={false}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Encrypted Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50 hover:bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              {selectedFile ? (
                <div className="text-center">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click to select a file (PDF, image, document)
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.txt,.csv,.xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add notes about this document..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <p className="font-medium">🔒 End-to-end encrypted</p>
              <p>Your file will be encrypted in your browser before upload. The server only stores encrypted data.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Encrypt & Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl || !!previewError} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate">{previewName}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto" style={{ maxHeight: "70vh" }}>
            {previewError ? (
              <div className="py-12 text-center">
                <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-yellow-500 opacity-70" />
                <p className="text-sm text-muted-foreground">{previewError}</p>
              </div>
            ) : (
              <>
                {previewType.startsWith("image/") && previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={previewName}
                    className="max-h-full max-w-full rounded object-contain"
                  />
                )}
                {previewType === "application/pdf" && previewUrl && (
                  <iframe
                    src={previewUrl}
                    title={previewName}
                    className="h-[70vh] w-full rounded border-0"
                  />
                )}
                {previewType.startsWith("text/") && previewUrl && (
                  <iframe
                    src={previewUrl}
                    title={previewName}
                    className="h-[70vh] w-full rounded border bg-white p-4"
                  />
                )}
                {!previewType.startsWith("image/") &&
                  previewType !== "application/pdf" &&
                  !previewType.startsWith("text/") && (
                    <div className="py-12 text-center text-muted-foreground">
                      <File className="mx-auto mb-3 h-12 w-12 opacity-50" />
                      <p>Preview not available for this file type</p>
                      <p className="text-xs mt-1">{previewType}</p>
                    </div>
                  )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

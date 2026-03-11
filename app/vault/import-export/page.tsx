"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Download,
  FileText,
  Shield,
  Loader2,
  Check,
  AlertTriangle,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVault } from "@/hooks/use-vault";
import { createClient } from "@/supabase/client";
import { encrypt, decrypt } from "@/encryption";

type ImportFormat = "zerovault" | "bitwarden" | "csv";

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
}

export default function ImportExportPage() {
  const { user, masterPassword } = useVault();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");
  const [importing, setImporting] = useState(false);
  const [importFormat, setImportFormat] = useState<ImportFormat>("zerovault");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");

  async function handleExport() {
    if (!user || !masterPassword) return;
    setExporting(true);

    const { data: items } = await supabase
      .from("vault_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_deleted", false);

    if (!items) {
      setExporting(false);
      return;
    }

    const decryptedItems = [];
    for (const item of items) {
      try {
        const decryptedData = await decrypt(item.encrypted_data, masterPassword);
        decryptedItems.push({
          type: item.type,
          data: JSON.parse(decryptedData),
          created_at: item.created_at,
          is_favorite: item.is_favorite,
        });
      } catch {
        // Skip failed items
      }
    }

    if (exportFormat === "csv") {
      // Export passwords as CSV
      const passwords = decryptedItems.filter((i) => i.type === "password");
      const csvRows = [
        "name,url,username,password,notes",
        ...passwords.map((p) => {
          const d = p.data;
          const escape = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
          return `${escape(d.title)},${escape(d.website)},${escape(d.username)},${escape(d.password)},${escape(d.notes)}`;
        }),
      ];
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      downloadBlob(blob, `zerovault-passwords-${dateStr()}.csv`);
    } else {
      const blob = new Blob([JSON.stringify(decryptedItems, null, 2)], {
        type: "application/json",
      });
      downloadBlob(blob, `zerovault-export-${dateStr()}.json`);
    }

    setExporting(false);
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function dateStr() {
    return new Date().toISOString().slice(0, 10);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !masterPassword) return;

    setImporting(true);
    setImportError("");
    setImportResult(null);

    try {
      const text = await file.text();
      let items: { type: string; data: any }[] = [];

      if (importFormat === "zerovault") {
        items = JSON.parse(text);
      } else if (importFormat === "bitwarden") {
        items = parseBitwardenExport(text);
      } else if (importFormat === "csv") {
        items = parseCsvPasswords(text);
      }

      let imported = 0;
      let skipped = 0;

      for (const item of items) {
        try {
          const encryptedData = await encrypt(JSON.stringify(item.data), masterPassword);
          const title = item.data.title || item.data.name || "Imported";
          const encryptedTitle = await encrypt(title, masterPassword);

          await supabase.from("vault_items").insert({
            user_id: user.id,
            type: item.type as any,
            encrypted_data: encryptedData,
            metadata: { encrypted_title: encryptedTitle },
          });
          imported++;
        } catch {
          skipped++;
        }
      }

      setImportResult({ total: items.length, imported, skipped });
    } catch {
      setImportError("Failed to parse import file. Check the format.");
    }

    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function parseBitwardenExport(text: string): { type: string; data: any }[] {
    const json = JSON.parse(text);
    const items: { type: string; data: any }[] = [];

    for (const item of json.items || []) {
      if (item.type === 1 && item.login) {
        items.push({
          type: "password",
          data: {
            title: item.name || "",
            website: item.login.uris?.[0]?.uri || "",
            username: item.login.username || "",
            password: item.login.password || "",
            notes: item.notes || "",
          },
        });
      } else if (item.type === 2) {
        items.push({
          type: "note",
          data: {
            title: item.name || "Imported Note",
            content: item.notes || "",
            format: "markdown",
          },
        });
      }
    }

    return items;
  }

  function parseCsvPasswords(text: string): { type: string; data: any }[] {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];

    const header = lines[0].toLowerCase();
    const items: { type: string; data: any }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) continue;

      // Try to detect common CSV formats
      if (header.includes("name") || header.includes("title")) {
        items.push({
          type: "password",
          data: {
            title: values[0] || "",
            website: values[1] || "",
            username: values[2] || "",
            password: values[3] || "",
            notes: values[4] || "",
          },
        });
      } else {
        items.push({
          type: "password",
          data: {
            title: values[0] || "",
            website: values[1] || "",
            username: values[2] || "",
            password: values[3] || "",
            notes: values[4] || "",
          },
        });
      }
    }

    return items;
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Import & Export</h1>
        <p className="text-sm text-muted-foreground">
          Import from other password managers or export your vault data
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5" /> Export
            </CardTitle>
            <CardDescription>
              Download your vault data. The exported file will contain unencrypted data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON (all items)</SelectItem>
                  <SelectItem value="csv">CSV (passwords only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-xs">
              <AlertTriangle className="mr-1 inline h-3 w-3 text-yellow-600" />
              The exported file contains <strong>unencrypted</strong> data. Handle with care and delete after use.
            </div>
            <Button onClick={handleExport} disabled={exporting} className="w-full">
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export Data
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5" /> Import
            </CardTitle>
            <CardDescription>
              Import data from ZeroVault, Bitwarden, or CSV files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Source format</Label>
              <Select value={importFormat} onValueChange={(v: any) => setImportFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zerovault">ZeroVault JSON</SelectItem>
                  <SelectItem value="bitwarden">Bitwarden JSON</SelectItem>
                  <SelectItem value="csv">CSV (name, url, username, password, notes)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <Shield className="mr-1 inline h-3 w-3" />
              Imported data will be encrypted with your master password before storage.
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.txt"
                className="hidden"
                onChange={handleImport}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                variant="outline"
                className="w-full"
              >
                {importing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Select File to Import
              </Button>
            </div>

            {importResult && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                <Check className="mr-1 inline h-4 w-4" />
                Imported {importResult.imported} of {importResult.total} items
                {importResult.skipped > 0 && ` (${importResult.skipped} skipped)`}
              </div>
            )}
            {importError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mr-1 inline h-4 w-4" />
                {importError}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

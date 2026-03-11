"use client";

import { useState, useEffect } from "react";
import { Shield, Lock, Eye, EyeOff, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShareViewPage({ params }: { params: { id: string } }) {
  const [passphrase, setPassphrase] = useState("");
  const [decryptedData, setDecryptedData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [encryptedData, setEncryptedData] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");
  const [fetching, setFetching] = useState(true);
  const [showPassphrase, setShowPassphrase] = useState(false);

  useEffect(() => {
    fetchLink();
  }, []);

  async function fetchLink() {
    try {
      const res = await fetch(`/api/share/${params.id}`);
      if (!res.ok) {
        const data = await res.json();
        setLinkError(data.error || "Link not found or expired");
        return;
      }
      const data = await res.json();
      setEncryptedData(data.encrypted_data);
    } catch {
      setLinkError("Failed to load shared content");
    } finally {
      setFetching(false);
    }
  }

  async function handleDecrypt() {
    if (!encryptedData || !passphrase) return;
    setLoading(true);
    setError("");

    try {
      // Import decrypt from crypto module inline to avoid bundling issues
      const parts = encryptedData.split(".");
      if (parts.length !== 3) throw new Error("Invalid data");

      const salt = Uint8Array.from(atob(parts[0]), (c) => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));
      const ciphertext = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));

      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(passphrase),
        "PBKDF2",
        false,
        ["deriveKey"]
      );

      const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
      );

      const text = new TextDecoder().decode(decrypted);
      setDecryptedData(JSON.parse(text));
    } catch {
      setError("Invalid passphrase or corrupted data");
    }
    setLoading(false);
  }

  if (fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="text-lg font-medium">{linkError}</p>
            <p className="text-sm text-muted-foreground">
              This link may have expired or reached its view limit.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Shared Secret</CardTitle>
          <p className="text-sm text-muted-foreground">
            This content was securely shared via ZeroVault
          </p>
        </CardHeader>
        <CardContent>
          {!decryptedData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Enter passphrase to decrypt</label>
                <div className="relative">
                  <Input
                    type={showPassphrase ? "text" : "password"}
                    placeholder="Passphrase"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDecrypt()}
                    autoComplete="off"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    tabIndex={-1}
                  >
                    {showPassphrase ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button
                className="w-full"
                onClick={handleDecrypt}
                disabled={loading || !passphrase}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Decrypt
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/50 p-4">
                {decryptedData.type === "note" && (
                  <div>
                    <h3 className="font-semibold">{decryptedData.data.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{decryptedData.data.content}</p>
                  </div>
                )}
                {decryptedData.type === "password" && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">{decryptedData.data.title}</h3>
                    {decryptedData.data.website && (
                      <p className="text-sm"><span className="text-muted-foreground">Website:</span> {decryptedData.data.website}</p>
                    )}
                    {decryptedData.data.username && (
                      <p className="text-sm"><span className="text-muted-foreground">Username:</span> {decryptedData.data.username}</p>
                    )}
                    <p className="text-sm font-mono"><span className="text-muted-foreground font-sans">Password:</span> {decryptedData.data.password}</p>
                  </div>
                )}
                {decryptedData.type === "personal" && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">{decryptedData.data.title}</h3>
                    {decryptedData.data.fields?.map((f: any, i: number) => (
                      <p key={i} className="text-sm">
                        <span className="text-muted-foreground">{f.label}:</span> {f.value}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                <Lock className="mr-1 inline h-3 w-3" />
                Decrypted in your browser. Nothing was sent to the server.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

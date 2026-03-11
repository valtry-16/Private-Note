"use client";

import { useState } from "react";
import { Share2, Copy, Loader2, Check, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

interface ShareDialogProps {
  itemId: string;
  itemType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ itemId, itemType, open, onOpenChange }: ShareDialogProps) {
  const { user, masterPassword } = useVault();
  const supabase = createClient();
  const [passphrase, setPassphrase] = useState("");
  const [expiryHours, setExpiryHours] = useState("24");
  const [maxViews, setMaxViews] = useState("1");
  const [shareUrl, setShareUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCreateLink() {
    if (!user || !masterPassword || !passphrase) return;
    setCreating(true);

    try {
      // Fetch and decrypt the item
      const { data: item } = await supabase
        .from("vault_items")
        .select("encrypted_data, type")
        .eq("id", itemId)
        .single();

      if (!item) return;

      const decryptedData = await decrypt(item.encrypted_data, masterPassword);
      const sharePayload = JSON.stringify({
        type: item.type,
        data: JSON.parse(decryptedData),
      });

      // Re-encrypt with the share passphrase
      const encryptedShareData = await encrypt(sharePayload, passphrase);

      // Generate share key
      const shareKey = crypto.randomUUID();
      const expiresAt = new Date(
        Date.now() + parseInt(expiryHours) * 60 * 60 * 1000
      ).toISOString();

      await supabase.from("shared_links").insert({
        user_id: user.id,
        item_id: itemId,
        encrypted_data: encryptedShareData,
        share_key: shareKey,
        expires_at: expiresAt,
        max_views: parseInt(maxViews),
      });

      const url = `${window.location.origin}/share/${shareKey}`;
      setShareUrl(url);
    } catch (err) {
      console.error("Failed to create share link:", err);
    }

    setCreating(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setPassphrase("");
    setShareUrl("");
    setCopied(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" /> Share Securely
          </DialogTitle>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <p>The shared data will be re-encrypted with a passphrase you choose. Share the passphrase separately.</p>
            </div>
            <div className="space-y-2">
              <Label>Passphrase for recipient</Label>
              <Input
                type="text"
                placeholder="Choose a strong passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expires after</Label>
                <Select value={expiryHours} onValueChange={setExpiryHours}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max views</Label>
                <Select value={maxViews} onValueChange={setMaxViews}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 view</SelectItem>
                    <SelectItem value="3">3 views</SelectItem>
                    <SelectItem value="5">5 views</SelectItem>
                    <SelectItem value="10">10 views</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleCreateLink} disabled={creating || !passphrase}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Link className="mr-2 h-4 w-4" />
                Create Link
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
              <Check className="mr-1 inline h-4 w-4" /> Share link created!
            </div>
            <div className="space-y-2">
              <Label>Share URL</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="rounded-md border p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>Passphrase:</strong> {passphrase}</p>
              <p>Share the passphrase separately (e.g. via a different channel).</p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

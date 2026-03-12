"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  User,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  CreditCard,
  Landmark,
  Fingerprint,
  Wallet,
  Loader2,
  X,
  Wifi,
  KeyRound,
  FileText,
  Smartphone,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVaultItems } from "@/hooks/use-vault-items";
import { useSearch } from "@/hooks/use-search";
import { useVault } from "@/hooks/use-vault";
import { useClipboard } from "@/hooks/use-clipboard";
import { createClient } from "@/supabase/client";
import { encrypt, decrypt } from "@/encryption";
import { ItemActionsMenu } from "@/components/vault/item-actions-menu";
import type { DecryptedPersonalInfo } from "@/types";

const templates: Record<string, { label: string; icon: any; color: string; fields: { label: string; value: string }[] }> = {
  personal_id: {
    label: "Personal ID",
    icon: Fingerprint,
    color: "bg-blue-500/10 text-blue-500",
    fields: [
      { label: "ID Type", value: "" },
      { label: "Full Name", value: "" },
      { label: "ID Number", value: "" },
      { label: "Date of Birth", value: "" },
      { label: "Issue Date", value: "" },
      { label: "Expiry Date", value: "" },
      { label: "Issuing Authority", value: "" },
      { label: "Nationality", value: "" },
    ],
  },
  bank_card: {
    label: "Bank Card",
    icon: CreditCard,
    color: "bg-emerald-500/10 text-emerald-500",
    fields: [
      { label: "Card Name", value: "" },
      { label: "Card Number", value: "" },
      { label: "Cardholder Name", value: "" },
      { label: "Expiry Date (MM/YY)", value: "" },
      { label: "CVV", value: "" },
      { label: "PIN", value: "" },
      { label: "Bank Name", value: "" },
      { label: "Billing Address", value: "" },
    ],
  },
  bank_account: {
    label: "Bank Account",
    icon: Landmark,
    color: "bg-green-500/10 text-green-500",
    fields: [
      { label: "Bank Name", value: "" },
      { label: "Account Holder", value: "" },
      { label: "Account Number", value: "" },
      { label: "Routing Number", value: "" },
      { label: "SWIFT/BIC", value: "" },
      { label: "IBAN", value: "" },
      { label: "Account Type", value: "" },
      { label: "Branch", value: "" },
    ],
  },
  crypto_wallet: {
    label: "Crypto Wallet",
    icon: Wallet,
    color: "bg-purple-500/10 text-purple-500",
    fields: [
      { label: "Wallet Name", value: "" },
      { label: "Cryptocurrency", value: "" },
      { label: "Wallet Address", value: "" },
      { label: "Private Key", value: "" },
      { label: "Seed Phrase", value: "" },
      { label: "Exchange", value: "" },
      { label: "Network", value: "" },
    ],
  },
  wifi_password: {
    label: "WiFi Password",
    icon: Wifi,
    color: "bg-cyan-500/10 text-cyan-500",
    fields: [
      { label: "Network Name (SSID)", value: "" },
      { label: "Password", value: "" },
      { label: "Security Type", value: "" },
      { label: "Router IP", value: "" },
      { label: "Admin Username", value: "" },
      { label: "Admin Password", value: "" },
    ],
  },
  api_key: {
    label: "API Key",
    icon: KeyRound,
    color: "bg-orange-500/10 text-orange-500",
    fields: [
      { label: "Service Name", value: "" },
      { label: "API Key", value: "" },
      { label: "API Secret", value: "" },
      { label: "Base URL", value: "" },
      { label: "Environment", value: "" },
      { label: "Rate Limit", value: "" },
    ],
  },
  document: {
    label: "Document",
    icon: FileText,
    color: "bg-amber-500/10 text-amber-500",
    fields: [
      { label: "Document Type", value: "" },
      { label: "Document Number", value: "" },
      { label: "Issued By", value: "" },
      { label: "Issue Date", value: "" },
      { label: "Expiry Date", value: "" },
      { label: "Holder Name", value: "" },
    ],
  },
  other: {
    label: "Other",
    icon: Shield,
    color: "bg-gray-500/10 text-gray-500",
    fields: [{ label: "", value: "" }],
  },
};

const templateList = Object.entries(templates).map(([key, val]) => ({ value: key, ...val }));

export default function PersonalInfoPage() {
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "true";
  const router = useRouter();
  const { user, masterPassword } = useVault();
  const { copyToClipboard } = useClipboard();
  const { items, loading, refetch } = useVaultItems("personal");
  const { query, setQuery, filteredItems } = useSearch(items);
  const supabase = createClient();

  const [dialogOpen, setDialogOpen] = useState(isNew);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);
  const [formData, setFormData] = useState<DecryptedPersonalInfo>({
    title: "",
    category: "other",
    fields: [{ label: "", value: "" }],
    notes: "",
  });
  const [visibleItems, setVisibleItems] = useState<Record<string, DecryptedPersonalInfo>>({});
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  async function loadItem(id: string) {
    if (visibleItems[id]) return;
    const { data } = await supabase
      .from("vault_items")
      .select("encrypted_data")
      .eq("id", id)
      .single();

    if (data && masterPassword) {
      const decrypted = JSON.parse(
        await decrypt(data.encrypted_data, masterPassword)
      ) as DecryptedPersonalInfo;
      setVisibleItems((prev) => ({ ...prev, [id]: decrypted }));
    }
  }

  async function handleSave() {
    if (!user || !masterPassword) return;
    setSaving(true);

    const cleanFields = formData.fields.filter((f) => f.label.trim() || f.value.trim());
    const dataToSave = { ...formData, fields: cleanFields };

    const encryptedData = await encrypt(JSON.stringify(dataToSave), masterPassword);
    const encryptedTitle = await encrypt(formData.title, masterPassword);

    if (editingId) {
      await supabase
        .from("vault_items")
        .update({
          encrypted_data: encryptedData,
          metadata: { encrypted_title: encryptedTitle },
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);
      setVisibleItems((prev) => ({ ...prev, [editingId]: dataToSave }));
    } else {
      await supabase.from("vault_items").insert({
        user_id: user.id,
        type: "personal",
        encrypted_data: encryptedData,
        metadata: { encrypted_title: encryptedTitle },
      });
    }

    resetForm();
    refetch();
  }

  async function handleEdit(id: string) {
    await loadItem(id);
    const item = visibleItems[id];
    if (item) {
      setFormData(item);
      setEditingId(id);
      setDialogOpen(true);
    } else {
      // Wait for load
      const { data } = await supabase
        .from("vault_items")
        .select("encrypted_data")
        .eq("id", id)
        .single();
      if (data && masterPassword) {
        const decrypted = JSON.parse(
          await decrypt(data.encrypted_data, masterPassword)
        ) as DecryptedPersonalInfo;
        setFormData(decrypted);
        setEditingId(id);
        setDialogOpen(true);
      }
    }
  }

  async function handleDelete(id: string) {
    await supabase
      .from("vault_items")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", id);
    setVisibleItems((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    refetch();
  }

  async function toggleHidden(id: string) {
    await supabase.from("vault_items").update({ is_hidden: true, updated_at: new Date().toISOString() }).eq("id", id);
    refetch();
  }

  function addField() {
    setFormData((f) => ({ ...f, fields: [...f.fields, { label: "", value: "" }] }));
  }

  function removeField(index: number) {
    setFormData((f) => ({
      ...f,
      fields: f.fields.filter((_, i) => i !== index),
    }));
  }

  function updateField(index: number, key: "label" | "value", val: string) {
    setFormData((f) => ({
      ...f,
      fields: f.fields.map((field, i) => (i === index ? { ...field, [key]: val } : field)),
    }));
  }

  function resetForm() {
    setDialogOpen(false);
    setShowTemplateSelect(false);
    setEditingId(null);
    setFormData({ title: "", category: "other", fields: [{ label: "", value: "" }], notes: "" });
    if (isNew) router.replace("/vault/personal");
  }

  function selectTemplate(templateKey: string) {
    const tmpl = templates[templateKey];
    if (tmpl) {
      setFormData({
        title: "",
        category: templateKey,
        fields: tmpl.fields.map((f) => ({ ...f })),
        notes: "",
      });
    }
    setShowTemplateSelect(false);
    setDialogOpen(true);
  }

  function toggleVisibility(id: string) {
    if (!showFields[id]) loadItem(id);
    setShowFields((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Personal Information</h1>
          <p className="text-sm text-muted-foreground">
            Securely store IDs, bank accounts, crypto keys, and more
          </p>
        </div>
        <Button onClick={() => { setShowTemplateSelect(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Add Info
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search personal info..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <User className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {query ? "No matching items" : "No personal info saved yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems
            .filter((i) => !i.is_hidden && !i.is_deleted)
            .map((item) => {
              const isVisible = showFields[item.id];
              const details = visibleItems[item.id];
              const Icon = templates[details?.category || "other"]?.icon || Shield;
              const color = templates[details?.category || "other"]?.color || templates.other.color;

              return (
                <Card key={item.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {templates[details?.category || "other"]?.label || "Personal"} •{" "}
                          {new Date(item.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleVisibility(item.id)}
                        >
                          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item.id)}>
                          <Edit3 className="h-4 w-4" />
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
                    </div>
                    {isVisible && details && (
                      <div className="mt-4 space-y-2 rounded-md bg-muted/50 p-3">
                        {details.fields.map((field, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{field.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{field.value}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(field.value)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {details.notes && (
                          <p className="mt-2 text-xs text-muted-foreground">{details.notes}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateSelect} onOpenChange={(open) => { if (!open) setShowTemplateSelect(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {templateList.map((tmpl) => (
              <button
                key={tmpl.value}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted"
                onClick={() => selectTemplate(tmpl.value)}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${tmpl.color}`}>
                  <tmpl.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{tmpl.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit" : "Add"} {templates[formData.category]?.label || "Personal Info"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder={`e.g. ${formData.category === "bank_card" ? "Visa Gold Card" : formData.category === "wifi_password" ? "Home WiFi" : formData.category === "api_key" ? "Stripe API" : "My Passport"}`}
                  value={formData.title}
                  onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Fields</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addField}>
                    <Plus className="mr-1 h-3 w-3" /> Add Field
                  </Button>
                </div>
                {formData.fields.map((field, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <Input
                      placeholder="Label"
                      className="flex-1"
                      value={field.label}
                      onChange={(e) => updateField(i, "label", e.target.value)}
                    />
                    <Input
                      placeholder="Value"
                      className="flex-1"
                      value={field.value}
                      onChange={(e) => updateField(i, "value", e.target.value)}
                    />
                    {formData.fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => removeField(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.title.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

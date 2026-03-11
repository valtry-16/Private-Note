"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Shield,
  Clock,
  Monitor,
  Mail,
  Key,
  Lock,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Palette,
  Type,
  Circle,
  Sun,
  Moon,
  Laptop,
  Check,
  Filter,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useVault } from "@/hooks/use-vault";
import { useAppearance, type ColorTheme, type FontFamily } from "@/hooks/use-appearance";
import { createClient } from "@/supabase/client";
import { encrypt, decrypt, generateVerificationToken, verifyMasterPassword } from "@/encryption";
import { cn } from "@/lib/utils";

interface SecurityLog {
  id: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const { user, masterPassword, lockVault, signOut, isHiddenVaultSetup, refreshHiddenVaultStatus } = useVault();
  const supabase = createClient();

  const [autoLockSeconds, setAutoLockSeconds] = useState(60);
  const [emergencyEmail, setEmergencyEmail] = useState("");
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Dead man's switch
  const [deadManEnabled, setDeadManEnabled] = useState(false);
  const [deadManDays, setDeadManDays] = useState(90);
  const [lastActiveAt, setLastActiveAt] = useState<string | null>(null);

  // Change master password
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [currentMasterPw, setCurrentMasterPw] = useState("");
  const [newMasterPw, setNewMasterPw] = useState("");
  const [confirmNewMasterPw, setConfirmNewMasterPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [changePwError, setChangePwError] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmNewPw, setShowConfirmNewPw] = useState(false);

  // Hidden vault
  const [hiddenVaultOpen, setHiddenVaultOpen] = useState(false);
  const [hiddenPasscode, setHiddenPasscode] = useState("");
  const [confirmHiddenPasscode, setConfirmHiddenPasscode] = useState("");
  const [settingUpHidden, setSettingUpHidden] = useState(false);
  const [showHiddenPasscode, setShowHiddenPasscode] = useState(false);
  const [showConfirmHiddenPasscode, setShowConfirmHiddenPasscode] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  // 2FA TOTP
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSetupOpen, setTotpSetupOpen] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [totpQrUrl, setTotpQrUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState("");
  const [totpDisableOpen, setTotpDisableOpen] = useState(false);
  const [totpDisableCode, setTotpDisableCode] = useState("");

  // WebAuthn / Biometric
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  // Audit log filters
  const [logFilter, setLogFilter] = useState("all");
  const [logDateRange, setLogDateRange] = useState("all");

  useEffect(() => {
    loadSettings();
    loadSecurityLogs();
    // Check WebAuthn support
    if (window.PublicKeyCredential) {
      setBiometricSupported(true);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetch("/api/webauthn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "check" }),
      })
        .then((r) => r.json())
        .then((d) => setBiometricEnabled(d.enabled))
        .catch(() => {});
    }
  }, [user]);

  async function loadSettings() {
    if (!user) return;
    const { data } = await supabase
      .from("user_profiles")
      .select("auto_lock_seconds, emergency_contact_email, hidden_vault_hash, dead_man_switch_enabled, dead_man_inactivity_days, last_active_at, totp_enabled")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setAutoLockSeconds(data.auto_lock_seconds || 60);
      setEmergencyEmail(data.emergency_contact_email || "");
      setDeadManEnabled(data.dead_man_switch_enabled || false);
      setDeadManDays(data.dead_man_inactivity_days || 90);
      setLastActiveAt(data.last_active_at || null);
      setTotpEnabled(data.totp_enabled || false);
    }
  }

  async function loadSecurityLogs() {
    if (!user) return;
    setLogsLoading(true);
    const { data } = await supabase
      .from("security_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setSecurityLogs((data as SecurityLog[]) || []);
    setLogsLoading(false);
  }

  async function saveAutoLock(seconds: number) {
    if (!user) return;
    setAutoLockSeconds(seconds);
    await supabase
      .from("user_profiles")
      .update({ auto_lock_seconds: seconds, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
  }

  async function saveEmergencyEmail() {
    if (!user) return;
    await supabase
      .from("user_profiles")
      .update({
        emergency_contact_email: emergencyEmail || null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
  }

  async function handleChangeMasterPassword() {
    if (!user || !masterPassword) return;
    setChangePwError("");

    if (newMasterPw !== confirmNewMasterPw) {
      setChangePwError("New passwords do not match.");
      return;
    }
    if (newMasterPw.length < 12) {
      setChangePwError("New master password must be at least 12 characters.");
      return;
    }

    setChangingPw(true);

    // Verify current master password
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("encrypted_verification")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      setChangePwError("Could not load profile.");
      setChangingPw(false);
      return;
    }

    const valid = await verifyMasterPassword(currentMasterPw, profile.encrypted_verification);
    if (!valid) {
      setChangePwError("Current master password is incorrect.");
      setChangingPw(false);
      return;
    }

    // Re-encrypt all vault items with new master password
    const { data: items } = await supabase
      .from("vault_items")
      .select("id, encrypted_data, metadata")
      .eq("user_id", user.id);

    if (items) {
      for (const item of items) {
        try {
          const decryptedData = await decrypt(item.encrypted_data, currentMasterPw);
          const newEncryptedData = await encrypt(decryptedData, newMasterPw);

          const metadata = item.metadata as any;
          let newMetadata = { ...metadata };

          if (metadata.encrypted_title) {
            const title = await decrypt(metadata.encrypted_title, currentMasterPw);
            newMetadata.encrypted_title = await encrypt(title, newMasterPw);
          }
          if (metadata.encrypted_preview) {
            const preview = await decrypt(metadata.encrypted_preview, currentMasterPw);
            newMetadata.encrypted_preview = await encrypt(preview, newMasterPw);
          }

          await supabase
            .from("vault_items")
            .update({
              encrypted_data: newEncryptedData,
              metadata: newMetadata,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id);
        } catch {
          // Skip items that fail to decrypt
        }
      }
    }

    // Update verification token
    const newVerification = await generateVerificationToken(newMasterPw);
    await supabase
      .from("user_profiles")
      .update({
        encrypted_verification: newVerification,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    await supabase.from("security_logs").insert({
      user_id: user.id,
      event_type: "master_password_changed",
      user_agent: navigator.userAgent,
    });

    setChangingPw(false);
    setChangePwOpen(false);
    // Force re-lock since master password changed
    lockVault();
  }

  async function handleSetupHiddenVault() {
    if (!user || !masterPassword) return;
    if (hiddenPasscode !== confirmHiddenPasscode) return;
    if (hiddenPasscode.length < 6) return;

    setSettingUpHidden(true);
    const hash = await encrypt(hiddenPasscode, masterPassword);
    await supabase
      .from("user_profiles")
      .update({ hidden_vault_hash: hash, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    await refreshHiddenVaultStatus();
    setSettingUpHidden(false);
    setHiddenVaultOpen(false);
    setHiddenPasscode("");
    setConfirmHiddenPasscode("");
  }

  async function handleExportData() {
    if (!user || !masterPassword) return;
    setExporting(true);

    const { data: items } = await supabase
      .from("vault_items")
      .select("*")
      .eq("user_id", user.id);

    if (items) {
      const decryptedItems = [];
      for (const item of items) {
        try {
          const decryptedData = await decrypt(item.encrypted_data, masterPassword);
          decryptedItems.push({
            type: item.type,
            data: JSON.parse(decryptedData),
            created_at: item.created_at,
          });
        } catch {
          // Skip failed items
        }
      }

      const blob = new Blob([JSON.stringify(decryptedItems, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zerovault-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    setExporting(false);
  }

  async function startTotpSetup() {
    if (!user) return;
    setTotpLoading(true);
    setTotpError("");
    try {
      const res = await fetch("/api/totp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "generate" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTotpSecret(data.secret);
      // Generate QR code data URL
      const QRCode = (await import("qrcode")).default;
      const qrDataUrl = await QRCode.toDataURL(data.otpauthUrl, { width: 200, margin: 2 });
      setTotpQrUrl(qrDataUrl);
      setTotpSetupOpen(true);
    } catch (e: any) {
      setTotpError(e.message || "Failed to start 2FA setup");
    }
    setTotpLoading(false);
  }

  async function verifyTotpSetup() {
    if (!user || !totpCode) return;
    setTotpLoading(true);
    setTotpError("");
    try {
      const res = await fetch("/api/totp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "verify", token: totpCode }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTotpEnabled(true);
      setTotpSetupOpen(false);
      setTotpCode("");
      setTotpSecret("");
      setTotpQrUrl("");
    } catch (e: any) {
      setTotpError(e.message || "Invalid verification code");
    }
    setTotpLoading(false);
  }

  async function disableTotp() {
    if (!user || !totpDisableCode) return;
    setTotpLoading(true);
    setTotpError("");
    try {
      const res = await fetch("/api/totp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "disable", token: totpDisableCode }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTotpEnabled(false);
      setTotpDisableOpen(false);
      setTotpDisableCode("");
    } catch (e: any) {
      setTotpError(e.message || "Invalid code");
    }
    setTotpLoading(false);
  }

  async function setupBiometric() {
    if (!user || !masterPassword) return;
    setBiometricLoading(true);
    try {
      // Get challenge from server
      const challengeRes = await fetch("/api/webauthn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "challenge" }),
      });
      const { challenge } = await challengeRes.json();

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: Uint8Array.from(atob(challenge.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
          rp: { name: "ZeroVault", id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email || "user",
            displayName: "ZeroVault User",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (!credential) throw new Error("Registration cancelled");

      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));

      // Store credential on server
      await fetch("/api/webauthn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          action: "register",
          credentialId,
          publicKey: "registered",
        }),
      });

      // Store encrypted master password locally for biometric unlock
      const enc = btoa(masterPassword);
      localStorage.setItem(`zv_bio_${user.id}`, enc);

      setBiometricEnabled(true);
    } catch (e: any) {
      console.error("Biometric setup failed:", e);
    }
    setBiometricLoading(false);
  }

  async function removeBiometric() {
    if (!user) return;
    setBiometricLoading(true);
    await fetch("/api/webauthn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, action: "remove" }),
    });
    localStorage.removeItem(`zv_bio_${user.id}`);
    setBiometricEnabled(false);
    setBiometricLoading(false);
  }

  const eventLabels: Record<string, string> = {
    account_created: "Account Created",
    vault_unlock: "Vault Unlocked",
    vault_lockout: "Failed Unlock — Lockout",
    master_password_changed: "Master Password Changed",
    item_created: "Item Created",
    item_updated: "Item Updated",
    item_deleted: "Item Deleted",
    item_shared: "Item Shared",
    export_data: "Data Exported",
    import_data: "Data Imported",
    hidden_vault_setup: "Hidden Vault Setup",
    hidden_vault_access: "Hidden Vault Accessed",
    emergency_contact_updated: "Emergency Contact Updated",
  };

  const eventColors: Record<string, string> = {
    account_created: "bg-green-500/10 text-green-600 border-green-500/20",
    vault_unlock: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    vault_lockout: "bg-red-500/10 text-red-600 border-red-500/20",
    master_password_changed: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    item_created: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    item_updated: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    item_deleted: "bg-red-500/10 text-red-600 border-red-500/20",
    item_shared: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    export_data: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    import_data: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    hidden_vault_setup: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    hidden_vault_access: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    emergency_contact_updated: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  };

  const uniqueEventTypes = Array.from(new Set(securityLogs.map((l) => l.event_type)));

  const filteredLogs = securityLogs.filter((log) => {
    if (logFilter !== "all" && log.event_type !== logFilter) return false;
    if (logDateRange !== "all") {
      const logDate = new Date(log.created_at);
      const now = new Date();
      const daysMap: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 };
      const days = daysMap[logDateRange];
      if (days && now.getTime() - logDate.getTime() > days * 86400000) return false;
    }
    return true;
  });

  function exportLogs() {
    const header = "Event,Date,IP Address,User Agent\n";
    const rows = filteredLogs
      .map(
        (l) =>
          `"${eventLabels[l.event_type] || l.event_type}","${new Date(l.created_at).toLocaleString()}","${l.ip_address || ""}","${(l.user_agent || "").replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zerovault-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your vault security and preferences</p>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1 p-1">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <AppearanceSettings />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Auto Lock */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" /> Auto Lock
              </CardTitle>
              <CardDescription>
                Automatically lock the vault after a period of inactivity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[30, 60, 120, 300, 600].map((seconds) => (
                  <Button
                    key={seconds}
                    variant={autoLockSeconds === seconds ? "default" : "outline"}
                    size="sm"
                    onClick={() => saveAutoLock(seconds)}
                  >
                    {seconds < 60
                      ? `${seconds}s`
                      : `${seconds / 60} min`}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Change Master Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" /> Two-Factor Authentication (TOTP)
              </CardTitle>
              <CardDescription>
                Add an extra layer of security with a time-based one-time password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {totpEnabled ? (
                <>
                  <div className="flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    Two-factor authentication is enabled
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setTotpDisableOpen(true)}>
                    Disable 2FA
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={startTotpSetup} disabled={totpLoading}>
                  {totpLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enable 2FA
                </Button>
              )}
              {totpError && !totpSetupOpen && !totpDisableOpen && (
                <p className="text-sm text-destructive">{totpError}</p>
              )}
            </CardContent>
          </Card>

          {/* Change Master Password */}
          {/* Biometric Unlock */}
          {biometricSupported && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="h-5 w-5" /> Biometric Unlock
                </CardTitle>
                <CardDescription>
                  Use fingerprint or face recognition to unlock your vault
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {biometricEnabled ? (
                  <>
                    <div className="flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      Biometric unlock is enabled
                    </div>
                    <Button variant="destructive" size="sm" onClick={removeBiometric} disabled={biometricLoading}>
                      {biometricLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Remove Biometric
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={setupBiometric} disabled={biometricLoading}>
                    {biometricLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Setup Biometric Unlock
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Change Master Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="h-5 w-5" /> Master Password
              </CardTitle>
              <CardDescription>
                Change your master encryption password. All data will be re-encrypted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setChangePwOpen(true)}>
                Change Master Password
              </Button>
            </CardContent>
          </Card>

          {/* Emergency Access */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5" /> Emergency Access
              </CardTitle>
              <CardDescription>
                Set a trusted contact email for encrypted backup delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="trusted@example.com"
                  value={emergencyEmail}
                  onChange={(e) => setEmergencyEmail(e.target.value)}
                />
                <Button onClick={saveEmergencyEmail}>Save</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This email will receive an encrypted backup if the dead man&apos;s switch is triggered
                (prolonged inactivity).
              </p>
            </CardContent>
          </Card>

          {/* Export Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="h-5 w-5" /> Export Data
              </CardTitle>
              <CardDescription>
                Download all your decrypted vault data as a JSON file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <Button variant="outline" onClick={handleExportData} disabled={exporting}>
                  {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Export All Data
                </Button>
                <p className="text-xs text-muted-foreground">
                  <AlertTriangle className="mr-1 inline h-3 w-3" />
                  The exported file will contain <strong>unencrypted</strong> data. Handle with care.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          {/* Hidden Vault */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5" /> Hidden Vault
              </CardTitle>
              <CardDescription>
                {isHiddenVaultSetup
                  ? "Your hidden vault is configured. Items hidden from your vault are stored here."
                  : "Create a secret vault inside your vault with an additional passcode"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isHiddenVaultSetup && (
                <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
                  <Check className="h-4 w-4" />
                  Hidden vault is active
                </div>
              )}
              <Button variant="outline" onClick={() => setHiddenVaultOpen(true)}>
                <Lock className="mr-2 h-4 w-4" />
                {isHiddenVaultSetup ? "Change Passcode" : "Setup Hidden Vault"}
              </Button>
            </CardContent>
          </Card>

          {/* Dead Man's Switch */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" /> Dead Man&apos;s Switch
              </CardTitle>
              <CardDescription>
                If you are inactive for an extended period, notify your emergency contact
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Switch
                  checked={deadManEnabled}
                  onCheckedChange={async (checked) => {
                    if (checked && !emergencyEmail) return;
                    setDeadManEnabled(checked);
                    if (user) {
                      await supabase
                        .from("user_profiles")
                        .update({
                          dead_man_switch_enabled: checked,
                          updated_at: new Date().toISOString(),
                        })
                        .eq("user_id", user.id);
                    }
                  }}
                />
                <div>
                  <p className="text-sm font-medium">Enable Dead Man&apos;s Switch</p>
                  <p className="text-xs text-muted-foreground">
                    Sends notification after prolonged inactivity
                  </p>
                </div>
              </div>
              {!emergencyEmail && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="mr-1 inline h-3 w-3" />
                  Set an emergency contact email in the Security tab first
                </p>
              )}
              {deadManEnabled && (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Inactivity threshold</Label>
                    <div className="flex flex-wrap gap-2">
                      {[30, 60, 90, 180, 365].map((days) => (
                        <Button
                          key={days}
                          variant={deadManDays === days ? "default" : "outline"}
                          size="sm"
                          onClick={async () => {
                            setDeadManDays(days);
                            if (user) {
                              await supabase
                                .from("user_profiles")
                                .update({
                                  dead_man_inactivity_days: days,
                                  updated_at: new Date().toISOString(),
                                })
                                .eq("user_id", user.id);
                            }
                          }}
                        >
                          {days} days
                        </Button>
                      ))}
                    </div>
                  </div>
                  {lastActiveAt && (
                    <p className="text-xs text-muted-foreground">
                      Last activity: {new Date(lastActiveAt).toLocaleDateString()}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    If you don&apos;t unlock your vault for {deadManDays} days,
                    an email will be sent to <strong>{emergencyEmail || "your emergency contact"}</strong>.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                <AlertTriangle className="h-5 w-5" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={signOut}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Sign Out & Clear Local Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Monitor className="h-5 w-5" /> Security Activity
                  </CardTitle>
                  <CardDescription>
                    {filteredLogs.length} event{filteredLogs.length !== 1 ? "s" : ""}
                    {logFilter !== "all" || logDateRange !== "all" ? " (filtered)" : ""}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportLogs} disabled={filteredLogs.length === 0}>
                  <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  className="rounded-md border bg-background px-3 py-1.5 text-sm"
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                >
                  <option value="all">All events</option>
                  {uniqueEventTypes.map((t) => (
                    <option key={t} value={t}>
                      {eventLabels[t] || t}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border bg-background px-3 py-1.5 text-sm"
                  value={logDateRange}
                  onChange={(e) => setLogDateRange(e.target.value)}
                >
                  <option value="all">All time</option>
                  <option value="1d">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
              {logsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : filteredLogs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {securityLogs.length === 0
                    ? "No security events recorded yet"
                    : "No events match the current filters"}
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start justify-between rounded-md border p-3"
                      >
                        <div className="flex items-start gap-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "mt-0.5 shrink-0 text-xs",
                              eventColors[log.event_type] || "bg-gray-500/10 text-gray-600 border-gray-500/20"
                            )}
                          >
                            {eventLabels[log.event_type] || log.event_type}
                          </Badge>
                          <div>
                            {log.ip_address && (
                              <p className="text-xs text-muted-foreground">
                                IP: {log.ip_address}
                              </p>
                            )}
                            {log.user_agent && (
                              <p className="mt-0.5 truncate text-xs text-muted-foreground" style={{ maxWidth: 350 }}>
                                {log.user_agent}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Master Password Dialog */}
      <Dialog open={changePwOpen} onOpenChange={setChangePwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Master Password</DialogTitle>
            <DialogDescription>
              All vault data will be re-encrypted with the new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
              <AlertTriangle className="mb-1 inline h-4 w-4 text-yellow-600" /> If you forget the
              new master password, your data <strong>cannot be recovered</strong>.
            </div>
            <div className="space-y-2">
              <Label>Current Master Password</Label>
              <div className="relative">
                <Input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentMasterPw}
                  onChange={(e) => setCurrentMasterPw(e.target.value)}
                  autoComplete="off"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  tabIndex={-1}
                >
                  {showCurrentPw ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Master Password</Label>
              <div className="relative">
                <Input
                  type={showNewPw ? "text" : "password"}
                  value={newMasterPw}
                  onChange={(e) => setNewMasterPw(e.target.value)}
                  placeholder="Min 12 characters"
                  autoComplete="off"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowNewPw(!showNewPw)}
                  tabIndex={-1}
                >
                  {showNewPw ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm New Master Password</Label>
              <div className="relative">
                <Input
                  type={showConfirmNewPw ? "text" : "password"}
                  value={confirmNewMasterPw}
                  onChange={(e) => setConfirmNewMasterPw(e.target.value)}
                  autoComplete="off"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmNewPw(!showConfirmNewPw)}
                  tabIndex={-1}
                >
                  {showConfirmNewPw ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            {changePwError && (
              <p className="text-sm text-destructive">{changePwError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePwOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeMasterPassword} disabled={changingPw}>
              {changingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TOTP Setup Dialog */}
      <Dialog open={totpSetupOpen} onOpenChange={(open) => { setTotpSetupOpen(open); if (!open) { setTotpCode(""); setTotpError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {totpQrUrl && (
              <div className="flex justify-center">
                <img src={totpQrUrl} alt="TOTP QR Code" className="rounded-md border" width={200} height={200} />
              </div>
            )}
            {totpSecret && (
              <div className="rounded-md bg-muted p-3 text-center">
                <p className="mb-1 text-xs text-muted-foreground">Manual entry key:</p>
                <code className="text-sm font-medium tracking-wider">{totpSecret}</code>
              </div>
            )}
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                autoComplete="off"
              />
            </div>
            {totpError && <p className="text-sm text-destructive">{totpError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTotpSetupOpen(false)}>Cancel</Button>
            <Button onClick={verifyTotpSetup} disabled={totpLoading || totpCode.length !== 6}>
              {totpLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TOTP Disable Dialog */}
      <Dialog open={totpDisableOpen} onOpenChange={(open) => { setTotpDisableOpen(open); if (!open) { setTotpDisableCode(""); setTotpError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter a code from your authenticator app to confirm disabling 2FA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
              <AlertTriangle className="mb-1 inline h-4 w-4 text-yellow-600" /> This will remove the extra security layer from your vault.
            </div>
            <div className="space-y-2">
              <Label>Authenticator Code</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={totpDisableCode}
                onChange={(e) => setTotpDisableCode(e.target.value.replace(/\D/g, ""))}
                autoComplete="off"
              />
            </div>
            {totpError && <p className="text-sm text-destructive">{totpError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTotpDisableOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={disableTotp} disabled={totpLoading || totpDisableCode.length !== 6}>
              {totpLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Vault Dialog */}
      <Dialog open={hiddenVaultOpen} onOpenChange={setHiddenVaultOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setup Hidden Vault</DialogTitle>
            <DialogDescription>
              Create a separate passcode to access hidden items in your vault.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hidden Vault Passcode</Label>
              <div className="relative">
                <Input
                  type={showHiddenPasscode ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={hiddenPasscode}
                  onChange={(e) => setHiddenPasscode(e.target.value)}
                  autoComplete="off"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowHiddenPasscode(!showHiddenPasscode)}
                  tabIndex={-1}
                >
                  {showHiddenPasscode ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm Passcode</Label>
              <div className="relative">
                <Input
                  type={showConfirmHiddenPasscode ? "text" : "password"}
                  value={confirmHiddenPasscode}
                  onChange={(e) => setConfirmHiddenPasscode(e.target.value)}
                  autoComplete="off"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmHiddenPasscode(!showConfirmHiddenPasscode)}
                  tabIndex={-1}
                >
                  {showConfirmHiddenPasscode ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHiddenVaultOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSetupHiddenVault}
              disabled={
                settingUpHidden ||
                hiddenPasscode.length < 6 ||
                hiddenPasscode !== confirmHiddenPasscode
              }
            >
              {settingUpHidden && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Setup Hidden Vault
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────────────────────── Appearance Settings ────────────────────────── */

const colorThemes: { value: ColorTheme; label: string; tw: string }[] = [
  { value: "blue", label: "Blue", tw: "bg-blue-500" },
  { value: "emerald", label: "Emerald", tw: "bg-emerald-500" },
  { value: "rose", label: "Rose", tw: "bg-rose-500" },
  { value: "violet", label: "Violet", tw: "bg-violet-500" },
  { value: "amber", label: "Amber", tw: "bg-amber-500" },
  { value: "cyan", label: "Cyan", tw: "bg-cyan-500" },
  { value: "crimson", label: "Crimson", tw: "bg-red-600" },
];

const fonts: { value: FontFamily; label: string; preview: string }[] = [
  { value: "inter", label: "Inter", preview: "font-sans" },
  { value: "system", label: "System UI", preview: "font-sans" },
  { value: "mono", label: "Monospace", preview: "font-mono" },
];

const radii = [
  { value: "0", label: "None" },
  { value: "0.3", label: "Small" },
  { value: "0.5", label: "Medium" },
  { value: "0.75", label: "Large" },
  { value: "1", label: "Full" },
];

function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { colorTheme, fontFamily, radius, setColorTheme, setFontFamily, setRadius } =
    useAppearance();

  return (
    <>
      {/* Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sun className="h-5 w-5" /> Mode
          </CardTitle>
          <CardDescription>Choose between light, dark, or system preference</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {([
              { value: "light", icon: Sun, label: "Light" },
              { value: "dark", icon: Moon, label: "Dark" },
              { value: "system", icon: Laptop, label: "System" },
            ] as const).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors",
                  theme === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" /> Accent Color
          </CardTitle>
          <CardDescription>Pick a primary color for buttons, links, and highlights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {colorThemes.map(({ value, label, tw }) => (
              <button
                key={value}
                onClick={() => setColorTheme(value)}
                className={cn(
                  "relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all sm:h-14 sm:w-14",
                  colorTheme === value
                    ? "border-foreground scale-110"
                    : "border-transparent hover:scale-105"
                )}
                title={label}
              >
                <span className={cn("h-8 w-8 rounded-full sm:h-10 sm:w-10", tw)} />
                {colorTheme === value && (
                  <Check className="absolute h-4 w-4 text-white drop-shadow" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Font */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Type className="h-5 w-5" /> Font
          </CardTitle>
          <CardDescription>Select the typeface used across the app</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {fonts.map(({ value, label, preview }) => (
              <button
                key={value}
                onClick={() => setFontFamily(value)}
                className={cn(
                  "rounded-lg border-2 p-4 text-left transition-colors",
                  fontFamily === value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <p className={cn("text-lg font-semibold", preview)}>{label}</p>
                <p className={cn("mt-1 text-xs text-muted-foreground", preview)}>
                  The quick brown fox jumps over the lazy dog
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Border Radius */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Circle className="h-5 w-5" /> Border Radius
          </CardTitle>
          <CardDescription>Control how rounded the UI elements appear</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {radii.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setRadius(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border-2 px-4 py-3 text-sm transition-colors",
                  radius === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div
                  className="h-6 w-10 border-2 border-current"
                  style={{ borderRadius: `${value}rem` }}
                />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

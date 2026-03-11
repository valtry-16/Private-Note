"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  FileText,
  Key,
  Upload,
  User,
  Settings,
  Search,
  LogOut,
  Lock,
  Star,
  Pin,
  FolderClosed,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Menu,
  X,
  EyeOff,
  Trash2,
  Tag,
  Activity,
  RefreshCw,
  Cloud,
  CloudOff,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVault } from "@/hooks/use-vault";

const navItems = [
  { href: "/vault", icon: Search, label: "Dashboard" },
  { href: "/vault/notes", icon: FileText, label: "Notes" },
  { href: "/vault/passwords", icon: Key, label: "Passwords" },
  { href: "/vault/documents", icon: Upload, label: "Documents" },
  { href: "/vault/personal", icon: User, label: "Personal Info" },
  { href: "/vault/favorites", icon: Star, label: "Favorites" },
  { href: "/vault/folders", icon: FolderClosed, label: "Folders" },
  { href: "/vault/tags", icon: Tag, label: "Tags" },
  { href: "/vault/health", icon: Activity, label: "Password Health" },
  { href: "/vault/hidden", icon: EyeOff, label: "Hidden Vault" },
  { href: "/vault/trash", icon: Trash2, label: "Trash" },
  { href: "/vault/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { lockVault, signOut } = useVault();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Track online status and sync time
  useEffect(() => {
    setIsOnline(navigator.onLine);
    setLastSync(new Date());

    const handleOnline = () => { setIsOnline(true); setLastSync(new Date()); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Update sync time periodically when online
    const interval = setInterval(() => {
      if (navigator.onLine) setLastSync(new Date());
    }, 60000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  function formatSyncTime(date: Date | null) {
    if (!date) return "Never";
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold">ZeroVault</span>
          </div>
        )}
        {/* Desktop collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden shrink-0 md:flex"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        {/* Mobile close */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(false)}
          className="shrink-0 md:hidden"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/vault"
                ? pathname === "/vault"
                : pathname.startsWith(item.href);

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {(!collapsed || mobileOpen) && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed && !mobileOpen) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.href}>{linkContent}</div>;
          })}
        </nav>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="space-y-1 border-t p-2">
        {/* Sync indicator */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground",
            collapsed && !mobileOpen && "justify-center px-0"
          )}
        >
          {isOnline ? (
            <Cloud className="h-4 w-4 shrink-0 text-green-500" />
          ) : (
            <CloudOff className="h-4 w-4 shrink-0 text-yellow-500" />
          )}
          {(!collapsed || mobileOpen) && (
            <span>
              {isOnline ? `Synced ${formatSyncTime(lastSync)}` : "Offline"}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3",
            collapsed && !mobileOpen && "justify-center px-0"
          )}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 shrink-0" />
          ) : (
            <Moon className="h-5 w-5 shrink-0" />
          )}
          {(!collapsed || mobileOpen) && (
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          )}
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3",
            collapsed && !mobileOpen && "justify-center px-0"
          )}
          onClick={lockVault}
        >
          <Lock className="h-5 w-5 shrink-0" />
          {(!collapsed || mobileOpen) && <span>Lock Vault</span>}
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-destructive hover:text-destructive",
            collapsed && !mobileOpen && "justify-center px-0"
          )}
          onClick={signOut}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {(!collapsed || mobileOpen) && <span>Sign Out</span>}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-40 rounded-md bg-card p-2 shadow-md md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar (overlay drawer) */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden h-full flex-col border-r bg-card transition-all duration-300 md:flex",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
}

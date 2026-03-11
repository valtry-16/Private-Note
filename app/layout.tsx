import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { VaultProvider } from "@/hooks/use-vault";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ZeroVault — Zero Knowledge Encrypted Vault",
  description:
    "Secure your secrets with zero-knowledge encryption. Store notes, passwords, documents, and personal information with military-grade security.",
  manifest: "/manifest.json",
  icons: { icon: [{ url: "/icon-192.png" }, { url: "/icon-192.svg", type: "image/svg+xml" }], apple: "/icon-512.png", shortcut: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AppearanceProvider>
            <TooltipProvider>
              <VaultProvider>{children}</VaultProvider>
            </TooltipProvider>
          </AppearanceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import Link from "next/link";
import {
  Lock,
  Eye,
  FileText,
  Key,
  Server,
  ArrowRight,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZeroVaultLogo } from "@/components/ui/logo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ZeroVaultLogo className="h-8 w-8" />
            <span className="text-xl font-bold">ZeroVault</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link href="/faq" className="hidden sm:block">
              <Button variant="ghost" size="sm">FAQ</Button>
            </Link>
            <Link href="/privacy" className="hidden sm:block">
              <Button variant="ghost" size="sm">Privacy</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm">
            <Lock className="h-4 w-4 text-primary" />
            Zero-Knowledge Architecture
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            Secure Your Secrets With{" "}
            <span className="text-primary">Zero Knowledge</span> Encryption
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            Your data is encrypted in your browser before it ever reaches our servers. Not even we
            can read your information. Military-grade AES-256-GCM encryption keeps your secrets
            truly secret.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Start For Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t bg-muted/40 py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold">Everything You Need, Fully Encrypted</h2>
            <p className="text-lg text-muted-foreground">
              Store all your sensitive information in one secure place.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: FileText,
                title: "Encrypted Notes",
                desc: "Write and organize notes with rich text editing. Everything is encrypted before saving.",
              },
              {
                icon: Key,
                title: "Password Vault",
                desc: "Store credentials securely with a built-in password generator and breach checker.",
              },
              {
                icon: Shield,
                title: "Document Storage",
                desc: "Upload and encrypt files directly in your browser. PDFs, images, and more.",
              },
              {
                icon: Lock,
                title: "Personal Info",
                desc: "Securely store passport numbers, bank accounts, crypto keys, and more.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <feature.icon className="mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-bold">True Zero-Knowledge Security</h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Your master password never leaves your device. We use PBKDF2 key derivation with
                600,000 iterations to generate your encryption key, and AES-256-GCM to encrypt your
                data — all in your browser.
              </p>
              <div className="space-y-4">
                {[
                  "Data encrypted in your browser before transmission",
                  "Server only stores encrypted blobs",
                  "Master password never sent to the server",
                  "Even our developers cannot access your data",
                  "Auto-lock after 60 seconds of inactivity",
                  "Clipboard auto-clear after 20 seconds",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/50 p-8">
              <h3 className="mb-4 text-lg font-semibold">How It Works</h3>
              <div className="space-y-6">
                {[
                  { step: "1", title: "You Enter Data", desc: "Type your note, password, or upload a file" },
                  { step: "2", title: "Browser Encrypts", desc: "AES-256-GCM encryption happens locally" },
                  { step: "3", title: "Encrypted Storage", desc: "Only encrypted data reaches our servers" },
                  { step: "4", title: "You Decrypt", desc: "Data is decrypted locally when you need it" },
                ].map((s) => (
                  <div key={s.step} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {s.step}
                    </div>
                    <div>
                      <h4 className="font-medium">{s.title}</h4>
                      <p className="text-sm text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/40 py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Secure Your Digital Life?</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join ZeroVault and take control of your privacy today.
          </p>
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <ZeroVaultLogo className="h-5 w-5" />
            <span>ZeroVault</span>
          </div>
          <p>Zero-knowledge encrypted vault. Your data, your keys, your privacy.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/faq" className="hover:text-foreground">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ZeroVaultLogo } from "@/components/ui/logo";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <ZeroVaultLogo className="h-8 w-8" />
            <span className="text-xl font-bold">ZeroVault</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      <div className="container mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-2 text-4xl font-bold">Privacy Policy</h1>
        <p className="mb-10 text-muted-foreground">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold">1. Introduction</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              ZeroVault (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is a zero-knowledge encrypted vault application 
              designed to securely store your notes, passwords, documents, and personal information. 
              We are committed to protecting your privacy and ensuring the security of your data. 
              This Privacy Policy explains what information we collect, how we use it, and the 
              measures we take to safeguard your data.
            </p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              By using ZeroVault, you agree to the practices described in this Privacy Policy. 
              If you do not agree with these practices, please do not use our service.
            </p>
          </section>

          {/* Zero-Knowledge Architecture */}
          <section>
            <h2 className="text-2xl font-semibold">2. Zero-Knowledge Architecture</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              ZeroVault is built on a zero-knowledge architecture. This means:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Your master password never leaves your device.</strong> It is used locally 
                in your browser to derive an encryption key using PBKDF2 with 600,000 iterations.
              </li>
              <li>
                <strong>All encryption and decryption happens in your browser.</strong> We use 
                AES-256-GCM (military-grade encryption) to encrypt your data before it is 
                transmitted to our servers.
              </li>
              <li>
                <strong>We cannot read your data.</strong> Our servers only store encrypted blobs. 
                Without your master password, the data is computationally infeasible to decrypt — 
                even for us, our developers, or any third party.
              </li>
              <li>
                <strong>We cannot reset your master password.</strong> Since we never have access 
                to your master password, we cannot reset it. The only recovery method is through 
                the recovery key generated during signup.
              </li>
            </ul>
          </section>

          {/* Data We Collect */}
          <section>
            <h2 className="text-2xl font-semibold">3. Data We Collect</h2>

            <h3 className="mt-4 text-lg font-medium">3.1 Account Information</h3>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              When you create a ZeroVault account, we collect:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li><strong>Email address</strong> — Used for account authentication, password recovery, and essential notifications.</li>
              <li><strong>Hashed account password</strong> — Your account password is hashed by Supabase Auth using bcrypt before storage. We never store your plaintext account password.</li>
            </ul>

            <h3 className="mt-4 text-lg font-medium">3.2 Encrypted Vault Data</h3>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              All vault items — notes, passwords, documents, and personal information — are 
              encrypted with AES-256-GCM in your browser before transmission. We store:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Encrypted content blobs (unreadable without your master password)</li>
              <li>Encrypted file attachments (also AES-256-GCM encrypted in your browser)</li>
              <li>Encrypted metadata such as titles and tags</li>
              <li>Encrypted verification token (used to validate your master password locally)</li>
              <li>Encrypted recovery key (encrypted with your master password)</li>
            </ul>

            <h3 className="mt-4 text-lg font-medium">3.3 Technical Data</h3>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              For security monitoring and service improvement, we may collect:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Security event logs (login attempts, vault lock/unlock events, failed authentication attempts)</li>
              <li>User agent string (browser type and version)</li>
              <li>Timestamps of account activity</li>
              <li>Auto-lock and security preference settings</li>
            </ul>

            <h3 className="mt-4 text-lg font-medium">3.4 Data We Do NOT Collect</h3>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Your master password (never transmitted to our servers)</li>
              <li>Your recovery key in plaintext (only the encrypted version is stored)</li>
              <li>Decrypted vault contents (we cannot decrypt them)</li>
              <li>IP addresses for tracking purposes</li>
              <li>Third-party analytics or advertising trackers</li>
            </ul>
          </section>

          {/* How We Use Your Data */}
          <section>
            <h2 className="text-2xl font-semibold">4. How We Use Your Data</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">We use the collected data exclusively for:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li><strong>Authentication:</strong> Verifying your identity when you log in.</li>
              <li><strong>Vault storage:</strong> Storing your encrypted data securely on our servers.</li>
              <li><strong>Account recovery:</strong> Sending password reset emails when you request them.</li>
              <li><strong>Security monitoring:</strong> Detecting and preventing unauthorized access attempts, including brute-force protection and account lockout after failed attempts.</li>
              <li><strong>Dead Man&apos;s Switch:</strong> If enabled, sending an automated notification to your designated emergency contact after a configured period of inactivity.</li>
              <li><strong>Service operation:</strong> Maintaining, improving, and ensuring the reliability of the ZeroVault service.</li>
            </ul>
          </section>

          {/* Data Storage and Security */}
          <section>
            <h2 className="text-2xl font-semibold">5. Data Storage and Security</h2>

            <h3 className="mt-4 text-lg font-medium">5.1 Infrastructure</h3>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Your encrypted data is stored on Supabase, a secure, SOC 2 Type II compliant 
              cloud platform built on PostgreSQL. Supabase provides enterprise-grade security, 
              including encryption at rest and in transit for all stored data.
            </p>

            <h3 className="mt-4 text-lg font-medium">5.2 Encryption Standards</h3>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li><strong>Encryption algorithm:</strong> AES-256-GCM (Advanced Encryption Standard with Galois/Counter Mode)</li>
              <li><strong>Key derivation:</strong> PBKDF2 with SHA-256 and 600,000 iterations</li>
              <li><strong>Transport security:</strong> All communications use HTTPS/TLS 1.2+</li>
              <li><strong>Password hashing:</strong> Account passwords are hashed using bcrypt via Supabase Auth</li>
            </ul>

            <h3 className="mt-4 text-lg font-medium">5.3 Security Features</h3>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Automatic vault lock after 60 seconds of inactivity</li>
              <li>Clipboard auto-clear after 20 seconds when copying sensitive data</li>
              <li>Brute-force protection with account lockout after 5 failed attempts</li>
              <li>Optional two-factor authentication (TOTP-based 2FA)</li>
              <li>Password health monitoring with breach detection via Have I Been Pwned API</li>
              <li>Hidden vault feature for additional privacy</li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold">6. Third-Party Services</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              ZeroVault integrates with the following third-party services:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Supabase:</strong> Provides authentication services and encrypted database storage. 
                Supabase processes your email for authentication purposes. See{" "}
                <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Supabase Privacy Policy
                </a>.
              </li>
              <li>
                <strong>Vercel:</strong> Hosts the ZeroVault web application. Vercel processes standard 
                web traffic data. See{" "}
                <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Vercel Privacy Policy
                </a>.
              </li>
              <li>
                <strong>Brevo (Sendinblue):</strong> Used for transactional emails such as password 
                reset links and Dead Man&apos;s Switch notifications. Brevo processes the recipient email address 
                for delivery purposes only.
              </li>
              <li>
                <strong>Have I Been Pwned:</strong> Used for password breach checking. Only the first 5 
                characters of the SHA-1 hash of your password are sent (k-anonymity model) — your 
                actual password is never transmitted.
              </li>
            </ul>
          </section>

          {/* Cookies and Local Storage */}
          <section>
            <h2 className="text-2xl font-semibold">7. Cookies and Local Storage</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              ZeroVault uses only essential cookies and local storage for:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li><strong>Authentication session:</strong> Supabase Auth session tokens to maintain your login state.</li>
              <li><strong>Theme preference:</strong> Your light/dark mode preference stored in local storage.</li>
              <li><strong>TOTP secret (if 2FA enabled):</strong> Encrypted 2FA setup data stored in your profile.</li>
            </ul>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              We do <strong>not</strong> use any third-party tracking cookies, advertising cookies, 
              or analytics cookies. We do not track you across websites.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold">8. Data Retention</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li><strong>Account data:</strong> Retained for as long as your account is active.</li>
              <li><strong>Encrypted vault data:</strong> Retained until you delete it or delete your account.</li>
              <li><strong>Trash items:</strong> Items moved to trash can be permanently deleted by you at any time.</li>
              <li><strong>Security logs:</strong> Retained for security auditing purposes and deleted periodically.</li>
              <li><strong>Account deletion:</strong> When you delete your account, all associated data — including encrypted vault contents, profile information, and security logs — is permanently removed from our servers.</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold">9. Your Rights</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">You have the right to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li><strong>Access your data:</strong> View all your stored information through the ZeroVault interface.</li>
              <li><strong>Export your data:</strong> Download your decrypted data at any time while logged into your vault.</li>
              <li><strong>Delete your data:</strong> Remove individual items or your entire account and all associated data.</li>
              <li><strong>Modify your data:</strong> Edit or update any stored information through the vault.</li>
              <li><strong>Control notifications:</strong> Enable or disable the Dead Man&apos;s Switch and configure notification preferences.</li>
            </ul>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Due to our zero-knowledge architecture, we cannot access, export, or modify your 
              encrypted data on your behalf. All data management must be performed through the 
              ZeroVault application using your master password.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold">10. Children&apos;s Privacy</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              ZeroVault is not intended for use by children under the age of 13. We do not 
              knowingly collect personal information from children under 13. If you believe a 
              child under 13 has provided us with personal information, please contact us so 
              we can delete the information.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-semibold">11. Changes to This Policy</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              We may update this Privacy Policy from time to time. When we make significant 
              changes, we will notify users through the application. The &quot;Last updated&quot; date 
              at the top of this page indicates when this policy was last revised. Continued 
              use of ZeroVault after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold">12. Contact Us</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              If you have any questions, concerns, or requests regarding this Privacy Policy 
              or our data practices, please contact us at:
            </p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              <strong>Email:</strong>{" "}
              <a href="mailto:zerovaultstorage@gmail.com" className="text-primary hover:underline">
                zerovaultstorage@gmail.com
              </a>
            </p>
          </section>

          {/* Summary */}
          <section className="rounded-lg border bg-muted/50 p-6">
            <h2 className="text-2xl font-semibold">Privacy at a Glance</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {[
                { label: "Encryption", value: "AES-256-GCM (client-side)" },
                { label: "Key Derivation", value: "PBKDF2 — 600,000 iterations" },
                { label: "Master Password Stored?", value: "Never" },
                { label: "Can We Read Your Data?", value: "No — zero-knowledge" },
                { label: "Third-Party Trackers", value: "None" },
                { label: "Advertising", value: "None" },
                { label: "Data Sold to Third Parties", value: "Never" },
                { label: "Open Architecture", value: "Client-side encryption" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between rounded-md border bg-card px-4 py-2 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto flex items-center justify-between px-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ZeroVaultLogo className="h-5 w-5" />
            <span>ZeroVault</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/faq" className="hover:text-foreground">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

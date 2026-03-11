"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, ArrowLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

const faqSections: FAQSection[] = [
  {
    title: "General",
    items: [
      {
        question: "What is ZeroVault?",
        answer:
          "ZeroVault is a zero-knowledge encrypted vault application that securely stores your notes, passwords, documents, and personal information. All data is encrypted in your browser using AES-256-GCM before it ever reaches our servers, meaning only you can access your information.",
      },
      {
        question: "What does \"zero-knowledge\" mean?",
        answer:
          "Zero-knowledge means that our servers never have access to your unencrypted data or your master password. All encryption and decryption happens locally in your web browser. Even our developers cannot read your stored information. If someone were to gain access to our database, they would only find encrypted blobs that are computationally infeasible to decrypt without your master password.",
      },
      {
        question: "Is ZeroVault free to use?",
        answer:
          "Yes, ZeroVault is currently free to use. You can create an account and store your notes, passwords, documents, and personal information at no cost.",
      },
      {
        question: "What can I store in ZeroVault?",
        answer:
          "You can store encrypted notes (with rich text editing), passwords and login credentials, documents and files (PDFs, images, and more), and personal sensitive information such as passport numbers, bank account details, crypto keys, and other confidential data.",
      },
      {
        question: "Can I access ZeroVault on mobile devices?",
        answer:
          "Yes, ZeroVault is a responsive web application that works on smartphones, tablets, and desktop browsers. Simply visit the ZeroVault website on any device with a modern web browser.",
      },
    ],
  },
  {
    title: "Account & Authentication",
    items: [
      {
        question: "What is the difference between my account password and master password?",
        answer:
          "Your account password is used to log in to ZeroVault (authentication). Your master password is used to encrypt and decrypt your vault data (encryption). These are two separate passwords for maximum security. Your account password is handled by Supabase Auth, while your master password never leaves your browser.",
      },
      {
        question: "What happens if I forget my account password?",
        answer:
          'You can reset your account password by clicking "Forgot your account password?" on the login page. A password reset link will be sent to your registered email address. This resets only your account login password — your encrypted vault data and master password are not affected.',
      },
      {
        question: "What happens if I forget my master password?",
        answer:
          "If you forget your master password, the only way to recover access to your vault is by using the recovery key that was generated during signup. If you have lost both your master password and your recovery key, your encrypted data CANNOT be recovered — this is by design for maximum security. We strongly recommend storing your recovery key in a physically secure location.",
      },
      {
        question: "What is a recovery key?",
        answer:
          "A recovery key is a unique 48-character hexadecimal code generated when you create your account. It is the only backup method to recover your vault if you forget your master password. The recovery key is shown once during signup — you should copy it, download it, and store it securely. It will not be shown again.",
      },
      {
        question: "Does ZeroVault support two-factor authentication (2FA)?",
        answer:
          "Yes. You can enable TOTP-based two-factor authentication in your vault settings. Once enabled, you will need to enter a time-based one-time password from your authenticator app (such as Google Authenticator, Authy, or Microsoft Authenticator) each time you unlock your vault.",
      },
      {
        question: "What happens after too many failed login attempts?",
        answer:
          "After 5 consecutive failed master password attempts, your vault access is temporarily locked for 5 minutes as a brute-force protection measure. This prevents unauthorized users from guessing your master password. You can still log out and use a different account during this time.",
      },
    ],
  },
  {
    title: "Security & Encryption",
    items: [
      {
        question: "What encryption does ZeroVault use?",
        answer:
          "ZeroVault uses AES-256-GCM (Advanced Encryption Standard with 256-bit keys in Galois/Counter Mode) for data encryption. Your encryption key is derived from your master password using PBKDF2 (Password-Based Key Derivation Function 2) with SHA-256 and 600,000 iterations. This is considered military-grade encryption.",
      },
      {
        question: "Can ZeroVault staff read my data?",
        answer:
          "No. Due to our zero-knowledge architecture, our servers only store encrypted data. Without your master password, nobody — including ZeroVault developers, server administrators, or anyone with database access — can decrypt or read your data.",
      },
      {
        question: "Is my data encrypted during transmission?",
        answer:
          "Your data is doubly protected during transmission. First, it is encrypted with AES-256-GCM in your browser before being sent. Second, all network communication uses HTTPS with TLS 1.2+ encryption. This means your data is encrypted end-to-end.",
      },
      {
        question: "What is the auto-lock feature?",
        answer:
          "ZeroVault automatically locks your vault after 60 seconds of inactivity. When locked, your master password is cleared from memory, and your encrypted data cannot be accessed until you re-enter your master password. This protects your data if you walk away from your device.",
      },
      {
        question: "What is clipboard auto-clear?",
        answer:
          "When you copy sensitive information (like a password) from ZeroVault, the clipboard is automatically cleared after 20 seconds. This prevents your sensitive data from remaining on the clipboard where other applications or people could access it.",
      },
      {
        question: "What is the Password Health feature?",
        answer:
          "Password Health analyzes your stored passwords for common issues: weak passwords, reused passwords across accounts, and passwords that have appeared in known data breaches (checked securely via the Have I Been Pwned API using k-anonymity — your actual passwords are never sent). It provides a security score and recommendations.",
      },
      {
        question: "How does the breach check work? Is my password sent to a server?",
        answer:
          "No. The breach check uses the Have I Been Pwned API with k-anonymity. Only the first 5 characters of the SHA-1 hash of your password are sent to the API. The API returns all known breached hashes with the same prefix, and the comparison is done locally in your browser. Your actual password or its full hash is never transmitted.",
      },
    ],
  },
  {
    title: "Features",
    items: [
      {
        question: "What is the Hidden Vault?",
        answer:
          "The Hidden Vault is a separate, concealed section within your vault that requires an additional password to access. It provides an extra layer of privacy for your most sensitive items. Items in the Hidden Vault are not visible in the regular vault view, even when your main vault is unlocked.",
      },
      {
        question: "How do folders and tags work?",
        answer:
          "You can organize your vault items using folders and tags. Folders provide a hierarchical structure, while tags allow cross-category labeling. Both folder names and tag names are encrypted along with your data. You can view all items associated with a specific tag from the Tags page.",
      },
      {
        question: "Can I share vault items with others?",
        answer:
          "Yes. ZeroVault supports secure sharing via encrypted share links. When you share an item, a unique encryption key is generated for that share link. The recipient can view the shared content without needing a ZeroVault account. Share links can be configured with a maximum number of views and will expire accordingly.",
      },
      {
        question: "What is the Dead Man's Switch?",
        answer:
          "The Dead Man's Switch is an optional safety feature. If enabled, ZeroVault monitors your account activity. If you are inactive for a configured period (e.g., 90 days), an automated email notification is sent to your designated emergency contact. This ensures someone you trust is aware of your prolonged absence.",
      },
      {
        question: "What file types can I upload?",
        answer:
          "You can upload various file types including PDFs, images (JPG, PNG, GIF, SVG), text files, and other documents. All uploaded files are encrypted with AES-256-GCM in your browser before being stored. Files can be previewed within the vault for supported formats.",
      },
      {
        question: "How does the password generator work?",
        answer:
          "ZeroVault includes a built-in cryptographic password generator that creates strong, random passwords. You can customize the length and character types (uppercase, lowercase, numbers, symbols). The generator uses the Web Crypto API for cryptographically secure random number generation.",
      },
      {
        question: "Can I favorite or pin items?",
        answer:
          "Yes. You can mark items as favorites for quick access. Favorited items appear in the dedicated Favorites section of your vault for easy retrieval.",
      },
    ],
  },
  {
    title: "Data & Privacy",
    items: [
      {
        question: "Where is my data stored?",
        answer:
          "Your encrypted data is stored on Supabase, a secure cloud platform built on PostgreSQL. Supabase is SOC 2 Type II compliant and provides encryption at rest and in transit. However, since your data is already encrypted before reaching Supabase, the server-side encryption is an additional layer of protection.",
      },
      {
        question: "Does ZeroVault use cookies or trackers?",
        answer:
          "ZeroVault uses only essential cookies for authentication sessions (Supabase Auth tokens). We do NOT use any third-party tracking cookies, advertising cookies, or analytics trackers. We do not track you across websites or sell your data.",
      },
      {
        question: "Can I export my data?",
        answer:
          "You can access and copy all your stored data through the ZeroVault interface while your vault is unlocked. For documents and files, you can download the decrypted originals at any time.",
      },
      {
        question: "Can I delete my account?",
        answer:
          "Yes. You can delete your ZeroVault account, which permanently removes all associated data from our servers — including encrypted vault contents, profile information, and security logs.",
      },
      {
        question: "Is ZeroVault compliant with GDPR?",
        answer:
          "ZeroVault is designed with privacy by default. Our zero-knowledge architecture ensures that personal data stored in the vault is encrypted and inaccessible to us. You have full control over your data — including the right to access, modify, export, and delete it at any time.",
      },
    ],
  },
  {
    title: "Troubleshooting",
    items: [
      {
        question: "I'm not receiving password reset emails. What should I do?",
        answer:
          "Check your spam/junk folder — the email may have been filtered. Ensure you are entering the correct email address. If you still don't receive the email, try again after a few minutes. The reset email is sent from zerovaultstorage@gmail.com, so make sure this address is not blocked by your email provider or firewall.",
      },
      {
        question: "My vault says it's temporarily locked. What do I do?",
        answer:
          "This happens after 5 failed master password attempts. Wait 5 minutes and try again with the correct master password. If you've forgotten your master password, use the \"Forgot Password?\" option on the lock screen and enter your recovery key.",
      },
      {
        question: "I lost my recovery key. Can you help me recover my vault?",
        answer:
          "Unfortunately, no. Due to our zero-knowledge architecture, we cannot recover or reset your master password. The recovery key is the only backup method. If you have lost both your master password and recovery key, your encrypted data cannot be recovered. This is an intentional security feature to ensure that only you can access your data.",
      },
      {
        question: "Can I change my master password?",
        answer:
          "Master password changes must be done through the vault settings. When you change your master password, all your vault data is re-encrypted with the new password. Make sure to update your recovery key as well, as the old recovery key will no longer work with the new master password.",
      },
      {
        question: "Why does my vault keep locking automatically?",
        answer:
          "The vault auto-locks after 60 seconds of inactivity for security purposes. This ensures your data is protected if you step away from your device. The auto-lock timer can be configured in your vault settings.",
      },
    ],
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium hover:text-primary"
      >
        <span>{item.question}</span>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="pb-4 text-sm leading-relaxed text-muted-foreground">
          {item.answer}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
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
        <h1 className="mb-2 text-4xl font-bold">Frequently Asked Questions</h1>
        <p className="mb-10 text-muted-foreground">
          Everything you need to know about ZeroVault and how it protects your data.
        </p>

        <div className="space-y-10">
          {faqSections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-4 text-2xl font-semibold">{section.title}</h2>
              <div className="rounded-lg border">
                {section.items.map((item) => (
                  <FAQAccordion key={item.question} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 rounded-lg border bg-muted/50 p-8 text-center">
          <h3 className="mb-2 text-xl font-semibold">Still have questions?</h3>
          <p className="mb-4 text-muted-foreground">
            Can&apos;t find what you&apos;re looking for? Reach out to us directly.
          </p>
          <a
            href="mailto:zerovaultstorage@gmail.com"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Contact Us
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto flex items-center justify-between px-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
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

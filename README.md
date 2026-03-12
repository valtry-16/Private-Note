# ZeroVault — Zero-Knowledge Encrypted Vault

A privacy-first encrypted vault web application with a companion Chrome extension. Store notes, passwords, documents, and personal information with **true zero-knowledge security** — all data is encrypted in the browser using AES-256-GCM before reaching the server.

**Live:** [zero-vault-storage.vercel.app](https://zero-vault-storage.vercel.app)

---

## Security Architecture

```
User Input → Browser Encryption (AES-256-GCM + PBKDF2) → Encrypted Storage (Supabase) → Browser Decryption → User
```

- **Master password never leaves the device**
- **PBKDF2 key derivation** — 600,000 iterations, SHA-256
- **AES-256-GCM** — 32-byte salt, 12-byte IV for all data encryption
- **Server stores only encrypted blobs** — database admins cannot read your data
- **File encryption** — documents encrypted client-side before upload
- **Auto-lock** after configurable inactivity timeout
- **Clipboard auto-clear** after 20 seconds
- **Failed unlock lockout** — 5 attempts → 5-minute lockout

---

## Features

### Vault Items
- **Notes** — Markdown editor with live preview, 15+ toolbar actions, undo/redo (50 levels), keyboard shortcuts (Ctrl+B/I/K/Z/Y, Tab)
- **Passwords** — Generator (configurable length/charset), username generator, strength meter, breach checking (HaveIBeenPwned k-anonymity)
- **Documents** — Client-side encrypted file upload/download, in-browser preview (images, PDFs), 50 MB storage quota
- **Personal Info** — 8 templates with pre-defined fields:
  - Personal ID, Bank Card, Bank Account, Crypto Wallet, WiFi Password, API Key, Document, Other

### Organization
- **Folders** — Create, rename, delete, assign items
- **Tags** — Colored tags, filter items by tag
- **Favorites & Pins** — Quick access to important items
- **Hidden Vault** — Separate passcode-protected section
- **Trash** — Soft-delete with restore, permanent delete, empty trash
- **Global Search** — Search across all decrypted vault items

### Security & Authentication
- **Zero-knowledge architecture** — encryption/decryption happens entirely in the browser
- **TOTP Two-Factor Authentication** — setup with QR code, enable/disable
- **WebAuthn / Biometric Auth** — hardware key or fingerprint registration
- **Security Audit Logs** — last login, device, IP address, vault unlock time, failed attempts with summary cards
- **Emergency Contact** — designate a trusted email
- **Dead Man's Switch** — configurable inactivity period, auto-emails emergency contact via daily Vercel cron
- **Master Password Change** — re-encrypts all vault items with new key
- **Forgot / Reset Password** — email-based password reset via Brevo

### Sharing
- Passphrase-protected shareable links
- Configurable expiry (1h, 24h, 7d, 30d)
- Configurable max views (1, 5, 10, unlimited)

### Import & Export
- **Export:** `.zvault` format (human-readable structured JSON) or CSV (passwords only)
- **Import:** ZeroVault `.zvault`/`.json`, Bitwarden JSON, generic CSV

### Chrome Extension
- Manifest V3 with popup UI (dark theme)
- Login with Supabase email + master password
- Browse and search all vault passwords
- **Smart autofill** — type a username on any login form, password auto-fills on match
- Detect login forms and capture credentials for saving
- Copy password to clipboard with 20s auto-clear
- Password visibility toggles
- Session persisted via `chrome.storage.session`

### Design & UX
- Dark / Light / System theme
- Customizable color themes and fonts
- Fully responsive (mobile, tablet, desktop)
- PWA — installable, offline fallback page
- Modern UI inspired by Notion + Bitwarden

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.1 (App Router), React 18, TypeScript |
| UI | ShadCN UI (Radix primitives), TailwindCSS, Lucide icons |
| Backend | Supabase (Auth, PostgreSQL, Storage) |
| Encryption | Web Crypto API (AES-256-GCM, PBKDF2) |
| 2FA | otplib (TOTP), qrcode |
| Email | Brevo (transactional emails) |
| Extension | Chrome Manifest V3 (vanilla JS) |
| Deployment | Vercel (frontend + cron), Supabase (backend) |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Login |
| `/signup` | Signup with master password setup |
| `/forgot-password` | Request password reset email |
| `/reset-password` | Set new password |
| `/faq` | Frequently asked questions |
| `/privacy` | Privacy policy |
| `/share/[id]` | Passphrase-protected shared item view |
| `/vault` | Dashboard — stats, quick actions, recent items, favorites |
| `/vault/notes` | Markdown notes editor |
| `/vault/passwords` | Password vault with generator |
| `/vault/documents` | Encrypted document storage |
| `/vault/personal` | Personal info with templates |
| `/vault/favorites` | Favorited items |
| `/vault/folders` | Folder management |
| `/vault/tags` | Tag management |
| `/vault/health` | Password health analysis |
| `/vault/hidden` | Hidden vault |
| `/vault/import-export` | Import & export |
| `/vault/trash` | Trash |
| `/vault/settings` | Appearance, security, 2FA, logs, emergency access |
| `/vault/unlock` | Master password entry |

### API Routes

| Endpoint | Purpose |
|----------|---------|
| `/api/totp/setup` | Generate TOTP secret & QR code |
| `/api/totp/verify` | Verify TOTP code |
| `/api/webauthn` | WebAuthn registration & verification |
| `/api/share` | Create share links |
| `/api/share/[id]` | Retrieve shared content |
| `/api/forgot-password` | Send reset email via Brevo |
| `/api/log` | Security event logging (captures IP, user-agent) |
| `/api/storage` | Storage usage tracking |
| `/api/cron/dead-man-switch` | Daily cron for emergency contact emails |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project

### 1. Clone & Install

```bash
git clone https://github.com/valtry-16/Private-Note.git
cd Private-Note
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-cron-secret
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=your-sender@email.com
```

### 3. Setup Database

Run `supabase/schema.sql` in your Supabase SQL Editor. This creates all tables, indexes, RLS policies, and the `vault-documents` storage bucket.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Load Chrome Extension (optional)

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Click the ZeroVault icon in the toolbar to log in

---

## Project Structure

```
ZeroVault/
├── app/                        # Next.js App Router
│   ├── page.tsx               # Landing page
│   ├── login/                 # Login
│   ├── signup/                # Signup
│   ├── forgot-password/       # Forgot password
│   ├── reset-password/        # Reset password
│   ├── faq/                   # FAQ
│   ├── privacy/               # Privacy policy
│   ├── share/[id]/            # Shared item viewer
│   ├── vault/                 # Protected vault pages
│   │   ├── page.tsx           # Dashboard
│   │   ├── unlock/            # Vault unlock
│   │   ├── notes/             # Notes editor
│   │   ├── passwords/         # Password vault
│   │   ├── documents/         # Document storage
│   │   ├── personal/          # Personal info (templates)
│   │   ├── favorites/         # Favorites
│   │   ├── folders/           # Folders
│   │   ├── tags/              # Tags
│   │   ├── health/            # Password health
│   │   ├── hidden/            # Hidden vault
│   │   ├── import-export/     # Import & export
│   │   ├── trash/             # Trash
│   │   └── settings/          # Settings & security
│   └── api/                   # API routes
│       ├── totp/              # 2FA setup & verify
│       ├── webauthn/          # Biometric auth
│       ├── share/             # Sharing
│       ├── forgot-password/   # Password reset email
│       ├── log/               # Security logging
│       ├── storage/           # Storage tracking
│       └── cron/              # Dead man's switch cron
├── components/                # React components
│   ├── ui/                   # ShadCN UI primitives + logo
│   └── vault/                # Sidebar, note-editor, etc.
├── encryption/                # AES-256-GCM + PBKDF2 module
├── hooks/                     # React hooks
│   ├── use-vault.tsx         # Vault state, auth, lock/unlock
│   ├── use-auto-lock.ts     # Auto-lock timer
│   ├── use-clipboard.ts     # Clipboard with auto-clear
│   ├── use-vault-items.ts   # Data fetching & caching
│   ├── use-search.ts        # Client-side search
│   └── use-pwa.ts           # PWA registration
├── extension/                 # Chrome extension (Manifest V3)
│   ├── manifest.json         # Extension manifest
│   ├── popup.html/js/css     # Extension popup UI
│   ├── crypto.js             # Matching crypto (JS)
│   ├── content.js/css        # Login form detection & autofill
│   └── background.js         # Service worker
├── supabase/                  # Supabase config
│   ├── client.ts             # Browser client
│   ├── server.ts             # Server client
│   └── schema.sql            # Database schema
├── utils/                     # Utilities
│   └── breach-check.ts      # HaveIBeenPwned API
├── middleware.ts              # Auth middleware
└── public/                    # Static assets, PWA manifest, SW
```

---

## Authentication Flow

1. **Signup** — User creates account (email + password via Supabase Auth) and sets a master password
2. **Login** — Authenticate with Supabase, optionally verify TOTP 2FA
3. **Vault Unlock** — Master password → PBKDF2 key derivation → verify against stored encrypted token
4. **Data Access** — All vault data decrypted client-side using the derived key
5. **Auto-lock** — Vault locks after inactivity, requires master password to unlock again

---

## Deployment

### Vercel

```bash
npm run build
vercel deploy
```

Set all environment variables in Vercel project settings. The `vercel.json` includes a daily cron job for the dead man's switch.

### Chrome Extension

The `extension/` folder is a standalone Chrome extension. No build step required — load it as an unpacked extension directly.

---

## License

Private project.

### Environment Variables (Vercel)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## License

Private — All rights reserved.

# ZeroVault — Zero-Knowledge Encrypted Vault

A privacy-first encrypted vault web application where users can store notes, passwords, documents, and personal information with **true zero-knowledge security**. All sensitive data is encrypted in the browser using AES-256-GCM before being sent to the server.

## Security Architecture

```
User Input → Browser Encryption (AES-256-GCM) → Encrypted Storage (Supabase) → Browser Decryption → User
```

- **Master password never leaves the device**
- **PBKDF2 key derivation** with 600,000 iterations
- **AES-256-GCM** for all data encryption
- **Server only stores encrypted blobs** — even database admins cannot read your data
- **Auto-lock** after 60 seconds of inactivity
- **Clipboard auto-clear** after 20 seconds

## Features

### Core
- Encrypted Notes (Markdown support)
- Password Vault with generator & breach checker
- Encrypted Document Storage
- Personal Information vault (IDs, bank accounts, crypto keys)
- Global search across all decrypted items
- Folders, tags, pins, and favorites

### Security
- Zero-knowledge architecture
- Auto-lock on inactivity
- Clipboard protection
- Failed login lockout (5 attempts → 5 min lockout)
- Security activity logs
- Hidden vault with separate passcode
- Emergency access contact
- Dead man's switch
- Master password change (re-encrypts all data)

### Design
- Dark/Light mode
- Responsive design
- PWA (installable, offline-capable)
- Modern UI (Notion + Bitwarden inspired)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React, TypeScript, TailwindCSS |
| UI Components | ShadCN UI (Radix primitives) |
| Backend | Supabase (Auth, PostgreSQL, Storage, Realtime) |
| Encryption | Web Crypto API (AES-256-GCM, PBKDF2) |
| Deployment | Vercel (frontend), Supabase (backend) |

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project

### 1. Clone & Install

```bash
cd ZeroVault
npm install
```

### 2. Configure Supabase

1. Create a new Supabase project at https://supabase.com
2. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

3. Fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Setup Database

Run the SQL schema in your Supabase SQL Editor:

```bash
# Copy the contents of supabase/schema.sql and run it in Supabase SQL Editor
```

This creates all tables, indexes, RLS policies, and the storage bucket.

### 4. Create Storage Bucket

The schema SQL automatically creates the `vault-documents` bucket. If it doesn't, create it manually:
- Go to Supabase Dashboard → Storage
- Create bucket named `vault-documents` (private)

### 5. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Project Structure

```
ZeroVault/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   └── vault/             # Protected vault pages
│       ├── layout.tsx     # Vault layout with sidebar
│       ├── page.tsx       # Dashboard
│       ├── unlock/        # Vault unlock screen
│       ├── notes/         # Notes section
│       ├── passwords/     # Password vault
│       ├── documents/     # Document storage
│       ├── personal/      # Personal info
│       ├── favorites/     # Favorites view
│       └── settings/      # Settings & security
├── components/            # React components
│   ├── ui/               # ShadCN UI primitives
│   ├── theme-provider.tsx
│   └── vault/            # Vault-specific components
├── encryption/            # Encryption module
│   ├── crypto.ts         # AES-256-GCM + PBKDF2
│   └── index.ts
├── hooks/                 # React hooks
│   ├── use-vault.tsx     # Vault state & auth
│   ├── use-auto-lock.ts  # Auto-lock timer
│   ├── use-clipboard.ts  # Clipboard with auto-clear
│   ├── use-vault-items.ts # Data fetching
│   ├── use-search.ts     # Client-side search
│   └── use-pwa.ts        # PWA registration
├── supabase/              # Supabase clients
│   ├── client.ts         # Browser client
│   ├── server.ts         # Server client
│   └── schema.sql        # Database schema
├── types/                 # TypeScript types
├── utils/                 # Utilities
│   └── breach-check.ts   # HaveIBeenPwned API
├── lib/                   # Shared lib
│   └── utils.ts          # cn() helper
├── middleware.ts          # Auth middleware
└── public/               # Static assets + PWA
```

## Authentication Flow

1. **Signup**: User creates account with email + password (Supabase Auth) and a separate master password
2. **Login**: User authenticates with Supabase, then enters master password
3. **Vault Unlock**: Master password derives encryption key via PBKDF2 → verifies against stored token
4. **Data Access**: All data decrypted client-side using derived key

## Deployment

### Vercel

```bash
npm run build
# Deploy to Vercel with environment variables
```

### Environment Variables (Vercel)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## License

Private — All rights reserved.

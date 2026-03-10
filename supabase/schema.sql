-- ZeroVault Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles (stores encrypted verification token, settings)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_verification TEXT NOT NULL,
  emergency_contact_email TEXT,
  hidden_vault_hash TEXT,
  auto_lock_seconds INTEGER DEFAULT 60,
  dead_man_switch_enabled BOOLEAN DEFAULT FALSE,
  dead_man_inactivity_days INTEGER DEFAULT 90,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Folders
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1'
);

-- Vault items (all encrypted data lives here)
CREATE TABLE IF NOT EXISTS vault_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note', 'password', 'document', 'personal')),
  encrypted_data TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item-Tag junction table
CREATE TABLE IF NOT EXISTS item_tags (
  item_id UUID NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

-- Security logs
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vault_items_user_id ON vault_items(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_type ON vault_items(user_id, type);
CREATE INDEX IF NOT EXISTS idx_vault_items_folder ON vault_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_updated ON vault_items(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_tags_item ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id);

-- Row Level Security (RLS) Policies
-- Users can only access their own data

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Vault items policies
CREATE POLICY "Users can view own vault items"
  ON vault_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault items"
  ON vault_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault items"
  ON vault_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault items"
  ON vault_items FOR DELETE
  USING (auth.uid() = user_id);

-- Folders policies
CREATE POLICY "Users can view own folders"
  ON folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON folders FOR DELETE
  USING (auth.uid() = user_id);

-- Tags policies
CREATE POLICY "Users can view own tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);

-- Item tags policies (via vault_items ownership)
CREATE POLICY "Users can view own item tags"
  ON item_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vault_items WHERE vault_items.id = item_tags.item_id AND vault_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own item tags"
  ON item_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vault_items WHERE vault_items.id = item_tags.item_id AND vault_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own item tags"
  ON item_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM vault_items WHERE vault_items.id = item_tags.item_id AND vault_items.user_id = auth.uid()
    )
  );

-- Security logs policies
CREATE POLICY "Users can view own security logs"
  ON security_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own security logs"
  ON security_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket for encrypted documents
INSERT INTO storage.buckets (id, name, public) VALUES ('vault-documents', 'vault-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vault-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vault-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vault-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

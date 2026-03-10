export type VaultItemType = "note" | "password" | "document" | "personal";

export interface Database {
  public: {
    Tables: {
      vault_items: {
        Row: {
          id: string;
          user_id: string;
          type: VaultItemType;
          encrypted_data: string;
          metadata: VaultItemMetadata;
          folder_id: string | null;
          is_pinned: boolean;
          is_favorite: boolean;
          is_hidden: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: VaultItemType;
          encrypted_data: string;
          metadata?: VaultItemMetadata;
          folder_id?: string | null;
          is_pinned?: boolean;
          is_favorite?: boolean;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: VaultItemType;
          encrypted_data?: string;
          metadata?: VaultItemMetadata;
          folder_id?: string | null;
          is_pinned?: boolean;
          is_favorite?: boolean;
          is_hidden?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      folders: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          parent_id?: string | null;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
        };
        Update: {
          name?: string;
          color?: string;
        };
        Relationships: [];
      };
      item_tags: {
        Row: {
          item_id: string;
          tag_id: string;
        };
        Insert: {
          item_id: string;
          tag_id: string;
        };
        Update: {};
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          encrypted_verification: string;
          emergency_contact_email: string | null;
          hidden_vault_hash: string | null;
          auto_lock_seconds: number;
          dead_man_switch_enabled: boolean;
          dead_man_inactivity_days: number;
          last_active_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          encrypted_verification: string;
          emergency_contact_email?: string | null;
          hidden_vault_hash?: string | null;
          auto_lock_seconds?: number;
          dead_man_switch_enabled?: boolean;
          dead_man_inactivity_days?: number;
          last_active_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          encrypted_verification?: string;
          emergency_contact_email?: string | null;
          hidden_vault_hash?: string | null;
          auto_lock_seconds?: number;
          dead_man_switch_enabled?: boolean;
          dead_man_inactivity_days?: number;
          last_active_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      security_logs: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {};
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}

export interface VaultItemMetadata {
  encrypted_title: string;
  encrypted_preview?: string;
  file_path?: string;
  file_size?: number;
}

export interface DecryptedNote {
  title: string;
  content: string;
  format: "markdown" | "richtext";
}

export interface DecryptedPassword {
  title: string;
  website: string;
  username: string;
  password: string;
  notes: string;
}

export interface DecryptedDocument {
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  notes: string;
}

export interface DecryptedPersonalInfo {
  title: string;
  category: string;
  fields: { label: string; value: string }[];
  notes: string;
}

export type DecryptedVaultItem =
  | { type: "note"; data: DecryptedNote }
  | { type: "password"; data: DecryptedPassword }
  | { type: "document"; data: DecryptedDocument }
  | { type: "personal"; data: DecryptedPersonalInfo };

export interface VaultItemListEntry {
  id: string;
  type: VaultItemType;
  title: string;
  preview?: string;
  folder_id: string | null;
  is_pinned: boolean;
  is_favorite: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  tags: string[];
}

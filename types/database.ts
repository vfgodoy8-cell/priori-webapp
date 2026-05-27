export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          profile_id: string;
          role: "owner" | "admin" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          profile_id: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
        Update: {
          role?: "owner" | "admin" | "member";
        };
      };
      projects: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          impact_value: number;
          impact_metric: "revenue" | "customers";
          effort_sprints: number;
          stakeholder: string | null;
          production_date: string | null;
          dependencies: string | null;
          status: "active" | "discarded";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          impact_value?: number;
          impact_metric?: "revenue" | "customers";
          effort_sprints?: number;
          stakeholder?: string | null;
          production_date?: string | null;
          dependencies?: string | null;
          status?: "active" | "discarded";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          impact_value?: number;
          impact_metric?: "revenue" | "customers";
          effort_sprints?: number;
          stakeholder?: string | null;
          production_date?: string | null;
          dependencies?: string | null;
          status?: "active" | "discarded";
          updated_at?: string;
        };
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      member_role: "owner" | "admin" | "member";
    };
  };
};

// Aliases de conveniencia
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationMember = Database["public"]["Tables"]["organization_members"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type MemberRole = Database["public"]["Enums"]["member_role"];

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
          sprints_completed: number;
          stakeholder: string | null;
          production_date: string | null;
          dependencies: string | null;
          status: "active" | "discarded";
          squad_status: "backlog" | "curso";
          canvas_x: number | null;
          canvas_y: number | null;
          parent_id: string | null;
          slice_label: string | null;
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
          sprints_completed?: number;
          stakeholder?: string | null;
          production_date?: string | null;
          dependencies?: string | null;
          status?: "active" | "discarded";
          squad_status?: "backlog" | "curso";
          canvas_x?: number | null;
          canvas_y?: number | null;
          parent_id?: string | null;
          slice_label?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          impact_value?: number;
          impact_metric?: "revenue" | "customers";
          effort_sprints?: number;
          sprints_completed?: number;
          stakeholder?: string | null;
          production_date?: string | null;
          dependencies?: string | null;
          status?: "active" | "discarded";
          squad_status?: "backlog" | "curso";
          canvas_x?: number | null;
          canvas_y?: number | null;
          parent_id?: string | null;
          slice_label?: string | null;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          personas: number;
          proy_per_persona: number;
          q1_pct: number;
          q2_pct: number;
          q3_pct: number;
          q4_pct: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          personas?: number;
          proy_per_persona?: number;
          q1_pct?: number;
          q2_pct?: number;
          q3_pct?: number;
          q4_pct?: number;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          personas?: number;
          proy_per_persona?: number;
          q1_pct?: number;
          q2_pct?: number;
          q3_pct?: number;
          q4_pct?: number;
          sort_order?: number;
        };
      };
      initiatives: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          stakeholder: string | null;
          impact_value: number;
          impact_metric: "revenue" | "customers";
          effort_sprints: number;
          duration_quarters: number;
          q_start: number | null;
          team_ids: string[];
          team_allocations: Record<string, number>;
          description: string | null;
          sq_project_ids: string[];
          start_date: string | null;
          end_date: string | null;
          status: "active" | "discarded";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          stakeholder?: string | null;
          impact_value?: number;
          impact_metric?: "revenue" | "customers";
          effort_sprints?: number;
          duration_quarters?: number;
          q_start?: number | null;
          team_ids?: string[];
          team_allocations?: Record<string, number>;
          description?: string | null;
          sq_project_ids?: string[];
          start_date?: string | null;
          end_date?: string | null;
          status?: "active" | "discarded";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          stakeholder?: string | null;
          impact_value?: number;
          impact_metric?: "revenue" | "customers";
          effort_sprints?: number;
          duration_quarters?: number;
          q_start?: number | null;
          team_ids?: string[];
          team_allocations?: Record<string, number>;
          description?: string | null;
          sq_project_ids?: string[];
          start_date?: string | null;
          end_date?: string | null;
          status?: "active" | "discarded";
          updated_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          organization_id: string;
          actor_id: string | null;
          entity_type: "initiative" | "project";
          entity_id: string;
          entity_name: string;
          action: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_id?: string | null;
          entity_type: "initiative" | "project";
          entity_id: string;
          entity_name: string;
          action: string;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      comments: {
        Row: {
          id: string;
          organization_id: string;
          author_id: string | null;
          initiative_id: string | null;
          project_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          author_id?: string | null;
          initiative_id?: string | null;
          project_id?: string | null;
          body: string;
          created_at?: string;
        };
        Update: {
          body?: string;
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
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type Initiative = Database["public"]["Tables"]["initiatives"]["Row"];

export type Comment = {
  id: string;
  organization_id: string;
  author_id: string | null;
  initiative_id: string | null;
  project_id: string | null;
  body: string;
  created_at: string;
  author?: { full_name: string | null } | null;
};

export type Invitation = {
  id: string;
  organization_id: string;
  invited_by: string;
  email: string;
  role: "owner" | "admin" | "member";
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type SharedView = {
  id: string;
  organization_id: string;
  created_by: string;
  mode: "squad" | "cross";
  token: string;
  expires_at: string | null;
  created_at: string;
};

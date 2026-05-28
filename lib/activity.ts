import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityAction =
  | "created" | "updated" | "deleted"
  | "placed" | "unplaced"
  | "discarded" | "restored"
  | "commented";

export const ACTION_LABEL: Record<ActivityAction, string> = {
  created:   "creó",
  updated:   "actualizó",
  deleted:   "eliminó",
  placed:    "asignó al timeline",
  unplaced:  "quitó del timeline",
  discarded: "descartó",
  restored:  "restauró",
  commented: "comentó en",
};

export type ActivityLog = {
  id: string;
  organization_id: string;
  actor_id: string | null;
  entity_type: "initiative" | "project";
  entity_id: string;
  entity_name: string;
  action: ActivityAction;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor?: { full_name: string | null } | null;
};

export function logActivity(
  admin: SupabaseClient<any>,
  orgId: string,
  actorId: string,
  entityType: "initiative" | "project",
  entityId: string,
  entityName: string,
  action: ActivityAction,
  metadata?: Record<string, unknown>
): void {
  admin.from("activity_log").insert({
    organization_id: orgId,
    actor_id: actorId,
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    action,
    metadata: metadata ?? null,
  }).then(({ error }) => {
    if (error) console.error("[activity] Log error:", error.message);
  });
}

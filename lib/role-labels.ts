import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABEL, type AppRole } from "@/lib/roles";

export async function getOrgRoleLabels(orgId: string): Promise<Record<AppRole, string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("org_role_labels")
    .select("role, label")
    .eq("organization_id", orgId);

  const result: Record<AppRole, string> = { ...ROLE_LABEL };
  for (const row of (data ?? []) as { role: string; label: string }[]) {
    if (row.role === "owner" || row.role === "admin" || row.role === "member") {
      result[row.role] = row.label;
    }
  }
  return result;
}

import { createAdminClient } from "@/lib/supabase/admin";

export const LEVEL_LABEL_DEFAULT: Record<number, string> = {
  1: "Grupo",
  2: "Subgrupo",
  3: "Equipo",
  4: "Célula",
};

export async function getOrgGroupLevelLabels(orgId: string): Promise<Record<number, string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("org_group_level_labels")
    .select("level, label")
    .eq("organization_id", orgId);

  const result: Record<number, string> = { ...LEVEL_LABEL_DEFAULT };
  for (const row of (data ?? []) as { level: number; label: string }[]) {
    if (row.level >= 1 && row.level <= 4) {
      result[row.level] = row.label;
    }
  }
  return result;
}

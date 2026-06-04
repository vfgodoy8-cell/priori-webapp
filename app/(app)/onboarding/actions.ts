"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

type State = { error: string | null };

export async function createOrganization(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const name = (formData.get("name") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim();

  if (!name || !slug) return { error: "Nombre requerido." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name, slug })
    .select()
    .single();

  if (orgError) {
    return {
      error:
        orgError.code === "23505"
          ? "Ya existe una organización con ese nombre. Probá con uno diferente."
          : orgError.message,
    };
  }

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({ organization_id: org.id, profile_id: user.id, role: "owner" });

  if (memberError) return { error: memberError.message };

  const DEFAULT_CHANNELS = ["Banco", "Mandarina", "Productores", "Andrea", "Affinity"];
  await admin.from("channels").insert(
    DEFAULT_CHANNELS.map((name, sort_order) => ({
      organization_id: org.id,
      name,
      sort_order,
    })),
  );

  redirect("/onboarding/teams");
}

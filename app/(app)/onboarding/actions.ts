"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function createOrganization(
  name: string,
  slug: string
): Promise<{ error: string; code?: string } | never> {
  // 1. Verificar sesión con el cliente normal
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 2. Escritura con cliente admin (bypasea RLS — seguro porque user ya está verificado)
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
      code: orgError.code,
    };
  }

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({
      organization_id: org.id,
      profile_id: user.id,
      role: "owner",
    });

  if (memberError) {
    return { error: memberError.message };
  }

  redirect("/dashboard");
}

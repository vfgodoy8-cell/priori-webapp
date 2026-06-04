"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";

export async function createSharedView(
  mode: "squad" | "cross" | "roadmap",
  expiresIn7Days: boolean,
  productId?: string,
): Promise<{ token: string } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .single();

  if (!membership) return { error: "No pertenecés a ninguna organización." };

  const token = randomBytes(6).toString("base64url").slice(0, 8);
  const expires_at = expiresIn7Days
    ? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    : null;

  const { error } = await admin.from("shared_views").insert({
    organization_id: membership.organization_id,
    created_by: user.id,
    mode,
    token,
    expires_at,
    product_id: productId ?? null,
  });

  if (error) return { error: error.message };
  return { token };
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Token requerido." }, { status: 400 });

  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("invitations")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .single();

  if (!inv) return NextResponse.json({ error: "Invitación inválida o ya usada." }, { status: 404 });
  if (new Date(inv.expires_at) < new Date()) {
    return NextResponse.json({ error: "La invitación expiró." }, { status: 410 });
  }
  if (inv.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return NextResponse.json({ error: "Este enlace no es para tu cuenta." }, { status: 403 });
  }

  // Check if already a member
  const { data: existing } = await admin
    .from("organization_members")
    .select("id")
    .eq("organization_id", inv.organization_id)
    .eq("profile_id", user.id)
    .single();

  if (!existing) {
    const { error: insertErr } = await admin.from("organization_members").insert({
      organization_id: inv.organization_id,
      profile_id: user.id,
      role: inv.role,
    });
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Mark invitation as accepted
  await admin
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inv.id);

  return NextResponse.json({ ok: true });
}

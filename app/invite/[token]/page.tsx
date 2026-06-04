import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgRoleLabels } from "@/lib/role-labels";
import type { Invitation, Organization } from "@/types/database";
import { AcceptInviteButton } from "./AcceptInviteButton";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();

  const { data: invRaw } = await admin
    .from("invitations")
    .select("*")
    .eq("token", params.token)
    .is("accepted_at", null)
    .single();

  const invitation = invRaw as Invitation | null;
  if (!invitation) notFound();

  // Check expiry
  if (new Date(invitation.expires_at) < new Date()) notFound();

  const { data: orgRaw } = await admin
    .from("organizations")
    .select("name")
    .eq("id", invitation.organization_id)
    .single();

  const org = orgRaw as Pick<Organization, "name"> | null;
  const roleLabels = await getOrgRoleLabels(invitation.organization_id);

  // Check if user is logged in
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <div className="h-1.5 w-8 rounded-full bg-brand-orange" />
            <div className="h-1.5 w-5 rounded-full bg-brand-orange opacity-65" />
            <div className="h-1.5 w-3 rounded-full bg-brand-orange opacity-30" />
          </div>
          <span className="font-bold text-brand-black text-lg">priori</span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-brand-black">Invitación al equipo</h1>
          <p className="text-sm text-brand-gray">
            Fuiste invitado a unirte a{" "}
            <span className="font-semibold text-brand-black">{org?.name ?? "un equipo"}</span>
            {" "}como{" "}
            <span className="font-semibold text-brand-black">
              {roleLabels[invitation.role as keyof typeof roleLabels]}
            </span>.
          </p>
        </div>

        {user ? (
          <AcceptInviteButton token={params.token} invitationEmail={invitation.email} userEmail={user.email ?? ""} />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-brand-gray">Inicia sesión o crea una cuenta para aceptar esta invitación.</p>
            <Link
              href={`/login?redirect=/invite/${params.token}`}
              className="w-full py-3 text-sm font-bold rounded-lg bg-brand-orange hover:bg-orange-600 text-white transition text-center"
            >
              Iniciar sesión
            </Link>
            <Link
              href={`/signup?redirect=/invite/${params.token}`}
              className="w-full py-3 text-sm font-semibold rounded-lg border border-gray-200 hover:border-brand-orange text-brand-gray hover:text-brand-black transition text-center"
            >
              Crear cuenta
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

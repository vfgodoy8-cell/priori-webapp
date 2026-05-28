"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { OrganizationMember } from "@/types/database";
import type { Invitation } from "@/types/database";
import { type AppRole, ROLE_LABEL, ROLE_COLOR, ROLE_BG, ROLE_BORDER, canManageMembers } from "@/lib/roles";
import { createInvitation, cancelInvitation, updateMemberRole, removeMember } from "../actions";

type MemberWithProfile = OrganizationMember & {
  profile: { id: string; full_name: string | null; avatar_url: string | null } | null;
  isCurrentUser: boolean;
};

type Props = {
  members: MemberWithProfile[];
  invitations: Invitation[];
  currentUserRole: AppRole;
  currentUserId: string;
};

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 text-sm font-bold rounded-lg bg-brand-orange hover:bg-orange-600 disabled:opacity-60 text-white transition"
    >
      {pending ? "Enviando…" : label}
    </button>
  );
}

export function MembersView({ members, invitations: initialInvitations, currentUserRole, currentUserId }: Props) {
  const canManage = canManageMembers(currentUserRole);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [inviteState, inviteAction] = useFormState(createInvitation, { error: null });

  async function handleCancelInvitation(id: string) {
    await cancelInvitation(id);
    setInvitations((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Members table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100">
          <span className="text-xs font-bold text-brand-gray uppercase tracking-wide">Miembros actuales</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-brand-gray text-xs uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Nombre</th>
              <th className="text-left px-5 py-3 font-medium">Email</th>
              <th className="text-left px-5 py-3 font-medium">Rol</th>
              {canManage && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                canManage={canManage}
                isCurrentUser={m.isCurrentUser}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending invitations */}
      {(invitations.length > 0 || canManage) && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-bold text-brand-gray uppercase tracking-wide">
              Invitaciones pendientes
            </span>
          </div>
          {invitations.length === 0 ? (
            <p className="px-5 py-4 text-xs text-gray-400">No hay invitaciones pendientes.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-brand-gray text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-left px-5 py-3 font-medium">Rol</th>
                  <th className="text-left px-5 py-3 font-medium">Expira</th>
                  {canManage && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition group">
                    <td className="px-5 py-3 text-brand-gray">{inv.email}</td>
                    <td className="px-5 py-3">
                      <RoleBadge role={inv.role as AppRole} />
                    </td>
                    <td className="px-5 py-3 text-xs text-brand-gray">
                      {new Date(inv.expires_at).toLocaleDateString("es-AR")}
                    </td>
                    {canManage && (
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                        >
                          Cancelar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Invite form */}
      {canManage && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-bold text-brand-gray uppercase tracking-wide">Invitar miembro</span>
          </div>
          <form action={inviteAction} className="px-5 py-4 flex flex-col gap-3">
            <div className="flex gap-3 items-end">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="correo@empresa.com"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent bg-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">Rol</label>
                <select
                  name="role"
                  defaultValue="member"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-brand-black bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange"
                >
                  <option value="owner">Líder</option>
                  <option value="admin">Analista</option>
                  <option value="member">Stakeholder</option>
                </select>
              </div>
              <SubmitBtn label="Invitar" />
            </div>
            {inviteState.error && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{inviteState.error}</p>
            )}
            {inviteState.error === null && inviteState.success && (
              <p className="text-xs text-brand-green bg-green-50 rounded px-3 py-2">
                Invitación creada. El enlace de invitación se puede compartir manualmente.
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member: m,
  canManage,
  isCurrentUser,
}: {
  member: MemberWithProfile;
  canManage: boolean;
  isCurrentUser: boolean;
}) {
  const displayName = m.profile?.full_name ?? "Sin nombre";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <tr className="hover:bg-gray-50 transition group">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: "#E8621A" }}
          >
            {initials || "?"}
          </div>
          <span className="font-medium text-brand-black text-sm">
            {displayName}
            {isCurrentUser && (
              <span className="ml-2 text-[10px] text-brand-gray font-normal">(tú)</span>
            )}
          </span>
        </div>
      </td>
      <td className="px-5 py-3 text-brand-gray text-sm">—</td>
      <td className="px-5 py-3">
        <RoleBadge role={m.role as AppRole} />
      </td>
      {canManage && !isCurrentUser && (
        <td className="px-5 py-3">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
            <RoleSelect memberId={m.id} currentRole={m.role as AppRole} />
            <form action={removeMember.bind(null, m.id)}>
              <button
                type="submit"
                className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition"
              >
                Eliminar
              </button>
            </form>
          </div>
        </td>
      )}
      {canManage && isCurrentUser && <td className="px-5 py-3" />}
    </tr>
  );
}

function RoleSelect({ memberId, currentRole }: { memberId: string; currentRole: AppRole }) {
  return (
    <select
      defaultValue={currentRole}
      onChange={(e) => updateMemberRole(memberId, e.target.value as AppRole)}
      className="text-xs rounded border border-gray-200 px-1.5 py-1 bg-white text-brand-gray focus:outline-none focus:ring-1 focus:ring-brand-orange"
    >
      <option value="owner">Líder</option>
      <option value="admin">Analista</option>
      <option value="member">Stakeholder</option>
    </select>
  );
}

function RoleBadge({ role }: { role: AppRole }) {
  return (
    <span
      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
      style={{
        background: ROLE_BG[role],
        color: ROLE_COLOR[role],
        border: `1px solid ${ROLE_BORDER[role]}`,
      }}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

"use client";

import { useState, useEffect, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { OrganizationMember } from "@/types/database";
import type { Invitation } from "@/types/database";
import { type AppRole, ROLE_LABEL, ROLE_COLOR, ROLE_BG, ROLE_BORDER, canManageMembers } from "@/lib/roles";
import { createInvitation, cancelInvitation, updateMemberRole, removeMember, setRoleLabel, resetRoleLabel } from "../actions";

type MemberWithProfile = OrganizationMember & {
  profile: { id: string; full_name: string | null; avatar_url: string | null } | null;
  email: string | null;
  isCurrentUser: boolean;
};

type Props = {
  members: MemberWithProfile[];
  invitations: Invitation[];
  currentUserRole: AppRole;
  currentUserId: string;
  roleLabels: Record<AppRole, string>;
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

export function MembersView({ members, invitations: initialInvitations, currentUserRole, currentUserId, roleLabels: initialRoleLabels }: Props) {
  const canManage = canManageMembers(currentUserRole);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [localRoleLabels, setLocalRoleLabels] = useState(initialRoleLabels);
  const [inviteState, inviteAction] = useFormState(createInvitation, { error: null });

  async function handleCancelInvitation(id: string) {
    await cancelInvitation(id);
    setInvitations((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSetRoleLabel(role: AppRole, label: string) {
    const res = await setRoleLabel(role, label);
    if (!res.error) setLocalRoleLabels((prev) => ({ ...prev, [role]: label }));
  }

  async function handleResetRoleLabel(role: AppRole) {
    await resetRoleLabel(role);
    setLocalRoleLabels((prev) => ({ ...prev, [role]: ROLE_LABEL[role] }));
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
              <th className="text-left px-5 py-3 font-medium">Rol</th>
              <th className="text-left px-5 py-3 font-medium">Nombre</th>
              <th className="text-left px-5 py-3 font-medium">Email</th>
              {canManage && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                email={m.email}
                canManage={canManage}
                isCurrentUser={m.isCurrentUser}
                roleLabels={localRoleLabels}
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
                      <RoleBadge role={inv.role as AppRole} roleLabels={localRoleLabels} />
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
                  <option value="owner">{localRoleLabels.owner}</option>
                  <option value="admin">{localRoleLabels.admin}</option>
                  <option value="member">{localRoleLabels.member}</option>
                </select>
              </div>
              <SubmitBtn label="Invitar" />
            </div>
            {inviteState.error && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{inviteState.error}</p>
            )}
            {inviteState.error === null && inviteState.success && (
              <p className="text-xs text-brand-green bg-green-50 rounded px-3 py-2">
                Invitación enviada por email. El destinatario recibirá un enlace para unirse.
              </p>
            )}
          </form>
        </div>
      )}

      {/* Nombres de roles */}
      {canManage && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-bold text-brand-gray uppercase tracking-wide">Nombres de roles</span>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            {(["owner", "admin", "member"] as AppRole[]).map((r) => (
              <RoleLabelRow
                key={r}
                role={r}
                currentLabel={localRoleLabels[r]}
                defaultLabel={ROLE_LABEL[r]}
                onSave={(label) => handleSetRoleLabel(r, label)}
                onReset={() => handleResetRoleLabel(r)}
              />
            ))}
            <p className="text-[10px] text-brand-gray mt-1">
              Los nombres se muestran en toda la app. Los permisos de cada rol no cambian.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MemberRow ─────────────────────────────────────────────────────────────────

function MemberRow({
  member: m,
  email,
  canManage,
  isCurrentUser,
  roleLabels,
}: {
  member: MemberWithProfile;
  email: string | null;
  canManage: boolean;
  isCurrentUser: boolean;
  roleLabels: Record<AppRole, string>;
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
        <RoleBadge role={m.role as AppRole} roleLabels={roleLabels} />
      </td>
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
      <td className="px-5 py-3 text-brand-gray text-sm">{email ?? "—"}</td>
      {canManage && !isCurrentUser && (
        <td className="px-5 py-3">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
            <RoleSelect memberId={m.id} currentRole={m.role as AppRole} roleLabels={roleLabels} />
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

// ── RoleSelect ────────────────────────────────────────────────────────────────

function RoleSelect({ memberId, currentRole, roleLabels }: { memberId: string; currentRole: AppRole; roleLabels: Record<AppRole, string> }) {
  return (
    <select
      defaultValue={currentRole}
      onChange={(e) => updateMemberRole(memberId, e.target.value as AppRole)}
      className="text-xs rounded border border-gray-200 px-1.5 py-1 bg-white text-brand-gray focus:outline-none focus:ring-1 focus:ring-brand-orange"
    >
      <option value="owner">{roleLabels.owner}</option>
      <option value="admin">{roleLabels.admin}</option>
      <option value="member">{roleLabels.member}</option>
    </select>
  );
}

// ── RoleBadge ─────────────────────────────────────────────────────────────────

function RoleBadge({ role, roleLabels }: { role: AppRole; roleLabels: Record<AppRole, string> }) {
  return (
    <span
      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
      style={{
        background: ROLE_BG[role],
        color: ROLE_COLOR[role],
        border: `1px solid ${ROLE_BORDER[role]}`,
      }}
    >
      {roleLabels[role]}
    </span>
  );
}

// ── RoleLabelRow ──────────────────────────────────────────────────────────────

function RoleLabelRow({
  role,
  currentLabel,
  defaultLabel,
  onSave,
  onReset,
}: {
  role: AppRole;
  currentLabel: string;
  defaultLabel: string;
  onSave: (label: string) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentLabel);
  const [isPending, startTransition] = useTransition();
  const isCustom = currentLabel !== defaultLabel;

  useEffect(() => { setValue(currentLabel); }, [currentLabel]);

  function handleSave() {
    if (!value.trim()) return;
    startTransition(async () => {
      await onSave(value.trim());
      setEditing(false);
    });
  }

  function handleReset() {
    startTransition(async () => {
      await onReset();
      setEditing(false);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-28 flex-shrink-0">
        <span
          className="text-xs font-bold px-2.5 py-0.5 rounded-full"
          style={{ background: ROLE_BG[role], color: ROLE_COLOR[role], border: `1px solid ${ROLE_BORDER[role]}` }}
        >
          {currentLabel}
        </span>
      </div>
      {editing ? (
        <>
          <input
            autoFocus
            className="flex-1 text-sm border border-brand-orange/40 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            value={value}
            maxLength={40}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setValue(currentLabel); setEditing(false); }
            }}
          />
          <button
            onClick={handleSave}
            disabled={isPending || !value.trim()}
            className="text-xs px-2.5 py-1 rounded-lg bg-brand-orange text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Guardar
          </button>
          <button
            onClick={() => { setValue(currentLabel); setEditing(false); }}
            className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-brand-gray hover:text-brand-black transition-colors"
          >
            Cancelar
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-brand-black">{currentLabel}</span>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-brand-gray hover:text-brand-black transition-colors"
          >
            Renombrar
          </button>
          {isCustom && (
            <button
              onClick={handleReset}
              disabled={isPending}
              className="text-xs text-brand-gray hover:text-brand-black transition-colors disabled:opacity-40"
            >
              Restablecer ({defaultLabel})
            </button>
          )}
        </>
      )}
    </div>
  );
}

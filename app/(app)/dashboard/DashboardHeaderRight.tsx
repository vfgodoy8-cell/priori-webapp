"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { TeamPanelTrigger } from "@/components/ui/TeamPanelTrigger";
import type { Team } from "@/types/database";

type Props = {
  orgName: string;
  userEmail: string;
  teams: Team[];
  orgId: string;
};

export function DashboardHeaderRight({ orgName, userEmail, teams, orgId }: Props) {
  return (
    <div className="flex items-center gap-4">
      <TeamPanelTrigger teams={teams} orgId={orgId} />
      <Link
        href="/settings/members"
        className="text-sm px-3 py-1.5 rounded-lg bg-white text-brand-gray hover:text-brand-black transition"
        style={{ border: "1.5px solid #E5E5E5", borderRadius: 8 }}
      >
        👥 Miembros
      </Link>
      <span className="text-sm text-brand-gray">{orgName}</span>
      <span className="text-xs text-gray-300">|</span>
      <span className="text-sm text-brand-gray">{userEmail}</span>
      <LogoutButton />
    </div>
  );
}

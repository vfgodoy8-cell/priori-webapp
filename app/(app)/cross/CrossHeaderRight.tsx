"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { TeamPanelTrigger } from "@/components/ui/TeamPanelTrigger";
import type { Team } from "@/types/database";

type Props = {
  orgName: string;
  teams: Team[];
  orgId: string;
};

export function CrossHeaderRight({ orgName, teams, orgId }: Props) {
  return (
    <div className="flex items-center gap-4">
      <Link
        href="/squad"
        className="text-sm font-bold px-3.5 py-1.5 rounded-lg bg-white text-brand-gray hover:text-brand-orange hover:border-brand-orange transition"
        style={{ border: "1.5px solid #E5E5E5", borderRadius: 8 }}
      >
        👥 Modo Squad →
      </Link>
      <TeamPanelTrigger teams={teams} orgId={orgId} />
      <span className="text-sm text-brand-gray">{orgName}</span>
      <LogoutButton />
    </div>
  );
}

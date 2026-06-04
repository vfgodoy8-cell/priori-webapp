"use client";

import { LogoutButton } from "@/components/ui/LogoutButton";
import { TeamPanelTrigger } from "@/components/ui/TeamPanelTrigger";
import { IdeaButton } from "@/components/ui/IdeaButton";
import { ModoSwitcher } from "@/components/ui/ModoSwitcher";
import type { Team } from "@/types/database";
import type { AppRole } from "@/lib/roles";

type Props = {
  orgName: string;
  teams: Team[];
  orgId: string;
  role: AppRole;
};

export function CrossHeaderRight({ orgName, teams, orgId, role }: Props) {
  return (
    <div className="flex items-center gap-4">
      {role === "owner" && <IdeaButton />}
      <ModoSwitcher current="cross" />
      <TeamPanelTrigger teams={teams} orgId={orgId} />
      <span className="text-sm text-brand-gray">{orgName}</span>
      <LogoutButton />
    </div>
  );
}

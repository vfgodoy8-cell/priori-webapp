"use client";

import { LogoutButton } from "@/components/ui/LogoutButton";
import { TeamPanelTrigger } from "@/components/ui/TeamPanelTrigger";
import { IdeaButton } from "@/components/ui/IdeaButton";
import { ModoSwitcher } from "@/components/ui/ModoSwitcher";
import { NotificationBell } from "@/components/ui/NotificationBell";
import type { Team } from "@/types/database";
import type { AppRole } from "@/lib/roles";
import type { DeadlineAlert } from "@/lib/deadlines";

type Props = {
  orgName: string;
  teams: Team[];
  orgId: string;
  role: AppRole;
  alerts: DeadlineAlert[];
};

export function CrossHeaderRight({ orgName, teams, orgId, role, alerts }: Props) {
  return (
    <div className="flex items-center gap-4">
      {role === "owner" && <IdeaButton />}
      <NotificationBell alerts={alerts} />
      <ModoSwitcher current="cross" />
      <TeamPanelTrigger teams={teams} orgId={orgId} role={role} />
      <span className="text-sm text-brand-gray">{orgName}</span>
      <LogoutButton />
    </div>
  );
}

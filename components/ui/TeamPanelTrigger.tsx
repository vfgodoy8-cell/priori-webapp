"use client";

import { useState } from "react";
import { GroupsManagerModal } from "./GroupsManagerModal";
import type { Group } from "@/types/database";
import type { AppRole } from "@/lib/roles";

type Props = {
  teams: Group[];
  orgId: string;
  role?: AppRole;
};

export function TeamPanelTrigger({ teams, orgId, role = "member" }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-white text-brand-gray hover:text-brand-orange hover:border-brand-orange transition"
        style={{ border: "1.5px solid #E5E5E5", borderRadius: 8 }}
      >
        ⚙ Grupos
      </button>
      <GroupsManagerModal
        groups={teams}
        orgId={orgId}
        role={role}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

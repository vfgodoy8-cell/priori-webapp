"use client";

import { useState } from "react";
import { TeamPanel } from "./TeamPanel";
import type { Team } from "@/types/database";

type Props = {
  teams: Team[];
  orgId: string;
};

export function TeamPanelTrigger({ teams, orgId }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-white text-brand-gray hover:text-brand-orange hover:border-brand-orange transition"
        style={{ border: "1.5px solid #E5E5E5", borderRadius: 8 }}
      >
        ⚙ Equipos
      </button>
      <TeamPanel teams={teams} orgId={orgId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

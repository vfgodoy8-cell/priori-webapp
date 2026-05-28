"use client";

import { useState, useEffect } from "react";
import { getEntityActivity } from "@/app/(app)/activity/actions";
import type { ActivityLog, ActivityAction } from "@/lib/activity";
import { ACTION_LABEL } from "@/lib/activity";

const ACTION_ICON: Record<ActivityAction, string> = {
  created:   "✦",
  updated:   "✎",
  deleted:   "✕",
  placed:    "📅",
  unplaced:  "⊘",
  discarded: "✗",
  restored:  "↩",
  commented: "💬",
};

const ACTION_COLOR: Record<ActivityAction, string> = {
  created:   "#1D9E75",
  updated:   "#1E6FC5",
  deleted:   "#E24B4A",
  placed:    "#E8621A",
  unplaced:  "#6B6B6B",
  discarded: "#E24B4A",
  restored:  "#1D9E75",
  commented: "#6B6B6B",
};

type Props = {
  entityId: string;
};

export function ActivityFeed({ entityId }: Props) {
  const [log, setLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getEntityActivity(entityId).then((data) => {
      setLog(data);
      setLoading(false);
    });
  }, [entityId]);

  if (loading) return <p className="text-xs text-gray-400 text-center py-4">Cargando…</p>;
  if (log.length === 0) return <p className="text-xs text-gray-400 text-center py-4">Sin actividad registrada.</p>;

  return (
    <div className="flex flex-col gap-0">
      {log.map((entry, i) => (
        <ActivityEntry key={entry.id} entry={entry} isLast={i === log.length - 1} />
      ))}
    </div>
  );
}

function ActivityEntry({ entry, isLast }: { entry: ActivityLog; isLast: boolean }) {
  const action = entry.action as ActivityAction;
  const color = ACTION_COLOR[action] ?? "#6B6B6B";
  const icon = ACTION_ICON[action] ?? "·";
  const label = ACTION_LABEL[action] ?? entry.action;
  const actor = entry.actor?.full_name ?? "Alguien";

  return (
    <div className="flex gap-2.5">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 z-10"
          style={{ background: color }}
        >
          {icon}
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-100 mt-0.5" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-3 min-w-0">
        <div className="flex items-baseline gap-1 flex-wrap">
          <span className="text-[11px] font-semibold text-brand-black">{actor}</span>
          <span className="text-[11px] text-brand-gray">{label}</span>
          <span className="text-[11px] font-medium text-brand-black truncate max-w-[140px]">{entry.entity_name}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-gray-400">{timeAgo(entry.created_at)}</span>
          {typeof entry.metadata?.q === "string" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-brand-orange">{entry.metadata.q}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

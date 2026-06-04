"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { IconBell } from "@tabler/icons-react";
import type { DeadlineAlert, DeadlineSeverity } from "@/lib/deadlines";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "@/lib/deadlines";

const MODE_LABEL: Record<string, string> = { squad: "Squad", cross: "Cross", roadmap: "Roadmap" };
const MONTHS_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function fmtDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTHS_ES[m - 1]}`;
}

export function NotificationBell({ alerts }: { alerts: DeadlineAlert[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const topSeverity: DeadlineSeverity | null =
    alerts.some((a) => a.severity === "red")    ? "red"    :
    alerts.some((a) => a.severity === "orange")  ? "orange" :
    alerts.some((a) => a.severity === "yellow")  ? "yellow" : null;

  const grouped = { red: [] as DeadlineAlert[], orange: [] as DeadlineAlert[], yellow: [] as DeadlineAlert[] };
  for (const a of alerts) grouped[a.severity].push(a);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-brand-gray hover:text-brand-black transition"
        style={{ border: "1.5px solid #E5E5E5" }}
        title="Alertas de vencimiento"
      >
        <IconBell size={16} strokeWidth={1.75} />
        {topSeverity && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center leading-none"
            style={{ background: SEVERITY_COLOR[topSeverity], fontSize: 9, fontWeight: 700 }}
          >
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-100 w-72 max-h-80 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-brand-black uppercase tracking-wide">
              Alertas de vencimiento
            </p>
          </div>

          {alerts.length === 0 ? (
            <p className="text-xs text-brand-gray p-4 text-center">Sin alertas pendientes.</p>
          ) : (
            (["red", "orange", "yellow"] as DeadlineSeverity[]).map((sev) => {
              const group = grouped[sev];
              if (group.length === 0) return null;
              return (
                <div key={sev}>
                  <p
                    className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: SEVERITY_COLOR[sev], background: `${SEVERITY_COLOR[sev]}18` }}
                  >
                    {SEVERITY_LABEL[sev]}
                  </p>
                  {group.map((a) => (
                    <Link
                      key={a.id}
                      href={a.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: SEVERITY_COLOR[sev] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-brand-black truncate">{a.name}</p>
                        <p className="text-[10px] text-brand-gray">
                          {MODE_LABEL[a.mode]} · {fmtDate(a.dueDate)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

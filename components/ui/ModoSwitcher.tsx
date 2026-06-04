"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { IconLayoutKanban, IconCalendarStats, IconTimeline, IconChevronDown } from "@tabler/icons-react";

type Mode = "squad" | "cross" | "roadmap";

const MODES: Record<Mode, { label: string; href: string; icon: React.ReactNode }> = {
  squad:   { label: "Modo Squad",   href: "/squad",   icon: <IconLayoutKanban size={14} strokeWidth={2} /> },
  cross:   { label: "Modo Cross",   href: "/cross",   icon: <IconCalendarStats size={14} strokeWidth={2} /> },
  roadmap: { label: "Modo Roadmap", href: "/roadmap", icon: <IconTimeline      size={14} strokeWidth={2} /> },
};

export function ModoSwitcher({ current }: { current: Mode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const others = (Object.keys(MODES) as Mode[]).filter((m) => m !== current);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-lg bg-white text-brand-gray hover:text-brand-orange transition"
        style={{ border: "1.5px solid #E5E5E5", borderRadius: 8 }}
      >
        Cambiar modo
        <IconChevronDown
          size={13}
          strokeWidth={2}
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-100 py-1 min-w-[168px]">
          {others.map((m) => {
            const mode = MODES[m];
            return (
              <Link
                key={m}
                href={mode.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-brand-gray hover:text-brand-orange hover:bg-orange-50 transition"
              >
                {mode.icon}
                {mode.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

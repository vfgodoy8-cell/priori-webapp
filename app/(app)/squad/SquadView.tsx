"use client";

import { useState, useEffect } from "react";
import type { Project } from "@/types/database";
import { ProjectList } from "./ProjectList";
import { SquadCanvas } from "./SquadCanvas";
import { AnalystPanel } from "./AnalystPanel";
import { ShareModal } from "@/components/ui/ShareModal";
import { loadConfig, DEFAULT_CONFIG, type SquadConfig } from "@/lib/squad-logic";

type View = "canvas" | "list";

type Props = {
  projects: Project[];     // active, non-p0 (for canvas)
  discarded: Project[];    // status='discarded'
  p0Projects: Project[];   // active but computed quadrant = p0
  allActive: Project[];    // all active projects (for AnalystPanel list)
  orgId: string;
};

export function SquadView({ projects, discarded, p0Projects, allActive, orgId }: Props) {
  const [view, setView] = useState<View>("canvas");
  const [config, setConfig] = useState<SquadConfig>(DEFAULT_CONFIG);
  const [forceEdit, setForceEdit] = useState<Project | null>(null);
  const [openRequest, setOpenRequest] = useState(0);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    setConfig(loadConfig(orgId));
  }, [orgId]);

  return (
    <>
      {/* Share bar */}
      <div className="flex items-center gap-3 pb-3 mb-3 border-b border-gray-100">
        <span className="text-xs font-bold text-brand-gray uppercase tracking-wide">Compartir vista</span>
        <button
          onClick={() => setShowShare(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-orange hover:bg-orange-600 text-white transition"
        >
          ↗ Compartir / Exportar
        </button>
      </div>

      {/* Title + view toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Modo Squad</h1>
          <p className="text-xs text-brand-gray mt-0.5">
            {allActive.length} proyecto{allActive.length !== 1 ? "s" : ""} activo
            {allActive.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView("canvas")}
            className={`px-3 py-1.5 text-sm rounded-md transition ${
              view === "canvas"
                ? "bg-white text-brand-black font-medium shadow-sm"
                : "text-brand-gray hover:text-brand-black"
            }`}
          >
            Canvas
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 text-sm rounded-md transition ${
              view === "list"
                ? "bg-white text-brand-black font-medium shadow-sm"
                : "text-brand-gray hover:text-brand-black"
            }`}
          >
            Lista
          </button>
        </div>
      </div>

      {view === "canvas" ? (
        <SquadCanvas
          projects={projects}
          discarded={discarded}
          p0Projects={p0Projects}
          config={config}
          onEdit={(p) => setForceEdit(p)}
        />
      ) : (
        <ProjectList
          projects={allActive}
          discarded={discarded}
          onEdit={(p) => setForceEdit(p)}
          onNew={() => setOpenRequest((n) => n + 1)}
        />
      )}

      {showShare && <ShareModal mode="squad" onClose={() => setShowShare(false)} />}

      <AnalystPanel
        projects={allActive}
        orgId={orgId}
        config={config}
        onConfigChange={setConfig}
        forceEdit={forceEdit}
        onForceEditConsumed={() => setForceEdit(null)}
        openRequest={openRequest}
      />
    </>
  );
}

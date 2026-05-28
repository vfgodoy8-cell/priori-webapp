"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/types/database";
import { ProjectList } from "./ProjectList";
import { SquadCanvas } from "./SquadCanvas";
import { AnalystPanel } from "./AnalystPanel";
import { ShareModal } from "@/components/ui/ShareModal";
import { loadConfig, DEFAULT_CONFIG, type SquadConfig } from "@/lib/squad-logic";
import { type AppRole, ROLE_LABEL, ROLE_COLOR, ROLE_BG, ROLE_BORDER } from "@/lib/roles";

type View = "canvas" | "list";

type Props = {
  projects: Project[];
  discarded: Project[];
  p0Projects: Project[];
  allActive: Project[];
  orgId: string;
  role: AppRole;
  crossLinkedIds?: Set<string>;
  highlightIds?: Set<string> | null;
  filterInitiative?: { id: string; name: string } | null;
  projectIniMap?: Record<string, string>;
};

export function SquadView({ projects, discarded, p0Projects, allActive, orgId, role, crossLinkedIds, highlightIds, filterInitiative, projectIniMap }: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>("canvas");
  const [quarterOverlay, setQuarterOverlay] = useState(false);
  const [config, setConfig] = useState<SquadConfig>(DEFAULT_CONFIG);
  const [forceEdit, setForceEdit] = useState<Project | null>(null);
  const [openRequest, setOpenRequest] = useState(0);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    setConfig(loadConfig(orgId));
  }, [orgId]);

  return (
    <>
      {/* Cross drill-down filter banner */}
      {filterInitiative && (
        <div className="flex items-center gap-3 px-4 py-2.5 mb-3 bg-blue-50 border border-blue-100 rounded-lg text-xs">
          <span className="text-brand-blue font-semibold">
            Mostrando proyectos de: <strong>{filterInitiative.name}</strong>
          </span>
          <a href="/cross" className="text-brand-blue underline hover:text-blue-700 ml-auto flex-shrink-0">← Ver en Cross</a>
          <button
            onClick={() => router.push("/squad")}
            className="text-gray-400 hover:text-brand-black flex-shrink-0"
            title="Limpiar filtro"
          >
            ✕ Limpiar
          </button>
        </div>
      )}

      {/* Share bar */}
      <div className="flex items-center gap-3 pb-3 mb-3 border-b border-gray-100">
        <span className="text-xs font-bold text-brand-gray uppercase tracking-wide">Compartir vista</span>
        <button
          onClick={() => setShowShare(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-orange hover:bg-orange-600 text-white transition"
        >
          ↗ Compartir / Exportar
        </button>
        <span className="ml-auto">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: ROLE_BG[role],
              color: ROLE_COLOR[role],
              border: `1px solid ${ROLE_BORDER[role]}`,
            }}
          >
            {ROLE_LABEL[role]}
          </span>
        </span>
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
        <div className="flex items-center gap-3">
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
          {view === "canvas" && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs font-semibold text-brand-gray">Vista Q</span>
              <div
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${quarterOverlay ? "bg-brand-orange" : "bg-gray-300"}`}
                onClick={() => setQuarterOverlay((q) => !q)}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${quarterOverlay ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </div>
            </label>
          )}
        </div>
      </div>

      {view === "canvas" ? (
        <SquadCanvas
          projects={projects}
          discarded={discarded}
          p0Projects={p0Projects}
          config={config}
          onEdit={(p) => setForceEdit(p)}
          quarterOverlay={quarterOverlay}
          readOnly={role === "member"}
          crossLinkedIds={crossLinkedIds}
          highlightIds={highlightIds}
          projectIniMap={projectIniMap}
        />
      ) : (
        <ProjectList
          projects={allActive}
          discarded={discarded}
          onEdit={(p) => setForceEdit(p)}
          onNew={() => setOpenRequest((n) => n + 1)}
          readOnly={role === "member"}
        />
      )}

      {showShare && <ShareModal mode="squad" onClose={() => setShowShare(false)} />}

      {role !== "member" && (
        <AnalystPanel
          projects={allActive}
          orgId={orgId}
          config={config}
          onConfigChange={setConfig}
          forceEdit={forceEdit}
          onForceEditConsumed={() => setForceEdit(null)}
          openRequest={openRequest}
        />
      )}
    </>
  );
}

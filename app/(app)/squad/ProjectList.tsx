"use client";

import { useState } from "react";
import { ProjectForm } from "./ProjectForm";
import { discardProject, restoreProject, deleteProject } from "./actions";
import { computeQuadrant, QUADRANT_META } from "@/lib/quadrant";
import type { Project } from "@/types/database";

type Props = {
  projects: Project[];
  discarded: Project[];
};

export function ProjectList({ projects, discarded }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState<Project | undefined>();

  function openCreate() {
    setEditProject(undefined);
    setShowForm(true);
  }

  function openEdit(p: Project) {
    setEditProject(p);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditProject(undefined);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Modo Squad</h1>
          <p className="text-sm text-brand-gray mt-0.5">
            {projects.length} proyecto{projects.length !== 1 ? "s" : ""} activo
            {projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-brand-orange hover:bg-orange-600 text-white font-semibold rounded-lg px-4 py-2 text-sm transition"
        >
          + Nuevo proyecto
        </button>
      </div>

      {/* Tabla de proyectos activos */}
      {projects.length === 0 ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <ProjectTable projects={projects} onEdit={openEdit} />
      )}

      {/* Proyectos descartados */}
      {discarded.length > 0 && (
        <DiscardedSection discarded={discarded} />
      )}

      {/* Modal */}
      {showForm && (
        <ProjectForm project={editProject} onClose={closeForm} />
      )}
    </div>
  );
}

function ProjectTable({
  projects,
  onEdit,
}: {
  projects: Project[];
  onEdit: (p: Project) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-brand-gray text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3 font-medium">Proyecto</th>
            <th className="text-left px-4 py-3 font-medium">Cuadrante</th>
            <th className="text-right px-4 py-3 font-medium">Impacto</th>
            <th className="text-right px-4 py-3 font-medium">Sprints</th>
            <th className="text-left px-4 py-3 font-medium">Stakeholder</th>
            <th className="text-right px-4 py-3 font-medium">Fecha prod.</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {projects.map((p) => (
            <ProjectRow key={p.id} project={p} onEdit={onEdit} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectRow({
  project: p,
  onEdit,
}: {
  project: Project;
  onEdit: (p: Project) => void;
}) {
  const q = computeQuadrant(p.impact_value, p.effort_sprints);
  const meta = QUADRANT_META[q];

  const discardWithId = discardProject.bind(null, p.id);
  const deleteWithId = deleteProject.bind(null, p.id);

  return (
    <tr className="hover:bg-gray-50 transition group">
      <td className="px-4 py-3 font-medium text-brand-black max-w-[200px] truncate">
        {p.name}
      </td>
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ color: meta.color, backgroundColor: meta.bg }}
        >
          {meta.priority} {meta.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-brand-black tabular-nums">
        {p.impact_metric === "revenue"
          ? `$${Number(p.impact_value).toLocaleString("es-AR")}`
          : `${Number(p.impact_value).toLocaleString("es-AR")} cli.`}
      </td>
      <td className="px-4 py-3 text-right text-brand-black tabular-nums">
        {p.effort_sprints} sp
      </td>
      <td className="px-4 py-3 text-brand-gray max-w-[150px] truncate">
        {p.stakeholder ?? "—"}
      </td>
      <td className="px-4 py-3 text-right text-brand-gray">
        {p.production_date
          ? new Date(p.production_date).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => onEdit(p)}
            className="text-xs text-brand-gray hover:text-brand-black px-2 py-1 rounded hover:bg-gray-100 transition"
          >
            Editar
          </button>
          <form action={discardWithId}>
            <button
              type="submit"
              className="text-xs text-brand-gray hover:text-brand-orange px-2 py-1 rounded hover:bg-orange-50 transition"
            >
              Descartar
            </button>
          </form>
          <form action={deleteWithId}>
            <button
              type="submit"
              className="text-xs text-brand-gray hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition"
            >
              Eliminar
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function DiscardedSection({ discarded }: { discarded: Project[] }) {
  return (
    <details className="group">
      <summary className="flex items-center gap-2 cursor-pointer text-sm text-brand-gray hover:text-brand-black transition list-none">
        <span className="text-xs">▶</span>
        <span>
          Descartados ({discarded.length})
        </span>
      </summary>
      <div className="mt-3 bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-50">
            {discarded.map((p) => (
              <DiscardedRow key={p.id} project={p} />
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function DiscardedRow({ project: p }: { project: Project }) {
  const restoreWithId = restoreProject.bind(null, p.id);
  const deleteWithId = deleteProject.bind(null, p.id);

  return (
    <tr className="hover:bg-gray-50 transition group opacity-60 hover:opacity-100">
      <td className="px-4 py-3 font-medium text-brand-black line-through">
        {p.name}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <form action={restoreWithId}>
            <button
              type="submit"
              className="text-xs text-brand-green hover:underline px-2 py-1 rounded hover:bg-green-50 transition"
            >
              Restaurar
            </button>
          </form>
          <form action={deleteWithId}>
            <button
              type="submit"
              className="text-xs text-red-500 hover:underline px-2 py-1 rounded hover:bg-red-50 transition"
            >
              Eliminar
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-200 py-16 flex flex-col items-center gap-3">
      <p className="text-brand-gray text-sm">No hay proyectos todavía.</p>
      <button
        onClick={onAdd}
        className="text-sm text-brand-orange font-medium hover:underline"
      >
        Crear el primero
      </button>
    </div>
  );
}

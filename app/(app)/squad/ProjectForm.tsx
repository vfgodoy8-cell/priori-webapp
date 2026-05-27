"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createProject, updateProject } from "./actions";
import type { Project } from "@/types/database";

type Props = {
  project?: Project;
  onClose: () => void;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand-orange hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition"
    >
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}

export function ProjectForm({ project, onClose }: Props) {
  const action = project ? updateProject : createProject;
  const [state, formAction] = useFormState(action, { error: null });
  const formRef = useRef<HTMLFormElement>(null);

  // Cerrar el modal cuando la acción fue exitosa
  useEffect(() => {
    if (state.error === null && formRef.current?.dataset.submitted === "true") {
      onClose();
    }
  }, [state, onClose]);

  const isEditing = !!project;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-brand-black">
            {isEditing ? "Editar proyecto" : "Nuevo proyecto"}
          </h2>
          <button
            onClick={onClose}
            className="text-brand-gray hover:text-brand-black transition text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form
          ref={formRef}
          action={formAction}
          onSubmit={() => {
            if (formRef.current) formRef.current.dataset.submitted = "true";
          }}
          className="px-6 py-5 flex flex-col gap-4"
        >
          {isEditing && <input type="hidden" name="id" value={project.id} />}

          {/* Nombre */}
          <Field label="Nombre del proyecto *" htmlFor="name">
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={project?.name}
              placeholder="Ej: Portal de autogestión"
              className={inputClass}
            />
          </Field>

          {/* Impacto */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Impacto *" htmlFor="impact_value">
              <input
                id="impact_value"
                name="impact_value"
                type="number"
                min="0"
                step="any"
                required
                defaultValue={project?.impact_value ?? ""}
                placeholder="0"
                className={inputClass}
              />
            </Field>
            <Field label="Métrica" htmlFor="impact_metric">
              <select
                id="impact_metric"
                name="impact_metric"
                defaultValue={project?.impact_metric ?? "revenue"}
                className={inputClass}
              >
                <option value="revenue">Ventas ($)</option>
                <option value="customers">Clientes</option>
              </select>
            </Field>
          </div>

          {/* Esfuerzo */}
          <Field label={`Esfuerzo (sprints) *`} htmlFor="effort_sprints">
            <input
              id="effort_sprints"
              name="effort_sprints"
              type="number"
              min="1"
              max="24"
              required
              defaultValue={project?.effort_sprints ?? ""}
              placeholder="1 – 24"
              className={inputClass}
            />
          </Field>

          {/* Stakeholder */}
          <Field label="Stakeholder" htmlFor="stakeholder">
            <input
              id="stakeholder"
              name="stakeholder"
              type="text"
              defaultValue={project?.stakeholder ?? ""}
              placeholder="Ej: Gerencia Comercial"
              className={inputClass}
            />
          </Field>

          {/* Fecha de producción */}
          <Field label="Fecha de producción" htmlFor="production_date">
            <input
              id="production_date"
              name="production_date"
              type="date"
              defaultValue={project?.production_date ?? ""}
              className={inputClass}
            />
          </Field>

          {/* Dependencias */}
          <Field label="Dependencias" htmlFor="dependencies">
            <input
              id="dependencies"
              name="dependencies"
              type="text"
              defaultValue={project?.dependencies ?? ""}
              placeholder="Ej: API de pagos, equipo de infra"
              className={inputClass}
            />
          </Field>

          {/* Descripción */}
          <Field label="Descripción" htmlFor="description">
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={project?.description ?? ""}
              placeholder="Contexto adicional del proyecto…"
              className={`${inputClass} resize-none`}
            />
          </Field>

          {state.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-brand-gray hover:text-brand-black transition px-4 py-2.5"
            >
              Cancelar
            </button>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-brand-black">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition bg-white";

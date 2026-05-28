"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createOrganization } from "./actions";

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full bg-brand-orange hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition"
    >
      {pending ? "Creando…" : "Crear organización"}
    </button>
  );
}

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [state, formAction] = useFormState(createOrganization, { error: null });

  const slug = nameToSlug(name);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="h-2.5 w-16 rounded-full bg-brand-orange" />
            <div className="h-2.5 w-10 rounded-full bg-brand-orange opacity-65" />
            <div className="h-2.5 w-6 rounded-full bg-brand-orange opacity-30" />
          </div>
          <span className="text-2xl font-bold text-brand-black tracking-tight">
            priori
          </span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center">1</div>
            <span className="text-xs font-medium text-brand-orange">Organización</span>
          </div>
          <div className="w-8 h-px bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gray-100 text-brand-gray text-xs font-bold flex items-center justify-center">2</div>
            <span className="text-xs text-brand-gray">Equipos</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-brand-black">
              Creá tu organización
            </h1>
            <p className="text-sm text-brand-gray mt-1">
              Es el espacio de trabajo de tu equipo dentro de Priori™.
            </p>
          </div>

          {/* form action={} — Next.js lo intercepta server-side */}
          <form action={formAction} className="flex flex-col gap-5">
            <input type="hidden" name="slug" value={slug} />

            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium text-brand-black"
                htmlFor="name"
              >
                Nombre de la organización
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                placeholder="Ej: Galicia Seguros"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition"
              />
              {slug && (
                <p className="text-xs text-brand-gray">
                  Identificador:{" "}
                  <span className="font-mono text-brand-black">{slug}</span>
                </p>
              )}
            </div>

            {state.error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {state.error}
              </p>
            )}

            <SubmitButton disabled={!slug} />
          </form>
        </div>
      </div>
    </div>
  );
}

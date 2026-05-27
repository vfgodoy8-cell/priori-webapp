"use client";

import { useState } from "react";
import { createOrganization } from "./actions";

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const slug = nameToSlug(name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setLoading(true);
    setError(null);

    const result = await createOrganization(name.trim(), slug);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // Si no hay error, el server action hace redirect("/dashboard")
  }

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

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium text-brand-black"
                htmlFor="name"
              >
                Nombre de la organización
              </label>
              <input
                id="name"
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

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !slug}
              className="w-full bg-brand-orange hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition"
            >
              {loading ? "Creando…" : "Crear organización"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

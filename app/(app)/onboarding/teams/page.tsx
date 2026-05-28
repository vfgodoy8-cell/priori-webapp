"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTeam } from "@/app/(app)/cross/actions";

const inp = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent bg-white";

type TeamDraft = {
  name: string;
  personas: number;
  proy_per_persona: number;
  q1_pct: number;
  q2_pct: number;
  q3_pct: number;
  q4_pct: number;
};

const EMPTY_DRAFT: TeamDraft = {
  name: "",
  personas: 3,
  proy_per_persona: 1,
  q1_pct: 100,
  q2_pct: 100,
  q3_pct: 100,
  q4_pct: 100,
};

export default function OnboardingTeamsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<TeamDraft[]>([{ ...EMPTY_DRAFT }]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<(string | null)[]>([null]);

  function setField(idx: number, key: keyof TeamDraft, value: string | number) {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, [key]: value } : d)));
  }

  function addDraft() {
    setDrafts((prev) => [...prev, { ...EMPTY_DRAFT }]);
    setErrors((prev) => [...prev, null]);
  }

  function removeDraft(idx: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== idx));
    setErrors((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    const newErrors = drafts.map((d) => (!d.name.trim() ? "El nombre es requerido." : null));
    if (newErrors.some(Boolean)) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    for (const draft of drafts) {
      const fd = new FormData();
      fd.set("name", draft.name.trim());
      fd.set("personas", String(draft.personas));
      fd.set("proy_per_persona", String(draft.proy_per_persona));
      fd.set("q1_pct", String(draft.q1_pct));
      fd.set("q2_pct", String(draft.q2_pct));
      fd.set("q3_pct", String(draft.q3_pct));
      fd.set("q4_pct", String(draft.q4_pct));
      const res = await createTeam({ error: null }, fd);
      if (res.error) {
        setSaving(false);
        setErrors(drafts.map((_, i) => (i === 0 ? res.error : null)));
        return;
      }
    }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="h-2.5 w-16 rounded-full bg-brand-orange" />
            <div className="h-2.5 w-10 rounded-full bg-brand-orange opacity-65" />
            <div className="h-2.5 w-6 rounded-full bg-brand-orange opacity-30" />
          </div>
          <span className="text-2xl font-bold text-brand-black tracking-tight">priori</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gray-100 text-brand-gray text-xs font-bold flex items-center justify-center">1</div>
            <span className="text-xs text-brand-gray">Organización</span>
          </div>
          <div className="w-8 h-px bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center">2</div>
            <span className="text-xs font-medium text-brand-orange">Equipos</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-brand-black">Configurá tu equipo</h1>
            <p className="text-sm text-brand-gray mt-1">Podés agregar más equipos después.</p>
          </div>

          <div className="flex flex-col gap-5">
            {drafts.map((draft, idx) => (
              <div key={idx} className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50 relative">
                {drafts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDraft(idx)}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red-400 text-xs transition"
                  >
                    ✕
                  </button>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">Nombre del equipo</label>
                  <input
                    value={draft.name}
                    onChange={(e) => setField(idx, "name", e.target.value)}
                    placeholder="Ej: Software Delivery"
                    className={inp}
                  />
                  {errors[idx] && <p className="text-xs text-red-600">{errors[idx]}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">Personas</label>
                    <input
                      type="number"
                      min="1"
                      value={draft.personas}
                      onChange={(e) => setField(idx, "personas", parseInt(e.target.value) || 1)}
                      className={inp}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">Proy/persona</label>
                    <input
                      type="number"
                      min="1"
                      value={draft.proy_per_persona}
                      onChange={(e) => setField(idx, "proy_per_persona", parseInt(e.target.value) || 1)}
                      className={inp}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-brand-gray uppercase tracking-wider">Disponibilidad por Quarter (%)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["q1_pct", "q2_pct", "q3_pct", "q4_pct"] as const).map((f, qi) => (
                      <div key={f} className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-brand-gray text-center">Q{qi + 1}</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={draft[f]}
                          onChange={(e) => setField(idx, f, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className={`${inp} text-center px-1`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addDraft}
              className="text-sm text-brand-orange hover:text-orange-600 font-semibold py-1.5 border border-dashed border-brand-orange rounded-lg hover:bg-orange-50 transition"
            >
              + Agregar equipo
            </button>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-brand-orange hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition"
              >
                {saving ? "Guardando…" : "Guardar y continuar"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="w-full text-sm text-brand-gray hover:text-brand-black py-2 transition"
              >
                Ir al dashboard sin configurar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

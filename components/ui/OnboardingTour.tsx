"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "priori_tour_done_v1";

type Step = {
  title: string;
  body: React.ReactNode;
  visual: React.ReactNode;
};

const STEPS: Step[] = [
  {
    title: "Bienvenido a priori™",
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-col gap-2.5">
          <div className="h-3 w-20 rounded-full bg-brand-orange" />
          <div className="h-3 w-13 rounded-full bg-brand-orange opacity-65" />
          <div className="h-3 w-8 rounded-full bg-brand-orange opacity-30" />
        </div>
        <span className="text-3xl font-bold text-brand-black tracking-tight">priori</span>
      </div>
    ),
    body: (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-brand-gray leading-relaxed">
          La herramienta de <span className="font-semibold text-brand-black">transparencia estratégica</span> para equipos de software.
        </p>
        <div className="flex flex-col gap-2">
          {[
            { icon: "🎯", text: "Priorizar proyectos por Impacto vs Esfuerzo" },
            { icon: "📅", text: "Planificar iniciativas por Quarter" },
            { icon: "👥", text: "Colaborar con tu equipo en tiempo real" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm text-brand-gray">
              <span className="text-base">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Modo Squad — La Matriz",
    visual: (
      <div className="grid grid-cols-2 gap-1.5 w-[200px]">
        {[
          { label: "Quick Win", color: "#1D9E75", bg: "#F0FBF6", priority: "P1", sub: "Alto impacto · Bajo esfuerzo" },
          { label: "Gran Proyecto", color: "#1E6FC5", bg: "#EAF1FB", priority: "P2", sub: "Alto impacto · Alto esfuerzo" },
          { label: "Iniciativa Menor", color: "#6B6B6B", bg: "#F5F5F5", priority: "P3", sub: "Bajo impacto · Bajo esfuerzo" },
          { label: "Descartada", color: "#E24B4A", bg: "#FEF3F3", priority: "P0", sub: "Bajo impacto · Alto esfuerzo" },
        ].map((q) => (
          <div
            key={q.label}
            className="flex flex-col gap-0.5 rounded-lg border p-2"
            style={{ background: q.bg, borderColor: `${q.color}44` }}
          >
            <span className="text-[10px] font-bold" style={{ color: q.color }}>{q.priority} {q.label}</span>
            <span className="text-[9px] text-brand-gray leading-tight">{q.sub}</span>
          </div>
        ))}
      </div>
    ),
    body: (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-brand-gray leading-relaxed">
          Cada proyecto se clasifica automáticamente en uno de <span className="font-semibold text-brand-black">4 cuadrantes</span> según su impacto y esfuerzo estimado.
        </p>
        <div className="flex flex-col gap-1.5 text-xs text-brand-gray">
          <p>El <span className="font-semibold text-brand-green">Quick Win</span> es lo primero que hay que hacer: mucho valor, poco costo.</p>
          <p>El <span className="font-semibold text-brand-blue">Gran Proyecto</span> requiere planificación cuidadosa.</p>
          <p>La <span className="font-semibold text-brand-black">Iniciativa Menor</span> se hace si hay capacidad disponible.</p>
        </div>
      </div>
    ),
  },
  {
    title: "El Canvas del Squad",
    visual: (
      <div className="relative w-[200px] h-[140px] rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-brand-orange/30 flex items-center justify-center">
            <span className="text-[10px] font-bold text-brand-orange/60">En Curso</span>
          </div>
        </div>
        {[
          { x: 50, y: 50, r: 16, color: "#1D9E75", label: "P1" },
          { x: 110, y: 65, r: 22, color: "#1E6FC5", label: "P2" },
          { x: 155, y: 40, r: 12, color: "#6B6B6B", label: "P3" },
        ].map((b) => (
          <div
            key={b.label}
            className="absolute rounded-full flex items-center justify-center text-white font-bold"
            style={{
              left: b.x - b.r,
              top: b.y - b.r,
              width: b.r * 2,
              height: b.r * 2,
              background: b.color,
              fontSize: 9,
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            {b.label}
          </div>
        ))}
      </div>
    ),
    body: (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-brand-gray leading-relaxed">
          Arrastrá proyectos al área circular <span className="font-semibold text-brand-black">&quot;En Curso&quot;</span> para marcarlos como activos.
        </p>
        <div className="flex flex-col gap-1.5 text-xs text-brand-gray">
          <p>🔵 El anillo alrededor de cada burbuja muestra el <span className="font-semibold text-brand-black">progreso</span> (sprints completados).</p>
          <p>👁 Activá <span className="font-semibold text-brand-black">Vista Q</span> para ver qué proyectos corresponden a cada Quarter.</p>
          <p>⑂ Podés dividir proyectos grandes en <span className="font-semibold text-brand-black">slices</span> con el panel del analista.</p>
        </div>
      </div>
    ),
  },
  {
    title: "Modo Cross — El Programa",
    visual: (
      <div className="w-[200px] flex flex-col gap-1">
        <div className="grid grid-cols-4 gap-0.5">
          {["Q1", "Q2", "Q3", "Q4"].map((q) => (
            <div key={q} className="text-center text-[9px] font-bold text-brand-gray bg-gray-100 rounded py-1">{q}</div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-0.5">
          <div
            className="col-span-2 rounded border-[1.5px] px-1.5 py-1"
            style={{ background: "#EAF1FB", borderColor: "#1E6FC5aa" }}
          >
            <span className="text-[9px] font-bold text-brand-blue">P2 Transf. Digital</span>
          </div>
          <div
            className="col-span-1 rounded border-[1.5px] px-1.5 py-1"
            style={{ background: "#F0FBF6", borderColor: "#1D9E75aa" }}
          >
            <span className="text-[9px] font-bold text-brand-green">P1 App Mobile</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-0.5 mt-1">
          {[["Equipo A", 2, 4], ["Equipo B", 3, 3]].map(([name, used, cap]) => (
            <div key={name as string} className="col-span-4 flex items-center gap-1 px-1 py-0.5 rounded bg-gray-50 border border-gray-100">
              <span className="text-[9px] text-brand-gray flex-1">{name as string}</span>
              <div className="h-1.5 w-12 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-brand-green" style={{ width: `${Math.round(((used as number) / (cap as number)) * 100)}%` }} />
              </div>
              <span className="text-[9px] text-brand-green font-bold">{used}/{cap}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    body: (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-brand-gray leading-relaxed">
          En <span className="font-semibold text-brand-black">Modo Cross</span> planificás iniciativas multi-equipo a lo largo del año.
        </p>
        <div className="flex flex-col gap-1.5 text-xs text-brand-gray">
          <p>📅 Arrastrá iniciativas del backlog al <span className="font-semibold text-brand-black">timeline Q1–Q4</span>.</p>
          <p>📊 La tabla de capacidad muestra en <span className="font-semibold text-brand-black">tiempo real</span> si los equipos están sobreocupados.</p>
          <p>🔗 Vinculá proyectos del Squad con iniciativas del programa para drill-down bidireccional.</p>
        </div>
      </div>
    ),
  },
  {
    title: "¡Listo para empezar!",
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg"
          style={{ background: "#FFF4EE", border: "2px solid #E8621A22" }}
        >
          ⚙
        </div>
        <div className="flex flex-col gap-1 items-center">
          <span className="text-xs font-bold text-brand-orange">Panel del analista</span>
          <span className="text-[10px] text-brand-gray">botón fijo esquina inferior derecha</span>
        </div>
      </div>
    ),
    body: (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-brand-gray leading-relaxed">
          Abrí el <span className="font-semibold text-brand-black">panel del analista</span> (⚙ en la esquina inferior derecha) para crear tu primer proyecto.
        </p>
        <div className="flex flex-col gap-1.5 text-xs text-brand-gray">
          <p>1. Completá nombre, impacto y sprints estimados.</p>
          <p>2. El cuadrante se asigna automáticamente.</p>
          <p>3. Arrastrá la burbuja al área &quot;En Curso&quot; cuando inicie.</p>
        </div>
      </div>
    ),
  },
];

type Props = {
  /** Force-show the tour ignoring localStorage (e.g. from a help button) */
  forceOpen?: boolean;
  onClose?: () => void;
};

export function OnboardingTour({ forceOpen = false, onClose }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setStep(0);
      setOpen(true);
      return;
    }
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, [forceOpen]);

  function close() {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setOpen(false);
    onClose?.();
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      close();
    }
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={close} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[480px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-brand-orange transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5">
          {/* Step counter + close */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === step ? 20 : 8,
                    height: 8,
                    background: i === step ? "#E8621A" : i < step ? "#FDDCB5" : "#E5E7EB",
                  }}
                />
              ))}
            </div>
            <button
              onClick={close}
              className="text-gray-400 hover:text-brand-black text-xl leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
            >
              ×
            </button>
          </div>

          {/* Visual */}
          <div className="flex items-center justify-center py-2 min-h-[150px]">
            {current.visual}
          </div>

          {/* Text */}
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-brand-black">{current.title}</h2>
            {current.body}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 pt-1">
            {step > 0 ? (
              <button
                onClick={prev}
                className="px-4 py-2 text-sm text-brand-gray border border-gray-200 rounded-lg hover:text-brand-black hover:border-gray-300 transition"
              >
                ← Anterior
              </button>
            ) : (
              <button
                onClick={close}
                className="px-4 py-2 text-sm text-brand-gray hover:text-brand-black transition"
              >
                Saltear
              </button>
            )}
            <button
              onClick={next}
              className="flex-1 py-2 text-sm font-bold rounded-lg bg-brand-orange hover:bg-orange-600 text-white transition"
            >
              {isLast ? "Empezar →" : "Siguiente →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

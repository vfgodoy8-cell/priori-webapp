"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveAiSettings } from "./actions";

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic Claude", placeholder: "sk-ant-..." },
  { value: "openai",    label: "OpenAI GPT-4",     placeholder: "sk-..."     },
  { value: "azure",     label: "Azure OpenAI",      placeholder: "..."        },
  { value: "google",    label: "Google Gemini",      placeholder: "AIza..."    },
  { value: "groq",      label: "Groq",               placeholder: "gsk_..."    },
] as const;

type Props = {
  current: { provider: string; model_id: string | null; azure_endpoint: string | null; configured: boolean } | null;
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="px-5 py-2.5 text-sm font-bold rounded-lg bg-brand-orange hover:bg-orange-600 disabled:opacity-60 text-white transition">
      {pending ? "Guardando..." : "Guardar configuracion"}
    </button>
  );
}

export function AISettingsView({ current }: Props) {
  const [state, formAction] = useFormState(saveAiSettings, { error: null });
  const provider = current?.provider ?? "anthropic";

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-lg">
      {state.success && (
        <div className="px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 font-semibold">
          Configuracion guardada correctamente.
        </div>
      )}
      {state.error && (
        <div className="px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-brand-gray uppercase tracking-wider">Proveedor de IA</label>
        <select name="provider" defaultValue={provider}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-orange bg-white">
          {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-brand-gray uppercase tracking-wider">API Key</label>
        <input type="password" name="api_key" autoComplete="off" required
          placeholder={PROVIDERS.find(p => p.value === provider)?.placeholder ?? "..."}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange" />
        {current?.configured && (
          <p className="text-[11px] text-brand-gray">Ya tenes una key configurada. Pega una nueva para reemplazarla.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-brand-gray uppercase tracking-wider">Modelo (opcional)</label>
        <input type="text" name="model_id" defaultValue={current?.model_id ?? ""}
          placeholder="Dejar vacio para usar el default del proveedor"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange" />
        <p className="text-[11px] text-brand-gray">
          Defaults: Anthropic = claude-sonnet-4-6 | OpenAI = gpt-4o | Azure = gpt-4o | Google = gemini-2.0-flash | Groq = llama-3.3-70b-versatile
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-brand-gray uppercase tracking-wider">Azure Endpoint (solo Azure)</label>
        <input type="url" name="azure_endpoint" defaultValue={current?.azure_endpoint ?? ""}
          placeholder="https://tu-recurso.openai.azure.com"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange" />
      </div>

      <Submit />
    </form>
  );
}

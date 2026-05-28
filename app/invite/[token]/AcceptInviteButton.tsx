"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";

type Props = {
  token: string;
  invitationEmail: string;
  userEmail: string;
};

export function AcceptInviteButton({ token, invitationEmail, userEmail }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const emailMatch = invitationEmail.toLowerCase() === userEmail.toLowerCase();

  async function handleAccept() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  if (!emailMatch) {
    return (
      <div className="flex flex-col gap-3">
        <div className="px-4 py-3 rounded-lg bg-orange-50 border border-orange-200 text-xs text-brand-orange">
          Esta invitación es para <strong>{invitationEmail}</strong>, pero iniciaste sesión con{" "}
          <strong>{userEmail}</strong>. Cerrá sesión e iniciá con el email correcto.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-brand-gray">
        Sesión activa como <strong>{userEmail}</strong>.
      </p>
      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
      )}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full py-3 text-sm font-bold rounded-lg bg-brand-orange hover:bg-orange-600 disabled:opacity-60 text-white transition"
      >
        {loading ? "Aceptando…" : "Aceptar invitación"}
      </button>
    </div>
  );
}

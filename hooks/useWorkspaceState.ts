"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type WorkspaceContext = "squad" | "cross" | "roadmap" | "dashboard";

/**
 * Persists a jsonb state blob per user+org+context in user_workspace_state.
 * Returns [state, merge, loaded] — merge does a shallow patch.
 * Uses browser Supabase client (RLS: profile_id = auth.uid()).
 */
export function useWorkspaceState<T extends Record<string, unknown>>(
  context: WorkspaceContext,
  orgId: string,
  userId: string,
  defaults: T
): [T, (patch: Partial<T>) => void, boolean] {
  const [state, setState] = useState<T>(defaults);
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<T>(defaults);

  // Load on mount
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("user_workspace_state")
      .select("state")
      .eq("organization_id", orgId)
      .eq("profile_id", userId)
      .eq("context", context)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.state && typeof data.state === "object") {
          const merged = { ...defaults, ...(data.state as Partial<T>) };
          stateRef.current = merged;
          setState(merged);
        }
        setLoaded(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, userId, context]);

  const merge = (patch: Partial<T>) => {
    const next = { ...stateRef.current, ...patch };
    stateRef.current = next;
    setState(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const supabase = createClient();
      supabase
        .from("user_workspace_state")
        .upsert(
          {
            organization_id: orgId,
            profile_id: userId,
            context,
            state: next as Record<string, unknown>,
          },
          { onConflict: "organization_id,profile_id,context" }
        )
        .then(() => {});
    }, 500);
  };

  return [state, merge, loaded];
}

import { createClient } from "@supabase/supabase-js";

// Cliente con service role key — bypasea RLS.
// Usar SOLO en Server Actions/Route Handlers, nunca en el browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

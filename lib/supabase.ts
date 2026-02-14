import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseAnon = process.env.SUPABASE_ANON_KEY ?? "";
const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseServer = createClient(supabaseUrl, supabaseService, {
  auth: { persistSession: false },
});

export const supabaseClient = createClient(supabaseUrl, supabaseAnon);

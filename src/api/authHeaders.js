import { supabase } from "./supabase";
import { SUPABASE_KEY } from "../constants";

// Builds Supabase REST headers using the signed-in user's own session token
// when one exists. This lets Postgres RLS policies see who's really making
// the request (via auth.jwt()) instead of everyone looking like the same
// anonymous "anon" role. Falls back to the public anon key when signed out,
// which is correct for anonymous browsing (reading books, public comments).
export const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || SUPABASE_KEY;
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
    Prefer: "return=representation",
  };
};

// Used to stamp new rows (reading list, etc.) with the real auth user id
// instead of only a username string, so RLS can rely on auth.uid() going
// forward rather than text-matching a display name.
export const getCurrentUserId = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id || null;
};

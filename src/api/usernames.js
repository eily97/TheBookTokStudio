import { SUPABASE_URL, SB_HEADERS as H } from "../constants";
import { getAuthHeaders } from "./authHeaders";

const normalize = (name) => name.trim().toLowerCase();

// Public, unauthenticated check — used for the live "available/taken"
// indicator while someone is typing.
export const checkUsernameAvailable = async (name) => {
  const key = normalize(name);
  if (!key) return false;
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/usernames?username_key=eq.${encodeURIComponent(key)}&select=user_id`,
    { headers: H }
  );
  const rows = await r.json();
  return Array.isArray(rows) && rows.length === 0;
};

// Attempts to claim a username for the current user. Handles two edge cases
// that a naive "check then insert" would miss:
//  - Race condition: two people submit the same name at the same instant —
//    the table's primary key makes the second INSERT fail with a conflict,
//    which we surface as "taken" rather than a generic error.
//  - Retry-after-partial-failure: if a previous attempt claimed the row but
//    a later step (updating the auth profile) failed, retrying with the same
//    name would otherwise look like "taken" even though it's the user's own
//    row — we detect that and treat it as success instead.
export const claimUsername = async (name, userId) => {
  const display = name.trim();
  const key = normalize(display);
  if (!key) return { error: { message: "Please enter a name." } };

  const headers = await getAuthHeaders();
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/usernames`, {
    method: "POST",
    headers,
    body: JSON.stringify({ username_key: key, display_name: display, user_id: userId }),
  });

  if (insertRes.ok) return { error: null };

  // 409 = unique constraint violation (name already taken by someone).
  if (insertRes.status === 409) {
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/usernames?username_key=eq.${encodeURIComponent(key)}&select=user_id`,
      { headers: H }
    );
    const rows = await checkRes.json();
    const owner = Array.isArray(rows) && rows[0]?.user_id;
    if (owner === userId) return { error: null }; // already mine — fine
    return { error: { message: "That name is already taken. Try another one." } };
  }

  return { error: { message: "Could not save your name. Please try again." } };
};

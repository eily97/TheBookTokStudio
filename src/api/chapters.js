import { SUPABASE_URL, SB_HEADERS as H } from "../constants";

// These three call the verified /api/admin-chapters endpoint instead of
// hitting Supabase directly — the table itself no longer trusts the public
// anon key for moderation actions (see DROP POLICY change), only a verified
// admin session can approve/reject/delete chapter name suggestions.
const callAdmin = async (token, action, payload) => {
  const r = await fetch("/api/admin-chapters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, action, payload }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || "Admin request failed");
  return r.json();
};

export const getPendingChapterNamesSecure = (token) => callAdmin(token, "pending");
export const approveChapterNameSecure = (token, sv) =>
  callAdmin(token, "approve", { id: sv.id, book: sv.book, chapter: sv.chapter });
export const rejectChapterNameSecure = (token, sv) =>
  callAdmin(token, "reject", { id: sv.id });

export const getBookMetadata = (bookTitle) =>
  fetch(
    `${SUPABASE_URL}/rest/v1/book_metadata?book_title=eq.${encodeURIComponent(bookTitle)}&select=chapter_count`,
    { headers: H }
  ).then((r) => r.json());

export const getApprovedChapterNames = (bookTitle) =>
  fetch(
    `${SUPABASE_URL}/rest/v1/chapter_names?book=eq.${encodeURIComponent(bookTitle)}&status=eq.approved&select=chapter,name`,
    { headers: H }
  ).then((r) => r.json());

export const postChapterName = (payload) =>
  fetch(`${SUPABASE_URL}/rest/v1/chapter_names`, {
    method: "POST", headers: H,
    body: JSON.stringify(payload),
  });

export const postChapterCountSuggestion = (payload) =>
  fetch(`${SUPABASE_URL}/rest/v1/chapter_count_suggestions`, {
    method: "POST", headers: H,
    body: JSON.stringify(payload),
  });

export const getReadingList = (username) =>
  fetch(
    `${SUPABASE_URL}/rest/v1/reading_list?username=eq.${encodeURIComponent(username)}&order=added_at.desc`,
    { headers: H }
  ).then((r) => r.json());

export const addToReadingList = (payload) =>
  fetch(`${SUPABASE_URL}/rest/v1/reading_list`, {
    method: "POST", headers: H,
    body: JSON.stringify(payload),
  });

export const removeFromReadingList = (id) =>
  fetch(`${SUPABASE_URL}/rest/v1/reading_list?id=eq.${id}`, {
    method: "DELETE", headers: H,
  });

export const getRecentBookComments = (limit = 200) =>
  fetch(
    `${SUPABASE_URL}/rest/v1/comments?select=book&order=created_at.desc&limit=${limit}`,
    { headers: H }
  ).then((r) => r.json());

export const notifyAdmin = (payload) =>
  fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

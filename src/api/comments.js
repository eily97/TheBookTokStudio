import { SUPABASE_URL, SB_HEADERS as H } from "../constants";
import { getAuthHeaders } from "./authHeaders";

// Reads stay on the static anon headers — they're meant to be public
// (anyone can browse comments without signing in).
export const getComments = async (bookTitle, chapter) => {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/comments?book=eq.${encodeURIComponent(bookTitle)}&chapter=eq.${chapter}&order=created_at.desc`,
    { headers: H }
  );
  return r.json();
};

// Writes/ownership-sensitive actions use the caller's real session, so RLS
// (auth.jwt()) can correctly tell who's asking.
export const postComment = async (payload) => {
  const headers = await getAuthHeaders();
  return fetch(`${SUPABASE_URL}/rest/v1/comments`, {
    method: "POST", headers,
    body: JSON.stringify(payload),
  });
};

export const deleteComment = async (id) => {
  const headers = await getAuthHeaders();
  return fetch(`${SUPABASE_URL}/rest/v1/comments?id=eq.${id}`, { method: "DELETE", headers });
};

export const patchCommentLikes = async (id, likes) => {
  const headers = await getAuthHeaders();
  return fetch(`${SUPABASE_URL}/rest/v1/comments?id=eq.${id}`, {
    method: "PATCH", headers,
    body: JSON.stringify({ likes }),
  });
};

export const getCommentsByUser = (username) =>
  fetch(
    `${SUPABASE_URL}/rest/v1/comments?username=eq.${encodeURIComponent(username)}&order=created_at.desc`,
    { headers: H }
  ).then((r) => r.json());

export const getChapterCounts = async (bookTitle) => {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/comments?book=eq.${encodeURIComponent(bookTitle)}&select=chapter`,
    { headers: H }
  );
  return r.json();
};

export const getRepliesForComments = async (commentIds) => {
  if (!commentIds || commentIds.length === 0) return [];
  // `in.(...)` produces a single indexed lookup and a short, stable URL.
  // The previous `or=(comment_id.eq.1,comment_id.eq.2,...)` form grows the URL
  // linearly with the comment count and forces a less efficient query plan.
  const filter = commentIds.join(",");
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/replies?comment_id=in.(${filter})&order=created_at.asc`,
    { headers: H }
  );
  return r.json();
};

export const postReply = async (payload) => {
  const headers = await getAuthHeaders();
  return fetch(`${SUPABASE_URL}/rest/v1/replies`, {
    method: "POST", headers,
    body: JSON.stringify(payload),
  });
};

export const deleteReply = async (id) => {
  const headers = await getAuthHeaders();
  return fetch(`${SUPABASE_URL}/rest/v1/replies?id=eq.${id}`, { method: "DELETE", headers });
};

// Notifications are personal — always go through the real session so RLS can
// restrict reads/updates to the recipient only.
export const getNotifications = async (username) => {
  const headers = await getAuthHeaders();
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/notifications?username=eq.${encodeURIComponent(username)}&order=created_at.desc&limit=20`,
    { headers }
  );
  return r.json();
};

export const postNotification = async (payload) => {
  const headers = await getAuthHeaders();
  return fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
    method: "POST", headers,
    body: JSON.stringify(payload),
  });
};

export const markNotificationsRead = async (username) => {
  const headers = await getAuthHeaders();
  return fetch(
    `${SUPABASE_URL}/rest/v1/notifications?username=eq.${encodeURIComponent(username)}&is_read=eq.false`,
    { method: "PATCH", headers, body: JSON.stringify({ is_read: true }) }
  );
};

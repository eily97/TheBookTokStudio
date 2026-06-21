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

// Writes go through /api/post-comment now — a server-verified endpoint that
// enforces rate limiting and the profanity filter using the database (not
// localStorage), so it can't be bypassed from devtools. Direct REST insert
// access for these two tables has been revoked at the RLS level.
export const postComment = async (token, { book, chapter, text, spoiler }) => {
  const r = await fetch("/api/post-comment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, action: "comment", book, chapter, text, spoiler }),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data?.error || "Could not post comment.");
  }
  return r.json();
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

// Aggregated server-side via an RPC function (chapter_comment_counts) instead
// of pulling every comment row and counting in the browser — the old version
// got noticeably heavier as a book's comment count grew into the thousands.
export const getChapterCounts = async (bookTitle) => {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/chapter_comment_counts`,
    { method: "POST", headers: H, body: JSON.stringify({ p_book: bookTitle }) }
  );
  return r.json();
};

export const getRepliesForComments = async (commentIds) => {
  const filter = commentIds.map((id) => `comment_id.eq.${id}`).join(",");
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/replies?or=(${filter})&order=created_at.asc`,
    { headers: H }
  );
  return r.json();
};

export const postReply = async (token, { comment_id, text }) => {
  const r = await fetch("/api/post-comment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, action: "reply", commentId: comment_id, text }),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data?.error || "Could not post reply.");
  }
  return r.json();
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

import { SUPABASE_URL, SB_HEADERS as H } from "../constants";

export const getComments = async (bookTitle, chapter) => {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/comments?book=eq.${encodeURIComponent(bookTitle)}&chapter=eq.${chapter}&order=created_at.desc`,
    { headers: H }
  );
  return r.json();
};

export const postComment = (payload) =>
  fetch(`${SUPABASE_URL}/rest/v1/comments`, {
    method: "POST", headers: H,
    body: JSON.stringify(payload),
  });

export const deleteComment = (id) =>
  fetch(`${SUPABASE_URL}/rest/v1/comments?id=eq.${id}`, { method: "DELETE", headers: H });

export const patchCommentLikes = (id, likes) =>
  fetch(`${SUPABASE_URL}/rest/v1/comments?id=eq.${id}`, {
    method: "PATCH", headers: H,
    body: JSON.stringify({ likes }),
  });

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
  const filter = commentIds.map((id) => `comment_id.eq.${id}`).join(",");
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/replies?or=(${filter})&order=created_at.asc`,
    { headers: H }
  );
  return r.json();
};

export const postReply = (payload) =>
  fetch(`${SUPABASE_URL}/rest/v1/replies`, {
    method: "POST", headers: H,
    body: JSON.stringify(payload),
  });

export const deleteReply = (id) =>
  fetch(`${SUPABASE_URL}/rest/v1/replies?id=eq.${id}`, { method: "DELETE", headers: H });

export const getNotifications = (username) =>
  fetch(
    `${SUPABASE_URL}/rest/v1/notifications?username=eq.${encodeURIComponent(username)}&order=created_at.desc&limit=20`,
    { headers: H }
  ).then((r) => r.json());

export const postNotification = (payload) =>
  fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
    method: "POST", headers: H,
    body: JSON.stringify(payload),
  });

export const markNotificationsRead = (username) =>
  fetch(
    `${SUPABASE_URL}/rest/v1/notifications?username=eq.${encodeURIComponent(username)}&is_read=eq.false`,
    { method: "PATCH", headers: H, body: JSON.stringify({ is_read: true }) }
  );
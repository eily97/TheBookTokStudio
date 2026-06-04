import { SUPABASE_URL, SB_HEADERS as H } from "../constants";

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

export const getPendingChapterNames = () =>
  fetch(
    `${SUPABASE_URL}/rest/v1/chapter_names?status=eq.pending&order=created_at.desc`,
    { headers: H }
  ).then((r) => r.json());

export const patchChapterNameStatus = (id, status) =>
  fetch(`${SUPABASE_URL}/rest/v1/chapter_names?id=eq.${id}`, {
    method: "PATCH", headers: H,
    body: JSON.stringify({ status }),
  });

export const deleteApprovedChapterName = (book, chapter) =>
  fetch(
    `${SUPABASE_URL}/rest/v1/chapter_names?book=eq.${encodeURIComponent(book)}&chapter=eq.${chapter}&status=eq.approved`,
    { method: "DELETE", headers: H }
  );

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
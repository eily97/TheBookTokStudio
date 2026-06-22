import { hasNonLatin, normalizeTitle, titlesAreSimilar } from "../utils";
import { SUPABASE_URL, SB_HEADERS as H } from "../constants";

const OL_FIELDS = "title,author_name,cover_i,key,first_publish_year,language";

const fetchWithRetry = async (url, retries = 1) => {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } catch (e) {
    if (retries > 0) {
      await new Promise((res) => setTimeout(res, 400));
      return fetchWithRetry(url, retries - 1);
    }
    throw e;
  }
};

const toBook = (b) => ({
  title:  b.title,
  author: b.author_name?.[0] ?? b.author ?? "",
  cover:  b.cover_url ?? (b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null),
  year:   b.first_publish_year ?? b.year ?? "",
  olKey:  b.key ?? b.ol_key ?? "",
});

// Supabase book_cache'te ara
const searchCache = async (q) => {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/book_cache?or=(title.ilike.*${encodeURIComponent(q)}*,author.ilike.*${encodeURIComponent(q)}*)&limit=10`,
      { headers: H }
    );
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows.map(toBook) : [];
  } catch {
    return [];
  }
};

// OpenLibrary'den ara
const searchOpenLibrary = async (q) => {
  const [r1, r2] = await Promise.all([
    fetchWithRetry(`https://openlibrary.org/search.json?author=${encodeURIComponent(q)}&limit=20&fields=${OL_FIELDS}`),
    fetchWithRetry(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=20&fields=${OL_FIELDS}`),
  ]);
  const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
  return [...(d1.docs || []), ...(d2.docs || [])]
    .filter((b) => {
      const title  = b.title?.trim();
      const author = b.author_name?.[0]?.trim();
      return title && author && !hasNonLatin(title) && !hasNonLatin(author);
    })
    .map(toBook);
};

// Sonuçları arka planda cache'e yaz (kullanıcıyı beklettirmez)
const cacheResults = (books) => {
  books.slice(0, 10).forEach((b) => {
    fetch("/api/cache-book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:     b.title,
        author:    b.author,
        cover_url: b.cover,
        ol_key:    b.olKey,
        year:      String(b.year ?? ""),
      }),
    }).catch(() => {}); // sessizce ignore et
  });
};

export const searchBooks = async (q) => {
  // Önce cache'e bak
  const cached = await searchCache(q);
  if (cached.length > 0) return cached;

  // Cache'te yoksa OpenLibrary'e git
  const results = await searchOpenLibrary(q);

  // Sonuçları arka planda kaydet, kullanıcıya hemen döndür
  if (results.length > 0) cacheResults(results);

  return results;
};

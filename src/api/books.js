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
  author: b.author_name[0],
  cover:  b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
  year:   b.first_publish_year || "",
  olKey:  b.key || "",
});

export const searchBooks = async (q) => {
  const [r1, r2] = await Promise.all([
    fetchWithRetry(`https://openlibrary.org/search.json?author=${encodeURIComponent(q)}&limit=20&fields=${OL_FIELDS}`),
    fetchWithRetry(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=20&fields=${OL_FIELDS}`),
  ]);
  const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
  const candidates = [...(d1.docs || []), ...(d2.docs || [])]
    .filter((b) => {
      const title  = b.title?.trim();
      const author = b.author_name?.[0]?.trim();
      return title && author && !hasNonLatin(title) && !hasNonLatin(author);
    })
    .map(toBook);
  const groups = new Map();
  for (const c of candidates) {
    const key      = `${normalizeTitle(c.title)}|${c.author.toLowerCase().split(" ")[0]}`;
    const existing = groups.get(key);
    const better =
      !existing ||
      (!!c.cover && !existing.cover) ||
      (!!c.cover === !!existing.cover && c.title.length < existing.title.length);
    if (better) groups.set(key, c);
  }
  const deduped = [];
  for (const [, item] of groups) {
    const isDuplicate = deduped.some(
      (ex) =>
        titlesAreSimilar(ex.title, item.title) &&
        ex.author.toLowerCase().split(" ").some((w) => item.author.toLowerCase().includes(w))
    );
    if (!isDuplicate) {
      deduped.push(item);
      if (deduped.length >= 7) break;
    }
  }
  return deduped;
};

const isEnglish = (text) => {
  if (!text || text.length < 30) return false;
  if (/[^\u0000-\u024F\u1E00-\u1EFF]/.test(text.slice(0, 200))) return false;
  return true;
};

const fetchDescriptionFromOpenLibrary = async (title, author) => {
  try {
    const r = await fetchWithRetry(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(`${title} ${author}`)}&lang=eng&limit=5&fields=key,language`
    );
    const d = await r.json();
    const docs = d.docs || [];

    const sorted = [...docs].sort((a, b) => {
      const aEng = a.language?.includes("eng") ? -1 : 1;
      const bEng = b.language?.includes("eng") ? -1 : 1;
      return aEng - bEng;
    });

    for (const doc of sorted) {
      try {
        const r2 = await fetchWithRetry(`https://openlibrary.org${doc.key}.json`);
        const d2 = await r2.json();
        const raw = d2.description;
        const text = typeof raw === "string" ? raw : raw?.value || null;
        if (isEnglish(text)) return text;
      } catch {}
    }
  } catch {}
  return null;
};

// Every visitor to a book page used to trigger a fresh OpenLibrary lookup —
// same book, same description, refetched over and over. This checks a
// Supabase cache first (book_metadata.description) and only falls back to
// OpenLibrary on a true cache miss, then writes the result back for next
// time. Cache failures are non-fatal — worst case, behaves like before.
export const fetchBookDescription = async (title, author) => {
  let rowExists = false;

  try {
    const cacheRes = await fetch(
      `${SUPABASE_URL}/rest/v1/book_metadata?book_title=eq.${encodeURIComponent(title)}&select=description`,
      { headers: H }
    );
    const cacheRows = await cacheRes.json();
    if (Array.isArray(cacheRows) && cacheRows.length > 0) {
      rowExists = true;
      if (cacheRows[0]?.description) return cacheRows[0].description;
    }
  } catch {
    // Cache read failed — fall through to a live OpenLibrary fetch.
  }

  const desc = await fetchDescriptionFromOpenLibrary(title, author);

  if (desc) {
    try {
      if (rowExists) {
        await fetch(`${SUPABASE_URL}/rest/v1/book_metadata?book_title=eq.${encodeURIComponent(title)}`, {
          method: "PATCH", headers: H,
          body: JSON.stringify({ description: desc }),
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/book_metadata`, {
          method: "POST", headers: H,
          body: JSON.stringify({ book_title: title, description: desc }),
        });
      }
    } catch {
      // Caching is best-effort — a failed write just means we'll fetch
      // from OpenLibrary again next time, same as before this change.
    }
  }

  return desc;
};

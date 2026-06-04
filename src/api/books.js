import { hasNonLatin, normalizeTitle, titlesAreSimilar } from "../utils";

const OL_FIELDS = "title,author_name,cover_i,key,first_publish_year,language";

const toBook = (b) => ({
  title:  b.title,
  author: b.author_name[0],
  cover:  b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
  year:   b.first_publish_year || "",
  olKey:  b.key || "",
});

export const searchBooks = async (q) => {
  const [r1, r2] = await Promise.all([
    fetch(`https://openlibrary.org/search.json?author=${encodeURIComponent(q)}&limit=20&fields=${OL_FIELDS}`),
    fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=20&fields=${OL_FIELDS}`),
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
    if (!existing || c.title.length < existing.title.length) groups.set(key, c);
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

export const fetchBookDescription = async (title, author) => {
  try {
    const r  = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(`${title} ${author}`)}&limit=1&fields=key`
    );
    const d  = await r.json();
    const key = d.docs?.[0]?.key;
    if (!key) return null;
    const r2  = await fetch(`https://openlibrary.org${key}.json`);
    const d2  = await r2.json();
    const desc = d2.description;
    const text = typeof desc === "string" ? desc : desc?.value || null;
    return text && text.length > 30 ? text : null;
  } catch {
    return null;
  }
};
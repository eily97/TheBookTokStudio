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

const isEnglishText = (text) => {
  if (!text || text.length < 30) return false;
  // İlk 200 karakterde Latin dışı karakter varsa reddet
  if (/[^\u0000-\u024F\u1E00-\u1EFF]/.test(text.slice(0, 200))) return false;
  return true;
};

// Strateji 1: Google Books — en güvenilir İngilizce kaynak
const fetchFromGoogleBooks = async (title, author) => {
  try {
    const q = encodeURIComponent(`intitle:${title} inauthor:${author}`);
    const r = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${q}&langRestrict=en&maxResults=3&fields=items(volumeInfo(title,authors,description,language))`
    );
    const d = await r.json();
    const items = d.items || [];
    for (const item of items) {
      const desc = item.volumeInfo?.description;
      if (isEnglishText(desc)) return desc;
    }
  } catch {}
  return null;
};

// Strateji 2: OpenLibrary — tüm sonuçları tara, İngilizce olanı bul
const fetchFromOpenLibrary = async (title, author) => {
  try {
    const r = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(`${title} ${author}`)}&limit=10&fields=key,language`
    );
    const d = await r.json();
    if (!d.docs?.length) return null;

    // İngilizce olanları önce sırala
    const sorted = [...(d.docs || [])].sort((a, b) => {
      const aEng = a.language?.includes("eng") ? -1 : 1;
      const bEng = b.language?.includes("eng") ? -1 : 1;
      return aEng - bEng;
    });

    for (const doc of sorted) {
      try {
        const r2 = await fetch(`https://openlibrary.org${doc.key}.json`);
        const d2 = await r2.json();
        const raw = d2.description;
        const text = typeof raw === "string" ? raw : raw?.value || null;
        if (isEnglishText(text)) return text;
      } catch {}
    }
  } catch {}
  return null;
};

export const fetchBookDescription = async (title, author) => {
  // Önce Google Books dene (daha hızlı ve güvenilir)
  const googleDesc = await fetchFromGoogleBooks(title, author);
  if (googleDesc) return googleDesc;

  // Google bulamazsa OpenLibrary'yi tara
  const olDesc = await fetchFromOpenLibrary(title, author);
  if (olDesc) return olDesc;

  return null;
};

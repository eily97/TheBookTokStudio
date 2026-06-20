import { useState, useEffect } from "react";
import { getRecentBookComments } from "../api/chapters";
import { searchBooks } from "../api/books";

const CACHE_KEY = "trending_cache";
const CACHE_TTL = 30 * 60 * 1000;

// Module-level state shared across every useTrending() consumer. Previously
// both App (landing) and HomePage mounted their own instance and each fired a
// full getRecentBookComments(200) + up to 5 cover lookups. The in-memory cache
// plus a single in-flight promise guarantee the network work happens once,
// regardless of how many components subscribe.
let memoryCache = null;        // { trending, covers }
let inFlight    = null;        // Promise<{ trending, covers }>

const readPersistentCache = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) return data;
  } catch {}
  return null;
};

const fetchTrending = async () => {
  const d = await getRecentBookComments(200);
  if (!Array.isArray(d)) return { trending: [], covers: {} };

  const counts = {};
  d.forEach((c) => { counts[c.book] = (counts[c.book] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const entries = await Promise.all(
    sorted.map(async ([title]) => {
      try {
        const results = await searchBooks(title);
        const match   = results.find((b) => b.title.toLowerCase() === title.toLowerCase()) || results[0];
        return match ? [title, { cover: match.cover, author: match.author }] : null;
      } catch { return null; }
    })
  );
  const covers = Object.fromEntries(entries.filter(Boolean));

  // Only persist when we actually resolved at least some covers — a transient
  // OpenLibrary hiccup shouldn't freeze broken (cover-less) data for 30 minutes.
  if (Object.keys(covers).length > 0) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: { trending: sorted, covers }, timestamp: Date.now(),
      }));
    } catch {}
  }
  return { trending: sorted, covers };
};

const loadShared = () => {
  if (memoryCache) return Promise.resolve(memoryCache);

  const persisted = readPersistentCache();
  if (persisted) {
    memoryCache = persisted;
    return Promise.resolve(memoryCache);
  }

  // Coalesce concurrent callers onto one network request.
  inFlight ??= fetchTrending()
    .then((data) => {
      if (data.trending.length > 0) memoryCache = data;
      return data;
    })
    .catch(() => ({ trending: [], covers: {} }))
    .finally(() => { inFlight = null; });

  return inFlight;
};

export const useTrending = () => {
  const [trending, setTrending]     = useState(() => memoryCache?.trending ?? []);
  const [trendingCovers, setCovers] = useState(() => memoryCache?.covers ?? {});

  useEffect(() => {
    let active = true;
    loadShared().then(({ trending, covers }) => {
      if (!active) return;
      setTrending(trending);
      setCovers(covers);
    });
    return () => { active = false; };
  }, []);

  return { trending, trendingCovers };
};

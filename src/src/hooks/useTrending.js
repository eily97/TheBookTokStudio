import { useState, useEffect, useCallback } from "react";
import { getRecentBookComments } from "../api/chapters";
import { searchBooks } from "../api/books";

const CACHE_KEY = "trending_cache";
const CACHE_TTL = 30 * 60 * 1000;

export const useTrending = () => {
  const [trending, setTrending]     = useState([]);
  const [trendingCovers, setCovers] = useState({});

  const load = useCallback(async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setTrending(data.trending);
          setCovers(data.covers);
          return;
        }
      }
    } catch {}

    try {
      const d = await getRecentBookComments(200);
      if (!Array.isArray(d)) return;

      const counts = {};
      d.forEach((c) => { counts[c.book] = (counts[c.book] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      setTrending(sorted);

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
      setCovers(covers);

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: { trending: sorted, covers }, timestamp: Date.now(),
        }));
      } catch {}
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  return { trending, trendingCovers };
};
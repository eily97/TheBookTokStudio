import { useState, useEffect, useCallback } from "react";
import { getTrendingBooks } from "../api/chapters";
import { searchBooks } from "../api/books";

export const useTrending = () => {
  const [trending, setTrending]     = useState([]);
  const [trendingCovers, setCovers] = useState({});

  const load = useCallback(async () => {
    try {
      const rows = await getTrendingBooks(90, 5);
      if (!Array.isArray(rows)) return;

      const sorted = rows.map((r) => [r.book, r.cnt]);
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
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  return { trending, trendingCovers };
};

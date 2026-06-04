import { useState, useRef, useCallback } from "react";
import { searchBooks } from "../api/books";

const DEBOUNCE_MS = 500;

export const useBookSearch = () => {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const timerRef                  = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); return; }

    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try   { setResults(await searchBooks(q)); }
      catch { setResults([]); }
      setSearching(false);
    }, DEBOUNCE_MS);
  }, []);

  const clear = useCallback(() => { setQuery(""); setResults([]); }, []);

  return { query, results, searching, search, clear };
};
import { useState, useRef, useCallback } from "react";
import { searchBooks } from "../api/books";

const DEBOUNCE_MS = 500;

export const useBookSearch = () => {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const timerRef                  = useRef(null);
  // Monotonic token: only the most recently *issued* search is allowed to
  // commit its results. Without this, a slow earlier request can resolve after
  // a faster later one and overwrite the correct, newer results.
  const requestIdRef              = useRef(0);

  const search = useCallback((q) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) {
      requestIdRef.current++; // invalidate any in-flight request
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const requestId = ++requestIdRef.current;
    timerRef.current = setTimeout(async () => {
      try {
        const r = await searchBooks(q);
        if (requestId !== requestIdRef.current) return; // a newer search won
        setResults(r);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setResults([]);
      }
      if (requestId === requestIdRef.current) setSearching(false);
    }, DEBOUNCE_MS);
  }, []);

  const clear = useCallback(() => {
    requestIdRef.current++;
    if (timerRef.current) clearTimeout(timerRef.current);
    setQuery("");
    setResults([]);
    setSearching(false);
  }, []);

  return { query, results, searching, search, clear };
};

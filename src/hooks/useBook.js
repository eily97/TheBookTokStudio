import { useState, useCallback, useMemo } from "react";
import * as chapApi from "../api/chapters";
import { getChapterCounts } from "../api/comments";
import { fetchBookDescription } from "../api/books";

export const useBook = (username) => {
  const [chapterNames,      setChapterNames]  = useState({});
  const [chapterCounts,     setChapterCounts] = useState({});
  const [totalChapters,     setTotalChapters] = useState(null);
  const [chaptersLoading,   setChapLoading]   = useState(false);
  const [bookTotalComments, setBookTotal]      = useState(0);
  const [bookDesc,          setBookDesc]       = useState(null);
  const [readingList,       setReadingList]    = useState([]);

  const loadBook = useCallback(async (book) => {
    setChapterNames({});
    setChapterCounts({});
    setTotalChapters(null);
    setBookDesc(null);
    setBookTotal(0);
    setChapLoading(true);

    const [namesRaw, countsRaw, metaRaw, desc] = await Promise.allSettled([
      chapApi.getApprovedChapterNames(book.title),
      getChapterCounts(book.title),
      chapApi.getBookMetadata(book.title),
      fetchBookDescription(book.title, book.author),
    ]);

    if (namesRaw.status === "fulfilled") {
      const map = {};
      (Array.isArray(namesRaw.value) ? namesRaw.value : []).forEach(
        (c) => { map[c.chapter] = c.name; }
      );
      setChapterNames(map);
    }

    if (countsRaw.status === "fulfilled") {
      const counts = {};
      let total = 0;
      (Array.isArray(countsRaw.value) ? countsRaw.value : []).forEach((c) => {
        counts[c.chapter] = (counts[c.chapter] || 0) + 1;
        total++;
      });
      setChapterCounts(counts);
      setBookTotal(total);
    }

    if (metaRaw.status === "fulfilled") {
      const d = metaRaw.value;
      if (Array.isArray(d) && d.length > 0 && d[0].chapter_count > 0) {
        setTotalChapters(d[0].chapter_count);
      }
    }

    if (desc.status === "fulfilled") setBookDesc(desc.value);

    setChapLoading(false);
  }, []);

  const loadReadingList = useCallback(async () => {
    if (!username) return;
    try {
      const d = await chapApi.getReadingList(username);
      setReadingList(Array.isArray(d) ? d : []);
    } catch { setReadingList([]); }
  }, [username]);

  const addBook = useCallback(async (book) => {
    if (!username) return;
    await chapApi.addToReadingList({ username, book: book.title, author: book.author, cover: book.cover });
    await loadReadingList();
  }, [username, loadReadingList]);

  const removeBook = useCallback(async (id) => {
    await chapApi.removeFromReadingList(id);
    await loadReadingList();
  }, [loadReadingList]);

  const isInReadingList = useCallback(
    (title) => readingList.some((r) => r.book === title),
    [readingList]
  );

  const topChapters = useMemo(
    () => Object.entries(chapterCounts).sort((a, b) => b[1] - a[1]).slice(0, 3),
    [chapterCounts]
  );

  const addChapterName = useCallback((chapter, name) => {
    setChapterNames((prev) => ({ ...prev, [chapter]: name }));
  }, []);

  return {
    chapterNames, chapterCounts, totalChapters, chaptersLoading,
    bookTotalComments, bookDesc, readingList, topChapters,
    loadBook, loadReadingList, addBook, removeBook, isInReadingList, addChapterName,
  };
};
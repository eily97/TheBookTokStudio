import { useState, useCallback, useMemo } from "react";
import { getCommentsByUser } from "../api/comments";

export const useProfile = (username) => {
  const [myComments, setMyComments] = useState([]);
  const [loading,    setLoading]    = useState(false);

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const d = await getCommentsByUser(username);
      setMyComments(Array.isArray(d) ? d : []);
    } catch { setMyComments([]); }
    setLoading(false);
  }, [username]);

  const remove = useCallback((id) => {
    setMyComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const totalLikes = useMemo(
    () => myComments.reduce((sum, c) => sum + (c.likes || 0), 0),
    [myComments]
  );

  const booksRead = useMemo(
    () => [...new Set(myComments.map((c) => c.book))],
    [myComments]
  );

  const mostActiveBook = useMemo(() => {
    if (!booksRead.length) return null;
    return booksRead
      .map((b) => ({ book: b, count: myComments.filter((c) => c.book === b).length }))
      .sort((a, b) => b.count - a.count)[0];
  }, [booksRead, myComments]);

  return { myComments, loading, totalLikes, booksRead, mostActiveBook, load, remove };
};
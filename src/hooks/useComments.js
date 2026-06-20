import { useState, useCallback } from "react";
import * as api from "../api/comments";

export const useComments = ({ book, chapter, username }) => {
  const [comments, setComments] = useState([]);
  const [replies,  setReplies]  = useState({});
  const [loading,  setLoading]  = useState(false);

  const refresh = useCallback(async () => {
    if (!book || chapter == null) return;
    setLoading(true);
    try {
      const cmts = await api.getComments(book.title, chapter);
      const list = Array.isArray(cmts) ? cmts : [];
      setComments(list);

      if (list.length > 0) {
        const rd  = await api.getRepliesForComments(list.map((c) => c.id));
        const map = {};
        (Array.isArray(rd) ? rd : []).forEach((r) => {
          (map[r.comment_id] ??= []).push(r);
        });
        setReplies(map);
      } else {
        setReplies({});
      }
    } catch {
      setComments([]); setReplies({});
    }
    setLoading(false);
  }, [book, chapter]);

  // Adding a comment is the one mutation that needs the server's canonical row
  // (id, created_at) before the user can like/reply to it, so it still does a
  // single refresh. Every other mutation below updates local state optimistically
  // and skips the full comments + replies refetch (the old N+1 round-trip).
  const addComment = useCallback(async ({ text, spoiler }) => {
    await api.postComment({ book: book.title, chapter, username, text, spoiler, likes: 0 });
    await refresh();
  }, [book, chapter, username, refresh]);

  const removeComment = useCallback(async (id) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    setReplies((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await api.deleteComment(id);
  }, []);

  const likeComment = useCallback(async (c) => {
    setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, likes: x.likes + 1 } : x)));
    await api.patchCommentLikes(c.id, c.likes + 1);
    if (c.username !== username) {
      await api.postNotification({
        username:   c.username,
        type:       "like",
        message:    `${username} felt the same about your comment on ${book.title} Ch.${chapter}`,
        book:       book.title,
        chapter,
        comment_id: c.id,
      });
    }
  }, [book, chapter, username]);

  const addReply = useCallback(async (commentId, text) => {
    const parent = comments.find((c) => c.id === commentId);
    // Optimistically show the reply with a temporary id; it's replaced with the
    // server row on the next natural refresh (navigation / reopen).
    const optimistic = {
      id: `tmp-${Date.now()}`,
      comment_id: commentId,
      username,
      text,
      created_at: new Date().toISOString(),
    };
    setReplies((prev) => ({ ...prev, [commentId]: [...(prev[commentId] || []), optimistic] }));

    await api.postReply({ comment_id: commentId, username, text });
    if (parent && parent.username !== username) {
      await api.postNotification({
        username:   parent.username,
        type:       "reply",
        message:    `${username} replied to your comment on ${book.title} Ch.${chapter}`,
        book:       book.title,
        chapter,
        comment_id: commentId,
      });
    }
  }, [book, chapter, username, comments]);

  const removeReply = useCallback(async (id) => {
    setReplies((prev) => {
      const next = {};
      for (const [cid, list] of Object.entries(prev)) {
        next[cid] = list.filter((r) => r.id !== id);
      }
      return next;
    });
    await api.deleteReply(id);
  }, []);

  return { comments, replies, loading, refresh, addComment, removeComment, likeComment, addReply, removeReply };
};

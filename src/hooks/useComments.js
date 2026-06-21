import { useState, useCallback } from "react";
import * as api from "../api/comments";

export const useComments = ({ book, chapter, username, accessToken }) => {
  const [comments, setComments] = useState([]);
  const [replies,  setReplies]  = useState({});
  const [loading,  setLoading]  = useState(false);

  const refresh = useCallback(async () => {
    if (!book || chapter == null) return;
    setLoading(true);
    try {
      const cmts = await api.getComments(book.title, chapter);
      setComments(Array.isArray(cmts) ? cmts : []);

      if (cmts.length > 0) {
        const rd  = await api.getRepliesForComments(cmts.map((c) => c.id));
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

  const addComment = useCallback(async ({ text, spoiler }) => {
    await api.postComment(accessToken, { book: book.title, chapter, text, spoiler });
    await refresh();
  }, [book, chapter, accessToken, refresh]);

  const removeComment = useCallback(async (id) => {
    await api.deleteComment(id);
    await refresh();
  }, [refresh]);

  const likeComment = useCallback(async (c) => {
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
    await refresh();
  }, [book, chapter, username, refresh]);

  const addReply = useCallback(async (commentId, text) => {
    await api.postReply(accessToken, { comment_id: commentId, text });
    const parent = comments.find((c) => c.id === commentId);
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
    await refresh();
  }, [book, chapter, username, accessToken, comments, refresh]);

  const removeReply = useCallback(async (id) => {
    await api.deleteReply(id);
    await refresh();
  }, [refresh]);

  return { comments, replies, loading, refresh, addComment, removeComment, likeComment, addReply, removeReply };
};

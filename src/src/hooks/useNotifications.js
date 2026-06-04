import { useState, useEffect, useCallback, useMemo } from "react";
import * as api from "../api/comments";

export const useNotifications = (username) => {
  const [notifications, setNotifications] = useState([]);

  const fetch = useCallback(async () => {
    if (!username) return;
    try {
      const d = await api.getNotifications(username);
      setNotifications(Array.isArray(d) ? d : []);
    } catch {
      setNotifications([]);
    }
  }, [username]);

  useEffect(() => { fetch(); }, [fetch]);

  const markAllRead = useCallback(async () => {
    if (!username) return;
    await api.markNotificationsRead(username);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [username]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  return { notifications, unreadCount, refresh: fetch, markAllRead };
};
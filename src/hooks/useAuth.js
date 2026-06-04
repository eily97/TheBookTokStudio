import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../api/supabase";

export const useAuth = () => {
  const [user, setUser]           = useState(null);
  const [authLoading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user || null)
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(() =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://thatpart.app" },
    }), []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const username = useMemo(
    () => user?.user_metadata?.name || user?.email?.split("@")[0] || "reader",
    [user]
  );

  const avatar   = user?.user_metadata?.avatar_url || null;
  const isAdmin  = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  const joinDate = useMemo(
    () =>
      user?.created_at
        ? new Date(user.created_at).toLocaleDateString("en-US", {
            month: "long", year: "numeric",
          })
        : "",
    [user]
  );

  return { user, authLoading, username, avatar, isAdmin, joinDate, signIn, signOut };
};
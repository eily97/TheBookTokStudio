import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../api/supabase";
import { isInAppBrowser } from "../utils";

export const useAuth = () => {
  const [user, setUser]           = useState(null);
  const [session, setSession]     = useState(null);
  const [authLoading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [showBrowserWarning, setShowBrowserWarning] = useState(false);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        setUser(data.session?.user || null);
        setSession(data.session || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => { setUser(session?.user || null); setSession(session || null); }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    setAuthError(null);

    // Google blocks OAuth inside Instagram/TikTok/Facebook in-app browsers
    // ("disallowed_useragent"). Catch it here instead of letting Google's
    // confusing error page break the flow.
    if (isInAppBrowser()) {
      setShowBrowserWarning(true);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://thatpart.app" },
    });

    if (error) setAuthError(error.message);
  }, []);

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

  return {
    user, authLoading, username, avatar, isAdmin, joinDate,
    signIn, signOut, authError,
    showBrowserWarning,
    dismissBrowserWarning: () => setShowBrowserWarning(false),
    accessToken: session?.access_token || null,
  };
};

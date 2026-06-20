import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../api/supabase";
import { isInAppBrowser, containsProfanity } from "../utils";
import { claimUsername } from "../api/usernames";

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

  // Magic-link fallback for readers who don't want to use Google — also
  // happens to sidestep the in-app-browser OAuth block entirely, since email
  // links work the same everywhere.
  const signInWithEmail = useCallback(async (email) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: "https://thatpart.app" },
    });
    if (error) setAuthError(error.message);
    return { error };
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  // Everyone — Google or email — gets a one-time prompt to confirm/choose
  // their public display name. `username_chosen` is an explicit flag (not
  // inferred from whether a name exists) so Google users, who already have
  // a name auto-filled from their profile, still get asked once instead of
  // silently being stuck with whatever Google handed them.
  const needsUsername = !!user && !user.user_metadata?.username_chosen;

  const setUsername = useCallback(async (name) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      return { error: { message: "Please enter at least 2 characters." } };
    }
    if (containsProfanity(trimmed)) {
      return { error: { message: "Please choose an appropriate name." } };
    }
    if (!user?.id) return { error: { message: "Not signed in." } };

    const { error: claimError } = await claimUsername(trimmed, user.id);
    if (claimError) return { error: claimError };

    const { data, error } = await supabase.auth.updateUser({
      data: { name: trimmed, username_chosen: true },
    });
    if (!error && data?.user) setUser(data.user);
    return { error };
  }, [user]);

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
    signIn, signInWithEmail, signOut, authError,
    needsUsername, setUsername,
    showBrowserWarning,
    dismissBrowserWarning: () => setShowBrowserWarning(false),
    accessToken: session?.access_token || null,
  };
};

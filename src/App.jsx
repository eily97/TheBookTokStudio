import { useState, useCallback, useMemo, useEffect, lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Analytics } from "@vercel/analytics/react";

import { useAuth }          from "./hooks/useAuth";
import { useNotifications } from "./hooks/useNotifications";
import { useBook }          from "./hooks/useBook";
import { useProfile }       from "./hooks/useProfile";
import { useTrending }      from "./hooks/useTrending";
import * as chapApi         from "./api/chapters";

import { SEO }              from "./components/layout/SEO";
import { MainHeader }       from "./components/layout/MainHeader";
import { PWABanner }        from "./components/layout/PWABanner";
import { Footer }           from "./components/ui";
import { InAppBrowserModal } from "./components/layout/InAppBrowserModal";
import { ErrorBoundary }    from "./components/layout/ErrorBoundary";

// LandingPage is the very first thing most visitors see, so it stays in the
// main bundle. Everything below is only needed after an interaction, so it's
// split into its own chunk and fetched on demand — keeps first load light.
import { LandingPage } from "./pages/LandingPage";

const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const ProfilePage       = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const AdminPage         = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const HomePage          = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const BookPage           = lazy(() => import("./pages/BookPage").then((m) => ({ default: m.BookPage })));
const CommentsPage      = lazy(() => import("./pages/CommentsPage").then((m) => ({ default: m.CommentsPage })));
const ShareCardModal    = lazy(() => import("./components/sharecard/ShareCardModal").then((m) => ({ default: m.ShareCardModal })));

import { S }                                      from "./styles";
import { buildSEO, buildCanonical, buildStructuredData, shouldShowPWABanner } from "./utils";

const AuthSkeleton = () => (
  <div style={{ minHeight: "100vh", background: "#fafaf8", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
    <div style={{ borderBottom: "1px solid #e8e8e4", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, background: "#fff" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #fb923c, #f472b6)" }} />
      <div style={{ width: 80, height: 20, borderRadius: 6, background: "#f0f0f0" }} />
      <div style={{ marginLeft: "auto", width: 60, height: 32, borderRadius: 8, background: "#f0f0f0" }} />
    </div>
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
      {[1,2,3].map((i) => (
        <div key={i} style={{ background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 12, padding: 14, marginBottom: 8, display: "flex", gap: 14 }}>
          <div style={{ width: 40, height: 56, borderRadius: 6, background: "#f0f0f0", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: "60%", height: 16, borderRadius: 4, background: "#f0f0f0", marginBottom: 8 }} />
            <div style={{ width: "40%", height: 13, borderRadius: 4, background: "#f0f0f0" }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PageLoader = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: "60px 20px" }}>
    <div style={{
      width: 28, height: 28, borderRadius: "50%",
      border: "3px solid #fce7f3", borderTopColor: "#f472b6",
      animation: "spin 0.8s linear infinite",
    }} />
    <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
  </div>
);

const AuthErrorBanner = ({ message, onDismiss }) => (
  <div style={{
    background: "#fef2f2", borderBottom: "1px solid #fecaca", color: "#b91c1c",
    fontSize: 13, padding: "10px 16px", display: "flex", alignItems: "center",
    justifyContent: "center", gap: 12, textAlign: "center",
  }}>
    <span>Sign-in failed: {message}</span>
    <button onClick={onDismiss} style={{ background: "none", border: "none", color: "#b91c1c", cursor: "pointer", fontWeight: 700 }}>✕</button>
  </div>
);

function AppContent() {
  const {
    user, authLoading, username, avatar, isAdmin, joinDate, signIn, signInWithEmail, signOut,
    accessToken,
    authError, showBrowserWarning, dismissBrowserWarning,
  } = useAuth();

  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const deepLinkBook  = initialParams.get("book");

  const [page,    setPage]    = useState(deepLinkBook ? "home" : "landing");
  const [book,    setBook]    = useState(null);
  const [chapter, setChapter] = useState(null);
  const [resolvingLink, setResolvingLink] = useState(!!deepLinkBook);

  const [shareCard, setShareCard] = useState(null);
  const [showPWA,   setShowPWA]   = useState(shouldShowPWABanner);
  const [adminOpen, setAdminOpen] = useState(false);
  const [pending,   setPending]   = useState([]);
  const [dismissedAuthError, setDismissedAuthError] = useState(false);

  // Shared links and any future sitemap entries point to ?book=...&chapter=...
  // URLs. Without this, opening one of those links just shows the homepage —
  // the "Share" button's copied link silently didn't work before this fix.
  useEffect(() => {
    if (!deepLinkBook) return;
    const chapterParam = initialParams.get("chapter");

    (async () => {
      try {
        const { searchBooks } = await import("./api/books");
        const results = await searchBooks(deepLinkBook);
        const match = results.find((b) => b.title.toLowerCase() === deepLinkBook.toLowerCase()) || results[0];
        if (match) {
          setBook(match);
          if (chapterParam) {
            const num = parseInt(chapterParam);
            setChapter(!isNaN(num) ? num : chapterParam);
            setPage("comments");
          } else {
            setPage("book");
          }
        }
      } catch {
        // Resolution failed — fall back to the homepage rather than getting stuck.
      } finally {
        setResolvingLink(false);
      }
    })();
  }, [deepLinkBook, initialParams]);

  const { notifications, unreadCount, refresh: refreshNotifs, markAllRead } = useNotifications(user ? username : null);
  const bookHook    = useBook(username);
  const profileHook = useProfile(username);
  const { trending, trendingCovers } = useTrending();

  const goHome = useCallback(() => { setPage("home"); setBook(null); setChapter(null); }, []);

  const goBook = useCallback(async (b) => {
    setBook(b); setChapter(null);
    setPage("book");
  }, []);

  const goChapter = useCallback((ch) => { setChapter(ch); setPage("comments"); }, []);

  const openAdmin = useCallback(async () => {
    const d = await chapApi.getPendingChapterNamesSecure(accessToken);
    setPending(Array.isArray(d) ? d : []);
    setAdminOpen(true);
  }, [accessToken]);

  const approveChapter = useCallback(async (sv) => {
    await chapApi.approveChapterNameSecure(accessToken, sv);
    setPending((p) => p.filter((x) => x.id !== sv.id));
  }, [accessToken]);

  const rejectChapter = useCallback(async (sv) => {
    await chapApi.rejectChapterNameSecure(accessToken, sv);
    setPending((p) => p.filter((x) => x.id !== sv.id));
  }, [accessToken]);

  const handleDeleteComment = useCallback(async (id) => {
    if (!confirm("Delete this comment?")) return;
    const { deleteComment } = await import("./api/comments");
    await deleteComment(id);
    profileHook.remove(id);
  }, [profileHook]);

  const seo = useMemo(() =>
    buildSEO({ page, book, chapter, chapterNames: bookHook.chapterNames, username }),
    [page, book, chapter, bookHook.chapterNames, username]
  );
  const canonical = useMemo(() =>
    buildCanonical({ page, book, chapter }),
    [page, book, chapter]
  );
  const structuredData = useMemo(() =>
    buildStructuredData({ page, book, chapter }),
    [page, book, chapter]
  );

  if (authLoading || resolvingLink) return <AuthSkeleton />;

  if (page === "landing") return (
    <>
      <LandingPage
        onBrowse={() => setPage("home")}
        onSignIn={signIn}
        onSignInEmail={signInWithEmail}
        trending={trending}
        trendingCovers={trendingCovers}
        onSelectBook={goBook}
      />
      {showBrowserWarning && <InAppBrowserModal onClose={dismissBrowserWarning} />}
    </>
  );

  if (adminOpen && isAdmin) return (
    <div style={S.wrap}>
      <SEO title={seo.title} desc={seo.desc} canonical={canonical} />
      <div style={S.header}>
        <button onClick={() => setAdminOpen(false)}
          style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, background: "none", border: "none", cursor: "pointer" }}>
          that<span style={{ color: "#f472b6" }}>part</span>.
        </button>
        <span style={{ marginLeft: "auto", ...S.tag }}>Admin</span>
      </div>
      <Suspense fallback={<PageLoader />}>
        <AdminPage pending={pending} onApprove={approveChapter} onReject={rejectChapter} />
      </Suspense>
      <Analytics />
    </div>
  );

  return (
    <div style={S.wrap}>
      <SEO title={seo.title} desc={seo.desc} canonical={canonical} structuredData={structuredData} />
      {shareCard && (
        <Suspense fallback={null}>
          <ShareCardModal shareCard={shareCard} onClose={() => setShareCard(null)} />
        </Suspense>
      )}
      {showBrowserWarning && <InAppBrowserModal onClose={dismissBrowserWarning} />}
      {authError && !dismissedAuthError && (
        <AuthErrorBanner message={authError} onDismiss={() => setDismissedAuthError(true)} />
      )}
      <MainHeader
        user={user} username={username} avatar={avatar}
        isAdmin={isAdmin} unreadCount={unreadCount}
        onLogoClick={goHome}
        onNotificationsClick={() => { setPage("notifications"); refreshNotifs(); }}
        onProfileClick={() => { setPage("profile"); profileHook.load(); bookHook.loadReadingList(); }}
        onSignOut={signOut}
        onSignIn={signIn}
        onAdminClick={openAdmin}
      />
      {showPWA && (
        <PWABanner onDismiss={() => { setShowPWA(false); localStorage.setItem("pwa_dismissed", "1"); }} />
      )}
      <Suspense fallback={<PageLoader />}>
        {page === "notifications" && (
          <NotificationsPage notifications={notifications} unreadCount={unreadCount} onMarkAllRead={markAllRead} />
        )}
        {page === "profile" && (
          <ProfilePage
            username={username} avatar={avatar} joinDate={joinDate}
            myComments={profileHook.myComments} loading={profileHook.loading}
            totalLikes={profileHook.totalLikes} booksRead={profileHook.booksRead}
            mostActiveBook={profileHook.mostActiveBook} readingList={bookHook.readingList}
            onDeleteComment={handleDeleteComment} onGoBook={goBook}
            onRemoveFromReadingList={bookHook.removeBook}
            onRefreshReadingList={bookHook.loadReadingList}
          />
        )}
        {page === "home" && <HomePage onSelectBook={goBook} />}
        {page === "book" && book && (
          <BookPage book={book} user={user} username={username} onBack={goHome} onSelectChapter={goChapter} />
        )}
        {page === "comments" && book && (
          <CommentsPage
            book={book} chapter={chapter} chapterNames={bookHook.chapterNames}
            user={user} username={username}
            onBack={() => setPage("book")}
            onOpenShareCard={setShareCard}
            onSignIn={signIn}
            onSignInEmail={signInWithEmail}
          />
        )}
      </Suspense>
      <Footer />
      <Analytics />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <AppContent />
      </HelmetProvider>
    </ErrorBoundary>
  );
}

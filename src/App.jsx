import { useState, useCallback, useMemo } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Analytics } from "@vercel/analytics/react";

import { useAuth }          from "./hooks/useAuth";
import { useNotifications } from "./hooks/useNotifications";
import { useBook }          from "./hooks/useBook";
import { useProfile }       from "./hooks/useProfile";
import { useTrending }      from "./hooks/useTrending";
import * as chapApi         from "./api/chapters";

import { SEO }            from "./components/layout/SEO";
import { MainHeader }     from "./components/layout/MainHeader";
import { PWABanner }      from "./components/layout/PWABanner";
import { Footer }         from "./components/ui";
import { ShareCardModal } from "./components/sharecard/ShareCardModal";
import { InAppBrowserModal } from "./components/layout/InAppBrowserModal";

import { LandingPage, NotificationsPage, ProfilePage, AdminPage } from "./pages/misc";
import { HomePage }       from "./pages/HomePage";
import { BookPage }       from "./pages/BookPage";
import { CommentsPage }   from "./pages/CommentsPage";

import { S }                                      from "./styles";
import { buildSEO, buildCanonical, shouldShowPWABanner } from "./utils";

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

function AppContent() {
  const {
    user, authLoading, username, avatar, isAdmin, joinDate, signIn, signOut,
    showBrowserWarning, dismissBrowserWarning,
  } = useAuth();

  const [page,    setPage]    = useState("landing");
  const [book,    setBook]    = useState(null);
  const [chapter, setChapter] = useState(null);

  const [shareCard, setShareCard] = useState(null);
  const [showPWA,   setShowPWA]   = useState(shouldShowPWABanner);
  const [adminOpen, setAdminOpen] = useState(false);
  const [pending,   setPending]   = useState([]);

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
    const d = await chapApi.getPendingChapterNames();
    setPending(Array.isArray(d) ? d : []);
    setAdminOpen(true);
  }, []);

  const approveChapter = useCallback(async (sv) => {
    await chapApi.deleteApprovedChapterName(sv.book, sv.chapter);
    await chapApi.patchChapterNameStatus(sv.id, "approved");
    setPending((p) => p.filter((x) => x.id !== sv.id));
  }, []);

  const rejectChapter = useCallback(async (sv) => {
    await chapApi.patchChapterNameStatus(sv.id, "rejected");
    setPending((p) => p.filter((x) => x.id !== sv.id));
  }, []);

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

  if (authLoading) return <AuthSkeleton />;

  if (page === "landing") return (
    <>
      <LandingPage
        onBrowse={() => setPage("home")}
        onSignIn={signIn}
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
      <AdminPage pending={pending} onApprove={approveChapter} onReject={rejectChapter} />
      <Analytics />
    </div>
  );

  return (
    <div style={S.wrap}>
      <SEO title={seo.title} desc={seo.desc} canonical={canonical} />
      <ShareCardModal shareCard={shareCard} onClose={() => setShareCard(null)} />
      {showBrowserWarning && <InAppBrowserModal onClose={dismissBrowserWarning} />}
      <MainHeader
        user={user} username={username} avatar={avatar}
        isAdmin={isAdmin} unreadCount={unreadCount}
        onLogoClick={goHome}
        onNotificationsClick={() => { setPage("notifications"); refreshNotifs(); }}
        onProfileClick={() => { setPage("profile"); profileHook.load(); bookHook.loadReadingList(); }}
        onSignOut={signOut}
        onAdminClick={openAdmin}
      />
      {showPWA && (
        <PWABanner onDismiss={() => { setShowPWA(false); localStorage.setItem("pwa_dismissed", "1"); }} />
      )}
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
        />
      )}
      <Footer />
      <Analytics />
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <AppContent />
    </HelmetProvider>
  );
}

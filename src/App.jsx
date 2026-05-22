import { useState, useEffect } from "react";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://fycpjuwufasvccezfuis.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y3BqdXd1ZmFzdmNjZXpmdWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzUwNTQsImV4cCI6MjA5NTAxMTA1NH0.-2U8vWzNwtg5xvoAESiii9d2YU6xXrfaIbKvHb0yLKo";
const ADMIN_EMAIL = "yarenpekgil97@gmail.com";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SB = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  Prefer: "return=representation",
};

const hasNonLatin = (str) => /[^\u0000-\u024F\u1E00-\u1EFF]/.test(str);

const searchBooks = async (q) => {
  // author: ile yazar araması + title araması birleştir
  const [r1, r2] = await Promise.all([
    fetch(`https://openlibrary.org/search.json?author=${encodeURIComponent(q)}&limit=20&fields=title,author_name,cover_i,key,first_publish_year,language`),
    fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(q)}&limit=20&fields=title,author_name,cover_i,key,first_publish_year,language`),
  ]);
  const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
  const all = [...(d1.docs || []), ...(d2.docs || [])];
  const seen = new Set();
  return all.filter(b => {
    const title = b.title?.trim();
    const author = b.author_name?.[0]?.trim();
    if (!title || !author) return false;
    if (hasNonLatin(title) || hasNonLatin(author)) return false;
    const key = title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 7).map(b => ({
    title: b.title,
    author: b.author_name[0],
    cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
    year: b.first_publish_year || "",
    olKey: b.key || "",
  }));
};

const fetchBookDescription = async (title, author) => {
  try {
    const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(title + " " + author)}&limit=1&fields=key`);
    const d = await r.json();
    const key = d.docs?.[0]?.key;
    if (key) {
      const r2 = await fetch(`https://openlibrary.org${key}.json`);
      const d2 = await r2.json();
      const desc = d2.description;
      const text = typeof desc === "string" ? desc : desc?.value || null;
      if (text && text.length > 30) return text;
    }
  } catch {}
  return null;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("home");
  const [book, setBook] = useState(null);
  const [bookDesc, setBookDesc] = useState(null);
  const [bookDescExpanded, setBookDescExpanded] = useState(false);
  const [bookTotalComments, setBookTotalComments] = useState(0);
  const [chapter, setChapter] = useState(null);
  const [chapterNames, setChapterNames] = useState({});
  const [chapterCounts, setChapterCounts] = useState({});
  const [comments, setComments] = useState([]);
  const [replies, setReplies] = useState({});
  const [text, setText] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [suggestChapter, setSuggestChapter] = useState(null);
  const [suggestText, setSuggestText] = useState("");
  const [suggestSent, setSuggestSent] = useState({});
  const [adminPage, setAdminPage] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [myCommentsLoading, setMyCommentsLoading] = useState(false);
  const [trending, setTrending] = useState([]);
  const [trendingCovers, setTrendingCovers] = useState({});
  const [searchTimer, setSearchTimer] = useState(null);
  const [showPWABanner, setShowPWABanner] = useState(() => {
    const isStandalone = window.navigator.standalone === true;
    const dismissed = localStorage.getItem("pwa_dismissed");
    return !isStandalone && !dismissed;
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setAuthLoading(false);
    });
    supabase.auth.onAuthStateChange((_, session) => setUser(session?.user || null));
    fetchTrending();
  }, []);

  const signInWithGoogle = () => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  const signOut = () => { supabase.auth.signOut(); setUser(null); setPage("home"); };
  const username = user?.user_metadata?.name || user?.email?.split("@")[0] || "reader";
  const avatar = user?.user_metadata?.avatar_url;
  const isAdmin = user?.email === ADMIN_EMAIL;

  const fetchTrending = async () => {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/comments?select=book&order=created_at.desc&limit=200`, { headers: SB });
      const d = await r.json();
      if (!Array.isArray(d)) return;
      const counts = {};
      d.forEach(c => { counts[c.book] = (counts[c.book] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      setTrending(sorted);
      sorted.forEach(async ([title]) => {
        try {
          const results = await searchBooks(title);
          const match = results.find(b => b.title.toLowerCase() === title.toLowerCase()) || results[0];
          if (match) setTrendingCovers(prev => ({ ...prev, [title]: { cover: match.cover, author: match.author } }));
        } catch {}
      });
    } catch {}
  };

  const handleSearch = (q) => {
    setSearch(q);
    if (searchTimer) clearTimeout(searchTimer);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try { setSearchResults(await searchBooks(q)); }
      catch { setSearchResults([]); }
      setSearching(false);
    }, 500);
    setSearchTimer(t);
  };

  const fetchChapterNames = async (bookTitle) => {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/chapter_names?book=eq.${encodeURIComponent(bookTitle)}&status=eq.approved&select=chapter,name`, { headers: SB });
      const d = await r.json();
      const map = {};
      (Array.isArray(d) ? d : []).forEach(c => { map[c.chapter] = c.name; });
      setChapterNames(map);
    } catch { setChapterNames({}); }
  };

  const fetchChapterCounts = async (bookTitle) => {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/comments?book=eq.${encodeURIComponent(bookTitle)}&select=chapter`, { headers: SB });
      const d = await r.json();
      const counts = {};
      let total = 0;
      (Array.isArray(d) ? d : []).forEach(c => { counts[c.chapter] = (counts[c.chapter] || 0) + 1; total++; });
      setChapterCounts(counts);
      setBookTotalComments(total);
    } catch { setChapterCounts({}); setBookTotalComments(0); }
  };

  const fetchComments = async (b, ch) => {
    setLoading(true);
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/comments?book=eq.${encodeURIComponent(b.title)}&chapter=eq.${ch}&order=created_at.desc`, { headers: SB });
      const d = await r.json();
      const cmts = Array.isArray(d) ? d : [];
      setComments(cmts);
      if (cmts.length > 0) {
        const r2 = await fetch(`${SUPABASE_URL}/rest/v1/replies?or=(${cmts.map(c => `comment_id.eq.${c.id}`).join(",")})&order=created_at.asc`, { headers: SB });
        const rd = await r2.json();
        const map = {};
        (Array.isArray(rd) ? rd : []).forEach(reply => {
          if (!map[reply.comment_id]) map[reply.comment_id] = [];
          map[reply.comment_id].push(reply);
        });
        setReplies(map);
      } else { setReplies({}); }
    } catch { setComments([]); setReplies({}); }
    setLoading(false);
  };

  const fetchMyComments = async () => {
    if (!user) return;
    setMyCommentsLoading(true);
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/comments?username=eq.${encodeURIComponent(username)}&order=created_at.desc`, { headers: SB });
      const d = await r.json();
      setMyComments(Array.isArray(d) ? d : []);
    } catch { setMyComments([]); }
    setMyCommentsLoading(false);
  };

  const post = async () => {
    if (!text.trim() || !user) return;
    await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
      method: "POST", headers: SB,
      body: JSON.stringify({ book: book.title, chapter, username, text: text.trim(), spoiler, likes: 0 }),
    });
    setText(""); setSpoiler(false);
    fetchComments(book, chapter);
    fetchChapterCounts(book.title);
  };

  const deleteComment = async (id, fromProfile = false) => {
    if (!confirm("Delete this comment?")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/comments?id=eq.${id}`, { method: "DELETE", headers: SB });
    if (fromProfile) fetchMyComments(); else { fetchComments(book, chapter); fetchChapterCounts(book.title); }
  };

  const like = async (c) => {
    await fetch(`${SUPABASE_URL}/rest/v1/comments?id=eq.${c.id}`, { method: "PATCH", headers: SB, body: JSON.stringify({ likes: c.likes + 1 }) });
    fetchComments(book, chapter);
  };

  const postReply = async (commentId) => {
    if (!replyText.trim() || !user) return;
    await fetch(`${SUPABASE_URL}/rest/v1/replies`, { method: "POST", headers: SB, body: JSON.stringify({ comment_id: commentId, username, text: replyText.trim() }) });
    setReplyText(""); setReplyTo(null);
    fetchComments(book, chapter);
  };

  const deleteReply = async (id) => {
    if (!confirm("Delete this reply?")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/replies?id=eq.${id}`, { method: "DELETE", headers: SB });
    fetchComments(book, chapter);
  };

  const submitSuggestion = async (ch) => {
    if (!suggestText.trim() || !user) return;
    await fetch(`${SUPABASE_URL}/rest/v1/chapter_names`, { method: "POST", headers: SB, body: JSON.stringify({ book: book.title, chapter: ch, name: suggestText.trim(), suggested_by: username, status: "pending" }) });
    setSuggestSent(p => ({ ...p, [ch]: true }));
    setSuggestText(""); setSuggestChapter(null);
  };

  const fetchPending = async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/chapter_names?status=eq.pending&order=created_at.desc`, { headers: SB });
    const d = await r.json();
    setPendingSuggestions(Array.isArray(d) ? d : []);
  };

  const approve = async (sv) => {
    await fetch(`${SUPABASE_URL}/rest/v1/chapter_names?book=eq.${encodeURIComponent(sv.book)}&chapter=eq.${sv.chapter}&status=eq.approved`, { method: "DELETE", headers: SB });
    await fetch(`${SUPABASE_URL}/rest/v1/chapter_names?id=eq.${sv.id}`, { method: "PATCH", headers: SB, body: JSON.stringify({ status: "approved" }) });
    fetchPending();
  };

  const reject = async (sv) => {
    await fetch(`${SUPABASE_URL}/rest/v1/chapter_names?id=eq.${sv.id}`, { method: "PATCH", headers: SB, body: JSON.stringify({ status: "rejected" }) });
    fetchPending();
  };

  const getAI = async () => {
    setAiLoading(true); setAiText("");
    const cmts = comments.map(c => c.text).join("\n");
    const chTitle = chapterNames[chapter];
    const prompt = cmts
      ? `"${book.title}" Chapter ${chapter}${chTitle ? ` "${chTitle}"` : ""} reader comments:\n${cmts}\n\nWhat did readers feel? 2-3 sentences.`
      : `What do readers generally feel about Chapter ${chapter} of "${book.title}"? 2-3 sentences.`;
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }) });
      const d = await r.json();
      setAiText(d.content?.map(i => i.text || "").join("") || "Could not get summary.");
    } catch { setAiText("Connection error."); }
    setAiLoading(false);
  };

  const goBook = async (b) => {
    setBook(b); setChapterNames({}); setChapterCounts({}); setBookDesc(null); setBookDescExpanded(false); setBookTotalComments(0);
    fetchChapterNames(b.title);
    fetchChapterCounts(b.title);
    fetchBookDescription(b.title, b.author).then(desc => setBookDesc(desc));
    setPage("book");
  };

  const topChapters = Object.entries(chapterCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const s = {
    wrap: { minHeight: "100vh", background: "#fafaf8", color: "#1a1a1a", fontFamily: "'Inter','Segoe UI',sans-serif" },
    header: { borderBottom: "1px solid #e8e8e4", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12, background: "#fff", position: "sticky", top: 0, zIndex: 10 },
    logo: { fontSize: 20, fontWeight: 700, color: "#1a1a1a", letterSpacing: -0.5, cursor: "pointer" },
    dot: { width: 8, height: 8, borderRadius: "50%", background: "#4f46e5", display: "inline-block", marginRight: 6 },
    body: { maxWidth: 640, margin: "0 auto", padding: "32px 20px" },
    input: { width: "100%", background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 10, padding: "12px 16px", fontSize: 15, color: "#1a1a1a", outline: "none", boxSizing: "border-box" },
    card: { background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 12, padding: 16, marginBottom: 10 },
    bookCard: { background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 12, padding: 14, marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 },
    btn: (bg, color = "#fff") => ({ background: bg, border: "none", borderRadius: 10, padding: "10px 16px", color, fontSize: 14, fontWeight: 600, cursor: "pointer" }),
    btnFull: (bg, color = "#fff") => ({ width: "100%", background: bg, border: "none", borderRadius: 10, padding: "12px 16px", color, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 8 }),
    back: { background: "none", border: "none", color: "#888", fontSize: 15, cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", gap: 6, padding: 0 },
    tag: { background: "#f0f0ff", color: "#4f46e5", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 },
    muted: { color: "#888", fontSize: 13 },
    label: { fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: 0.8, marginBottom: 10 },
    chRow: { background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 10, padding: "12px 16px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 },
    iconBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "2px 6px", borderRadius: 6 },
  };

  if (authLoading) return <div style={{ ...s.wrap, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>Loading...</div>;

  if (adminPage) {
    if (!isAdmin) { setAdminPage(false); return null; }
    return (
      <div style={s.wrap}>
        <div style={s.header}>
          <span style={s.logo} onClick={() => setAdminPage(false)}><span style={s.dot}></span>PageMind</span>
          <span style={{ marginLeft: "auto", ...s.tag }}>Admin</span>
        </div>
        {showPWABanner && (
        <div style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>📱</span>
            <div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Add PageMind to your home screen</div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }}>Safari → Share → Add to Home Screen</div>
            </div>
          </div>
          <button onClick={() => { setShowPWABanner(false); localStorage.setItem("pwa_dismissed", "1"); }}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", fontSize: 13, cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>
            ✕
          </button>
        </div>
      )}
      <div style={s.body}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Pending Suggestions</div>
          {pendingSuggestions.length === 0 && <div style={s.muted}>No pending suggestions.</div>}
          {pendingSuggestions.map(sv => (
            <div key={sv.id} style={s.card}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{sv.book} · Chapter {sv.chapter}</div>
              <div style={{ fontSize: 15, marginBottom: 4 }}>"{sv.name}"</div>
              <div style={{ ...s.muted, marginBottom: 12 }}>by @{sv.suggested_by}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={s.btn("#4f46e5")} onClick={() => approve(sv)}>✓ Approve</button>
                <button style={s.btn("#fee2e2", "#b91c1c")} onClick={() => reject(sv)}>✕ Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page === "profile") return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.logo} onClick={() => setPage("home")}><span style={s.dot}></span>PageMind</span>
        <button onClick={signOut} style={{ marginLeft: "auto", background: "none", border: "1px solid #e8e8e4", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", color: "#888" }}>Sign out</button>
      </div>
      <div style={s.body}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          {avatar ? <img src={avatar} alt="" style={{ width: 64, height: 64, borderRadius: "50%" }} />
            : <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f0f0ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👤</div>}
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{username}</div>
            <div style={s.muted}>{user?.email}</div>
            <div style={{ ...s.muted, marginTop: 4 }}>{myComments.length} comments</div>
          </div>
        </div>
        <div style={s.label}>My Comments</div>
        {myCommentsLoading && <div style={s.muted}>Loading...</div>}
        {!myCommentsLoading && myComments.length === 0 && <div style={{ ...s.card, textAlign: "center", color: "#aaa", padding: 40 }}>You haven't commented yet 🌱</div>}
        {myComments.map(c => (
          <div key={c.id} style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div><span style={{ fontWeight: 600, fontSize: 14 }}>{c.book}</span><span style={{ ...s.muted, marginLeft: 8 }}>· Chapter {c.chapter}</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={s.muted}>{new Date(c.created_at).toLocaleDateString("en-US")}</span>
                <button onClick={() => deleteComment(c.id, true)} style={{ ...s.iconBtn, color: "#f87171" }}>🗑</button>
              </div>
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.6, color: "#333" }}>
              {c.spoiler && <span style={{ background: "#fff8f0", color: "#b45309", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 6 }}>SPOILER</span>}
              {c.text}
            </div>
            <div style={{ ...s.muted, marginTop: 8 }}>🤍 {c.likes} felt the same</div>
          </div>
        ))}
      </div>
    </div>
  );

  const Header = () => (
    <div style={s.header}>
      <span style={s.logo} onClick={() => { setPage("home"); setBook(null); setSearch(""); setSearchResults([]); }}>
        <span style={s.dot}></span>PageMind
      </span>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {user ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => { setPage("profile"); fetchMyComments(); }}>
              {avatar ? <img src={avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />
                : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f0f0ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👤</div>}
              <span style={{ fontSize: 14, fontWeight: 600 }}>{username}</span>
            </div>
            <button onClick={signOut} style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", color: "#888" }}>Sign out</button>
          </>
        ) : (
          <button onClick={signInWithGoogle} style={s.btn("#4f46e5")}>Sign in with Google</button>
        )}
        {isAdmin && <button onClick={() => { setAdminPage(true); fetchPending(); }} style={{ background: "none", border: "none", color: "#ccc", fontSize: 14, cursor: "pointer" }}>⚙</button>}
      </div>
    </div>
  );

  const BookCard = ({ b, onClick }) => (
    <div style={s.bookCard}
      onMouseOver={e => e.currentTarget.style.borderColor = "#4f46e5"}
      onMouseOut={e => e.currentTarget.style.borderColor = "#e8e8e4"}
      onClick={onClick}>
      {b.cover ? <img src={b.cover} alt="" style={{ width: 40, height: 56, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
        : <div style={{ width: 40, height: 56, borderRadius: 6, background: "#f0f0ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📚</div>}
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{b.title}</div>
        <div style={s.muted}>{b.author}{b.year ? ` · ${b.year}` : ""}</div>
      </div>
    </div>
  );

  return (
    <div style={s.wrap}>
      <Header />
      <div style={s.body}>

        {page === "home" && <>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 6, letterSpacing: -0.5 }}>Find your book</div>
            <div style={s.muted}>Select a chapter and share what you felt with other readers.</div>
          </div>
          {!user && (
            <div style={{ ...s.card, borderColor: "#e0e0ff", background: "#f8f7ff", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 14, color: "#4f46e5" }}>Sign in to leave comments and suggest chapter names.</div>
              <button onClick={signInWithGoogle} style={s.btn("#4f46e5")}>Sign in</button>
            </div>
          )}
          <input style={s.input} placeholder="Search by title or author..." value={search} onChange={e => handleSearch(e.target.value)} />
          <div style={{ marginTop: 12 }}>
            {searching && <div style={{ ...s.muted, padding: "12px 0" }}>Searching...</div>}
            {searchResults.map((b, i) => <BookCard key={i} b={b} onClick={() => goBook(b)} />)}
            {search.length > 1 && !searching && searchResults.length === 0 && <div style={{ ...s.muted, padding: "12px 0" }}>No results found.</div>}
          </div>
          {trending.length > 0 && search.length < 2 && (
            <div style={{ marginTop: 36 }}>
              <div style={s.label}>🔥 Trending this week</div>
              {trending.map(([title, count]) => {
                const info = trendingCovers[title];
                const b = { title, author: info?.author || "", cover: info?.cover || null, year: "", olKey: "" };
                return (
                  <div key={title} style={s.bookCard}
                    onMouseOver={e => e.currentTarget.style.borderColor = "#4f46e5"}
                    onMouseOut={e => e.currentTarget.style.borderColor = "#e8e8e4"}
                    onClick={() => goBook(b)}>
                    {info?.cover ? <img src={info.cover} alt="" style={{ width: 40, height: 56, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 40, height: 56, borderRadius: 6, background: "#f0f0ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📚</div>}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{title}</div>
                      {info?.author && <div style={s.muted}>{info.author}</div>}
                    </div>
                    <span style={{ ...s.tag, background: "#fff8f0", color: "#b45309" }}>💬 {count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>}

        {page === "book" && <>
          <button style={s.back} onClick={() => { setPage("home"); setBook(null); setSearch(""); setSearchResults([]); }}>← Back</button>
          <div style={{ display: "flex", gap: 20, marginBottom: 28 }}>
            {book?.cover
              ? <img src={book.cover} alt="" style={{ width: 90, height: 130, borderRadius: 10, objectFit: "cover", flexShrink: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }} />
              : <div style={{ width: 90, height: 130, borderRadius: 10, background: "#f0f0ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, flexShrink: 0 }}>📚</div>}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, marginBottom: 6, lineHeight: 1.2 }}>{book?.title}</div>
              <div style={{ fontSize: 15, color: "#555", marginBottom: 4 }}>{book?.author}</div>
              {book?.year && <div style={s.muted}>{book.year}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {bookTotalComments > 0 && <span style={{ ...s.tag, background: "#fff8f0", color: "#b45309" }}>💬 {bookTotalComments} comments</span>}
                {topChapters.length > 0 && <span style={s.tag}>Most active: Ch. {topChapters[0][0]}</span>}
              </div>
            </div>
          </div>

          {bookDesc && (
            <div style={{ ...s.card, background: "#f8f7ff", borderColor: "#e0e0ff", marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5", marginBottom: 8, letterSpacing: 0.5 }}>About this book</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: "#444" }}>
                {bookDesc.length > 280 && !bookDescExpanded ? bookDesc.slice(0, 280) + "..." : bookDesc}
              </div>
              {bookDesc.length > 280 && (
                <button onClick={() => setBookDescExpanded(!bookDescExpanded)} style={{ background: "none", border: "none", color: "#4f46e5", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 0 0", display: "block" }}>
                  {bookDescExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}

          {topChapters.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={s.label}>Most discussed chapters</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {topChapters.map(([ch, count]) => (
                  <div key={ch} onClick={() => { setChapter(+ch); setAiText(""); fetchComments(book, +ch); setPage("comments"); }}
                    style={{ background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 10, padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                    onMouseOver={e => e.currentTarget.style.borderColor = "#4f46e5"}
                    onMouseOut={e => e.currentTarget.style.borderColor = "#e8e8e4"}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Ch. {ch}</span>
                    <span style={{ ...s.tag, background: "#fff8f0", color: "#b45309" }}>💬 {count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={s.label}>All chapters</div>
          {Array.from({ length: 20 }, (_, i) => i + 1).map(ch => (
            <div key={ch}>
              <div style={s.chRow}
                onMouseOver={e => e.currentTarget.style.borderColor = "#4f46e5"}
                onMouseOut={e => e.currentTarget.style.borderColor = "#e8e8e4"}
                onClick={() => { setChapter(ch); setAiText(""); fetchComments(book, ch); setPage("comments"); }}>
                <span style={{ ...s.tag, minWidth: 28, textAlign: "center", flexShrink: 0 }}>{ch}</span>
                <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{chapterNames[ch] || <span style={{ color: "#bbb" }}>Chapter {ch}</span>}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {chapterCounts[ch] > 0 && <span style={{ ...s.tag, background: "#fff8f0", color: "#b45309" }}>💬 {chapterCounts[ch]}</span>}
                  {user && !chapterNames[ch] && !suggestSent[ch] && (
                    <button onClick={e => { e.stopPropagation(); setSuggestChapter(ch === suggestChapter ? null : ch); }}
                      style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "#888", cursor: "pointer" }}>+ Name</button>
                  )}
                  {suggestSent[ch] && <span style={{ fontSize: 11, color: "#4f46e5" }}>Sent ✓</span>}
                </div>
              </div>
              {suggestChapter === ch && (
                <div style={{ ...s.card, marginTop: -4, marginBottom: 8 }}>
                  <div style={{ ...s.muted, marginBottom: 8 }}>Suggest a name for Chapter {ch}:</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input style={{ ...s.input, flex: 1 }} placeholder="e.g. The Awakening" value={suggestText} onChange={e => setSuggestText(e.target.value)} />
                    <button style={s.btn("#4f46e5")} onClick={() => submitSuggestion(ch)}>Send</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>}

        {page === "comments" && <>
          <button style={s.back} onClick={() => setPage("book")}>← Back</button>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{book?.title}</div>
            <div style={s.muted}>{chapterNames[chapter] ? `Chapter ${chapter}: ${chapterNames[chapter]}` : `Chapter ${chapter}`}</div>
          </div>
          <button onClick={getAI} disabled={aiLoading} style={s.btnFull("#f0f0ff", "#4f46e5")}>
            {aiLoading ? "✦ Analyzing..." : "✦ What did readers feel in this chapter?"}
          </button>
          {aiText && (
            <div style={{ ...s.card, borderColor: "#e0e0ff", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5", marginBottom: 8, letterSpacing: 0.5 }}>AI Summary</div>
              <div style={{ fontSize: 15, lineHeight: 1.7, color: "#333" }}>{aiText}</div>
            </div>
          )}
          {user ? (
            <div style={s.card}>
              <div style={s.label}>What did you feel?</div>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Share your thoughts while reading this chapter..."
                style={{ ...s.input, resize: "none", minHeight: 80, marginBottom: 10 }} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#888", fontSize: 14, marginBottom: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={spoiler} onChange={e => setSpoiler(e.target.checked)} /> Contains spoiler
              </label>
              <button onClick={post} style={s.btnFull("#4f46e5")}>Share</button>
            </div>
          ) : (
            <div style={{ ...s.card, borderColor: "#e0e0ff", background: "#f8f7ff", textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 15, color: "#4f46e5", marginBottom: 12 }}>Sign in to share your thoughts</div>
              <button onClick={signInWithGoogle} style={s.btn("#4f46e5")}>Sign in with Google</button>
            </div>
          )}
          <div style={{ ...s.label, marginTop: 24 }}>{loading ? "Loading..." : `${comments.length} comments`}</div>
          {!loading && comments.length === 0 && <div style={{ ...s.card, textAlign: "center", color: "#aaa", padding: 40 }}>Be the first to share your thoughts 🌱</div>}
          {comments.map(c => (
            <div key={c.id} style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "#4f46e5" }}>@{c.username}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={s.muted}>{new Date(c.created_at).toLocaleDateString("en-US")}</span>
                  {user && c.username === username && <button onClick={() => deleteComment(c.id)} style={{ ...s.iconBtn, color: "#f87171" }}>🗑</button>}
                </div>
              </div>
              {c.spoiler && !revealed[c.id]
                ? <div onClick={() => setRevealed(r => ({ ...r, [c.id]: true }))} style={{ background: "#fff8f0", border: "1px solid #fde8cc", borderRadius: 8, padding: "10px 14px", color: "#b45309", fontSize: 14, cursor: "pointer", textAlign: "center" }}>⚠️ Spoiler — click to reveal</div>
                : <div style={{ fontSize: 15, lineHeight: 1.6, color: "#333" }}>
                    {c.spoiler && <span style={{ background: "#fff8f0", color: "#b45309", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 6 }}>SPOILER</span>}
                    {c.text}
                  </div>}
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <button onClick={() => like(c)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 13, padding: 0 }}>🤍 {c.likes} felt the same</button>
                {user && <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 13, padding: 0 }}>💬 Reply</button>}
              </div>
              {(replies[c.id] || []).length > 0 && (
                <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: "2px solid #f0f0ff" }}>
                  {(replies[c.id] || []).map(r => (
                    <div key={r.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 12, color: "#4f46e5" }}>@{r.username}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ ...s.muted, fontSize: 11 }}>{new Date(r.created_at).toLocaleDateString("en-US")}</span>
                          {user && r.username === username && <button onClick={() => deleteReply(r.id)} style={{ ...s.iconBtn, color: "#f87171", fontSize: 11 }}>🗑</button>}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, color: "#444", lineHeight: 1.5 }}>{r.text}</div>
                    </div>
                  ))}
                </div>
              )}
              {replyTo === c.id && (
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <input style={{ ...s.input, flex: 1, padding: "8px 12px", fontSize: 14 }} placeholder="Write a reply..." value={replyText} onChange={e => setReplyText(e.target.value)} />
                  <button style={s.btn("#4f46e5")} onClick={() => postReply(c.id)}>Send</button>
                </div>
              )}
            </div>
          ))}
        </>}

      </div>
    </div>
  );
}

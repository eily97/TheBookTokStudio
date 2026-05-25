import { useState, useEffect, useRef } from "react";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { Analytics } from "@vercel/analytics/react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import html2canvas from "html2canvas";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://fycpjuwufasvccezfuis.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y3BqdXd1ZmFzdmNjZXpmdWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzUwNTQsImV4cCI6MjA5NTAxMTA1NH0.-2U8vWzNwtg5xvoAESiii9d2YU6xXrfaIbKvHb0yLKo";
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "yarenpekgil97@gmail.com";
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SB = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  Prefer: "return=representation",
};

const hasNonLatin = (str) => /[^\u0000-\u024F\u1E00-\u1EFF]/.test(str);

const normalizeTitle = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\b(the|a|an|special|edition|book|duet|series|novel|part|volume|vol|deluxe|collector|complete|omnibus|illustrated)\b/g, "")
    .replace(/\d+/g, "")
    .trim();
};

const titlesAreSimilar = (a, b) => {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return true;
  if (na.startsWith(nb) || nb.startsWith(na)) return true;
  const wordsA = na.split(" ").filter(Boolean);
  const wordsB = nb.split(" ").filter(Boolean);
  const shorter = wordsA.length < wordsB.length ? wordsA : wordsB;
  const longer = wordsA.length < wordsB.length ? wordsB : wordsA;
  if (shorter.length === 0) return false;
  const matchCount = shorter.filter(w => longer.includes(w)).length;
  return matchCount / shorter.length >= 0.8;
};

const searchBooks = async (q) => {
  const [r1, r2] = await Promise.all([
    fetch(`https://openlibrary.org/search.json?author=${encodeURIComponent(q)}&limit=20&fields=title,author_name,cover_i,key,first_publish_year,language`),
    fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=20&fields=title,author_name,cover_i,key,first_publish_year,language`),
  ]);
  const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
  const all = [...(d1.docs || []), ...(d2.docs || [])];
  const candidates = all.filter(b => {
    const title = b.title?.trim();
    const author = b.author_name?.[0]?.trim();
    if (!title || !author) return false;
    if (hasNonLatin(title) || hasNonLatin(author)) return false;
    return true;
  }).map(b => ({
    title: b.title,
    author: b.author_name[0],
    cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
    year: b.first_publish_year || "",
    olKey: b.key || "",
  }));
  const deduped = [];
  for (const candidate of candidates) {
    const isDuplicate = deduped.some(existing =>
      titlesAreSimilar(existing.title, candidate.title) &&
      existing.author.toLowerCase().split(" ").some(w => candidate.author.toLowerCase().includes(w))
    );
    if (!isDuplicate) {
      const preferred = candidates
        .filter(c =>
          titlesAreSimilar(c.title, candidate.title) &&
          candidate.author.toLowerCase().split(" ").some(w => c.author.toLowerCase().includes(w))
        )
        .sort((a, b) => a.title.length - b.title.length)[0];
      deduped.push(preferred || candidate);
      if (deduped.length >= 7) break;
    }
  }
  return deduped;
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

const BLOCKED_WORDS = [
  "fuck", "shit", "bitch", "asshole", "cunt", "damn", "bastard", "dick", "pussy", "faggot",
  "nigger", "retard", "whore", "slut", "motherfucker", "fuckoff", "bullshit",
  "sik", "orospu", "yarrak", "amk", "amına", "piç", "gerizekalı",
  "bok", "siktir", "kahpe", "ibne"
];

const containsProfanity = (text) => {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some(word => lower.includes(word));
};

const checkRateLimit = (username) => {
  const key = `rl_${username}`;
  const now = Date.now();
  const raw = localStorage.getItem(key);
  let timestamps = raw ? JSON.parse(raw) : [];
  timestamps = timestamps.filter(t => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) {
    const oldest = timestamps[0];
    const resetIn = Math.ceil((oldest + RATE_WINDOW_MS - now) / 60000);
    return { allowed: false, resetIn };
  }
  timestamps.push(now);
  localStorage.setItem(key, JSON.stringify(timestamps));
  return { allowed: true };
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
  </svg>
);

function AppContent() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("landing");
  const [profileTab, setProfileTab] = useState("comments");
  const [book, setBook] = useState(null);
  const [bookDesc, setBookDesc] = useState(null);
  const [bookDescExpanded, setBookDescExpanded] = useState(false);
  const [bookTotalComments, setBookTotalComments] = useState(0);
  const [chapter, setChapter] = useState(null);
  const [chapterNames, setChapterNames] = useState({});
  const [chapterCounts, setChapterCounts] = useState({});
  const [totalChapters, setTotalChapters] = useState(50);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [replies, setReplies] = useState({});
  const [text, setText] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(null);
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
  const [readingList, setReadingList] = useState([]);
  const [trending, setTrending] = useState([]);
  const [trendingCovers, setTrendingCovers] = useState({});
  const [searchTimer, setSearchTimer] = useState(null);
  const [showPWABanner, setShowPWABanner] = useState(() => {
    const isStandalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = localStorage.getItem("pwa_dismissed");
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile && !isStandalone && !dismissed;
  });
  const [notifications, setNotifications] = useState([]);
  const [shareCard, setShareCard] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [reportChapterCount, setReportChapterCount] = useState(false);
  const [suggestedChapterCount, setSuggestedChapterCount] = useState("");
  const shareCardRef = useRef(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user || null;
      setUser(u);
      if (u) setPage("home");
      setAuthLoading(false);
    });
    supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (event === "SIGNED_OUT") setPage("landing");
    });
    fetchTrending();
  }, []);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const signInWithGoogle = () => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "https://thatpart.app" } });
  const signOut = () => { supabase.auth.signOut(); setUser(null); setPage("landing"); setNotifications([]); };
  const username = user?.user_metadata?.name || user?.email?.split("@")[0] || "reader";
  const avatar = user?.user_metadata?.avatar_url;
  const isAdmin = user?.email === ADMIN_EMAIL;
  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const uname = user?.user_metadata?.name || user?.email?.split("@")[0];
      const r = await fetch(`${SUPABASE_URL}/rest/v1/notifications?username=eq.${encodeURIComponent(uname)}&order=created_at.desc&limit=20`, { headers: SB });
      const d = await r.json();
      setNotifications(Array.isArray(d) ? d : []);
    } catch { setNotifications([]); }
  };

  const markAllRead = async () => {
    if (!user) return;
    const uname = user?.user_metadata?.name || user?.email?.split("@")[0];
    await fetch(`${SUPABASE_URL}/rest/v1/notifications?username=eq.${encodeURIComponent(uname)}&is_read=eq.false`, {
      method: "PATCH", headers: SB, body: JSON.stringify({ is_read: true }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const fetchTrending = async () => {
    const cacheKey = "trending_cache";
    const cacheTTL = 30 * 60 * 1000;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < cacheTTL) {
          setTrending(data.trending);
          setTrendingCovers(data.covers);
          return;
        }
      }
    } catch {}
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/comments?select=book&order=created_at.desc&limit=200`, { headers: SB });
      const d = await r.json();
      if (!Array.isArray(d)) return;
      const counts = {};
      d.forEach(c => { counts[c.book] = (counts[c.book] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      setTrending(sorted);
      const covers = {};
      await Promise.all(sorted.map(async ([title]) => {
        try {
          const results = await searchBooks(title);
          const match = results.find(b => b.title.toLowerCase() === title.toLowerCase()) || results[0];
          if (match) covers[title] = { cover: match.cover, author: match.author };
        } catch {}
      }));
      setTrendingCovers(covers);
      localStorage.setItem(cacheKey, JSON.stringify({ data: { trending: sorted, covers }, timestamp: Date.now() }));
    } catch {}
  };

  const handleSearch = (q) => {
    setSearch(q);
    if (searchTimer) clearTimeout(searchTimer);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/canonical_books?or=(title.ilike.*${encodeURIComponent(q)}*,author.ilike.*${encodeURIComponent(q)}*)&limit=5`, { headers: SB });
        const canonical = await r.json();
        const canonicalResults = (Array.isArray(canonical) ? canonical : []).map(b => ({
          title: b.title,
          author: b.author,
          cover: b.cover_id ? `https://covers.openlibrary.org/b/id/${b.cover_id}-M.jpg` : null,
          year: "",
          olKey: "",
          isCanonical: true,
        }));
        const openLibResults = await searchBooks(q);
        const filtered = openLibResults.filter(b =>
          !canonicalResults.some(c => titlesAreSimilar(c.title, b.title))
        );
        setSearchResults([...canonicalResults, ...filtered].slice(0, 7));
      } catch {
        try { setSearchResults(await searchBooks(q)); }
        catch { setSearchResults([]); }
      }
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

  const fetchTotalChapters = async (b) => {
    setChaptersLoading(true);
    setTotalChapters(50);
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/book_metadata?book_title=eq.${encodeURIComponent(b.title)}&select=chapter_count`, { headers: SB });
      const d = await r.json();
      if (Array.isArray(d) && d.length > 0 && d[0].chapter_count > 0) {
        setTotalChapters(d[0].chapter_count);
      }
    } catch {}
    setChaptersLoading(false);
  };

  const submitChapterCountSuggestion = async () => {
    const num = parseInt(suggestedChapterCount);
    if (!num || num < 1 || num > 200) {
      alert("Please enter a valid chapter count between 1 and 200.");
      return;
    }
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/chapter_count_suggestions`, {
        method: "POST", headers: SB,
        body: JSON.stringify({ book_title: book.title, suggested_count: num, suggested_by: username, status: "pending" }),
      });
      setReportChapterCount(false);
      setSuggestedChapterCount("");
      alert("Thank you! Your correction has been submitted for review.");
    } catch {
      alert("Could not submit. Please try again.");
    }
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

  const fetchReadingList = async () => {
    if (!user) return;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/reading_list?username=eq.${encodeURIComponent(username)}&order=added_at.desc`, { headers: SB });
      const d = await r.json();
      setReadingList(Array.isArray(d) ? d : []);
    } catch { setReadingList([]); }
  };

  const addToReadingList = async (b) => {
    if (!user) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/reading_list`, {
        method: "POST", headers: SB,
        body: JSON.stringify({ username, book: b.title, author: b.author, cover: b.cover }),
      });
      fetchReadingList();
    } catch {}
  };

  const removeFromReadingList = async (id) => {
    await fetch(`${SUPABASE_URL}/rest/v1/reading_list?id=eq.${id}`, { method: "DELETE", headers: SB });
    fetchReadingList();
  };

  const isInReadingList = (bookTitle) => readingList.some(r => r.book === bookTitle);

  const post = async () => {
    if (!text.trim() || !user) return;
    setRateLimitError(null);
    if (containsProfanity(text)) {
      alert("Your comment contains inappropriate language. Please keep it respectful 🩷");
      return;
    }
    const rl = checkRateLimit(username);
    if (!rl.allowed) {
      setRateLimitError(`You've reached the limit of ${RATE_LIMIT} comments per hour. Try again in ${rl.resetIn} minute${rl.resetIn !== 1 ? "s" : ""}.`);
      return;
    }
    await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
      method: "POST", headers: SB,
      body: JSON.stringify({ book: book.title, chapter, username, text: text.trim(), spoiler, likes: 0 }),
    });
    setText(""); setSpoiler(false);
    setPostSuccess(true);
    setTimeout(() => setPostSuccess(false), 3000);
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
    if (c.username !== username) {
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: "POST", headers: SB,
        body: JSON.stringify({ username: c.username, type: "like", message: `${username} felt the same about your comment on ${book.title} Ch.${chapter}`, book: book.title, chapter, comment_id: c.id }),
      });
    }
    fetchComments(book, chapter);
  };

  const postReply = async (commentId) => {
    if (!replyText.trim() || !user) return;
    const parentComment = comments.find(c => c.id === commentId);
    await fetch(`${SUPABASE_URL}/rest/v1/replies`, { method: "POST", headers: SB, body: JSON.stringify({ comment_id: commentId, username, text: replyText.trim() }) });
    if (parentComment && parentComment.username !== username) {
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: "POST", headers: SB,
        body: JSON.stringify({ username: parentComment.username, type: "reply", message: `${username} replied to your comment on ${book.title} Ch.${chapter}`, book: book.title, chapter, comment_id: commentId }),
      });
    }
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
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book: book.title, chapter: ch, name: suggestText.trim(), suggested_by: username }),
      });
    } catch {}
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

  const getAI = async (autoTrigger = false) => {
    setAiLoading(true);
    if (!autoTrigger) setAiText("");
    const cmts = comments.map(c => c.text).join("\n");
    const chTitle = chapterNames[chapter];
    const prompt = cmts
      ? `"${book.title}" Chapter ${chapter}${chTitle ? ` "${chTitle}"` : ""} reader comments:\n${cmts}\n\nWhat did readers feel? 2-3 sentences.`
      : `What do readers typically feel about Chapter ${chapter} of "${book.title}" by ${book.author}? Be specific to this chapter if you can. 2-3 sentences.`;
    try {
      const r = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      });
      const d = await r.json();
      setAiText(d.content?.map(i => i.text || "").join("") || "Could not get summary.");
    } catch { setAiText("Connection error."); }
    setAiLoading(false);
  };

  const goBook = async (b) => {
    setBook(b); setChapterNames({}); setChapterCounts({}); setBookDesc(null); setBookDescExpanded(false); setBookTotalComments(0);
    fetchChapterNames(b.title);
    fetchChapterCounts(b.title);
    fetchTotalChapters(b);
    fetchBookDescription(b.title, b.author).then(desc => setBookDesc(desc));
    if (user) fetchReadingList();
    setPage("book");
  };

  const goChapter = (ch) => {
    setChapter(ch); setAiText(""); setRateLimitError(null);
    fetchComments(book, ch);
    setPage("comments");
  };

  const openShareCard = (comment) => {
    setShareCard({
      text: comment.text,
      username: comment.username,
      book: book.title,
      author: book.author,
      cover: book.cover,
      chapter: chapter,
      chapterName: chapterNames[chapter],
    });
  };

  const downloadShareCard = async () => {
    if (!shareCardRef.current) return;
    setGeneratingImage(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: null, scale: 2, useCORS: true, allowTaint: true,
      });
      const link = document.createElement("a");
      link.download = `thatpart-${shareCard.book.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-ch${shareCard.chapter}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch { alert("Could not generate image. Try again!"); }
    setGeneratingImage(false);
  };

  const topChapters = Object.entries(chapterCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const totalLikes = myComments.reduce((sum, c) => sum + (c.likes || 0), 0);
  const booksRead = [...new Set(myComments.map(c => c.book))];
  const mostActiveBook = booksRead.length > 0
    ? booksRead.map(b => ({ book: b, count: myComments.filter(c => c.book === b).length })).sort((a, b) => b.count - a.count)[0]
    : null;

  const getSEO = () => {
    if (page === "comments" && book && chapter) {
      const chName = chapterNames[chapter];
      return {
        title: `${book.title} Chapter ${chapter}${chName ? `: ${chName}` : ""} — Reader Discussion | thatpart`,
        desc: `What did readers feel in Chapter ${chapter} of "${book.title}" by ${book.author}? Read spoiler-free reactions and share your own thoughts.`,
      };
    }
    if (page === "book" && book) return {
      title: `${book.title} by ${book.author} — Chapter by Chapter Discussions | thatpart`,
      desc: `Discuss "${book.title}" chapter by chapter. Spoiler-free reader reactions, feelings, and discussions for every chapter.`,
    };
    if (page === "home") return { title: "Find your book — thatpart", desc: "Search millions of books and share what you felt, chapter by chapter. Spoiler-free reader community." };
    if (page === "profile") return { title: `${username} — thatpart`, desc: "Reader profile on thatpart." };
    if (page === "notifications") return { title: "Notifications — thatpart", desc: "Your notifications on thatpart." };
    return {
      title: "thatpart — Share what you felt, chapter by chapter",
      desc: "A free community for readers who feel too much. Share spoiler-free reactions chapter by chapter. Find readers who felt the exact same thing.",
    };
  };

  const seo = getSEO();
  const canonical = page === "comments" && book && chapter
    ? `https://thatpart.app/?book=${encodeURIComponent(book.title)}&chapter=${chapter}`
    : page === "book" && book ? `https://thatpart.app/?book=${encodeURIComponent(book.title)}`
    : "https://thatpart.app/";

  const s = {
    wrap: { minHeight: "100vh", background: "#fafaf8", color: "#1a1a1a", fontFamily: "'Inter','Segoe UI',sans-serif" },
    header: { borderBottom: "1px solid #e8e8e4", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, background: "#fff", position: "sticky", top: 0, zIndex: 10 },
    body: { maxWidth: 640, margin: "0 auto", padding: "24px 16px" },
    input: { width: "100%", background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 10, padding: "12px 16px", fontSize: 15, color: "#1a1a1a", outline: "none", boxSizing: "border-box" },
    card: { background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 12, padding: 16, marginBottom: 10 },
    bookCard: { background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 12, padding: 14, marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 },
    btn: (bg, color = "#fff") => ({ background: bg, border: "none", borderRadius: 10, padding: "10px 16px", color, fontSize: 14, fontWeight: 600, cursor: "pointer" }),
    btnFull: (bg, color = "#fff") => ({ width: "100%", background: bg, border: "none", borderRadius: 10, padding: "12px 16px", color, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 8 }),
    googleBtn: { width: "100%", background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 10, padding: "12px 16px", fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#1a1a1a" },
    back: { background: "none", border: "none", color: "#888", fontSize: 15, cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", gap: 6, padding: 0 },
    tag: { background: "#fce7f3", color: "#db2777", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 },
    muted: { color: "#888", fontSize: 13 },
    label: { fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: 0.8, marginBottom: 10 },
    chRow: { background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 10, padding: "12px 16px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 },
    iconBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "2px 6px", borderRadius: 6 },
    tab: (active) => ({ background: active ? "#fce7f3" : "none", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: active ? 700 : 500, color: active ? "#db2777" : "#888", cursor: "pointer" }),
  };

  const Logo = ({ onClick }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={onClick}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #fb923c, #f472b6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="20" height="20" viewBox="0 0 100 100">
          <rect x="15" y="15" width="70" height="50" rx="4" fill="white" opacity="0.25"/>
          <line x1="50" y1="15" x2="50" y2="65" stroke="white" strokeWidth="2" opacity="0.4"/>
          <rect x="20" y="24" width="24" height="3" rx="1.5" fill="white" opacity="0.6"/>
          <rect x="20" y="31" width="18" height="3" rx="1.5" fill="white" opacity="0.5"/>
          <rect x="20" y="38" width="21" height="3" rx="1.5" fill="white" opacity="0.5"/>
          <rect x="56" y="24" width="24" height="3" rx="1.5" fill="white" opacity="0.6"/>
          <rect x="56" y="31" width="16" height="3" rx="1.5" fill="white" opacity="0.5"/>
          <rect x="56" y="38" width="20" height="3" rx="1.5" fill="white" opacity="0.5"/>
        </svg>
      </div>
      <span style={{ fontFamily: "Georgia,serif", fontSize: 19, fontWeight: 700, letterSpacing: -0.5, color: "#1a1a1a" }}>
        that<span style={{ color: "#f472b6" }}>part</span>.
      </span>
    </div>
  );

  const Footer = () => (
    <div style={{ borderTop: "1px solid #e8e8e4", padding: "24px 20px", textAlign: "center", background: "#fff" }}>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
        that<span style={{ color: "#f472b6" }}>part</span>.
      </div>
      <div style={{ color: "#aaa", fontSize: 12 }}>by <a href="https://www.tiktok.com/@thebooktokstudio" target="_blank" rel="noreferrer" style={{ color: "#db2777", textDecoration: "none", fontWeight: 600 }}>TheBookTokStudio</a></div>
    </div>
  );

  const MainHeader = () => (
    <div style={s.header}>
      <Logo onClick={() => setPage("home")} />
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {user && (
          <button onClick={() => { setPage("notifications"); fetchNotifications(); }}
            style={{ position: "relative", background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: "4px" }}>
            🩷
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: 0, right: 0, background: "#db2777", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                {unreadCount}
              </span>
            )}
          </button>
        )}
        {user ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => { setPage("profile"); fetchMyComments(); fetchReadingList(); }}>
              {avatar ? <img src={avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />
                : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #fb923c, #f472b6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 700 }}>{username[0]?.toUpperCase()}</div>}
              <span style={{ fontSize: 14, fontWeight: 600 }}>{username}</span>
            </div>
            <button onClick={signOut} style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", color: "#888" }}>Sign out</button>
            {isAdmin && <button onClick={() => { setAdminPage(true); fetchPending(); }} style={{ background: "none", border: "none", color: "#ccc", fontSize: 14, cursor: "pointer" }}>⚙</button>}
          </>
        ) : (
          <button onClick={signInWithGoogle} style={{ ...s.googleBtn, width: "auto", marginBottom: 0, padding: "8px 14px" }}>
            <GoogleIcon /> Sign in
          </button>
        )}
      </div>
    </div>
  );

  const SEO = () => (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.desc} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.desc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="thatpart" />
      <meta property="og:image" content="https://thatpart.app/og-image.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.desc} />
      <meta name="twitter:image" content="https://thatpart.app/og-image.png" />
      <meta name="google-site-verification" content="tl8FQnHwLZsDIFlwHSPSgTDjh0g8Sm4C893F_HWoqBQ" />
    </Helmet>
  );

  const ShareCardModal = () => {
    if (!shareCard) return null;
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20, overflowY: "auto" }}
        onClick={() => setShareCard(null)}>
        <div onClick={e => e.stopPropagation()} style={{ maxWidth: 360, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
          <div ref={shareCardRef} style={{
            width: 360, height: 640, background: "linear-gradient(160deg, #fff8fb 0%, #fce7f3 60%, #fb923c 130%)",
            borderRadius: 24, padding: 28, display: "flex", flexDirection: "column", justifyContent: "space-between",
            fontFamily: "'Inter','Segoe UI',sans-serif", color: "#1a1a1a", overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #fb923c, #f472b6)" }} />
              <span style={{ fontFamily: "Georgia,serif", fontSize: 17, fontWeight: 700 }}>
                that<span style={{ color: "#db2777" }}>part</span>.
              </span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "20px 0" }}>
              {shareCard.cover && <img src={shareCard.cover} alt="" crossOrigin="anonymous" style={{ width: 100, height: 145, borderRadius: 8, objectFit: "cover", marginBottom: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }} />}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#db2777", letterSpacing: 1, marginBottom: 8 }}>
                CHAPTER {shareCard.chapter}{shareCard.chapterName ? ` · ${shareCard.chapterName.toUpperCase()}` : ""}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, letterSpacing: -0.3, lineHeight: 1.2 }}>{shareCard.book}</div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 20 }}>by {shareCard.author}</div>
              <div style={{ fontSize: 16, lineHeight: 1.5, fontStyle: "italic", color: "#1a1a1a", padding: "0 8px", fontWeight: 500 }}>
                "{shareCard.text.length > 180 ? shareCard.text.slice(0, 180) + "..." : shareCard.text}"
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: "#888", fontWeight: 600 }}>— @{shareCard.username}</div>
            </div>
            <div style={{ textAlign: "center", fontSize: 11, color: "#888", letterSpacing: 0.5, fontWeight: 600 }}>JOIN THE CONVERSATION · THATPART.APP</div>
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button onClick={downloadShareCard} disabled={generatingImage}
              style={{ flex: 1, background: "linear-gradient(135deg, #fb923c, #f472b6)", border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              {generatingImage ? "Generating..." : "Download image 🩷"}
            </button>
            <button onClick={() => setShareCard(null)}
              style={{ background: "rgba(255,255,255,0.95)", border: "none", borderRadius: 12, padding: "14px 20px", color: "#1a1a1a", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: "#fafaf8", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ borderBottom: "1px solid #e8e8e4", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, background: "#fff" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #fb923c, #f472b6)" }} />
        <div style={{ width: 80, height: 20, borderRadius: 6, background: "#f0f0f0" }} />
        <div style={{ marginLeft: "auto", width: 60, height: 32, borderRadius: 8, background: "#f0f0f0" }} />
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ width: 200, height: 32, borderRadius: 8, background: "#f0f0f0", marginBottom: 12 }} />
        <div style={{ width: 300, height: 20, borderRadius: 6, background: "#f0f0f0", marginBottom: 32 }} />
        <div style={{ width: "100%", height: 48, borderRadius: 10, background: "#f0f0f0", marginBottom: 24 }} />
        {[1,2,3].map(i => (
          <div key={i} style={{ background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 12, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 14 }}>
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

  if (page === "landing") return (
    <div style={s.wrap}>
      <SEO />
      <div style={s.header}>
        <Logo onClick={() => {}} />
        <div style={{ marginLeft: "auto" }}>
          <button onClick={signInWithGoogle} style={{ ...s.googleBtn, width: "auto", marginBottom: 0, padding: "8px 14px" }}>
            <GoogleIcon /> Sign in
          </button>
        </div>
      </div>
      <div style={{ background: "linear-gradient(160deg, #fff8fb 0%, #fafaf8 60%)", padding: "60px 20px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#db2777", letterSpacing: 1, marginBottom: 16 }}>FOR READERS WHO FEEL TOO MUCH</div>
          <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1.5, margin: "0 0 16px", color: "#1a1a1a" }}>
            that part when<br />
            <span style={{ background: "linear-gradient(135deg, #fb923c, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              you need to talk about it.
            </span>
          </h1>
          <p style={{ fontSize: 17, color: "#666", lineHeight: 1.7, marginBottom: 32 }}>
            Share what you felt, chapter by chapter.<br />Find readers who felt the exact same thing.
          </p>
          <button onClick={() => setPage("home")} style={{ background: "linear-gradient(135deg, #fb923c, #f472b6)", border: "none", borderRadius: 14, padding: "16px 36px", color: "#fff", fontSize: 17, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(244,114,182,0.35)" }}>
            Find your book →
          </button>
          <div style={{ marginTop: 12, color: "#aaa", fontSize: 13 }}>No account needed to browse</div>
        </div>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: 0.8, textAlign: "center", marginBottom: 24 }}>HOW IT WORKS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { icon: "🔍", title: "Find your book", desc: "Search from millions of books" },
            { icon: "📖", title: "Pick a chapter", desc: "See who else read the same part" },
            { icon: "💬", title: "Share the feeling", desc: "Did others feel it too?" },
          ].map((item, i) => (
            <div key={i} style={{ ...s.card, textAlign: "center", padding: "20px 12px" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{item.title}</div>
              <div style={{ color: "#888", fontSize: 12, lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
      {trending.length > 0 && (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 48px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: 0.8, marginBottom: 16 }}>🔥 TRENDING THIS WEEK</div>
          {trending.slice(0, 3).map(([title, count]) => {
            const info = trendingCovers[title];
            return (
              <div key={title} style={s.bookCard} onClick={() => goBook({ title, author: info?.author || "", cover: info?.cover || null, year: "", olKey: "" })}>
                {info?.cover ? <img src={info.cover} alt="" style={{ width: 40, height: 56, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 40, height: 56, borderRadius: 6, background: "#fce7f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📚</div>}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{title}</div>
                  {info?.author && <div style={s.muted}>{info.author}</div>}
                </div>
                <span style={{ ...s.tag, background: "#fff8f0", color: "#b45309" }}>💬 {count}</span>
              </div>
            );
          })}
          <button onClick={() => setPage("home")} style={{ ...s.btnFull("#fce7f3", "#db2777"), marginTop: 8 }}>See all books →</button>
        </div>
      )}
      <div style={{ background: "linear-gradient(135deg, #fb923c, #f472b6)", padding: "48px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: -0.5 }}>Ready to find your people?</div>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, marginBottom: 24 }}>Join readers sharing their chapter-by-chapter feelings.</div>
          <button onClick={signInWithGoogle} style={{ background: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", color: "#db2777", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <GoogleIcon /> Continue with Google
          </button>
        </div>
      </div>
      <Footer />
      <Analytics />
    </div>
  );

  if (adminPage) {
    if (!isAdmin) { setAdminPage(false); return null; }
    return (
      <div style={s.wrap}>
        <SEO />
        <div style={s.header}>
          <Logo onClick={() => setAdminPage(false)} />
          <span style={{ marginLeft: "auto", ...s.tag }}>Admin</span>
        </div>
        <div style={s.body}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Pending Suggestions</div>
          {pendingSuggestions.length === 0 && <div style={s.muted}>No pending suggestions.</div>}
          {pendingSuggestions.map(sv => (
            <div key={sv.id} style={s.card}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{sv.book} · Chapter {sv.chapter}</div>
              <div style={{ fontSize: 15, marginBottom: 4 }}>"{sv.name}"</div>
              <div style={{ ...s.muted, marginBottom: 12 }}>by @{sv.suggested_by}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={s.btn("#f472b6")} onClick={() => approve(sv)}>✓ Approve</button>
                <button style={s.btn("#fee2e2", "#b91c1c")} onClick={() => reject(sv)}>✕ Reject</button>
              </div>
            </div>
          ))}
        </div>
        <Analytics />
      </div>
    );
  }

  if (page === "notifications") return (
    <div style={s.wrap}>
      <SEO />
      <MainHeader />
      <div style={s.body}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Notifications</div>
          {unreadCount > 0 && <button onClick={markAllRead} style={{ ...s.btn("#fce7f3", "#db2777"), fontSize: 13 }}>Mark all read</button>}
        </div>
        {notifications.length === 0 && <div style={{ ...s.card, textAlign: "center", color: "#aaa", padding: 40 }}>No notifications yet 🌱</div>}
        {notifications.map(n => (
          <div key={n.id} style={{ ...s.card, borderLeft: n.is_read ? "1.5px solid #e8e8e4" : "3px solid #f472b6", background: n.is_read ? "#fff" : "#fff8fb" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18 }}>{n.type === "reply" ? "💬" : "🤍"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: "#333", lineHeight: 1.5 }}>{n.message}</div>
                <div style={{ ...s.muted, marginTop: 4, fontSize: 12 }}>{new Date(n.created_at).toLocaleDateString("en-US")}</div>
              </div>
              {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#db2777", flexShrink: 0, marginTop: 4 }} />}
            </div>
          </div>
        ))}
      </div>
      <Analytics />
    </div>
  );

  if (page === "profile") return (
    <div style={s.wrap}>
      <SEO />
      <MainHeader />
      <div style={s.body}>
        <div style={{ background: "linear-gradient(135deg, #fff8fb, #fafaf8)", borderRadius: 16, padding: 20, marginBottom: 20, border: "1.5px solid #fce7f3" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            {avatar ? <img src={avatar} alt="" style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid #fce7f3" }} />
              : <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #fb923c, #f472b6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#fff" }}>{username[0]?.toUpperCase()}</div>}
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{username}</div>
              <div style={{ ...s.muted, fontSize: 12 }}>Member since {joinDate}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { value: myComments.length, label: "comments" },
              { value: totalLikes, label: "likes received" },
              { value: booksRead.length, label: "books read" },
            ].map((stat, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "12px 8px", textAlign: "center", border: "1px solid #fce7f3" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#db2777" }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>
          {mostActiveBook && (
            <div style={{ marginTop: 12, background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1px solid #fce7f3", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔥</span>
              <div>
                <div style={{ fontSize: 11, color: "#888" }}>Most active in</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{mostActiveBook.book}</div>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f5f5f5", borderRadius: 10, padding: 4 }}>
          {["comments", "reading list"].map(tab => (
            <button key={tab} onClick={() => { setProfileTab(tab); if (tab === "reading list") fetchReadingList(); }}
              style={{ ...s.tab(profileTab === tab), flex: 1 }}>
              {tab === "comments" ? "💬 Comments" : "📚 Reading List"}
            </button>
          ))}
        </div>
        {profileTab === "comments" && <>
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
        </>}
        {profileTab === "reading list" && <>
          {readingList.length === 0 && (
            <div style={{ ...s.card, textAlign: "center", color: "#aaa", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Your reading list is empty</div>
              <div style={{ fontSize: 13 }}>Add books you want to read from any book page</div>
            </div>
          )}
          {readingList.map(item => (
            <div key={item.id} style={s.bookCard} onClick={() => goBook({ title: item.book, author: item.author, cover: item.cover, year: "", olKey: "" })}>
              {item.cover ? <img src={item.cover} alt="" style={{ width: 40, height: 56, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 40, height: 56, borderRadius: 6, background: "#fce7f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📚</div>}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{item.book}</div>
                <div style={s.muted}>{item.author}</div>
              </div>
              <button onClick={e => { e.stopPropagation(); removeFromReadingList(item.id); }} style={{ ...s.iconBtn, color: "#f87171", fontSize: 18 }}>×</button>
            </div>
          ))}
        </>}
      </div>
      <Footer />
      <Analytics />
    </div>
  );

  return (
    <div style={s.wrap}>
      <SEO />
      <ShareCardModal />
      <MainHeader />
      {showPWABanner && (
        <div style={{ background: "linear-gradient(135deg, #fb923c, #f472b6)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>✨</span>
            <div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Add ThatPart to your home screen</div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }}>Safari → Share → Add to Home Screen</div>
            </div>
          </div>
          <button onClick={() => { setShowPWABanner(false); localStorage.setItem("pwa_dismissed", "1"); }}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", fontSize: 13, cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>✕</button>
        </div>
      )}
      <div style={s.body}>
        {page === "home" && <>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6, letterSpacing: -0.5 }}>Find your book</h1>
            <div style={s.muted}>Select a chapter and share what you felt with other readers.</div>
          </div>
          <input style={s.input} placeholder="Search by title or author..." value={search} onChange={e => handleSearch(e.target.value)} />
          <div style={{ marginTop: 12 }}>
            {searching && <div style={{ ...s.muted, padding: "12px 0" }}>Searching...</div>}
            {searchResults.map((b, i) => (
              <div key={i} style={s.bookCard}
                onMouseOver={e => e.currentTarget.style.borderColor = "#f472b6"}
                onMouseOut={e => e.currentTarget.style.borderColor = "#e8e8e4"}
                onClick={() => goBook(b)}>
                {b.cover ? <img src={b.cover} alt="" style={{ width: 40, height: 56, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 40, height: 56, borderRadius: 6, background: "#fce7f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📚</div>}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{b.title}</div>
                  <div style={s.muted}>{b.author}{b.year ? ` · ${b.year}` : ""}</div>
                </div>
              </div>
            ))}
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
                    onMouseOver={e => e.currentTarget.style.borderColor = "#f472b6"}
                    onMouseOut={e => e.currentTarget.style.borderColor = "#e8e8e4"}
                    onClick={() => goBook(b)}>
                    {info?.cover ? <img src={info.cover} alt="" style={{ width: 40, height: 56, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 40, height: 56, borderRadius: 6, background: "#fce7f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📚</div>}
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
            {book?.cover ? <img src={book.cover} alt={`${book.title} cover`} style={{ width: 90, height: 130, borderRadius: 10, objectFit: "cover", flexShrink: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }} />
              : <div style={{ width: 90, height: 130, borderRadius: 10, background: "#fce7f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, flexShrink: 0 }}>📚</div>}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, marginBottom: 6, lineHeight: 1.2 }}>{book?.title}</h1>
              <div style={{ fontSize: 15, color: "#555", marginBottom: 4 }}>{book?.author}</div>
              {book?.year && <div style={s.muted}>{book.year}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {bookTotalComments > 0 && <span style={{ ...s.tag, background: "#fff8f0", color: "#b45309" }}>💬 {bookTotalComments} {bookTotalComments === 1 ? "comment" : "comments"}</span>}
                {topChapters.length > 0 && <span style={s.tag}>Most active: Ch. {topChapters[0][0]}</span>}
              </div>
              {user && (
                <button onClick={() => isInReadingList(book.title) ? null : addToReadingList(book)}
                  style={{ marginTop: 12, background: isInReadingList(book.title) ? "#fce7f3" : "#fff", border: "1.5px solid #fce7f3", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: isInReadingList(book.title) ? "default" : "pointer", color: "#db2777" }}>
                  {isInReadingList(book.title) ? "✓ In reading list" : "+ Add to reading list"}
                </button>
              )}
            </div>
          </div>
          {bookDesc && (
            <div style={{ ...s.card, background: "#fff8fb", borderColor: "#fce7f3", marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#db2777", marginBottom: 8, letterSpacing: 0.5 }}>About this book</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: "#444" }}>
                {bookDesc.length > 280 && !bookDescExpanded ? bookDesc.slice(0, 280) + "..." : bookDesc}
              </div>
              {bookDesc.length > 280 && (
                <button onClick={() => setBookDescExpanded(!bookDescExpanded)} style={{ background: "none", border: "none", color: "#db2777", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 0 0", display: "block" }}>
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
                  <div key={ch} onClick={() => goChapter(+ch)}
                    style={{ background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 10, padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                    onMouseOver={e => e.currentTarget.style.borderColor = "#f472b6"}
                    onMouseOut={e => e.currentTarget.style.borderColor = "#e8e8e4"}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Ch. {ch}</span>
                    <span style={{ ...s.tag, background: "#fff8f0", color: "#b45309" }}>💬 {count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={s.label}>{chaptersLoading ? "Loading chapters..." : `All ${totalChapters} chapters`}</div>
            {!chaptersLoading && user && (
              <button onClick={() => setReportChapterCount(!reportChapterCount)}
                style={{ background: "none", border: "none", color: "#aaa", fontSize: 11, cursor: "pointer", padding: 0 }}>
                Wrong count?
              </button>
            )}
          </div>
          {reportChapterCount && (
            <div style={{ ...s.card, background: "#fff8fb", borderColor: "#fce7f3", marginBottom: 12 }}>
              <div style={{ ...s.muted, marginBottom: 8, fontSize: 13 }}>How many chapters does "{book?.title}" actually have?</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" style={{ ...s.input, flex: 1 }} placeholder="e.g. 32" value={suggestedChapterCount} onChange={e => setSuggestedChapterCount(e.target.value)} />
                <button style={s.btn("#f472b6")} onClick={submitChapterCountSuggestion}>Send</button>
              </div>
            </div>
          )}
          {!chaptersLoading && Array.from({ length: totalChapters }, (_, i) => i + 1).map(ch => (
            <div key={ch}>
              <div style={s.chRow}
                onMouseOver={e => e.currentTarget.style.borderColor = "#f472b6"}
                onMouseOut={e => e.currentTarget.style.borderColor = "#e8e8e4"}
                onClick={() => goChapter(ch)}>
                <span style={{ ...s.tag, minWidth: 28, textAlign: "center", flexShrink: 0 }}>{ch}</span>
                <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{chapterNames[ch] || <span style={{ color: "#bbb" }}>Chapter {ch}</span>}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {chapterCounts[ch] > 0 && <span style={{ ...s.tag, background: "#fff8f0", color: "#b45309" }}>💬 {chapterCounts[ch]}</span>}
                  {user && !chapterNames[ch] && !suggestSent[ch] && (
                    <button onClick={e => { e.stopPropagation(); setSuggestChapter(ch === suggestChapter ? null : ch); }}
                      style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "#888", cursor: "pointer" }}>+ Name</button>
                  )}
                  {suggestSent[ch] && <span style={{ fontSize: 11, color: "#db2777" }}>Sent ✓</span>}
                </div>
              </div>
              {suggestChapter === ch && (
                <div style={{ ...s.card, marginTop: -4, marginBottom: 8 }}>
                  <div style={{ ...s.muted, marginBottom: 8 }}>Suggest a name for Chapter {ch}:</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input style={{ ...s.input, flex: 1 }} placeholder="e.g. The Awakening" value={suggestText} onChange={e => setSuggestText(e.target.value)} />
                    <button style={s.btn("#f472b6")} onClick={() => submitSuggestion(ch)}>Send</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>}

        {page === "comments" && <>
          <button style={s.back} onClick={() => setPage("book")}>← Back</button>
          <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{book?.title}</h1>
              <div style={s.muted}>{chapterNames[chapter] ? `Chapter ${chapter}: ${chapterNames[chapter]}` : `Chapter ${chapter}`}</div>
            </div>
            <button onClick={() => {
              const url = `https://thatpart.app/?book=${encodeURIComponent(book.title)}&chapter=${chapter}`;
              if (navigator.share) {
                navigator.share({ title: `${book.title} — Chapter ${chapter}`, text: `Check out the thoughts on Chapter ${chapter} of "${book.title}" on ThatPart!`, url });
              } else {
                navigator.clipboard.writeText(url);
                alert("Link copied! 🔗");
              }
            }} style={{ background: "#fce7f3", border: "none", borderRadius: 10, padding: "8px 14px", color: "#db2777", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
              Share 🔗
            </button>
          </div>
          <button onClick={() => getAI(false)} disabled={aiLoading} style={s.btnFull("#fff8fb", "#db2777")}>
            {aiLoading ? "✦ Analyzing..." : "✦ What did readers feel in this chapter?"}
          </button>
          {aiText && (
            <div style={{ ...s.card, borderColor: "#fce7f3", background: "#fff8fb", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#db2777", marginBottom: 8, letterSpacing: 0.5 }}>AI Summary</div>
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
              {rateLimitError && (
                <div style={{ background: "#fff8f0", border: "1px solid #fde8cc", borderRadius: 8, padding: "10px 14px", color: "#b45309", fontSize: 13, marginBottom: 10 }}>
                  ⏳ {rateLimitError}
                </div>
              )}
              <button onClick={post} style={s.btnFull("#f472b6")}>Share</button>
              {postSuccess && (
                <div style={{ textAlign: "center", color: "#db2777", fontSize: 14, fontWeight: 600, marginTop: 8 }}>
                  🩷 shared! thank you for being here
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...s.card, borderColor: "#fce7f3", background: "#fff8fb", textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 15, color: "#555", marginBottom: 12 }}>Sign in to share your thoughts</div>
              <button onClick={signInWithGoogle} style={s.googleBtn}><GoogleIcon /> Continue with Google</button>
            </div>
          )}
          <div style={{ ...s.label, marginTop: 24 }}>{loading ? "Loading..." : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}</div>
          {!loading && comments.length === 0 && (
            <div style={{ ...s.card, textAlign: "center", padding: 32, background: "linear-gradient(135deg, #fff8fb, #fafaf8)", borderColor: "#fce7f3" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Be the first to share your thoughts</div>
              <div style={{ ...s.muted, marginBottom: 16, lineHeight: 1.5 }}>Nobody has commented on this chapter yet. {user ? "Start the conversation 🩷" : "Sign in to start the conversation."}</div>
              <button onClick={() => getAI(true)} disabled={aiLoading}
                style={{ background: "rgba(244,114,182,0.1)", border: "1.5px solid #fce7f3", borderRadius: 10, padding: "10px 18px", color: "#db2777", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {aiLoading ? "✦ Thinking..." : "✦ See what readers usually feel here"}
              </button>
            </div>
          )}
          {comments.map(c => (
            <div key={c.id} style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "#db2777" }}>@{c.username}</span>
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
              <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={() => like(c)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 13, padding: 0 }}>🤍 {c.likes} felt the same</button>
                {user && <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 13, padding: 0 }}>💬 Reply</button>}
                {!c.spoiler && <button onClick={() => openShareCard(c)} style={{ background: "none", border: "none", color: "#db2777", cursor: "pointer", fontSize: 13, padding: 0, fontWeight: 600 }}>📤 Share as image</button>}
              </div>
              {(replies[c.id] || []).length > 0 && (
                <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: "2px solid #fce7f3" }}>
                  {(replies[c.id] || []).map(r => (
                    <div key={r.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 12, color: "#db2777" }}>@{r.username}</span>
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
                  <button style={s.btn("#f472b6")} onClick={() => postReply(c.id)}>Send</button>
                </div>
              )}
            </div>
          ))}
        </>}
      </div>
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
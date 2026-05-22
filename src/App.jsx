import { useState } from "react";

const SUPABASE_URL = "https://fycpjuwufasvccezfuis.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y3BqdXd1ZmFzdmNjZXpmdWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzUwNTQsImV4cCI6MjA5NTAxMTA1NH0.-2U8vWzNwtg5xvoAESiii9d2YU6xXrfaIbKvHb0yLKo";

const SB = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  Prefer: "return=representation",
};

export default function App() {
  const [page, setPage] = useState("home");
  const [book, setBook] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapterList, setChapterList] = useState([]);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [username] = useState("okuyucu_" + Math.floor(Math.random() * 9000 + 1000));

  const searchBooks = async (q) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const r = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&lang=eng&limit=30&fields=title,author_name,cover_i,key,edition_count,first_publish_year,language`
      );
      const d = await r.json();
      const seen = new Set();
      const filtered = (d.docs || [])
        .filter(b => {
          const key = b.title?.toLowerCase().trim();
          // Tekrar eden ve İngilizce olmayan kitapları filtrele
          if (!key || seen.has(key)) return false;
          if (!b.language?.includes("eng")) return false;
          if ((b.edition_count || 0) < 2) return false; // Çok az baskısı olanları çıkar
          seen.add(key);
          return true;
        })
        .slice(0, 6);
      setSearchResults(filtered);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const fetchChapters = async (b) => {
    setChaptersLoading(true);
    setChapterList([]);
    try {
      // Kitabın ilk edisyonunu çek
      const r = await fetch(`https://openlibrary.org${b.key}/editions.json?limit=5`);
      const d = await r.json();
      const editions = d.entries || [];
      
      // Her edisyonda table of contents ara
      for (const ed of editions) {
        if (ed.table_of_contents?.length > 0) {
          const chapters = ed.table_of_contents
            .filter(c => c.title && c.title.trim())
            .map((c, i) => ({ number: i + 1, title: c.title.trim() }));
          if (chapters.length > 0) {
            setChapterList(chapters);
            setChaptersLoading(false);
            return;
          }
        }
      }
      // Bulamazsa boş bırak, kullanıcı sayı girsin
      setChapterList([]);
    } catch { setChapterList([]); }
    setChaptersLoading(false);
  };

  const fetchComments = async (b, ch) => {
    setLoading(true);
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/comments?book=eq.${encodeURIComponent(b.title)}&chapter=eq.${ch}&order=created_at.desc`,
        { headers: SB }
      );
      const d = await r.json();
      setComments(Array.isArray(d) ? d : []);
    } catch { setComments([]); }
    setLoading(false);
  };

  const post = async () => {
    if (!text.trim()) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
        method: "POST",
        headers: SB,
        body: JSON.stringify({ book: book.title, chapter, username, text: text.trim(), spoiler, likes: 0 }),
      });
      setText(""); setSpoiler(false);
      fetchComments(book, chapter);
    } catch { alert("Yorum gönderilemedi."); }
  };

  const like = async (c) => {
    await fetch(`${SUPABASE_URL}/rest/v1/comments?id=eq.${c.id}`, {
      method: "PATCH", headers: SB,
      body: JSON.stringify({ likes: c.likes + 1 }),
    });
    fetchComments(book, chapter);
  };

  const getAI = async () => {
    setAiLoading(true); setAiText("");
    const cmts = comments.map(c => c.text).join("\n");
    const chTitle = chapterList.find(c => c.number === chapter)?.title;
    const chLabel = chTitle ? `"${chTitle}" (Bölüm ${chapter})` : `Bölüm ${chapter}`;
    const prompt = cmts
      ? `"${book.title}" kitabının ${chLabel} bölümüne ait yorumlar:\n${cmts}\n\nBu yorumlara göre okuyucular ne hissetti? 2-3 cümleyle özetle. Türkçe.`
      : `"${book.title}" kitabının ${chLabel} bölümü okuyucularda genellikle ne hissi uyandırır? 2-3 cümle, Türkçe.`;
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const d = await r.json();
      setAiText(d.content?.map(i => i.text || "").join("") || "Özet alınamadı.");
    } catch { setAiText("Bağlantı hatası."); }
    setAiLoading(false);
  };

  const goBook = async (b) => {
    setBook(b);
    setPage("chapters");
    fetchChapters(b);
  };

  const goChapter = (ch) => {
    setChapter(ch); setAiText("");
    fetchComments(book, ch);
    setPage("comments");
  };

  const coverUrl = (b) => b.cover_i
    ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`
    : null;

  const s = {
    wrap: { minHeight: "100vh", background: "#fafaf8", color: "#1a1a1a", fontFamily: "'Inter', 'Segoe UI', sans-serif" },
    header: { borderBottom: "1px solid #e8e8e4", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12, background: "#fff", position: "sticky", top: 0, zIndex: 10 },
    logo: { fontSize: 20, fontWeight: 700, color: "#1a1a1a", letterSpacing: -0.5 },
    dot: { width: 8, height: 8, borderRadius: "50%", background: "#4f46e5", display: "inline-block", marginRight: 6 },
    body: { maxWidth: 640, margin: "0 auto", padding: "32px 20px" },
    input: { width: "100%", background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 10, padding: "12px 16px", fontSize: 15, color: "#1a1a1a", outline: "none", boxSizing: "border-box" },
    card: { background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 12, padding: 16, marginBottom: 10 },
    bookCard: { background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 12, padding: 14, marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 },
    btn: (bg, color = "#fff") => ({ width: "100%", background: bg, border: "none", borderRadius: 10, padding: "12px 16px", color, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 8 }),
    back: { background: "none", border: "none", color: "#888", fontSize: 15, cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", gap: 6, padding: 0 },
    tag: { background: "#f0f0ff", color: "#4f46e5", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 },
    muted: { color: "#888", fontSize: 13 },
    label: { fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
    chapterRow: { background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 10, padding: "12px 16px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 },
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        {page !== "home" && (
          <button style={s.back} onClick={() => {
            if (page === "comments") { setPage("chapters"); }
            else { setPage("home"); setBook(null); setSearch(""); setSearchResults([]); setChapterList([]); }
          }}>← Back</button>
        )}
        <span style={s.logo}><span style={s.dot}></span>PageMind</span>
        {page === "comments" && <span style={{ marginLeft: "auto", ...s.tag }}>Chapter {chapter}</span>}
      </div>

      <div style={s.body}>

        {/* HOME */}
        {page === "home" && <>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 6, letterSpacing: -0.5 }}>Find your book</div>
            <div style={s.muted}>Select a chapter and share what you felt with other readers.</div>
          </div>
          <input
            style={s.input}
            placeholder="Search by title or author..."
            value={search}
            onChange={e => searchBooks(e.target.value)}
          />
          <div style={{ marginTop: 12 }}>
            {searching && <div style={{ ...s.muted, padding: "12px 0" }}>Searching...</div>}
            {searchResults.map((b, i) => (
              <div key={i} style={s.bookCard}
                onMouseOver={e => e.currentTarget.style.borderColor = "#4f46e5"}
                onMouseOut={e => e.currentTarget.style.borderColor = "#e8e8e4"}
                onClick={() => goBook(b)}>
                {coverUrl(b)
                  ? <img src={coverUrl(b)} alt="" style={{ width: 40, height: 56, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 40, height: 56, borderRadius: 6, background: "#f0f0ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📚</div>
                }
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{b.title}</div>
                  <div style={s.muted}>{b.author_name?.[0]} {b.first_publish_year ? `· ${b.first_publish_year}` : ""}</div>
                </div>
              </div>
            ))}
            {search.length > 1 && !searching && searchResults.length === 0 && (
              <div style={{ ...s.muted, padding: "12px 0" }}>No results found.</div>
            )}
          </div>
        </>}

        {/* CHAPTERS */}
        {page === "chapters" && <>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 32 }}>
            {coverUrl(book) && <img src={coverUrl(book)} alt="" style={{ width: 64, height: 90, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, marginBottom: 4 }}>{book?.title}</div>
              <div style={s.muted}>{book?.author_name?.[0]} {book?.first_publish_year ? `· ${book.first_publish_year}` : ""}</div>
            </div>
          </div>

          <div style={s.label}>Which chapter did you read?</div>

          {chaptersLoading && <div style={{ ...s.muted, padding: "16px 0" }}>Loading chapters...</div>}

          {!chaptersLoading && chapterList.length > 0 && chapterList.map(ch => (
            <div key={ch.number} style={s.chapterRow}
              onMouseOver={e => e.currentTarget.style.borderColor = "#4f46e5"}
              onMouseOut={e => e.currentTarget.style.borderColor = "#e8e8e4"}
              onClick={() => goChapter(ch.number)}>
              <span style={{ ...s.tag, minWidth: 28, textAlign: "center" }}>{ch.number}</span>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{ch.title}</span>
            </div>
          ))}

          {!chaptersLoading && chapterList.length === 0 && (
            <>
              <div style={{ ...s.muted, marginBottom: 16 }}>Chapter list not available for this book. Select manually:</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                {Array.from({ length: 20 }, (_, i) => i + 1).map(ch => (
                  <div key={ch}
                    style={{ background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 10, padding: "14px 6px", textAlign: "center", cursor: "pointer", fontWeight: 600, fontSize: 15 }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.color = "#4f46e5"; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = "#e8e8e4"; e.currentTarget.style.color = "#1a1a1a"; }}
                    onClick={() => goChapter(ch)}>{ch}</div>
                ))}
              </div>
            </>
          )}
        </>}

        {/* COMMENTS */}
        {page === "comments" && <>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{book?.title}</div>
            <div style={s.muted}>
              {chapterList.find(c => c.number === chapter)?.title
                ? `Chapter ${chapter}: ${chapterList.find(c => c.number === chapter).title}`
                : `Chapter ${chapter}`} · @{username}
            </div>
          </div>

          <button onClick={getAI} disabled={aiLoading} style={s.btn("#f0f0ff", "#4f46e5")}>
            {aiLoading ? "✦ Analyzing..." : "✦ What did readers feel in this chapter?"}
          </button>
          {aiText && (
            <div style={{ ...s.card, borderColor: "#e0e0ff", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>AI Summary</div>
              <div style={{ fontSize: 15, lineHeight: 1.7, color: "#333" }}>{aiText}</div>
            </div>
          )}

          <div style={s.card}>
            <div style={s.label}>What did you feel?</div>
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="Share your thoughts while reading this chapter..."
              style={{ ...s.input, resize: "none", minHeight: 80, marginBottom: 10 }} />
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#888", fontSize: 14, marginBottom: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={spoiler} onChange={e => setSpoiler(e.target.checked)} />
              Contains spoiler
            </label>
            <button onClick={post} style={s.btn("#4f46e5")}>Share</button>
          </div>

          <div style={{ ...s.label, marginTop: 24 }}>{loading ? "Loading..." : `${comments.length} comments`}</div>
          {!loading && comments.length === 0 && (
            <div style={{ ...s.card, textAlign: "center", color: "#aaa", padding: 40 }}>Be the first to share your thoughts 🌱</div>
          )}
          {comments.map(c => (
            <div key={c.id} style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "#4f46e5" }}>@{c.username}</span>
                <span style={s.muted}>{new Date(c.created_at).toLocaleDateString("en-US")}</span>
              </div>
              {c.spoiler && !revealed[c.id]
                ? <div onClick={() => setRevealed(r => ({ ...r, [c.id]: true }))}
                    style={{ background: "#fff8f0", border: "1px solid #fde8cc", borderRadius: 8, padding: "10px 14px", color: "#b45309", fontSize: 14, cursor: "pointer", textAlign: "center" }}>
                    ⚠️ Spoiler — click to reveal
                  </div>
                : <div style={{ fontSize: 15, lineHeight: 1.6, color: "#333" }}>
                    {c.spoiler && <span style={{ background: "#fff8f0", color: "#b45309", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 6 }}>SPOILER</span>}
                    {c.text}
                  </div>
              }
              <button onClick={() => like(c)}
                style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 13, marginTop: 10, padding: 0 }}>
                🤍 {c.likes} felt the same
              </button>
            </div>
          ))}
        </>}

      </div>
    </div>
  );
}

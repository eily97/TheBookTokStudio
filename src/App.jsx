import { useState } from "react";

const SUPABASE_URL = "https://fycpjuwufasvccezfuis.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y3BqdXd1ZmFzdmNjZXpmdWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzUwNTQsImV4cCI6MjA5NTAxMTA1NH0.-2U8vWzNwtg5xvoAESiii9d2YU6xXrfaIbKvHb0yLKo";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "return=representation"
};

const BOOKS = ["Suç ve Ceza", "Küçük Prens", "Dune", "1984", "Simyacı"];

export default function App() {
  const [page, setPage] = useState("home");
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [username] = useState("okuyucu_" + Math.floor(Math.random() * 9000 + 1000));

  const fetchComments = async (b, ch) => {
    setLoading(true);
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/comments?book=eq.${encodeURIComponent(b)}&chapter=eq.${ch}&order=created_at.desc`, { headers });
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
        headers,
        body: JSON.stringify({ book, chapter, username, text: text.trim(), spoiler, likes: 0 })
      });
      setText("");
      setSpoiler(false);
      fetchComments(book, chapter);
    } catch { alert("Yorum gönderilemedi."); }
  };

  const like = async (c) => {
    await fetch(`${SUPABASE_URL}/rest/v1/comments?id=eq.${c.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ likes: c.likes + 1 })
    });
    fetchComments(book, chapter);
  };

  const getAI = async () => {
    setAiLoading(true);
    setAiText("");
    const cmts = comments.map(c => c.text).join("\n");
    const prompt = cmts
      ? `"${book}" kitabının ${chapter}. bölümüne ait yorumlar:\n${cmts}\n\nBu yorumlara göre okuyucular ne hissetti? 2-3 cümleyle özetle. Türkçe.`
      : `"${book}" kitabının ${chapter}. bölümü okuyucularda genellikle ne hissi uyandırır? 2-3 cümle, Türkçe.`;
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      });
      const d = await r.json();
      setAiText(d.content?.map(i => i.text || "").join("") || "Özet alınamadı.");
    } catch { setAiText("Bağlantı hatası."); }
    setAiLoading(false);
  };

  const goChapter = (ch) => {
    setChapter(ch);
    setAiText("");
    fetchComments(book, ch);
    setPage("comments");
  };

  const filtered = search.length > 1 ? BOOKS.filter(b => b.toLowerCase().includes(search.toLowerCase())) : BOOKS;

  const st = {
    app: { minHeight: "100vh", background: "#0f0e17", color: "#e8e6f0", fontFamily: "sans-serif", padding: 20 },
    card: { background: "#1a1927", border: "1px solid #2a2840", borderRadius: 12, padding: "14px 16px", marginBottom: 10 },
    input: { width: "100%", background: "#1a1927", border: "1px solid #2a2840", borderRadius: 12, padding: "12px 16px", color: "#e8e6f0", fontSize: 16, outline: "none", boxSizing: "border-box" },
    btn: (bg) => ({ width: "100%", background: bg, border: "none", borderRadius: 12, padding: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10 }),
    back: { background: "none", border: "none", color: "#7a7890", fontSize: 18, cursor: "pointer", marginBottom: 16 },
    muted: { color: "#7a7890" },
  };

  if (page === "home") return (
    <div style={st.app}>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#7c6af7", marginBottom: 4 }}>📖 PageMind</div>
      <div style={{ color: "#7a7890", marginBottom: 24 }}>Okuduğun bölümü seç, hissini paylaş.</div>
      <input style={{ ...st.input, marginBottom: 12 }} placeholder="Kitap ara..." value={search} onChange={e => setSearch(e.target.value)} />
      {filtered.map(b => (
        <div key={b} onClick={() => { setBook(b); setPage("chapters"); }}
          style={{ ...st.card, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
          <span>📚 {b}</span><span style={st.muted}>→</span>
        </div>
      ))}
      {search.length > 1 && !BOOKS.find(b => b.toLowerCase() === search.toLowerCase()) && (
        <div onClick={() => { setBook(search); setPage("chapters"); }}
          style={{ ...st.card, cursor: "pointer", color: "#7c6af7", fontWeight: 700, border: "1px solid #7c6af7" }}>
          + "{search}" kitabını ekle
        </div>
      )}
    </div>
  );

  if (page === "chapters") return (
    <div style={st.app}>
      <button onClick={() => setPage("home")} style={st.back}>← Geri</button>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{book}</div>
      <div style={{ color: "#7a7890", marginBottom: 20 }}>Hangi bölümü okudun?</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
        {Array.from({ length: 15 }, (_, i) => i + 1).map(ch => (
          <div key={ch} onClick={() => goChapter(ch)}
            style={{ ...st.card, textAlign: "center", cursor: "pointer", padding: "14px 6px", marginBottom: 0 }}>
            <div style={{ fontWeight: 700 }}>{ch}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={st.app}>
      <button onClick={() => setPage("chapters")} style={st.back}>← Geri</button>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{book}</div>
      <div style={{ color: "#7a7890", fontSize: 14, marginBottom: 20 }}>Bölüm {chapter} · @{username}</div>

      <button onClick={getAI} disabled={aiLoading} style={st.btn("#2a1f6e")}>
        {aiLoading ? "🤖 Yükleniyor..." : "🤖 Bu bölümü okuyucular ne hissetti?"}
      </button>
      {aiText && (
        <div style={{ background: "#1a1535", border: "1px solid #7c6af744", borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 15, lineHeight: 1.7, color: "#c8c4e8" }}>
          <div style={{ color: "#7c6af7", fontWeight: 700, fontSize: 12, marginBottom: 6 }}>🤖 AI Özeti</div>
          {aiText}
        </div>
      )}

      <div style={{ ...st.card, marginBottom: 16 }}>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Bu bölümü okurken ne hissettin?"
          style={{ width: "100%", background: "#12111e", border: "1px solid #2a2840", borderRadius: 10, padding: 12, color: "#e8e6f0", fontSize: 15, outline: "none", resize: "none", minHeight: 70, boxSizing: "border-box" }} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#7a7890", fontSize: 14, margin: "10px 0", cursor: "pointer" }}>
          <input type="checkbox" checked={spoiler} onChange={e => setSpoiler(e.target.checked)} /> Spoiler içeriyor
        </label>
        <button onClick={post} style={st.btn("#7c6af7")}>Paylaş</button>
      </div>

      <div style={{ color: "#7a7890", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
        {loading ? "Yükleniyor..." : `${comments.length} yorum`}
      </div>
      {!loading && comments.length === 0 && (
        <div style={{ ...st.card, textAlign: "center", color: "#7a7890", padding: 32 }}>İlk yorumu sen yaz! 🌱</div>
      )}
      {comments.map(c => (
        <div key={c.id} style={st.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#7c6af7", fontWeight: 700, fontSize: 13 }}>@{c.username}</span>
            <span style={{ color: "#7a7890", fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString("tr-TR")}</span>
          </div>
          {c.spoiler && !revealed[c.id]
            ? <div onClick={() => setRevealed(r => ({ ...r, [c.id]: true }))} style={{ background: "#2a2840", borderRadius: 8, padding: "10px 14px", color: "#7a7890", fontSize: 14, cursor: "pointer", textAlign: "center" }}>⚠️ Spoiler — görmek için dokun</div>
            : <div style={{ fontSize: 15, lineHeight: 1.6 }}>{c.spoiler && <span style={{ background: "#e05c7a22", color: "#e05c7a", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 6 }}>SPOILER</span>}{c.text}</div>
          }
          <button onClick={() => like(c)} style={{ background: "none", border: "none", color: "#7a7890", cursor: "pointer", fontSize: 14, marginTop: 10, padding: 0 }}>
            🤍 {c.likes} kişi de hissetti
          </button>
        </div>
      ))}
    </div>
  );
}

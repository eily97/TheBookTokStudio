import { memo, useMemo } from "react";
import { S, shadow } from "../styles";
import { BookCover, Footer, GoogleIcon, Button } from "../components/ui";

export const LandingPage = memo(({ onBrowse, onSignIn, trending, trendingCovers, onSelectBook }) => {
  // Honest, real-data social proof — sum of actual reaction counts behind the
  // currently trending books, not a fabricated user count. Only shown once
  // there's something genuine to point to.
  const totalReactions = useMemo(
    () => trending.reduce((sum, [, count]) => sum + count, 0),
    [trending]
  );

  return (
    <div style={S.wrap}>
      <div style={{ background: "linear-gradient(160deg, #fff8fb 0%, #fafaf8 60%)", padding: "60px 20px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#db2777", letterSpacing: 1, marginBottom: 16 }}>FOR READERS WHO FEEL TOO MUCH</div>
          <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1.5, margin: "0 0 16px", color: "#1a1a1a" }}>
            that part when<br />
            <span style={{ background: "linear-gradient(135deg, #fb923c, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              you need to talk about it.
            </span>
          </h1>
          <p style={{ fontSize: 17, color: "#666", lineHeight: 1.7, marginBottom: 16 }}>
            Share what you felt, chapter by chapter.<br />Find readers who felt the exact same thing.
          </p>
          {totalReactions > 0 && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6, background: "#fff",
              border: "1px solid #fce7f3", borderRadius: 20, padding: "6px 14px",
              fontSize: 13, fontWeight: 600, color: "#db2777", marginBottom: 24, boxShadow: shadow.sm,
            }}>
              💬 {totalReactions}+ reactions shared on trending books this week
            </div>
          )}
          <div>
            <Button onClick={onBrowse} style={{ background: "linear-gradient(135deg, #fb923c, #f472b6)", border: "none", borderRadius: 14, padding: "16px 36px", color: "#fff", fontSize: 17, fontWeight: 700, boxShadow: "0 8px 24px rgba(244,114,182,0.35)" }}>
              Find your book →
            </Button>
          </div>
          <div style={{ marginTop: 12, color: "#aaa", fontSize: 13 }}>No account needed to browse</div>
        </div>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: 0.8, textAlign: "center", marginBottom: 24 }}>HOW IT WORKS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { icon: "🔍", title: "Find your book",    desc: "Search from millions of books" },
            { icon: "📖", title: "Pick a chapter",    desc: "See who else read the same part" },
            { icon: "💬", title: "Share the feeling", desc: "Did others feel it too?" },
          ].map((item, i) => (
            <div key={i} style={{ ...S.card, textAlign: "center", padding: "20px 12px" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{item.title}</div>
              <div style={{ color: "#888", fontSize: 12, lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", color: "#aaa", fontSize: 13, marginTop: 20, lineHeight: 1.6 }}>
          Not another group chat your thoughts get lost in — organized by book, by chapter, spoiler-tagged.
        </div>
      </div>
      {trending.length > 0 && (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 48px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: 0.8, marginBottom: 16 }}>🔥 TRENDING THIS WEEK</div>
          {trending.slice(0, 3).map(([title, count]) => {
            const info = trendingCovers[title];
            const b    = { title, author: info?.author || "", cover: info?.cover || null, year: "" };
            return (
              <div key={title} style={S.bookCard} onClick={() => onSelectBook(b)}>
                <BookCover src={info?.cover} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{title}</div>
                  {info?.author && <div style={S.muted}>{info.author}</div>}
                </div>
                <span style={S.tagWarm}>💬 {count}</span>
              </div>
            );
          })}
          <Button onClick={onBrowse} style={{ ...S.btnOutlinePink, marginTop: 8 }}>See all books →</Button>
        </div>
      )}
      <div style={{ background: "linear-gradient(135deg, #fb923c, #f472b6)", padding: "48px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: -0.5 }}>Ready to find your people?</div>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, marginBottom: 24 }}>Join readers sharing their chapter-by-chapter feelings.</div>
          <Button onClick={onSignIn} style={{ background: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 700, color: "#db2777", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <GoogleIcon /> Continue with Google
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
});

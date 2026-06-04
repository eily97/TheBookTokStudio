import { memo, useState } from "react";
import { S } from "../styles";
import { BookCover, Avatar, SignInButton, Footer, GoogleIcon } from "../components/ui";

export const LandingPage = memo(({ onBrowse, onSignIn, trending, trendingCovers, onSelectBook }) => (
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
        <p style={{ fontSize: 17, color: "#666", lineHeight: 1.7, marginBottom: 32 }}>
          Share what you felt, chapter by chapter.<br />Find readers who felt the exact same thing.
        </p>
        <button onClick={onBrowse} style={{ background: "linear-gradient(135deg, #fb923c, #f472b6)", border: "none", borderRadius: 14, padding: "16px 36px", color: "#fff", fontSize: 17, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(244,114,182,0.35)" }}>
          Find your book →
        </button>
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
        <button onClick={onBrowse} style={{ ...S.btnOutlinePink, marginTop: 8 }}>See all books →</button>
      </div>
    )}
    <div style={{ background: "linear-gradient(135deg, #fb923c, #f472b6)", padding: "48px 20px", textAlign: "center" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: -0.5 }}>Ready to find your people?</div>
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, marginBottom: 24 }}>Join readers sharing their chapter-by-chapter feelings.</div>
        <button onClick={onSignIn} style={{ background: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", color: "#db2777", display: "inline-flex", alignItems: "center", gap: 10 }}>
          <GoogleIcon /> Continue with Google
        </button>
      </div>
    </div>
    <Footer />
  </div>
));

export const NotificationsPage = memo(({ notifications, unreadCount, onMarkAllRead }) => (
  <div style={S.body}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>Notifications</div>
      {unreadCount > 0 && (
        <button onClick={onMarkAllRead} style={{ ...S.btnPink, fontSize: 13 }}>Mark all read</button>
      )}
    </div>
    {notifications.length === 0 && (
      <div style={{ ...S.card, textAlign: "center", color: "#aaa", padding: 40 }}>No notifications yet 🌱</div>
    )}
    {notifications.map((n) => (
      <div key={n.id} style={{ ...S.card, borderLeft: n.is_read ? "1.5px solid #e8e8e4" : "3px solid #f472b6", background: n.is_read ? "#fff" : "#fff8fb" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18 }}>{n.type === "reply" ? "💬" : "🤍"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: "#333", lineHeight: 1.5 }}>{n.message}</div>
            <div style={{ ...S.muted, marginTop: 4, fontSize: 12 }}>{new Date(n.created_at).toLocaleDateString("en-US")}</div>
          </div>
          {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#db2777", flexShrink: 0, marginTop: 4 }} />}
        </div>
      </div>
    ))}
  </div>
));

export const ProfilePage = memo(({
  username, avatar, joinDate,
  myComments, loading, totalLikes, booksRead, mostActiveBook,
  readingList, onDeleteComment, onGoBook, onRemoveFromReadingList, onRefreshReadingList,
}) => {
  const [tab, setTab] = useState("comments");
  return (
    <div style={S.body}>
      <div style={{ background: "linear-gradient(135deg, #fff8fb, #fafaf8)", borderRadius: 16, padding: 20, marginBottom: 20, border: "1.5px solid #fce7f3" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <Avatar src={avatar} name={username} size={64} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{username}</div>
            <div style={{ ...S.muted, fontSize: 12 }}>Member since {joinDate}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            { value: myComments.length, label: "comments" },
            { value: totalLikes,        label: "likes received" },
            { value: booksRead.length,  label: "books read" },
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
              <div style={{ fontSize: 13, fontWeight: 600 }}>{mostActiveBook.book}</div>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f5f5f5", borderRadius: 10, padding: 4 }}>
        {["comments", "reading list"].map((t) => (
          <button key={t} onClick={() => { setTab(t); if (t === "reading list") onRefreshReadingList(); }}
            style={tab === t ? S.tabActive : S.tabInactive}>
            {t === "comments" ? "💬 Comments" : "📚 Reading List"}
          </button>
        ))}
      </div>
      {tab === "comments" && (
        <>
          {loading && <div style={S.muted}>Loading...</div>}
          {!loading && myComments.length === 0 && (
            <div style={{ ...S.card, textAlign: "center", color: "#aaa", padding: 40 }}>You haven't commented yet 🌱</div>
          )}
          {myComments.map((c) => (
            <div key={c.id} style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div><span style={{ fontWeight: 600, fontSize: 14 }}>{c.book}</span><span style={{ ...S.muted, marginLeft: 8 }}>· Chapter {c.chapter}</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={S.muted}>{new Date(c.created_at).toLocaleDateString("en-US")}</span>
                  <button onClick={() => onDeleteComment(c.id)} style={{ ...S.iconBtn, color: "#f87171" }}>🗑</button>
                </div>
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.6, color: "#333" }}>
                {c.spoiler && <span style={{ background: "#fff8f0", color: "#b45309", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 6 }}>SPOILER</span>}
                {c.text}
              </div>
              <div style={{ ...S.muted, marginTop: 8 }}>🤍 {c.likes} felt the same</div>
            </div>
          ))}
        </>
      )}
      {tab === "reading list" && (
        <>
          {readingList.length === 0 && (
            <div style={{ ...S.card, textAlign: "center", color: "#aaa", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Your reading list is empty</div>
              <div style={{ fontSize: 13 }}>Add books you want to read from any book page</div>
            </div>
          )}
          {readingList.map((item) => (
            <div key={item.id} style={S.bookCard}
              onClick={() => onGoBook({ title: item.book, author: item.author, cover: item.cover, year: "", olKey: "" })}>
              <BookCover src={item.cover} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{item.book}</div>
                <div style={S.muted}>{item.author}</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onRemoveFromReadingList(item.id); }}
                style={{ ...S.iconBtn, color: "#f87171", fontSize: 18 }}>×</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
});

export const AdminPage = memo(({ pending, onApprove, onReject }) => (
  <div style={S.body}>
    <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Pending Suggestions</div>
    {pending.length === 0 && <div style={S.muted}>No pending suggestions.</div>}
    {pending.map((sv) => (
      <div key={sv.id} style={S.card}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{sv.book} · Chapter {sv.chapter}</div>
        <div style={{ fontSize: 15, marginBottom: 4 }}>"{sv.name}"</div>
        <div style={{ ...S.muted, marginBottom: 12 }}>by @{sv.suggested_by}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.btnPink} onClick={() => onApprove(sv)}>✓ Approve</button>
          <button style={{ ...S.btnPink, background: "#fee2e2", color: "#b91c1c" }} onClick={() => onReject(sv)}>✕ Reject</button>
        </div>
      </div>
    ))}
  </div>
));
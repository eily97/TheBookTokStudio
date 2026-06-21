import { memo, useState } from "react";
import { S } from "../styles";
import { BookCover, Avatar } from "../components/ui";
import { DeleteAccountModal } from "../components/DeleteAccountModal";

export const ProfilePage = memo(({
  username, avatar, joinDate,
  myComments, loading, totalLikes, booksRead, mostActiveBook,
  readingList, onDeleteComment, onGoBook, onRemoveFromReadingList, onRefreshReadingList,
  onDeleteAccount,
}) => {
  const [tab, setTab] = useState("comments");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

      {onDeleteAccount && (
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid #e8e8e4" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#bbb", letterSpacing: 0.5, marginBottom: 10 }}>DANGER ZONE</div>
          <button onClick={() => setShowDeleteModal(true)} style={{
            background: "none", border: "1px solid #fecaca", borderRadius: 10,
            padding: "10px 16px", color: "#dc2626", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            Delete account
          </button>
        </div>
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          username={username}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={onDeleteAccount}
        />
      )}
    </div>
  );
});

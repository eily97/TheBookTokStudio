import { memo, useState } from "react";
import { S } from "../../styles";

const ReplyItem = memo(({ reply, canDelete, onDelete }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
      <span style={{ fontWeight: 600, fontSize: 12, color: "#db2777" }}>@{reply.username}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ ...S.muted, fontSize: 11 }}>{new Date(reply.created_at).toLocaleDateString("en-US")}</span>
        {canDelete && (
          <button onClick={() => onDelete(reply.id)} style={{ ...S.iconBtn, color: "#f87171", fontSize: 11 }}>🗑</button>
        )}
      </div>
    </div>
    <div style={{ fontSize: 14, color: "#444", lineHeight: 1.5 }}>{reply.text}</div>
  </div>
));

export const CommentCard = memo(({ comment, replies = [], username, onLike, onDelete, onReply, onDeleteReply, onShare }) => {
  const [revealed,  setRevealed]  = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim());
    setReplyText("");
    setReplyOpen(false);
  };

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: "#db2777" }}>@{comment.username}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={S.muted}>{new Date(comment.created_at).toLocaleDateString("en-US")}</span>
          {username && comment.username === username && (
            <button onClick={() => onDelete(comment.id)} style={{ ...S.iconBtn, color: "#f87171" }}>🗑</button>
          )}
        </div>
      </div>

      {comment.spoiler && !revealed ? (
        <div onClick={() => setRevealed(true)}
          style={{ background: "#fff8f0", border: "1px solid #fde8cc", borderRadius: 8, padding: "10px 14px", color: "#b45309", fontSize: 14, cursor: "pointer", textAlign: "center" }}>
          ⚠️ Spoiler — click to reveal
        </div>
      ) : (
        <div style={{ fontSize: 15, lineHeight: 1.6, color: "#333" }}>
          {comment.spoiler && (
            <span style={{ background: "#fff8f0", color: "#b45309", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 6 }}>SPOILER</span>
          )}
          {comment.text}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => onLike(comment)}
          style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 13, padding: 0 }}>
          🤍 {comment.likes > 0 ? `${comment.likes} felt the same` : "felt the same"}
        </button>
        {username && (
          <button onClick={() => setReplyOpen((p) => !p)}
            style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 13, padding: 0 }}>
            💬 Reply
          </button>
        )}
        {!comment.spoiler && (
          <button onClick={() => onShare(comment)}
            style={{ background: "none", border: "none", color: "#db2777", cursor: "pointer", fontSize: 13, padding: 0, fontWeight: 600 }}>
            📤 Share as image
          </button>
        )}
      </div>

      {replies.length > 0 && (
        <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: "2px solid #fce7f3" }}>
          {replies.map((r) => (
            <ReplyItem key={r.id} reply={r}
              canDelete={username && r.username === username}
              onDelete={onDeleteReply} />
          ))}
        </div>
      )}

      {replyOpen && (
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <input style={{ ...S.input, flex: 1, padding: "8px 12px", fontSize: 14 }}
            placeholder="Write a reply..." value={replyText}
            onChange={(e) => setReplyText(e.target.value)} />
          <button style={S.btnPink} onClick={handleReply}>Send</button>
        </div>
      )}
    </div>
  );
});
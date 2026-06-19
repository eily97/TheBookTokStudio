import { memo, useState, useCallback, useEffect } from "react";
import { S } from "../styles";
import { Button } from "../components/ui";
import { CommentCard } from "../components/comments/CommentCard";
import { CommentForm } from "../components/comments/CommentForm";
import { useComments } from "../hooks/useComments";

export const CommentsPage = memo(({ book, chapter, chapterNames, user, username, onBack, onOpenShareCard, onSignIn }) => {
  const {
    comments, replies, loading,
    refresh, addComment, removeComment, likeComment, addReply, removeReply,
  } = useComments({ book, chapter, username });

  const [aiText,    setAiText]    = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => { refresh(); }, [refresh]);

  const chapterName = chapterNames[chapter];

  const getAI = useCallback(async () => {
    setAiLoading(true); setAiText("");
    const cmts   = comments.map((c) => c.text).join("\n");
    const prompt = cmts
      ? `"${book.title}" Chapter ${chapter}${chapterName ? ` "${chapterName}"` : ""} reader comments:\n${cmts}\n\nWhat did readers feel? 2-3 sentences.`
      : `What do readers typically feel about Chapter ${chapter} of "${book.title}" by ${book.author}? Be specific if you can. 2-3 sentences.`;
    try {
      const r = await fetch("/api/claude", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });
      const d = await r.json();
      setAiText(d.content?.map((i) => i.text || "").join("") || "Could not get summary.");
    } catch { setAiText("Connection error."); }
    setAiLoading(false);
  }, [comments, book, chapter, chapterName]);

  const shareChapter = useCallback(() => {
    const url = `https://thatpart.app/?book=${encodeURIComponent(book.title)}&chapter=${chapter}`;
    if (navigator.share) {
      navigator.share({ title: `${book.title} — Chapter ${chapter}`, text: `Check out the thoughts on Chapter ${chapter} of "${book.title}" on ThatPart!`, url });
    } else {
      navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [book, chapter]);

  const handleShare = useCallback((comment) => {
    onOpenShareCard({ text: comment.text, username: comment.username, book: book.title, author: book.author, cover: book.cover, chapter, chapterName });
  }, [book, chapter, chapterName, onOpenShareCard]);

  return (
    <div style={S.body}>
      <button style={S.back} onClick={onBack}>← Back</button>

      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{book.title}</h1>
          <div style={S.muted}>
            {chapterName
              ? `${isNaN(+chapter) ? "" : `Chapter ${chapter}: `}${chapterName}`
              : `Chapter ${chapter}`}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <Button onClick={shareChapter}
            style={{ background: "#fce7f3", border: "none", borderRadius: 10, padding: "8px 14px", color: "#db2777", fontSize: 13, fontWeight: 600 }}>
            Share 🔗
          </Button>
          {linkCopied && <span style={{ fontSize: 11, color: "#db2777", fontWeight: 600 }}>Link copied ✓</span>}
        </div>
      </div>

      {comments.length > 0 && (
        <Button onClick={getAI} disabled={aiLoading} style={S.btnAi}>
          {aiLoading ? "✦ Analyzing..." : "✦ What did readers feel in this chapter?"}
        </Button>
      )}
      {aiText && (
        <div style={{ ...S.card, borderColor: "#fce7f3", background: "#fff8fb", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#db2777", marginBottom: 8, letterSpacing: 0.5 }}>AI Summary</div>
          <div style={{ fontSize: 15, lineHeight: 1.7, color: "#333" }}>{aiText}</div>
        </div>
      )}

      <CommentForm user={user} username={username} onPost={addComment} onSignIn={onSignIn} />

      <div style={{ ...S.label, marginTop: 24 }}>
        {loading ? "Loading..." : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
      </div>

      {!loading && comments.length === 0 && (
        <div style={{ ...S.card, textAlign: "center", padding: 32, background: "linear-gradient(135deg, #fff8fb, #fafaf8)", borderColor: "#fce7f3" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Be the first to share your thoughts</div>
          <div style={{ ...S.muted, marginBottom: 16, lineHeight: 1.5 }}>
            Nobody has commented on this chapter yet.{" "}
            {user ? "Start the conversation 🩷" : "Sign in to start the conversation."}
          </div>
        </div>
      )}

      {comments.map((c) => (
        <CommentCard key={c.id}
          comment={c}
          replies={replies[c.id] || []}
          username={username}
          onLike={likeComment}
          onDelete={removeComment}
          onReply={addReply}
          onDeleteReply={removeReply}
          onShare={handleShare}
        />
      ))}
    </div>
  );
});

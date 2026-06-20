import { memo, useState } from "react";
import { S } from "../../styles";
import { Button, SignInButton, EmailSignIn } from "../ui";
import { containsProfanity, checkRateLimit } from "../../utils";
import { RATE_LIMIT, RATE_WINDOW_MS } from "../../constants";

export const CommentForm = memo(({ user, username, onPost, onSignIn, onSignInEmail }) => {
  const [text,           setText]         = useState("");
  const [spoiler,        setSpoiler]      = useState(false);
  const [postSuccess,    setPostSuccess]  = useState(false);
  const [formError,      setFormError]    = useState(null);
  const [isSubmitting,   setSubmitting]   = useState(false);

  const handlePost = async () => {
    if (!text.trim() || isSubmitting) return;
    setFormError(null);

    if (containsProfanity(text)) {
      setFormError("Your comment contains inappropriate language. Please keep it respectful 🩷");
      return;
    }
    const rl = checkRateLimit(username, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.allowed) {
      setFormError(`You've reached the limit of ${RATE_LIMIT} comments per hour. Try again in ${rl.resetIn} minute${rl.resetIn !== 1 ? "s" : ""}.`);
      return;
    }

    setSubmitting(true);
    try {
      await onPost({ text: text.trim(), spoiler });
      setText(""); setSpoiler(false);
      setPostSuccess(true);
      setTimeout(() => setPostSuccess(false), 3000);
    } catch {
      setFormError("Something went wrong posting your comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return (
    <div style={{ ...S.card, borderColor: "#fce7f3", background: "#fff8fb", textAlign: "center", padding: 24 }}>
      <div style={{ fontSize: 15, color: "#555", marginBottom: 12 }}>Sign in to share your thoughts</div>
      <SignInButton onClick={onSignIn} />
      {onSignInEmail && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <EmailSignIn onSubmit={onSignInEmail} />
        </div>
      )}
    </div>
  );

  return (
    <div style={S.card}>
      <div style={S.label}>What did you feel?</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Share your thoughts while reading this chapter..."
        maxLength={2000}
        style={{ ...S.input, resize: "none", minHeight: 120, marginBottom: 10 }} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#888", fontSize: 14, marginBottom: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} /> Contains spoiler
      </label>
      {formError && (
        <div style={{ background: "#fff8f0", border: "1px solid #fde8cc", borderRadius: 8, padding: "10px 14px", color: "#b45309", fontSize: 13, marginBottom: 10 }}>
          ⏳ {formError}
        </div>
      )}
      <Button onClick={handlePost} disabled={isSubmitting || !text.trim()} style={S.btnPinkFull}>
        {isSubmitting ? "Sharing..." : "Share"}
      </Button>
      {postSuccess && (
        <div style={{ textAlign: "center", color: "#db2777", fontSize: 14, fontWeight: 600, marginTop: 8 }}>
          🩷 shared! thank you for being here
        </div>
      )}
    </div>
  );
});

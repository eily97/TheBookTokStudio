import { memo, useState, useCallback } from "react";
import { S } from "../../styles";
import { Button } from "../ui";
import * as chapApi from "../../api/chapters";

const ChapterRow = memo(({ ch, name, count, user, suggestSent, onGo, onToggleSuggest }) => (
  <div>
    <div style={S.chRow}
      onMouseOver={(e)  => (e.currentTarget.style.borderColor = "#f472b6")}
      onMouseOut={(e)   => (e.currentTarget.style.borderColor = "#e8e8e4")}
      onClick={() => onGo(ch)}>
      <span style={{ ...S.tag, minWidth: 28, textAlign: "center", flexShrink: 0 }}>{ch}</span>
      <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>
        {name || <span style={{ color: "#bbb" }}>{isNaN(+ch) ? ch : `Chapter ${ch}`}</span>}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {count > 0 && <span style={S.tagWarm}>💬 {count}</span>}
        {user && !name && !isNaN(+ch) && !suggestSent && (
          <button onClick={(e) => { e.stopPropagation(); onToggleSuggest(ch); }}
            style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "#888", cursor: "pointer" }}>
            + Name
          </button>
        )}
        {suggestSent && <span style={{ fontSize: 11, color: "#db2777" }}>Sent ✓</span>}
      </div>
    </div>
  </div>
));

const SuggestNameForm = memo(({ chapter, book, username, onSent }) => {
  const [text, setText]             = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  const submit = useCallback(async () => {
    if (!text.trim() || isSubmitting) return;
    setSubmitting(true);
    try {
      await chapApi.postChapterName({ book: book.title, chapter, name: text.trim(), suggested_by: username, status: "pending" });
      try { await chapApi.notifyAdmin({ book: book.title, chapter, name: text.trim(), suggested_by: username }); } catch {}
      onSent(chapter);
    } finally {
      setSubmitting(false);
    }
  }, [text, chapter, book, username, onSent, isSubmitting]);

  return (
    <div style={{ ...S.card, marginTop: -4, marginBottom: 8 }}>
      <div style={{ ...S.muted, marginBottom: 8 }}>Suggest a name for Chapter {chapter}:</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...S.input, flex: 1 }} placeholder="e.g. The Awakening" value={text} onChange={(e) => setText(e.target.value)} />
        <Button style={S.btnPink} disabled={isSubmitting || !text.trim()} onClick={submit}>
          {isSubmitting ? "..." : "Send"}
        </Button>
      </div>
    </div>
  );
});

export const ChapterInput = memo(({ value, onChange, onGo, onQuickStart }) => (
  <div style={{ ...S.card, borderColor: "#fce7f3", background: "#fff8fb", padding: 20 }}>
    <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Which chapter are you on?</div>
    <div style={{ fontSize: 13, color: "#888", marginBottom: 14 }}>Not sure? Just start from the beginning.</div>
    <Button style={{ ...S.btnPinkFull, marginBottom: 12 }} onClick={onQuickStart}>
      Start from Chapter 1 →
    </Button>
    <div style={{ fontSize: 12, color: "#bbb", marginBottom: 8, textAlign: "center" }}>or jump to a specific chapter</div>
    <div style={{ display: "flex", gap: 8 }}>
      <input style={{ ...S.input, flex: 1 }} placeholder="12 or Prologue" value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onGo(); }} />
      <Button style={S.btnPink} onClick={onGo}>Go →</Button>
    </div>
  </div>
));

export const ChapterList = memo(({ totalChapters, chapterNames, chapterCounts, user, book, username, onGoChapter }) => {
  const [suggestOpen, setSuggestOpen] = useState(null);
  const [suggestSent, setSuggestSent] = useState({});

  const toggleSuggest = useCallback((ch) =>
    setSuggestOpen((prev) => (prev === ch ? null : ch)), []);

  const onSent = useCallback((ch) => {
    setSuggestSent((p) => ({ ...p, [ch]: true }));
    setSuggestOpen(null);
  }, []);

  return (
    <>
      {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => (
        <div key={ch}>
          <ChapterRow
            ch={ch}
            name={chapterNames[ch]}
            count={chapterCounts[ch] || 0}
            user={user}
            suggestSent={!!suggestSent[ch]}
            onGo={onGoChapter}
            onToggleSuggest={toggleSuggest}
          />
          {suggestOpen === ch && (
            <SuggestNameForm chapter={ch} book={book} username={username} onSent={onSent} />
          )}
        </div>
      ))}
    </>
  );
});

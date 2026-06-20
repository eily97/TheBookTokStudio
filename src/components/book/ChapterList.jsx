import { memo, useState, useCallback, useMemo } from "react";
import { S, shadow, colors } from "../../styles";
import { Button } from "../ui";
import * as chapApi from "../../api/chapters";

const GROUP_SIZE = 50;
const lastChapterKey = (bookTitle) => `last_chapter:${bookTitle}`;

const ChapterRow = memo(({ ch, name, count, user, suggestSent, onGo, onToggleSuggest }) => (
  <div>
    <div style={S.chRow}
      onMouseOver={(e) => { e.currentTarget.style.borderColor = "#f472b6"; e.currentTarget.style.boxShadow = shadow.md; }}
      onMouseOut={(e)  => { e.currentTarget.style.borderColor = "#e8e8e4"; e.currentTarget.style.boxShadow = shadow.sm; }}
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

const ChapterGroup = memo(({ label, chapters, chapterNames, chapterCounts, user, book, username, onGo, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [suggestOpen, setSuggestOpen] = useState(null);
  const [suggestSent, setSuggestSent] = useState({});

  const toggleSuggest = useCallback((ch) =>
    setSuggestOpen((prev) => (prev === ch ? null : ch)), []);
  const onSent = useCallback((ch) => {
    setSuggestSent((p) => ({ ...p, [ch]: true }));
    setSuggestOpen(null);
  }, []);

  const discussedCount = chapters.filter((ch) => (chapterCounts[ch] || 0) > 0).length;

  return (
    <div style={{ marginBottom: 8 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", background: open ? colors.brandTint : "#fff",
        border: `1px solid ${open ? "#f9c9e3" : colors.border}`, borderRadius: 10,
        padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer", marginBottom: open ? 8 : 0, boxShadow: shadow.sm,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: open ? colors.brandDark : colors.textPrimary }}>{label}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {discussedCount > 0 && <span style={S.tagWarm}>💬 {discussedCount}</span>}
          <span style={{ color: colors.textMuted, fontSize: 14, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>⌄</span>
        </span>
      </button>
      {open && chapters.map((ch) => (
        <div key={ch}>
          <ChapterRow
            ch={ch}
            name={chapterNames[ch]}
            count={chapterCounts[ch] || 0}
            user={user}
            suggestSent={!!suggestSent[ch]}
            onGo={onGo}
            onToggleSuggest={toggleSuggest}
          />
          {suggestOpen === ch && (
            <SuggestNameForm chapter={ch} book={book} username={username} onSent={onSent} />
          )}
        </div>
      ))}
    </div>
  );
});

export const ChapterList = memo(({ totalChapters, chapterNames, chapterCounts, user, book, username, onGoChapter }) => {
  const [suggestOpen, setSuggestOpen] = useState(null);
  const [suggestSent, setSuggestSent] = useState({});

  const lastChapter = useMemo(() => {
    try { return localStorage.getItem(lastChapterKey(book.title)); } catch { return null; }
  }, [book.title]);

  const handleGo = useCallback((ch) => {
    try { localStorage.setItem(lastChapterKey(book.title), String(ch)); } catch {}
    onGoChapter(ch);
  }, [book.title, onGoChapter]);

  const toggleSuggest = useCallback((ch) =>
    setSuggestOpen((prev) => (prev === ch ? null : ch)), []);

  const onSent = useCallback((ch) => {
    setSuggestSent((p) => ({ ...p, [ch]: true }));
    setSuggestOpen(null);
  }, []);

  const allChapters = useMemo(
    () => Array.from({ length: totalChapters }, (_, i) => i + 1),
    [totalChapters]
  );

  // Long-running serials (very common among this app's readers) can have
  // hundreds of chapters — a flat list becomes unwieldy past ~50. Group into
  // collapsible chunks instead of rendering everything at once.
  if (totalChapters > GROUP_SIZE) {
    const groups = [];
    for (let i = 0; i < allChapters.length; i += GROUP_SIZE) {
      groups.push(allChapters.slice(i, i + GROUP_SIZE));
    }
    const lastChapterGroupIdx = lastChapter
      ? groups.findIndex((g) => g.includes(Number(lastChapter)))
      : -1;

    return (
      <>
        {lastChapter && (
          <Button onClick={() => handleGo(Number(lastChapter))}
            style={{ ...S.btnOutlinePink, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            ↻ Continue Chapter {lastChapter}
          </Button>
        )}
        {groups.map((g, i) => (
          <ChapterGroup key={i}
            label={`Chapters ${g[0]}–${g[g.length - 1]}`}
            chapters={g}
            chapterNames={chapterNames}
            chapterCounts={chapterCounts}
            user={user} book={book} username={username}
            onGo={handleGo}
            defaultOpen={i === 0 || i === lastChapterGroupIdx}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {lastChapter && (
        <Button onClick={() => handleGo(Number(lastChapter))}
          style={{ ...S.btnOutlinePink, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          ↻ Continue Chapter {lastChapter}
        </Button>
      )}
      {allChapters.map((ch) => (
        <div key={ch}>
          <ChapterRow
            ch={ch}
            name={chapterNames[ch]}
            count={chapterCounts[ch] || 0}
            user={user}
            suggestSent={!!suggestSent[ch]}
            onGo={handleGo}
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

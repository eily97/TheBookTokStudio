import { memo, useState, useCallback, useEffect } from "react";
import { S } from "../styles";
import { BookCover } from "../components/ui";
import { ChapterList, ChapterInput } from "../components/book/ChapterList";
import { useBook } from "../hooks/useBook";
import * as chapApi from "../api/chapters";

export const BookPage = memo(({ book, user, username, onBack, onSelectChapter }) => {
  const {
    chapterNames, chapterCounts, totalChapters, chaptersLoading,
    bookTotalComments, bookDesc, readingList, topChapters,
    loadBook, loadReadingList, addBook, isInReadingList, addChapterName,
  } = useBook(username);

  const [descExpanded,   setDescExpanded]   = useState(false);
  const [reportCount,    setReportCount]    = useState(false);
  const [suggestedCount, setSuggestedCount] = useState("");
  const [chapterInput,   setChapterInput]   = useState("");

  useEffect(() => {
    loadBook(book);
    if (user) loadReadingList();
  }, [book, user]);

  const inList = isInReadingList(book.title);

  const goChapterFromInput = useCallback(async () => {
    const val = chapterInput.trim();
    if (!val) return;
    const num = parseInt(val);
    if (!isNaN(num) && num > 0) { setChapterInput(""); onSelectChapter(num); return; }
    if (user && !chapterNames[val]) {
      try {
        await chapApi.postChapterName({ book: book.title, chapter: val, name: val, suggested_by: username, status: "approved" });
        addChapterName(val, val);
      } catch {}
    }
    setChapterInput("");
    onSelectChapter(val);
  }, [chapterInput, user, chapterNames, book, username, addChapterName, onSelectChapter]);

  const submitCountSuggestion = useCallback(async () => {
    const num = parseInt(suggestedCount);
    if (!num || num < 1 || num > 200) { alert("Please enter a valid chapter count between 1 and 200."); return; }
    try {
      await chapApi.postChapterCountSuggestion({ book_title: book.title, suggested_count: num, suggested_by: username, status: "pending" });
      setReportCount(false); setSuggestedCount("");
      alert("Thank you! Your correction has been submitted for review.");
    } catch { alert("Could not submit. Please try again."); }
  }, [suggestedCount, book, username]);

  return (
    <div style={S.body}>
      <button style={S.back} onClick={onBack}>← Back</button>

      <div style={{ display: "flex", gap: 20, marginBottom: 28 }}>
        <BookCover src={book.cover} alt={`${book.title} cover`} width={90} height={130}
          style={{ borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, marginBottom: 6, lineHeight: 1.2 }}>{book.title}</h1>
          <div style={{ fontSize: 15, color: "#555", marginBottom: 4 }}>{book.author}</div>
          {book.year && <div style={S.muted}>{book.year}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {bookTotalComments > 0 && (
              <span style={S.tagWarm}>💬 {bookTotalComments} {bookTotalComments === 1 ? "comment" : "comments"}</span>
            )}
            {topChapters.length > 0 && (
              <span style={S.tag}>Most active: Ch. {topChapters[0][0]}</span>
            )}
          </div>
          {user && (
            <button onClick={() => inList ? null : addBook(book)}
              style={{ marginTop: 12, background: inList ? "#fce7f3" : "#fff", border: "1.5px solid #fce7f3", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: inList ? "default" : "pointer", color: "#db2777" }}>
              {inList ? "✓ In reading list" : "+ Add to reading list"}
            </button>
          )}
        </div>
      </div>

      {bookDesc && (
        <div style={{ ...S.card, background: "#fff8fb", borderColor: "#fce7f3", marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#db2777", marginBottom: 8, letterSpacing: 0.5 }}>About this book</div>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: "#444" }}>
            {bookDesc.length > 280 && !descExpanded ? bookDesc.slice(0, 280) + "..." : bookDesc}
          </div>
          {bookDesc.length > 280 && (
            <button onClick={() => setDescExpanded(!descExpanded)}
              style={{ background: "none", border: "none", color: "#db2777", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 0 0", display: "block" }}>
              {descExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {topChapters.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={S.label}>Most discussed chapters</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {topChapters.map(([ch, count]) => (
              <div key={ch}
                onClick={() => onSelectChapter(isNaN(+ch) ? ch : +ch)}
                style={{ background: "#fff", border: "1.5px solid #e8e8e4", borderRadius: 10, padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = "#f472b6")}
                onMouseOut={(e)  => (e.currentTarget.style.borderColor = "#e8e8e4")}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{isNaN(+ch) ? ch : `Ch. ${ch}`}</span>
                <span style={S.tagWarm}>💬 {count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={S.label}>
          {chaptersLoading ? "Loading chapters..." : totalChapters ? `All ${totalChapters} chapters` : "Chapters"}
        </div>
        {!chaptersLoading && totalChapters !== null && user && (
          <button onClick={() => setReportCount(!reportCount)}
            style={{ background: "none", border: "none", color: "#aaa", fontSize: 11, cursor: "pointer", padding: 0 }}>
            Wrong count?
          </button>
        )}
      </div>

      {reportCount && totalChapters !== null && (
        <div style={{ ...S.card, background: "#fff8fb", borderColor: "#fce7f3", marginBottom: 12 }}>
          <div style={{ ...S.muted, marginBottom: 8, fontSize: 13 }}>How many chapters does "{book.title}" actually have?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" style={{ ...S.input, flex: 1 }} placeholder="e.g. 32"
              value={suggestedCount} onChange={(e) => setSuggestedCount(e.target.value)} />
            <button style={S.btnPink} onClick={submitCountSuggestion}>Send</button>
          </div>
        </div>
      )}

      {!chaptersLoading && totalChapters === null && (
        <div style={{ marginBottom: 16 }}>
          {Object.keys(chapterCounts).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={S.label}>Chapters with discussions</div>
              {Object.entries(chapterCounts)
                .sort((a, b) => {
                  const na = Number(a[0]), nb = Number(b[0]);
                  if (!isNaN(na) && !isNaN(nb)) return na - nb;
                  return String(a[0]).localeCompare(String(b[0]));
                })
                .map(([ch, count]) => (
                  <div key={ch} style={S.chRow}
                    onMouseOver={(e) => (e.currentTarget.style.borderColor = "#f472b6")}
                    onMouseOut={(e)  => (e.currentTarget.style.borderColor = "#e8e8e4")}
                    onClick={() => onSelectChapter(isNaN(+ch) ? ch : +ch)}>
                    <span style={{ ...S.tag, minWidth: 28, textAlign: "center", flexShrink: 0 }}>{ch}</span>
                    <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>
                      {chapterNames[ch] || <span style={{ color: "#bbb" }}>{isNaN(+ch) ? ch : `Chapter ${ch}`}</span>}
                    </span>
                    <span style={S.tagWarm}>💬 {count}</span>
                  </div>
                ))}
            </div>
          )}
          <ChapterInput value={chapterInput} onChange={setChapterInput} onGo={goChapterFromInput} />
        </div>
      )}

      {!chaptersLoading && totalChapters !== null && (
        <ChapterList
          totalChapters={totalChapters}
          chapterNames={chapterNames}
          chapterCounts={chapterCounts}
          user={user}
          book={book}
          username={username}
          onGoChapter={onSelectChapter}
        />
      )}
    </div>
  );
});
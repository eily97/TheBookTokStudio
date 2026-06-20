import { memo, useMemo } from "react";
import { S } from "../styles";
import { BookCard } from "../components/book/BookCard";
import { useBookSearch } from "../hooks/useBookSearch";
import { useTrending } from "../hooks/useTrending";

export const HomePage = memo(({ onSelectBook }) => {
  const { query, results, searching, search } = useBookSearch();
  const { trending, trendingCovers }           = useTrending();

  // Build the trending book objects once per data change instead of on every
  // render, so the memoized BookCard children can actually bail out of
  // re-rendering when nothing relevant changed.
  const trendingBooks = useMemo(
    () => trending.map(([title, count]) => {
      const info = trendingCovers[title];
      return {
        count,
        book: { title, author: info?.author || "", cover: info?.cover || null, year: "", olKey: "" },
      };
    }),
    [trending, trendingCovers]
  );

  return (
    <div style={S.body}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6, letterSpacing: -0.5 }}>Find your book</h1>
        <div style={S.muted}>Select a chapter and share what you felt with other readers.</div>
      </div>

      <input style={S.input} placeholder="Search by title or author..."
        value={query} onChange={(e) => search(e.target.value)} />

      <div style={{ marginTop: 12 }}>
        {searching && <div style={{ ...S.muted, padding: "12px 0" }}>Searching...</div>}
        {results.map((b) => (
          <BookCard key={b.olKey || `${b.title}|${b.author}`} book={b} onSelect={onSelectBook} />
        ))}
        {query.length > 1 && !searching && results.length === 0 && (
          <div style={{ ...S.muted, padding: "12px 0" }}>No results found.</div>
        )}
      </div>

      {trendingBooks.length > 0 && query.length < 2 && (
        <div style={{ marginTop: 36 }}>
          <div style={S.label}>🔥 Trending this week</div>
          {trendingBooks.map(({ book, count }) => (
            <BookCard key={book.title} book={book} count={count} onSelect={onSelectBook} />
          ))}
        </div>
      )}
    </div>
  );
});

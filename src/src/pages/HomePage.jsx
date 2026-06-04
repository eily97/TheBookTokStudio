import { memo } from "react";
import { S } from "../styles";
import { BookCard } from "../components/book/BookCard";
import { useBookSearch } from "../hooks/useBookSearch";
import { useTrending } from "../hooks/useTrending";

export const HomePage = memo(({ onSelectBook }) => {
  const { query, results, searching, search } = useBookSearch();
  const { trending, trendingCovers }           = useTrending();

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
        {results.map((b, i) => (
          <BookCard key={i} book={b} onClick={() => onSelectBook(b)} />
        ))}
        {query.length > 1 && !searching && results.length === 0 && (
          <div style={{ ...S.muted, padding: "12px 0" }}>No results found.</div>
        )}
      </div>

      {trending.length > 0 && query.length < 2 && (
        <div style={{ marginTop: 36 }}>
          <div style={S.label}>🔥 Trending this week</div>
          {trending.map(([title, count]) => {
            const info = trendingCovers[title];
            const b    = { title, author: info?.author || "", cover: info?.cover || null, year: "", olKey: "" };
            return <BookCard key={title} book={b} count={count} onClick={() => onSelectBook(b)} />;
          })}
        </div>
      )}
    </div>
  );
});
import { memo } from "react";
import { S, shadow } from "../../styles";
import { BookCover } from "../ui";

export const BookCard = memo(({ book, count, onClick }) => (
  <div style={S.bookCard}
    onMouseOver={(e) => { e.currentTarget.style.borderColor = "#f472b6"; e.currentTarget.style.boxShadow = shadow.md; }}
    onMouseOut={(e)  => { e.currentTarget.style.borderColor = "#e8e8e4"; e.currentTarget.style.boxShadow = shadow.sm; }}
    onClick={onClick}>
    <BookCover src={book.cover} alt={book.title} />
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{book.title}</div>
      {book.author && <div style={S.muted}>{book.author}{book.year ? ` · ${book.year}` : ""}</div>}
    </div>
    {count != null && (
      <span style={S.tagWarm}>💬 {count}</span>
    )}
  </div>
));

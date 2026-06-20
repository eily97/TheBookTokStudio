import { memo, useCallback } from "react";
import { S, shadow } from "../../styles";
import { BookCover } from "../ui";

// Takes a stable `onSelect` and the `book`, then builds the click handler
// internally. Passing an inline `() => onSelectBook(b)` from the parent created
// a brand-new function every render, which silently defeated React.memo here.
export const BookCard = memo(({ book, count, onSelect }) => {
  const handleClick = useCallback(() => onSelect(book), [onSelect, book]);

  return (
    <div style={S.bookCard}
      onMouseOver={(e) => { e.currentTarget.style.borderColor = "#f472b6"; e.currentTarget.style.boxShadow = shadow.md; }}
      onMouseOut={(e)  => { e.currentTarget.style.borderColor = "#e8e8e4"; e.currentTarget.style.boxShadow = shadow.sm; }}
      onClick={handleClick}>
      <BookCover src={book.cover} alt={book.title} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{book.title}</div>
        {book.author && <div style={S.muted}>{book.author}{book.year ? ` · ${book.year}` : ""}</div>}
      </div>
      {count != null && (
        <span style={S.tagWarm}>💬 {count}</span>
      )}
    </div>
  );
});

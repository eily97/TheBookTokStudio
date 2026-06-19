import { memo, useRef, useState, useCallback } from "react";
import html2canvas from "html2canvas";
import { Button } from "../ui";

export const ShareCardModal = memo(({ shareCard, onClose }) => {
  const cardRef               = useRef(null);
  const [isGenerating, setGenerating] = useState(false);
  const [error, setError]     = useState(null);

  const download = useCallback(async () => {
    if (!cardRef.current || isGenerating) return;
    setGenerating(true);
    setError(null);

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null, scale: 2, useCORS: true, allowTaint: true,
      });
      const link    = document.createElement("a");
      link.download = `thatpart-${shareCard.book.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-ch${shareCard.chapter}.png`;
      link.href     = canvas.toDataURL("image/png");
      link.click();
    } catch {
      setError("Could not generate image. Try again!");
    }
    setGenerating(false);
  }, [shareCard, isGenerating]);

  if (!shareCard) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20, overflowY: "auto" }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div ref={cardRef} style={{
          width: 360, height: 640,
          background: "linear-gradient(160deg, #fff8fb 0%, #fce7f3 60%, #fb923c 130%)",
          borderRadius: 24, padding: 28, display: "flex", flexDirection: "column",
          justifyContent: "space-between", fontFamily: "'Inter','Segoe UI',sans-serif",
          color: "#1a1a1a", overflow: "hidden",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #fb923c, #f472b6)" }} />
            <span style={{ fontFamily: "Georgia,serif", fontSize: 17, fontWeight: 700 }}>
              that<span style={{ color: "#db2777" }}>part</span>.
            </span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "20px 0" }}>
            {shareCard.cover && (
              <img src={shareCard.cover} alt="" crossOrigin="anonymous"
                style={{ width: 100, height: 145, borderRadius: 8, objectFit: "cover", marginBottom: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }} />
            )}
            <div style={{ fontSize: 11, fontWeight: 700, color: "#db2777", letterSpacing: 1, marginBottom: 8 }}>
              CHAPTER {shareCard.chapter}{shareCard.chapterName ? ` · ${shareCard.chapterName.toUpperCase()}` : ""}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, letterSpacing: -0.3, lineHeight: 1.2 }}>{shareCard.book}</div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 20 }}>by {shareCard.author}</div>
            <div style={{ fontSize: 16, lineHeight: 1.5, fontStyle: "italic", color: "#1a1a1a", padding: "0 8px", fontWeight: 500 }}>
              "{shareCard.text.length > 180 ? shareCard.text.slice(0, 180) + "..." : shareCard.text}"
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: "#888", fontWeight: 600 }}>— @{shareCard.username}</div>
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#888", letterSpacing: 0.5, fontWeight: 600 }}>
            JOIN THE CONVERSATION · THATPART.APP
          </div>
        </div>
        {error && (
          <div style={{ marginTop: 12, background: "#fff8f0", border: "1px solid #fde8cc", borderRadius: 8, padding: "10px 14px", color: "#b45309", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <Button onClick={download} disabled={isGenerating}
            style={{ flex: 1, background: "linear-gradient(135deg, #fb923c, #f472b6)", border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontSize: 15, fontWeight: 700 }}>
            {isGenerating ? "Generating..." : "Download image 🩷"}
          </Button>
          <Button onClick={onClose}
            style={{ background: "rgba(255,255,255,0.95)", border: "none", borderRadius: 12, padding: "14px 20px", color: "#1a1a1a", fontSize: 15, fontWeight: 600 }}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
});

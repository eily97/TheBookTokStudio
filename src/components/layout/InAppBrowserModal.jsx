import { memo, useState } from "react";
import { isAndroidDevice } from "../../utils";

export const InAppBrowserModal = memo(({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText("https://thatpart.app");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked inside some in-app browsers; fail silently.
    }
  };

  const openInChrome = () => {
    window.location.href =
      "intent://thatpart.app/#Intent;scheme=https;package=com.android.chrome;end";
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: "16px 16px 0 0", padding: "24px 20px",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          maxWidth: 480, width: "100%", boxSizing: "border-box",
          fontFamily: "'Inter','Segoe UI',sans-serif",
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: "#1a1a1a" }}>
          Google sign-in needs a real browser 🩷
        </div>
        <div style={{ fontSize: 14, color: "#555", marginBottom: 18, lineHeight: 1.5 }}>
          You're inside an app's built-in browser (Instagram, TikTok, etc.), and Google
          blocks sign-in there for security reasons. Tap the <strong>•••</strong> or share
          icon at the top of this screen and choose <strong>"Open in Browser"</strong> —
          or copy the link below and paste it into Safari or Chrome.
        </div>

        {isAndroidDevice() && (
          <button
            onClick={openInChrome}
            style={{
              width: "100%", background: "#f472b6", border: "none", borderRadius: 10,
              padding: "12px 16px", color: "#fff", fontSize: 15, fontWeight: 600,
              cursor: "pointer", marginBottom: 8,
            }}
          >
            Open in Chrome
          </button>
        )}

        <button
          onClick={copyLink}
          style={{
            width: "100%", background: "#fce7f3", border: "none", borderRadius: 10,
            padding: "12px 16px", color: "#db2777", fontSize: 15, fontWeight: 600,
            cursor: "pointer", marginBottom: 8,
          }}
        >
          {copied ? "Link copied ✓" : "Copy thatpart.app link"}
        </button>

        <button
          onClick={onClose}
          style={{
            width: "100%", background: "none", border: "none",
            padding: "10px 16px", color: "#888", fontSize: 14, cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
});

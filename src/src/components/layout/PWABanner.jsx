import { memo } from "react";

export const PWABanner = memo(({ onDismiss }) => (
  <div style={{ background: "linear-gradient(135deg, #fb923c, #f472b6)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 22 }}>✨</span>
      <div>
        <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Add ThatPart to your home screen</div>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }}>Safari → Share → Add to Home Screen</div>
      </div>
    </div>
    <button onClick={onDismiss}
      style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", fontSize: 13, cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>
      ✕
    </button>
  </div>
));
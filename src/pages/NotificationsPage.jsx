import { memo } from "react";
import { S } from "../styles";

export const NotificationsPage = memo(({ notifications, unreadCount, onMarkAllRead }) => (
  <div style={S.body}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>Notifications</div>
      {unreadCount > 0 && (
        <button onClick={onMarkAllRead} style={{ ...S.btnPink, fontSize: 13 }}>Mark all read</button>
      )}
    </div>
    {notifications.length === 0 && (
      <div style={{ ...S.card, textAlign: "center", color: "#aaa", padding: 40 }}>No notifications yet 🌱</div>
    )}
    {notifications.map((n) => (
      <div key={n.id} style={{ ...S.card, borderLeft: n.is_read ? "1.5px solid #e8e8e4" : "3px solid #f472b6", background: n.is_read ? "#fff" : "#fff8fb" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18 }}>{n.type === "reply" ? "💬" : "🤍"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: "#333", lineHeight: 1.5 }}>{n.message}</div>
            <div style={{ ...S.muted, marginTop: 4, fontSize: 12 }}>{new Date(n.created_at).toLocaleDateString("en-US")}</div>
          </div>
          {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#db2777", flexShrink: 0, marginTop: 4 }} />}
        </div>
      </div>
    ))}
  </div>
));

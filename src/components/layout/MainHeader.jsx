import { memo } from "react";
import { S } from "../../styles";
import { Logo, Avatar, SignInButton } from "../ui";

export const MainHeader = memo(({
  user, username, avatar, isAdmin,
  unreadCount,
  onLogoClick, onNotificationsClick, onProfileClick, onSignOut, onAdminClick,
}) => (
  <div style={S.header}>
    <Logo onClick={onLogoClick} />
    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
      {user ? (
        <>
          <button onClick={onNotificationsClick}
            style={{ position: "relative", background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: "4px" }}>
            🩷
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: 0, right: 0, background: "#db2777", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                {unreadCount}
              </span>
            )}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={onProfileClick}>
            <Avatar src={avatar} name={username} size={28} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{username}</span>
          </div>
          <button onClick={onSignOut}
            style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", color: "#888" }}>
            Sign out
          </button>
          {isAdmin && (
            <button onClick={onAdminClick}
              style={{ background: "none", border: "none", color: "#ccc", fontSize: 14, cursor: "pointer" }}>
              ⚙
            </button>
          )}
        </>
      ) : (
        <SignInButton onClick={onNotificationsClick} compact />
      )}
    </div>
  </div>
));
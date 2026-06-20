import { memo, useState } from "react";
import { S, shadow, colors } from "../../styles";
import { Logo, Avatar, SignInButton, EmailSignIn } from "../ui";

export const MainHeader = memo(({
  user, username, avatar, isAdmin,
  unreadCount,
  onLogoClick, onNotificationsClick, onProfileClick, onSignOut, onAdminClick, onSignIn, onSignInEmail,
}) => {
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <div style={{ ...S.header, position: "relative" }}>
      <Logo onClick={onLogoClick} />
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {user ? (
          <>
            <button onClick={onNotificationsClick} aria-label="Notifications"
              style={{ position: "relative", background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: "4px" }}>
              🩷
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: 0, right: 0, background: "#db2777", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={onProfileClick} aria-label="Your profile"
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "none", border: "none", padding: 0 }}>
              <Avatar src={avatar} name={username} size={28} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{username}</span>
            </button>
            <button onClick={onSignOut}
              style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", color: "#888" }}>
              Sign out
            </button>
            {isAdmin && (
              <button onClick={onAdminClick} aria-label="Admin panel"
                style={{ background: "none", border: "none", color: "#ccc", fontSize: 14, cursor: "pointer" }}>
                ⚙
              </button>
            )}
          </>
        ) : onSignInEmail ? (
          <div style={{ position: "relative" }}>
            <SignInButton onClick={() => setSignInOpen((v) => !v)} compact />
            {signInOpen && (
              <>
                {/* click-away overlay */}
                <div onClick={() => setSignInOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 19 }} />
                <div style={{
                  position: "absolute", top: "calc(100% + 12px)", right: 0, zIndex: 20,
                  background: "#fff", border: "1px solid #f1f1ee", borderRadius: 16,
                  padding: "20px 18px", width: 280, boxShadow: shadow.lg,
                }}>
                  {/* pointer triangle */}
                  <div style={{
                    position: "absolute", top: -7, right: 22, width: 14, height: 14,
                    background: "#fff", borderLeft: "1px solid #f1f1ee", borderTop: "1px solid #f1f1ee",
                    transform: "rotate(45deg)",
                  }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary, marginBottom: 2, textAlign: "center" }}>
                    Welcome to thatpart 🩷
                  </div>
                  <div style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 16, textAlign: "center" }}>
                    Sign in to share your reactions
                  </div>
                  <SignInButton onClick={() => { setSignInOpen(false); onSignIn(); }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0" }}>
                    <div style={{ flex: 1, height: 1, background: colors.border }} />
                    <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 600 }}>OR</span>
                    <div style={{ flex: 1, height: 1, background: colors.border }} />
                  </div>
                  <EmailSignIn onSubmit={onSignInEmail} alwaysOpen />
                </div>
              </>
            )}
          </div>
        ) : (
          <SignInButton onClick={onSignIn} compact />
        )}
      </div>
    </div>
  );
});

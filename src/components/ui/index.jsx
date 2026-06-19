import { memo, useState } from "react";
import { S } from "../../styles";

// Centralized button so every CTA in the app gets real hover/active/disabled
// feedback for free, instead of every file reinventing (or skipping) it.
export const Button = memo(({ children, style, disabled, onClick, type = "button", ...rest }) => {
  const [hover, setHover]   = useState(false);
  const [active, setActive] = useState(false);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        ...style,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "default" : (style?.cursor || "pointer"),
        transition: "transform 0.12s ease, filter 0.12s ease, opacity 0.12s ease",
        filter: !disabled && hover ? "brightness(1.06)" : "none",
        transform: !disabled && active ? "scale(0.97)" : "scale(1)",
      }}
      {...rest}
    >
      {children}
    </button>
  );
});

export const GoogleIcon = memo(() => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
  </svg>
));

export const Logo = memo(({ onClick }) => (
  <button onClick={onClick} aria-label="thatpart home"
    style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "none", border: "none", padding: 0 }}>
    <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #fb923c, #f472b6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="20" height="20" viewBox="0 0 100 100">
        <rect x="15" y="15" width="70" height="50" rx="4" fill="white" opacity="0.25"/>
        <line x1="50" y1="15" x2="50" y2="65" stroke="white" strokeWidth="2" opacity="0.4"/>
        <rect x="20" y="24" width="24" height="3" rx="1.5" fill="white" opacity="0.6"/>
        <rect x="20" y="31" width="18" height="3" rx="1.5" fill="white" opacity="0.5"/>
        <rect x="20" y="38" width="21" height="3" rx="1.5" fill="white" opacity="0.5"/>
        <rect x="56" y="24" width="24" height="3" rx="1.5" fill="white" opacity="0.6"/>
        <rect x="56" y="31" width="16" height="3" rx="1.5" fill="white" opacity="0.5"/>
        <rect x="56" y="38" width="20" height="3" rx="1.5" fill="white" opacity="0.5"/>
      </svg>
    </div>
    <span style={{ fontFamily: "Georgia,serif", fontSize: 19, fontWeight: 700, letterSpacing: -0.5, color: "#1a1a1a" }}>
      that<span style={{ color: "#f472b6" }}>part</span>.
    </span>
  </button>
));

export const Footer = memo(() => (
  <div style={{ borderTop: "1px solid #e8e8e4", padding: "24px 20px", textAlign: "center", background: "#fff" }}>
    <div style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
      that<span style={{ color: "#f472b6" }}>part</span>.
    </div>
    <div style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>
      by{" "}
      <a href="https://www.tiktok.com/@thebooktokstudio" target="_blank" rel="noreferrer"
        style={{ color: "#db2777", textDecoration: "none", fontWeight: 600 }}>
        TheBookTokStudio
      </a>
    </div>
    <div style={{ color: "#bbb", fontSize: 11 }}>
      <a href="/privacy.html" style={{ color: "#bbb" }}>Privacy</a>
      {" · "}
      <a href="/terms.html" style={{ color: "#bbb" }}>Terms</a>
    </div>
  </div>
));

export const BookCover = memo(({ src, alt = "", width = 40, height = 56, style = {} }) => (
  src
    ? <img src={src} alt={alt} style={{ width, height, borderRadius: 6, objectFit: "cover", flexShrink: 0, ...style }} />
    : <div style={{ width, height, borderRadius: 6, background: "#fce7f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(height * 0.4), flexShrink: 0, ...style }}>📚</div>
));

export const Avatar = memo(({ src, name = "?", size = 28 }) => (
  src
    ? <img src={src} alt="" style={{ width: size, height: size, borderRadius: "50%" }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, #fb923c, #f472b6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5, color: "#fff", fontWeight: 700 }}>
        {name[0]?.toUpperCase()}
      </div>
));

export const SignInButton = memo(({ onClick, compact = false }) => (
  <Button onClick={onClick}
    style={compact
      ? { ...S.googleBtn, width: "auto", marginBottom: 0, padding: "8px 14px" }
      : S.googleBtn}>
    <GoogleIcon /> {compact ? "Sign in" : "Continue with Google"}
  </Button>
));

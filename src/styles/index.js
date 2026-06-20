// Design tokens. Centralizing these means a brand color/shadow/gray change
// happens in one place instead of being hunted down across 15+ component
// files — previously every component re-typed its own hex codes.
export const colors = {
  brand:       "#f472b6",
  brandDark:   "#db2777",
  brandAmber:  "#fb923c",
  brandTint:   "#fce7f3",
  brandTintWarm: "#fff8fb",
  bg:          "#fafaf8",
  surface:     "#fff",
  border:      "#e8e8e4",
  textPrimary:   "#1a1a1a",
  textSecondary: "#555",
  textTertiary:  "#888",
  textMuted:     "#aaa",
  textFaint:     "#bbb",
};

// 3-level elevation scale. Flat 1px borders alone don't separate a card from
// a same-toned background; a soft shadow gives real depth without looking
// heavy.
export const shadow = {
  sm: "0 1px 3px rgba(20,20,20,0.04), 0 1px 2px rgba(20,20,20,0.03)",
  md: "0 4px 12px rgba(20,20,20,0.06), 0 2px 4px rgba(20,20,20,0.04)",
  lg: "0 12px 32px rgba(20,20,20,0.10), 0 4px 8px rgba(20,20,20,0.05)",
};

export const S = {
  wrap: {
    minHeight: "100vh",
    background: colors.bg,
    color: colors.textPrimary,
    fontFamily: "'Inter','Segoe UI',sans-serif",
  },
  header: {
    borderBottom: `1px solid ${colors.border}`,
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: colors.surface,
    position: "sticky",
    top: 0,
    zIndex: 10,
    boxShadow: shadow.sm,
  },
  body:  { maxWidth: 640, margin: "0 auto", padding: "24px 16px" },
  input: {
    width: "100%",
    background: colors.surface,
    border: `1.5px solid ${colors.border}`,
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 16,
    color: colors.textPrimary,
    outline: "none",
    boxSizing: "border-box",
  },
  card: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    boxShadow: shadow.sm,
  },
  bookCard: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 14,
    boxShadow: shadow.sm,
    transition: "box-shadow 0.15s ease, border-color 0.15s ease",
  },
  chRow: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: "12px 16px",
    marginBottom: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: shadow.sm,
    transition: "box-shadow 0.15s ease, border-color 0.15s ease",
  },
  back: {
    background: "none",
    border: "none",
    color: colors.textTertiary,
    fontSize: 15,
    cursor: "pointer",
    marginBottom: 24,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: 0,
  },
  tag:     { background: colors.brandTint, color: colors.brandDark, borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 },
  tagWarm: { background: "#fff8f0", color: "#b45309", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 },
  muted:   { color: colors.textTertiary, fontSize: 13 },
  label:   { fontSize: 12, fontWeight: 700, color: colors.textMuted, letterSpacing: 0.8, marginBottom: 10 },
  iconBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "2px 6px", borderRadius: 6 },
  btnPink: {
    background: colors.brand, border: "none", borderRadius: 10,
    padding: "10px 16px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
    boxShadow: shadow.sm,
  },
  btnPinkFull: {
    width: "100%", background: colors.brand, border: "none", borderRadius: 10,
    padding: "12px 16px", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 8,
    boxShadow: shadow.sm,
  },
  btnOutlinePink: {
    width: "100%", background: colors.brandTint, border: "none", borderRadius: 10,
    padding: "12px 16px", color: colors.brandDark, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 8,
  },
  btnAi: {
    width: "100%", background: colors.brandTintWarm, border: "none", borderRadius: 10,
    padding: "12px 16px", color: colors.brandDark, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 8,
  },
  googleBtn: {
    width: "100%", background: colors.surface, border: `1.5px solid ${colors.border}`, borderRadius: 10,
    padding: "12px 16px", fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 8,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: colors.textPrimary,
    boxShadow: shadow.sm,
  },
  tabActive: {
    background: colors.brandTint, border: "none", borderRadius: 8, padding: "8px 16px",
    fontSize: 14, fontWeight: 700, color: colors.brandDark, cursor: "pointer", flex: 1,
  },
  tabInactive: {
    background: "none", border: "none", borderRadius: 8, padding: "8px 16px",
    fontSize: 14, fontWeight: 500, color: colors.textTertiary, cursor: "pointer", flex: 1,
  },
};

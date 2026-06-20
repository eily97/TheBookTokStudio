import { memo, useState, useEffect, useRef } from "react";
import { Button } from "./ui";
import { checkUsernameAvailable } from "../api/usernames";

export const ChooseUsernameModal = memo(({ defaultValue, onSubmit }) => {
  const [name, setName]         = useState(defaultValue || "");
  const [availability, setAvailability] = useState("idle"); // idle | checking | available | taken
  const [submitError, setSubmitError]   = useState(null);
  const [isSubmitting, setSubmitting]   = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const trimmed = name.trim();
    if (trimmed.length < 2) { setAvailability("idle"); return; }

    setAvailability("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const ok = await checkUsernameAvailable(trimmed);
        setAvailability(ok ? "available" : "taken");
      } catch {
        setAvailability("idle"); // don't block submission on a flaky check
      }
    }, 450);

    return () => clearTimeout(debounceRef.current);
  }, [name]);

  const submit = async () => {
    if (!name.trim() || isSubmitting || availability === "taken") return;
    setSubmitting(true);
    setSubmitError(null);
    const { error } = await onSubmit(name.trim());
    if (error) setSubmitError(error.message || "Could not save your name. Please try again.");
    setSubmitting(false);
  };

  const statusLine = () => {
    if (availability === "checking")  return { text: "Checking...", color: "#aaa" };
    if (availability === "available") return { text: "✓ Available", color: "#16a34a" };
    if (availability === "taken")     return { text: "✕ Already taken — try another", color: "#dc2626" };
    return null;
  };
  const status = statusLine();

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(20,20,20,0.55)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200,
    }}>
      <div style={{
        background: "#fff", borderRadius: "24px 24px 0 0",
        maxWidth: 420, width: "100%", boxSizing: "border-box",
        fontFamily: "'Inter','Segoe UI',sans-serif", overflow: "hidden",
      }}>
        <div style={{
          background: "linear-gradient(135deg, #fb923c, #f472b6)",
          padding: "28px 28px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🩷</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>
            Welcome to thatpart!
          </div>
        </div>

        <div style={{ padding: "24px 28px", paddingBottom: "calc(28px + env(safe-area-inset-bottom))" }}>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 16, textAlign: "center", lineHeight: 1.5 }}>
            What should other readers call you? You can keep this or make it your own.
          </div>

          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="e.g. bookish_yaren"
            maxLength={30}
            style={{
              width: "100%", boxSizing: "border-box", border: "1.5px solid #f3d6e6", borderRadius: 12,
              padding: "14px 16px", fontSize: 16, outline: "none", textAlign: "center",
              fontWeight: 600, color: "#1a1a1a", background: "#fff8fb",
            }}
          />

          <div style={{ height: 20, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 8 }}>
            {status && (
              <span style={{ fontSize: 12, fontWeight: 600, color: status.color }}>{status.text}</span>
            )}
          </div>

          {submitError && (
            <div style={{
              background: "#fff8f0", border: "1px solid #fde8cc", borderRadius: 8,
              padding: "10px 14px", color: "#b45309", fontSize: 13, marginBottom: 12, textAlign: "center",
            }}>
              ⏳ {submitError}
            </div>
          )}

          <Button onClick={submit} disabled={isSubmitting || !name.trim() || availability === "taken"} style={{
            width: "100%", background: "linear-gradient(135deg, #fb923c, #f472b6)", border: "none",
            borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 15, fontWeight: 700,
            marginTop: 4,
          }}>
            {isSubmitting ? "Saving..." : "Continue 🩷"}
          </Button>
        </div>
      </div>
    </div>
  );
});

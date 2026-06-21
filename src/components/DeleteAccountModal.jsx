import { memo, useState } from "react";
import { Button } from "./ui";

export const DeleteAccountModal = memo(({ username, onConfirm, onCancel }) => {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setDeleting]     = useState(false);
  const [error, setError]             = useState(null);

  const canDelete = confirmText.trim() === username;

  const handleConfirm = async () => {
    if (!canDelete || isDeleting) return;
    setDeleting(true);
    setError(null);
    const { error } = await onConfirm();
    if (error) {
      setError(error);
      setDeleting(false);
    }
  };

  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, background: "rgba(20,20,20,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 20, padding: 28, maxWidth: 380, width: "100%",
        boxSizing: "border-box", fontFamily: "'Inter','Segoe UI',sans-serif",
      }}>
        <div style={{ fontSize: 32, marginBottom: 10, textAlign: "center" }}>⚠️</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, textAlign: "center", color: "#1a1a1a" }}>
          Delete your account?
        </div>
        <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 16, textAlign: "center" }}>
          This permanently deletes your sign-in, notifications, and reading list.
          Your past comments will stay visible to other readers, but shown as posted by{" "}
          <strong>"Former member"</strong> instead of your name. <strong>This can't be undone.</strong>
        </div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
          Type <strong>{username}</strong> to confirm:
        </div>
        <input
          autoFocus
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={username}
          style={{
            width: "100%", boxSizing: "border-box", border: "1.5px solid #e8e8e4", borderRadius: 10,
            padding: "10px 14px", fontSize: 15, outline: "none", marginBottom: 14,
          }}
        />
        {error && (
          <div style={{ background: "#fff8f0", border: "1px solid #fde8cc", borderRadius: 8, padding: "10px 14px", color: "#b45309", fontSize: 13, marginBottom: 14 }}>
            ⏳ {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={onCancel} style={{
            flex: 1, background: "#f5f5f5", border: "none", borderRadius: 10,
            padding: "12px 16px", color: "#555", fontSize: 14, fontWeight: 600,
          }}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canDelete || isDeleting} style={{
            flex: 1, background: "#dc2626", border: "none", borderRadius: 10,
            padding: "12px 16px", color: "#fff", fontSize: 14, fontWeight: 700,
          }}>
            {isDeleting ? "Deleting..." : "Delete forever"}
          </Button>
        </div>
      </div>
    </div>
  );
});

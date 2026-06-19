import { memo } from "react";
import { S } from "../styles";

export const AdminPage = memo(({ pending, onApprove, onReject }) => (
  <div style={S.body}>
    <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Pending Suggestions</div>
    {pending.length === 0 && <div style={S.muted}>No pending suggestions.</div>}
    {pending.map((sv) => (
      <div key={sv.id} style={S.card}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{sv.book} · Chapter {sv.chapter}</div>
        <div style={{ fontSize: 15, marginBottom: 4 }}>"{sv.name}"</div>
        <div style={{ ...S.muted, marginBottom: 12 }}>by @{sv.suggested_by}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.btnPink} onClick={() => onApprove(sv)}>✓ Approve</button>
          <button style={{ ...S.btnPink, background: "#fee2e2", color: "#b91c1c" }} onClick={() => onReject(sv)}>✕ Reject</button>
        </div>
      </div>
    ))}
  </div>
));

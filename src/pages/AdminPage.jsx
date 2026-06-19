import { memo, useState } from "react";
import { S } from "../styles";
import { Button } from "../components/ui";

export const AdminPage = memo(({ pending, onApprove, onReject }) => {
  const [busyId, setBusyId] = useState(null);

  const handle = async (action, sv) => {
    if (busyId) return;
    setBusyId(sv.id);
    try { await action(sv); } finally { setBusyId(null); }
  };

  return (
    <div style={S.body}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Pending Suggestions</div>
      {pending.length === 0 && <div style={S.muted}>No pending suggestions.</div>}
      {pending.map((sv) => {
        const isBusy = busyId === sv.id;
        return (
          <div key={sv.id} style={S.card}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{sv.book} · Chapter {sv.chapter}</div>
            <div style={{ fontSize: 15, marginBottom: 4 }}>"{sv.name}"</div>
            <div style={{ ...S.muted, marginBottom: 12 }}>by @{sv.suggested_by}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button style={S.btnPink} disabled={isBusy} onClick={() => handle(onApprove, sv)}>
                {isBusy ? "..." : "✓ Approve"}
              </Button>
              <Button style={{ ...S.btnPink, background: "#fee2e2", color: "#b91c1c" }}
                disabled={isBusy} onClick={() => handle(onReject, sv)}>
                {isBusy ? "..." : "✕ Reject"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export const deleteAccount = async (token) => {
  const r = await fetch("/api/delete-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    return { error: data?.error || "Could not delete your account. Please try again." };
  }
  return { error: null };
};

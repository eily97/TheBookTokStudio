const ALLOWED_ORIGINS = new Set([
  'https://thatpart.app',
  'https://www.thatpart.app',
]);

const MAX_LEN = 300;

// Anyone who sees a chapter-name suggestion arrive in your inbox is reading
// HTML built from user input, so it has to be escaped — otherwise a comment
// like "<a href=evil.com>click</a>" would render as a real clickable link.
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const origin = req.headers.origin || req.headers.referer || '';
  const isAllowedOrigin = [...ALLOWED_ORIGINS].some((o) => origin.startsWith(o));
  if (!isAllowedOrigin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { book, chapter, name, suggested_by } = req.body || {};

  const isValidString = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= MAX_LEN;
  if (!isValidString(book) || !isValidString(name) || !isValidString(suggested_by) ||
      !(Number.isInteger(chapter) || /^\d+$/.test(String(chapter)))) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const safeBook        = escapeHtml(book);
  const safeName         = escapeHtml(name);
  const safeSuggestedBy = escapeHtml(suggested_by);
  const safeChapter     = escapeHtml(String(chapter));

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'thatpart <onboarding@resend.dev>',
        to: 'yarenpekgil97@gmail.com',
        subject: `New chapter name suggestion — ${safeBook}`,
        html: `<p><b>@${safeSuggestedBy}</b> suggested a name for <b>${safeBook} Chapter ${safeChapter}</b>:</p><p style="font-size:18px">"${safeName}"</p><p>Log in to approve or reject: <a href="https://thatpart.app">thatpart.app</a></p>`
      }),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    console.error('notify proxy error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

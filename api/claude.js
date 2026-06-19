const ALLOWED_ORIGINS = new Set([
  'https://thatpart.app',
  'https://www.thatpart.app',
]);

const MAX_MESSAGES = 1;
const MAX_PROMPT_CHARS = 4000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // This endpoint forwards requests to Anthropic using thatpart's own API key.
  // Without these checks, anyone on the internet could call it directly and
  // spend the key's quota on arbitrary requests. The origin check is a
  // best-effort deterrent (a server-side bot can spoof headers), but it
  // blocks casual browser-based abuse and accidental scraping.
  const origin = req.headers.origin || req.headers.referer || '';
  const isAllowedOrigin = [...ALLOWED_ORIGINS].some((o) => origin.startsWith(o));
  if (!isAllowedOrigin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { messages } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const totalChars = messages.reduce(
    (sum, m) => sum + (typeof m?.content === 'string' ? m.content.length : 0),
    0
  );
  if (totalChars === 0 || totalChars > MAX_PROMPT_CHARS) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      // model and max_tokens are fixed server-side — never trust the client for these,
      // since they directly control cost.
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages,
      }),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    console.error('claude proxy error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

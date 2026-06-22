export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const { title, author, cover_url, ol_key, year } = body;
  if (!title) return new Response('Missing title', { status: 400 });

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response('Server config error', { status: 500 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/book_cache`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'resolution=ignore-duplicates',
    },
    body: JSON.stringify({ title, author, cover_url, ol_key, year }),
  });

  if (!res.ok && res.status !== 409) {
    return new Response('DB error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
}

import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = new Set([
  'https://thatpart.app',
  'https://www.thatpart.app',
]);

// service_role bypasses Row Level Security entirely, so this key must never
// reach the browser. It only exists here, in a Vercel serverless function.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAIL = process.env.VITE_ADMIN_EMAIL;

async function requireAdmin(token) {
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  if (data.user.email !== ADMIN_EMAIL) return null;
  return data.user;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const origin = req.headers.origin || req.headers.referer || '';
  const isAllowedOrigin = [...ALLOWED_ORIGINS].some((o) => origin.startsWith(o));
  if (!isAllowedOrigin) return res.status(403).json({ error: 'Forbidden' });

  const { token, action, payload } = req.body || {};

  // This is the actual gate: token must be a real Supabase session for the
  // configured admin email. Without this, anyone could approve/reject/delete
  // chapter name suggestions by calling the table's REST endpoint directly.
  const user = await requireAdmin(token);
  if (!user) return res.status(403).json({ error: 'Admin only' });

  try {
    if (action === 'pending') {
      const { data, error } = await supabaseAdmin
        .from('chapter_names')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (action === 'approve') {
      const { id, book, chapter } = payload || {};
      if (!id || !book || chapter === undefined) {
        return res.status(400).json({ error: 'Invalid request' });
      }
      await supabaseAdmin
        .from('chapter_names')
        .delete()
        .eq('book', book)
        .eq('chapter', chapter)
        .eq('status', 'approved');

      const { error } = await supabaseAdmin
        .from('chapter_names')
        .update({ status: 'approved' })
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'reject') {
      const { id } = payload || {};
      if (!id) return res.status(400).json({ error: 'Invalid request' });
      const { error } = await supabaseAdmin
        .from('chapter_names')
        .update({ status: 'rejected' })
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    console.error('admin-chapters error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

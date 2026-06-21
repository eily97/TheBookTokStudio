import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = new Set([
  'https://thatpart.app',
  'https://www.thatpart.app',
]);

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const origin = req.headers.origin || req.headers.referer || '';
  const isAllowedOrigin = [...ALLOWED_ORIGINS].some((o) => origin.startsWith(o));
  if (!isAllowedOrigin) return res.status(403).json({ error: 'Forbidden' });

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return res.status(403).json({ error: 'Invalid session' });

  const user = userData.user;
  const username = user.user_metadata?.name || user.email?.split('@')[0] || 'reader';

  try {
    await supabaseAdmin.from('comments').update({ username: 'Former member' }).eq('username', username);
    await supabaseAdmin.from('replies').update({ username: 'Former member' }).eq('username', username);

    await supabaseAdmin.from('notifications').delete().eq('username', username);
    await supabaseAdmin.from('reading_list').delete().eq('username', username);
    await supabaseAdmin.from('usernames').delete().eq('user_id', user.id);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('delete-account error:', e);
    return res.status(500).json({ error: 'Something went wrong deleting your account. Please contact support — some of your data may already be removed.' });
  }
}

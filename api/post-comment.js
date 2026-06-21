import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = new Set([
  'https://thatpart.app',
  'https://www.thatpart.app',
]);

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_TEXT_LENGTH = 2000;
const BLOCKED_WORDS = [
  "fuck","shit","bitch","asshole","cunt","damn","bastard","dick","pussy",
  "faggot","nigger","retard","whore","slut","motherfucker","fuckoff",
  "bullshit","sik","orospu","yarrak","amk","amına","piç","gerizekalı",
  "bok","siktir","kahpe","ibne",
];

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const containsProfanity = (text) => {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some((w) => lower.includes(w));
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const origin = req.headers.origin || req.headers.referer || '';
  const isAllowedOrigin = [...ALLOWED_ORIGINS].some((o) => origin.startsWith(o));
  if (!isAllowedOrigin) return res.status(403).json({ error: 'Forbidden' });

  const { token, action, book, chapter, text, spoiler, commentId } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return res.status(403).json({ error: 'Invalid session' });

  const user = userData.user;
  const username = user.user_metadata?.name || user.email?.split('@')[0] || 'reader';

  if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: 'Invalid comment text' });
  }
  if (containsProfanity(text)) {
    return res.status(400).json({ error: 'Your comment contains inappropriate language.' });
  }

  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const [commentCountRes, replyCountRes] = await Promise.all([
    supabaseAdmin.from('comments').select('id', { count: 'exact', head: true })
      .eq('username', username).gte('created_at', since),
    supabaseAdmin.from('replies').select('id', { count: 'exact', head: true })
      .eq('username', username).gte('created_at', since),
  ]);
  const recentCount = (commentCountRes.count || 0) + (replyCountRes.count || 0);
  if (recentCount >= RATE_LIMIT) {
    return res.status(429).json({ error: `You've reached the limit of ${RATE_LIMIT} posts per hour. Please try again later.` });
  }

  try {
    if (action === 'reply') {
      if (!commentId) return res.status(400).json({ error: 'Missing comment id' });
      const { data, error } = await supabaseAdmin
        .from('replies')
        .insert({ comment_id: commentId, username, user_id: user.id, text: text.trim() })
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (action === 'comment') {
      if (!book || chapter === undefined) return res.status(400).json({ error: 'Missing book/chapter' });
      const { data, error } = await supabaseAdmin
        .from('comments')
        .insert({ book, chapter, username, user_id: user.id, text: text.trim(), spoiler: !!spoiler, likes: 0 })
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    console.error('post-comment error:', e);
    return res.status(500).json({ error: 'Could not post. Please try again.' });
  }
}

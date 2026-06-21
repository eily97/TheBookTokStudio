// Vercel Edge Middleware.
//
// thatpart is a client-rendered SPA: the real <title>, description, OG tags,
// and JSON-LD for a specific book/chapter are only added by React after the
// JS bundle runs. Crawlers and link-preview bots that don't execute
// JavaScript (most of them — Twitter/X, Discord, Slack, WhatsApp, and
// Google's *first* crawl pass) only ever see the generic homepage meta tags,
// no matter which book/chapter URL was requested. That breaks both SEO
// indexing of individual chapters and social share previews.
//
// This middleware runs at Vercel's edge, before the static file is served.
// For requests that look like a bot AND target a specific book/chapter, it
// fetches the real book data from Supabase and rewrites just the <head>
// meta tags in the static HTML shell before returning it. Real browsers
// (and bots that DO run JS) are untouched — they get the normal SPA, which
// then takes over and renders as usual.

export const config = {
  matcher: '/',
};

const BOT_PATTERN =
  /bot|crawl|spider|facebookexternalhit|twitterbot|slackbot|discordbot|whatsapp|telegrambot|linkedinbot|pinterest|embedly|quora|outbrain|vkshare|w3c_validator/i;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

async function getBookMeta(book) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/book_metadata?book_title=eq.${encodeURIComponent(book)}&select=description,chapter_count`,
      { headers }
    );
    const rows = await r.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch {
    return null;
  }
}

async function getChapterName(book, chapter) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/chapter_names?book=eq.${encodeURIComponent(book)}&chapter=eq.${encodeURIComponent(chapter)}&status=eq.approved&select=name&limit=1`,
      { headers }
    );
    const rows = await r.json();
    return Array.isArray(rows) && rows[0]?.name ? rows[0].name : null;
  } catch {
    return null;
  }
}

export default async function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  const book = url.searchParams.get('book');

  if (!book || !BOT_PATTERN.test(userAgent)) {
    return; // not a bot, or not a book deep link — serve the normal SPA untouched
  }

  const chapter = url.searchParams.get('chapter');

  const [bookMeta, chapterName] = await Promise.all([
    getBookMeta(book),
    chapter ? getChapterName(book, chapter) : Promise.resolve(null),
  ]);

  let rawTitle;
  let rawDescription;

  if (chapter) {
    rawTitle = `${book} Chapter ${chapter}${chapterName ? `: ${chapterName}` : ''} — Reader Discussion | thatpart`;
    rawDescription = `What did readers feel in Chapter ${chapter} of "${book}"? Read spoiler-free reactions and share your own thoughts.`;
  } else {
    rawTitle = `${book} — Chapter by Chapter Discussions | thatpart`;
    rawDescription = bookMeta?.description
      ? bookMeta.description.slice(0, 200)
      : `Discuss "${book}" chapter by chapter. Spoiler-free reader reactions for every chapter.`;
  }

  const title = escapeHtml(rawTitle);
  const description = escapeHtml(rawDescription);

  const canonical = chapter
    ? `https://thatpart.app/?book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(chapter)}`
    : `https://thatpart.app/?book=${encodeURIComponent(book)}`;

  const htmlRes = await fetch(new URL('/index.html', request.url));
  let html = await htmlRes.text();

  html = html
    .replace(/<title>.*?<\/title>/s, `<title>${title}</title>`)
    .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${description}" />`)
    .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${description}" />`)
    .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${description}" />`)
    .replace('</head>', `<link rel="canonical" href="${canonical}" /></head>`);

  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

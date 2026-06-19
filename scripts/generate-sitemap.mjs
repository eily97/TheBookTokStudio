// Runs before `vite build` (see package.json). Pulls the books and
// book+chapter combinations that actually have discussion on them and writes
// a real sitemap — the static version only ever listed the homepage, so
// search engines had no way to discover individual book/chapter pages.
import { writeFileSync } from "fs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const escapeXml = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  }[c]));

async function main() {
  const urls = [
    { loc: "https://thatpart.app/", priority: "1.0", changefreq: "daily" },
  ];

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("Sitemap: missing Supabase env vars, writing homepage-only sitemap.");
  } else {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/comments?select=book,chapter&order=created_at.desc&limit=2000`,
        { headers: HEADERS }
      );
      const rows = await res.json();

      const bookSet = new Set();
      const pairSet = new Set();
      if (Array.isArray(rows)) {
        for (const r of rows) {
          if (!r.book) continue;
          bookSet.add(r.book);
          if (r.chapter !== null && r.chapter !== undefined) {
            pairSet.add(`${r.book}\u0000${r.chapter}`);
          }
        }
      }

      for (const book of bookSet) {
        urls.push({
          loc: `https://thatpart.app/?book=${encodeURIComponent(book)}`,
          priority: "0.7", changefreq: "weekly",
        });
      }
      for (const pair of pairSet) {
        const [book, chapter] = pair.split("\u0000");
        urls.push({
          loc: `https://thatpart.app/?book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(chapter)}`,
          priority: "0.6", changefreq: "weekly",
        });
      }
    } catch (e) {
      console.warn("Sitemap: could not fetch book data, writing homepage-only sitemap.", e.message);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;

  writeFileSync("public/sitemap.xml", xml);
  console.log(`Sitemap: wrote ${urls.length} URLs.`);
}

main();

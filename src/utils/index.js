import { STOP_WORDS, BLOCKED_WORDS } from "../constants";

export const hasNonLatin = (str) =>
  /[^\u0000-\u024F\u1E00-\u1EFF]/.test(str);

export const normalizeTitle = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\d+/g, "")
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .join(" ")
    .trim();

export const titlesAreSimilar = (a, b) => {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return true;
  if (na.startsWith(nb) || nb.startsWith(na)) return true;
  const wordsA = na.split(" ").filter(Boolean);
  const wordsB = nb.split(" ").filter(Boolean);
  const [shorter, longer] =
    wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];
  if (shorter.length === 0) return false;
  const longerSet = new Set(longer);
  const matchCount = shorter.filter((w) => longerSet.has(w)).length;
  return matchCount / shorter.length >= 0.8;
};

export const containsProfanity = (text) => {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some((w) => lower.includes(w));
};

export const checkRateLimit = (username, limit, windowMs) => {
  const key = `rl_${username}`;
  const now = Date.now();
  let timestamps = [];
  try {
    const raw = localStorage.getItem(key);
    timestamps = raw ? JSON.parse(raw) : [];
  } catch {
    timestamps = [];
  }
  timestamps = timestamps.filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    const resetIn = Math.ceil((timestamps[0] + windowMs - now) / 60_000);
    return { allowed: false, resetIn };
  }
  timestamps.push(now);
  try { localStorage.setItem(key, JSON.stringify(timestamps)); } catch {}
  return { allowed: true };
};

export const buildSEO = ({ page, book, chapter, chapterNames, username }) => {
  if (page === "comments" && book && chapter) {
    const chName = chapterNames[chapter];
    return {
      title: `${book.title} Chapter ${chapter}${chName ? `: ${chName}` : ""} — Reader Discussion | thatpart`,
      desc:  `What did readers feel in Chapter ${chapter} of "${book.title}" by ${book.author}? Read spoiler-free reactions and share your own thoughts.`,
    };
  }
  if (page === "book" && book) return {
    title: `${book.title} by ${book.author} — Chapter by Chapter Discussions | thatpart`,
    desc:  `Discuss "${book.title}" chapter by chapter. Spoiler-free reader reactions, feelings, and discussions for every chapter.`,
  };
  if (page === "home") return {
    title: "Find your book — thatpart",
    desc:  "Search millions of books and share what you felt, chapter by chapter. Spoiler-free reader community.",
  };
  if (page === "profile")      return { title: `${username} — thatpart`,     desc: "Reader profile on thatpart." };
  if (page === "notifications") return { title: "Notifications — thatpart",  desc: "Your notifications on thatpart." };
  return {
    title: "thatpart — Share what you felt, chapter by chapter",
    desc:  "A free community for readers who feel too much. Share spoiler-free reactions chapter by chapter.",
  };
};

export const buildCanonical = ({ page, book, chapter }) => {
  if (page === "comments" && book && chapter)
    return `https://thatpart.app/?book=${encodeURIComponent(book.title)}&chapter=${chapter}`;
  if (page === "book" && book)
    return `https://thatpart.app/?book=${encodeURIComponent(book.title)}`;
  return "https://thatpart.app/";
};
export const buildStructuredData = ({ page, book, chapter, commentCount }) => {
  if (page === "book" && book) {
    return {
      "@context": "https://schema.org",
      "@type": "Book",
      name: book.title,
      author: book.author ? { "@type": "Person", name: book.author } : undefined,
      image: book.cover || undefined,
      url: `https://thatpart.app/?book=${encodeURIComponent(book.title)}`,
    };
  }
  if (page === "comments" && book && chapter) {
    return {
      "@context": "https://schema.org",
      "@type": "DiscussionForumPosting",
      headline: `${book.title} — Chapter ${chapter} reader reactions`,
      about: { "@type": "Book", name: book.title, author: book.author ? { "@type": "Person", name: book.author } : undefined },
      url: `https://thatpart.app/?book=${encodeURIComponent(book.title)}&chapter=${chapter}`,
      commentCount: commentCount ?? undefined,
    };
  }
  return null;
};
export const isInAppBrowser = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera || "";
  return /Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|BytedanceWebview|Snapchat|Pinterest/i.test(ua);
};

export const isAndroidDevice = () => /Android/i.test(navigator.userAgent || "");
export const shouldShowPWABanner = () => {
  const isStandalone =
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  const dismissed = localStorage.getItem("pwa_dismissed");
  const isMobile  = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return isMobile && !isStandalone && !dismissed;
};

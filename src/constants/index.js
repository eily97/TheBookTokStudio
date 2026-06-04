export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
export const ADMIN_EMAIL  = import.meta.env.VITE_ADMIN_EMAIL;

export const RATE_LIMIT     = 20;
export const RATE_WINDOW_MS = 60 * 60 * 1000;

export const SB_HEADERS = {
  "Content-Type": "application/json",
  apikey:         SUPABASE_KEY,
  Authorization:  `Bearer ${SUPABASE_KEY}`,
  Prefer:         "return=representation",
};

export const BLOCKED_WORDS = [
  "fuck","shit","bitch","asshole","cunt","damn","bastard","dick","pussy",
  "faggot","nigger","retard","whore","slut","motherfucker","fuckoff",
  "bullshit","sik","orospu","yarrak","amk","amına","piç","gerizekalı",
  "bok","siktir","kahpe","ibne",
];

export const STOP_WORDS = new Set([
  "the","a","an","special","edition","book","duet","series","novel",
  "part","volume","vol","deluxe","collector","complete","omnibus","illustrated",
]);
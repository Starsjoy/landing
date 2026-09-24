// Bot toifalari:
//  ai_user   — odam AI'dan so'raganda AI sahifani o'sha zahoti o'qiydi (eng qimmatli signal)
//  ai_search — AI qidiruv tizimi indeksi (ChatGPT/Claude/Perplexity search)
//  ai_train  — AI model o'qitish uchun sahifa yig'uvchi crawler
export type BotCategory = 'ai_user' | 'ai_search' | 'ai_train' | 'search' | 'social' | 'seo' | 'tool' | 'other';

// Tartib muhim — birinchi mos kelgani olinadi. Patternlar faqat oddiy matn va `|`
// dan iborat, chunki ular Postgres `~*` regex'ida ham ishlatiladi (getAiStats).
export const BOT_PATTERNS: { name: string; pattern: RegExp; category: BotCategory }[] = [
  // AI — foydalanuvchi so'rovi (User-Agent'da "bot" so'zi bo'lmasligi mumkin, shuning uchun yuqorida)
  { name: 'ChatGPT-User', pattern: /ChatGPT-User/i, category: 'ai_user' },
  { name: 'Perplexity-User', pattern: /Perplexity-User/i, category: 'ai_user' },
  { name: 'Claude-User', pattern: /Claude-User/i, category: 'ai_user' },
  { name: 'MistralAI-User', pattern: /MistralAI-User/i, category: 'ai_user' },
  { name: 'Meta-ExternalFetcher', pattern: /Meta-ExternalFetcher/i, category: 'ai_user' },
  { name: 'DuckAssistBot', pattern: /DuckAssistBot/i, category: 'ai_user' },

  // AI — qidiruv indeksi
  { name: 'OAI-SearchBot', pattern: /OAI-SearchBot/i, category: 'ai_search' },
  { name: 'Claude-SearchBot', pattern: /Claude-SearchBot/i, category: 'ai_search' },
  { name: 'PerplexityBot', pattern: /PerplexityBot|perplexity/i, category: 'ai_search' },
  { name: 'YouBot', pattern: /YouBot/i, category: 'ai_search' },

  // AI — o'qitish
  { name: 'GPTBot', pattern: /GPTBot/i, category: 'ai_train' },
  { name: 'ClaudeBot', pattern: /ClaudeBot|anthropic-ai/i, category: 'ai_train' },
  { name: 'CohereBot', pattern: /Cohere-ai|cohere/i, category: 'ai_train' },
  { name: 'Meta AI', pattern: /Meta-ExternalAgent/i, category: 'ai_train' },
  { name: 'AI2Bot', pattern: /AI2Bot/i, category: 'ai_train' },
  { name: 'Amazonbot', pattern: /Amazonbot/i, category: 'ai_train' },
  { name: 'Bytespider', pattern: /Bytespider/i, category: 'ai_train' },
  { name: 'CCBot', pattern: /CCBot/i, category: 'ai_train' },
  { name: 'Diffbot', pattern: /Diffbot/i, category: 'ai_train' },
  { name: 'Omgili', pattern: /omgili/i, category: 'ai_train' },
  { name: 'Timpibot', pattern: /Timpibot/i, category: 'ai_train' },
  { name: 'ImagesiftBot', pattern: /ImagesiftBot/i, category: 'ai_train' },
  { name: 'Kangaroo Bot', pattern: /Kangaroo Bot/i, category: 'ai_train' },

  // Search engine bots
  { name: 'Googlebot', pattern: /Googlebot/i, category: 'search' },
  // GoogleOther — Google'ning umumiy crawler'i (Gemini emas; Gemini oddiy Googlebot'dan foydalanadi)
  { name: 'GoogleOther', pattern: /Google-CloudVertexBot|GoogleOther/i, category: 'search' },
  { name: 'Bingbot', pattern: /bingbot/i, category: 'search' },
  { name: 'YandexBot', pattern: /YandexBot/i, category: 'search' },
  { name: 'Baiduspider', pattern: /Baiduspider/i, category: 'search' },
  { name: 'Applebot', pattern: /Applebot/i, category: 'search' },
  { name: 'BraveSearch', pattern: /BraveSearch/i, category: 'search' },
  { name: 'PetalBot', pattern: /PetalBot/i, category: 'search' },

  // Social media
  { name: 'FacebookBot', pattern: /facebookexternalhit|Facebot/i, category: 'social' },
  { name: 'Twitterbot', pattern: /Twitterbot/i, category: 'social' },

  // SEO bots
  { name: 'SemrushBot', pattern: /SemrushBot/i, category: 'seo' },
  { name: 'AhrefsBot', pattern: /AhrefsBot/i, category: 'seo' },
  { name: 'DotBot', pattern: /DotBot/i, category: 'seo' },
  { name: 'MJ12bot', pattern: /MJ12bot/i, category: 'seo' },
  { name: 'DataForSeoBot', pattern: /DataForSeoBot/i, category: 'seo' },

  // Tools
  { name: 'Lighthouse', pattern: /Lighthouse|PageSpeed/i, category: 'tool' },
];

export const AI_BOT_PATTERNS = BOT_PATTERNS.filter(b => b.category.startsWith('ai_'));

export function botCategory(name: string): BotCategory {
  return BOT_PATTERNS.find(b => b.name === name)?.category || 'other';
}

// Odam AI javobidagi havolani bosib kirganini aniqlash — referrer host'i yoki utm_source bo'yicha.
// ChatGPT havolalarga ?utm_source=chatgpt.com qo'shadi; mobil ilovadan referrer
// "android-app://com.openai.chatgpt" bo'lib keladi.
export const AI_REFERRERS: { name: string; pattern: RegExp }[] = [
  { name: 'ChatGPT', pattern: /chatgpt|openai/i },
  { name: 'Perplexity', pattern: /perplexity/i },
  { name: 'Gemini', pattern: /gemini|bard\.google/i },
  { name: 'Claude', pattern: /claude|anthropic/i },
  { name: 'Copilot', pattern: /copilot/i },
  { name: 'DeepSeek', pattern: /deepseek/i },
  { name: 'Grok', pattern: /grok/i },
  { name: 'Meta AI', pattern: /meta\.ai/i },
  { name: 'Mistral', pattern: /mistral/i },
  { name: 'You.com', pattern: /^you\.com$|\.you\.com$|^you$/i },
  { name: 'Poe', pattern: /poe\.com/i },
  { name: 'Qwen', pattern: /qwen|tongyi/i },
  { name: 'Kimi', pattern: /kimi\.|moonshot/i },
];

function refHost(ref: string): string {
  if (!ref) return '';
  try { return new URL(ref).hostname.toLowerCase(); } catch { return ''; }
}

/** AI manbasi nomi (ChatGPT, Perplexity...) yoki '' — faqat host va utm_source tekshiriladi. */
export function detectAiReferrer(referrer: string, utmSource: string): string {
  const host = refHost(referrer);
  const utm = (utmSource || '').trim().toLowerCase();
  for (const r of AI_REFERRERS) {
    if ((host && r.pattern.test(host)) || (utm && r.pattern.test(utm))) return r.name;
  }
  return '';
}

// Ignore — bazaga yozilmaydi
const IGNORE_PATTERNS = [
  /vercel-screenshot|vercel-og/i,
  /HeadlessChrome(?!.*bot)/i,
];

export function detectBot(ua: string): { isBot: boolean; isIgnored: boolean; botName: string } {
  if (!ua) return { isBot: false, isIgnored: false, botName: '' };

  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(ua)) return { isBot: true, isIgnored: true, botName: '' };
  }

  for (const bot of BOT_PATTERNS) {
    if (bot.pattern.test(ua)) return { isBot: true, isIgnored: false, botName: bot.name };
  }

  if (/bot|crawl|spider|scrape|fetch|http|curl|wget/i.test(ua)) {
    return { isBot: true, isIgnored: false, botName: 'Boshqa bot' };
  }

  return { isBot: false, isIgnored: false, botName: '' };
}

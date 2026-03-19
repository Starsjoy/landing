// AI botlar — faqat shularni track qilamiz
export const AI_BOT_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'GPTBot', pattern: /GPTBot/i },
  { name: 'ChatGPT-User', pattern: /ChatGPT-User/i },
  { name: 'ClaudeBot', pattern: /ClaudeBot|anthropic-ai/i },
  { name: 'PerplexityBot', pattern: /PerplexityBot|Perplexity-User|perplexity/i },
  { name: 'CohereBot', pattern: /Cohere-ai|cohere/i },
  { name: 'Meta AI', pattern: /Meta-ExternalAgent|meta-externalagent/i },
  { name: 'BraveSearch', pattern: /BraveSearch/i },
  { name: 'YouBot', pattern: /YouBot/i },
  { name: 'AI2Bot', pattern: /AI2Bot|Ai2Bot/i },
  { name: 'Amazonbot', pattern: /Amazonbot/i },
  { name: 'Google-Extended', pattern: /Google-Extended/i },
  { name: 'Google Gemini', pattern: /Google-CloudVertexBot|GoogleOther/i },
  { name: 'Bytespider', pattern: /Bytespider/i },
  { name: 'PetalBot', pattern: /PetalBot/i },
  { name: 'CCBot', pattern: /CCBot/i },
  { name: 'Diffbot', pattern: /Diffbot/i },
  { name: 'Omgili', pattern: /omgili/i },
  { name: 'Timpibot', pattern: /Timpibot/i },
  { name: 'ImagesiftBot', pattern: /ImagesiftBot/i },
  { name: 'Kangaroo Bot', pattern: /Kangaroo Bot/i },
];

// Ignore — umuman track qilinmaydi (internal tools, SEO, social)
const IGNORE_PATTERNS = [
  /HeadlessChrome/i,
  /vercel-screenshot|vercel-og/i,
  /Lighthouse|PageSpeed/i,
  /Googlebot/i,
  /bingbot/i,
  /YandexBot/i,
  /Baiduspider/i,
  /Applebot/i,
  /facebookexternalhit|Facebot/i,
  /Twitterbot/i,
  /SemrushBot/i,
  /AhrefsBot/i,
  /DotBot/i,
  /MJ12bot/i,
  /DataForSeoBot/i,
];

export function detectBot(ua: string): { isBot: boolean; isIgnored: boolean; botName: string } {
  if (!ua) return { isBot: false, isIgnored: false, botName: '' };

  // Ignore list — skip completely
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(ua)) return { isBot: true, isIgnored: true, botName: '' };
  }

  // AI bot — track
  for (const bot of AI_BOT_PATTERNS) {
    if (bot.pattern.test(ua)) return { isBot: true, isIgnored: false, botName: bot.name };
  }

  // Generic bot keywords — ignore
  if (/bot|crawl|spider|scrape|fetch|http|curl|wget/i.test(ua)) {
    return { isBot: true, isIgnored: true, botName: '' };
  }

  // Odam
  return { isBot: false, isIgnored: false, botName: '' };
}

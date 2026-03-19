export const BOT_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'GPTBot', pattern: /GPTBot/i },
  { name: 'ChatGPT-User', pattern: /ChatGPT-User/i },
  { name: 'ClaudeBot', pattern: /ClaudeBot|anthropic-ai/i },
  { name: 'PerplexityBot', pattern: /PerplexityBot|Perplexity-User|perplexity/i },
  { name: 'Google-Extended', pattern: /Google-Extended/i },
  { name: 'Googlebot', pattern: /Googlebot/i },
  { name: 'Bingbot', pattern: /bingbot/i },
  { name: 'YandexBot', pattern: /YandexBot/i },
  { name: 'Bytespider', pattern: /Bytespider/i },
  { name: 'Applebot', pattern: /Applebot/i },
  { name: 'FacebookBot', pattern: /facebookexternalhit|Facebot/i },
  { name: 'Twitterbot', pattern: /Twitterbot/i },
  { name: 'SemrushBot', pattern: /SemrushBot/i },
  { name: 'AhrefsBot', pattern: /AhrefsBot/i },
  { name: 'DotBot', pattern: /DotBot/i },
  { name: 'MJ12bot', pattern: /MJ12bot/i },
  { name: 'PetalBot', pattern: /PetalBot/i },
  { name: 'CCBot', pattern: /CCBot/i },
  { name: 'DataForSeoBot', pattern: /DataForSeoBot/i },
  { name: 'Baiduspider', pattern: /Baiduspider/i },
  { name: 'HeadlessChrome', pattern: /HeadlessChrome/i },
  { name: 'Vercel', pattern: /vercel-screenshot|vercel-og/i },
  { name: 'Lighthouse', pattern: /Lighthouse|PageSpeed/i },
];

export function detectBot(ua: string): { isBot: boolean; botName: string } {
  if (!ua) return { isBot: false, botName: '' };
  for (const bot of BOT_PATTERNS) {
    if (bot.pattern.test(ua)) {
      return { isBot: true, botName: bot.name };
    }
  }
  // Generic bot detection
  if (/bot|crawl|spider|scrape|fetch|http|curl|wget/i.test(ua)) {
    return { isBot: true, botName: 'Boshqa bot' };
  }
  return { isBot: false, botName: '' };
}

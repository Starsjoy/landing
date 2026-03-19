export const BOT_PATTERNS: { name: string; pattern: RegExp }[] = [
  // AI chatbot crawlers
  { name: 'GPTBot', pattern: /GPTBot/i },
  { name: 'ChatGPT-User', pattern: /ChatGPT-User/i },
  { name: 'ClaudeBot', pattern: /ClaudeBot|anthropic-ai/i },
  { name: 'PerplexityBot', pattern: /PerplexityBot|Perplexity-User|perplexity/i },
  { name: 'CohereBot', pattern: /Cohere-ai|cohere/i },
  { name: 'Meta AI', pattern: /Meta-ExternalAgent|FacebookBot|meta-externalagent/i },
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

  // Search engine bots
  { name: 'Googlebot', pattern: /Googlebot/i },
  { name: 'Bingbot', pattern: /bingbot/i },
  { name: 'YandexBot', pattern: /YandexBot/i },
  { name: 'Baiduspider', pattern: /Baiduspider/i },
  { name: 'Applebot', pattern: /Applebot/i },

  // Social media
  { name: 'Twitterbot', pattern: /Twitterbot/i },

  // SEO bots
  { name: 'SemrushBot', pattern: /SemrushBot/i },
  { name: 'AhrefsBot', pattern: /AhrefsBot/i },
  { name: 'DotBot', pattern: /DotBot/i },
  { name: 'MJ12bot', pattern: /MJ12bot/i },
  { name: 'DataForSeoBot', pattern: /DataForSeoBot/i },

  // Tools & internal
  { name: 'Lighthouse', pattern: /Lighthouse|PageSpeed/i },
  { name: 'HeadlessChrome', pattern: /HeadlessChrome/i },
  { name: 'Vercel', pattern: /vercel-screenshot|vercel-og/i },
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

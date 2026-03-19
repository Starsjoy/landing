import { next } from '@vercel/edge';

const BOT_PATTERNS = [
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

function detectBot(ua: string): { isBot: boolean; botName: string } {
  if (!ua) return { isBot: false, botName: '' };
  for (const bot of BOT_PATTERNS) {
    if (bot.pattern.test(ua)) return { isBot: true, botName: bot.name };
  }
  if (/bot|crawl|spider|scrape|fetch|http|curl|wget/i.test(ua)) {
    return { isBot: true, botName: 'Boshqa bot' };
  }
  return { isBot: false, botName: '' };
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Skip: assets, API, dashboard
  if (
    path.startsWith('/api') ||
    path.startsWith('/modad') ||
    path.startsWith('/_') ||
    path.includes('.') ||
    path.startsWith('/favicon')
  ) {
    return next();
  }

  const ua = request.headers.get('user-agent') || '';
  const { isBot, botName } = detectBot(ua);

  if (isBot) {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || '127.0.0.1';
      const vid = 'bot-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      const sid = 'bot-' + botName.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + ip.replace(/\./g, '-');

      // Fire and forget — don't block the response
      fetch(new URL('/api/track', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': ua, 'X-Real-IP': ip },
        body: JSON.stringify({ vid, sid, path, ref: '' }),
      }).catch(() => {});
    }
  }

  return next();
}

export const config = {
  matcher: ['/((?!api|_next|modad|.*\\..*).*)'],
};

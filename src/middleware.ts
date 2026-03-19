import { defineMiddleware } from 'astro:middleware';
import { neon } from '@neondatabase/serverless';

// Bot patterns — same as bots.ts but inline for edge runtime
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
    if (bot.pattern.test(ua)) {
      return { isBot: true, botName: bot.name };
    }
  }
  if (/bot|crawl|spider|scrape|fetch|http|curl|wget/i.test(ua)) {
    return { isBot: true, botName: 'Boshqa bot' };
  }
  return { isBot: false, botName: '' };
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  // Skip: assets, API, dashboard, favicon, sitemap
  if (
    path.startsWith('/api') ||
    path.startsWith('/modad') ||
    path.startsWith('/_') ||
    path.includes('.') ||
    path.startsWith('/favicon')
  ) {
    return next();
  }

  const ua = context.request.headers.get('user-agent') || '';
  const { isBot, botName } = detectBot(ua);

  // Only track bots server-side (humans tracked via client JS)
  if (isBot) {
    const dbUrl = import.meta.env.DATABASE_URL || process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        const sql = neon(dbUrl);
        const ip = context.request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
          || context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || context.request.headers.get('x-real-ip')
          || '127.0.0.1';
        const vid = 'bot-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        const sid = 'bot-' + botName.toLowerCase() + '-' + ip.replace(/\./g, '-');

        await sql`
          INSERT INTO visits (id, session_id, path, user_agent, ip, is_bot, bot_name, referrer)
          VALUES (${vid}, ${sid}, ${path}, ${ua}, ${ip}, true, ${botName}, '')
        `;

        // Resolve country (fire and forget)
        if (ip !== '127.0.0.1' && ip !== '::1') {
          fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, { signal: AbortSignal.timeout(3000) })
            .then(r => r.json())
            .then(j => {
              if (j.countryCode) {
                const s = neon(dbUrl);
                s`UPDATE visits SET country = ${j.countryCode} WHERE id = ${vid}`;
              }
            })
            .catch(() => {});
        }
      } catch (e) {
        console.error('Bot tracking error:', e);
      }
    }
  }

  return next();
});

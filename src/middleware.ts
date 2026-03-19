import { defineMiddleware } from 'astro:middleware';
import { neon } from '@neondatabase/serverless';

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

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  // Skip: API, dashboard, assets
  if (path.startsWith('/api') || path.startsWith('/modad') || path.includes('.')) {
    return next();
  }

  const ua = context.request.headers.get('user-agent') || '';
  const { isBot, botName } = detectBot(ua);

  // Only track bots here (humans tracked via client JS)
  if (isBot) {
    const dbUrl = import.meta.env.DATABASE_URL;
    if (dbUrl) {
      try {
        const sql = neon(dbUrl);
        const ip = context.request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
          || context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || context.request.headers.get('x-real-ip')
          || '127.0.0.1';
        const vid = 'bot-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        const sid = 'bot-' + botName.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + ip.replace(/[^a-z0-9]/gi, '-');

        // Don't await — fire and forget so page loads fast
        sql`
          INSERT INTO visits (id, session_id, path, user_agent, ip, is_bot, bot_name, referrer)
          VALUES (${vid}, ${sid}, ${path}, ${ua}, ${ip}, true, ${botName}, '')
        `.then(() => {
          // Resolve country
          if (ip !== '127.0.0.1' && ip !== '::1') {
            fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, { signal: AbortSignal.timeout(3000) })
              .then(r => r.json())
              .then(j => { if (j.countryCode) sql`UPDATE visits SET country = ${j.countryCode} WHERE id = ${vid}`; })
              .catch(() => {});
          }
        }).catch((e: any) => console.error('Bot track error:', e));
      } catch (e) {
        console.error('Bot middleware error:', e);
      }
    }
  }

  return next();
});

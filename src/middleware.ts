import { defineMiddleware } from 'astro:middleware';
import { neon } from '@neondatabase/serverless';
import { detectBot } from './lib/bots';

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

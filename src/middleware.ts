import { defineMiddleware } from 'astro:middleware';
import postgres from 'postgres';
import { detectBot } from './lib/bots';

// DigitalOcean Postgres + pgBouncer (transaction mode → prepare:false).
// Bitta client butun funksiya instansida qayta ishlatiladi.
let _sql: ReturnType<typeof postgres> | null = null;
function getSQL() {
  if (_sql) return _sql;
  const url = import.meta.env.DATABASE_URL;
  if (!url) return null;
  _sql = postgres(url, { prepare: false });
  return _sql;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  // Skip: API, dashboard, assets
  if (path.startsWith('/api') || path.startsWith('/modad') || path.includes('.')) {
    return next();
  }

  const ua = context.request.headers.get('user-agent') || '';
  const { isBot, isIgnored, botName } = detectBot(ua);

  // Ignored bots (Vercel, SEO, etc) — skip, bazaga yozilmaydi
  if (isIgnored) return next();

  // AI bot — track
  if (isBot && botName) {
    const sql = getSQL();
    if (sql) {
      try {
        const ip = context.request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
          || context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || context.request.headers.get('x-real-ip')
          || '127.0.0.1';
        const vid = 'bot-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        const sid = 'bot-' + botName.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + ip.replace(/[^a-z0-9]/gi, '-');

        const insert = sql`
          INSERT INTO visits (id, session_id, path, user_agent, ip, is_bot, bot_name, referrer)
          VALUES (${vid}, ${sid}, ${path}, ${ua}, ${ip}, true, ${botName}, '')
        `.then(() => {
          if (ip !== '127.0.0.1' && ip !== '::1') {
            fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, { signal: AbortSignal.timeout(3000) })
              .then(r => r.json())
              .then(j => { if (j.countryCode) sql`UPDATE visits SET country = ${j.countryCode} WHERE id = ${vid}`.catch(() => {}); })
              .catch(() => {});
          }
        }).catch(() => {});
        // Serverless funksiya javobdan keyin muzlatilishi mumkin — INSERT tugashini kutamiz,
        // lekin DB sekin bo'lsa bot so'rovini 1.5s dan ortiq ushlab turmaymiz.
        await Promise.race([insert, new Promise(r => setTimeout(r, 1500))]);
      } catch {}
    }
    return next();
  }

  // Bot deb tanilmagan so'rov — odam yoki o'zini brauzer qilib ko'rsatadigan fetcher (masalan Gemini).
  // Odamlar visits'ga JS orqali (/api/track) yoziladi; JS ishlatmaydigan fetcher esa u yerga tushmaydi.
  // Shuning uchun har bir so'rovni request_log'ga ham yozamiz — /modad "JS ishlamagan so'rovlar"
  // ro'yxati shu ikkisini solishtirib, yashirin AI fetcher'larni ko'rsatadi.
  const sql = getSQL();
  let logWrite: Promise<unknown> | null = null;
  if (sql) {
    const h = context.request.headers;
    const ip = h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
      || h.get('x-forwarded-for')?.split(',')[0]?.trim()
      || h.get('x-real-ip')
      || '';
    logWrite = ensureRequestLog(sql)
      .then(() => sql`
        INSERT INTO request_log (path, user_agent, ip, referrer, sec_fetch_mode, accept_language)
        VALUES (${path}, ${ua.slice(0, 500)}, ${ip}, ${(h.get('referer') || '').slice(0, 500)},
          ${h.get('sec-fetch-mode') || ''}, ${(h.get('accept-language') || '').slice(0, 100)})
      `)
      .then(() => {
        // Jadval cheksiz o'smasin — ~1% so'rovda 30 kundan eskisini tozalaymiz
        if (Math.random() < 0.01) sql`DELETE FROM request_log WHERE timestamp < NOW() - interval '30 days'`.catch(() => {});
      })
      .catch(() => {});
  }

  // Yozuv sahifa render bo'layotganda parallel ketadi — foydalanuvchini kuttirmaymiz
  const response = await next();
  if (logWrite) await Promise.race([logWrite, new Promise(r => setTimeout(r, 300))]);
  return response;
});

let requestLogReady: Promise<unknown> | null = null;
function ensureRequestLog(sql: NonNullable<ReturnType<typeof getSQL>>) {
  if (!requestLogReady) {
    requestLogReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS request_log (
          id BIGSERIAL PRIMARY KEY,
          timestamp TIMESTAMPTZ DEFAULT NOW(),
          path TEXT NOT NULL,
          user_agent TEXT DEFAULT '',
          ip TEXT DEFAULT '',
          referrer TEXT DEFAULT '',
          sec_fetch_mode TEXT DEFAULT '',
          accept_language TEXT DEFAULT ''
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_request_log_ts ON request_log(timestamp)`;
    })().catch(e => { requestLogReady = null; throw e; });
  }
  return requestLogReady;
}

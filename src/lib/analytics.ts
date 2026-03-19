import { neon } from '@neondatabase/serverless';
import { detectBot } from './bots';

function getSQL() {
  const url = import.meta.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

export interface Visit {
  id: string;
  path: string;
  user_agent: string;
  ip: string;
  country: string;
  is_bot: boolean;
  bot_name: string;
  timestamp: string;
  referrer: string;
  duration: number;
}

export async function initDB() {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      user_agent TEXT DEFAULT '',
      ip TEXT DEFAULT '',
      country TEXT DEFAULT '',
      is_bot BOOLEAN DEFAULT false,
      bot_name TEXT DEFAULT '',
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      referrer TEXT DEFAULT '',
      duration INTEGER DEFAULT 0
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_visits_timestamp ON visits(timestamp)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_visits_is_bot ON visits(is_bot)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_visits_path ON visits(path)`;
}

export async function addVisit(params: {
  path: string;
  userAgent: string;
  ip: string;
  referrer: string;
  vid: string;
}) {
  const sql = getSQL();
  const { isBot, botName } = detectBot(params.userAgent);

  await sql`
    INSERT INTO visits (id, path, user_agent, ip, is_bot, bot_name, referrer)
    VALUES (${params.vid}, ${params.path}, ${params.userAgent}, ${params.ip}, ${isBot}, ${botName}, ${params.referrer})
  `;

  // Resolve country in background (fire and forget)
  resolveCountry(params.ip, params.vid).catch(() => {});
}

export async function updateDuration(vid: string, duration: number) {
  const sql = getSQL();
  const dur = Math.min(duration, 3600);
  await sql`UPDATE visits SET duration = ${dur} WHERE id = ${vid}`;
}

async function resolveCountry(ip: string, vid: string) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    await updateCountry(vid, 'Local');
    return;
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
      signal: AbortSignal.timeout(3000),
    });
    const json = await res.json();
    await updateCountry(vid, json.countryCode || '—');
  } catch {
    await updateCountry(vid, '—');
  }
}

async function updateCountry(vid: string, country: string) {
  const sql = getSQL();
  await sql`UPDATE visits SET country = ${country} WHERE id = ${vid}`;
}

export async function getStats() {
  const sql = getSQL();

  // Overview counts
  const [todayStats] = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_bot) as bots,
      COUNT(*) FILTER (WHERE NOT is_bot) as humans
    FROM visits
    WHERE timestamp >= CURRENT_DATE
  `;
  const [weekStats] = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_bot) as bots,
      COUNT(*) FILTER (WHERE NOT is_bot) as humans
    FROM visits
    WHERE timestamp >= NOW() - INTERVAL '7 days'
  `;
  const [monthStats] = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_bot) as bots,
      COUNT(*) FILTER (WHERE NOT is_bot) as humans
    FROM visits
    WHERE timestamp >= NOW() - INTERVAL '30 days'
  `;

  // Bot traffic
  const botTraffic = await sql`
    SELECT
      bot_name as name,
      COUNT(*) as count,
      MAX(timestamp) as last_seen,
      ARRAY_AGG(DISTINCT path) as pages
    FROM visits
    WHERE is_bot = true AND bot_name != ''
    GROUP BY bot_name
    ORDER BY count DESC
  `;

  // Recent 10
  const recent = await sql`
    SELECT id, path, ip, country, is_bot, bot_name, timestamp, referrer, duration, user_agent
    FROM visits
    ORDER BY timestamp DESC
    LIMIT 10
  `;

  // Top 5 pages
  const topPages = await sql`
    SELECT path, COUNT(*) as count
    FROM visits
    GROUP BY path
    ORDER BY count DESC
    LIMIT 5
  `;

  return {
    today: { total: Number(todayStats.total), bots: Number(todayStats.bots), humans: Number(todayStats.humans) },
    week: { total: Number(weekStats.total), bots: Number(weekStats.bots), humans: Number(weekStats.humans) },
    month: { total: Number(monthStats.total), bots: Number(monthStats.bots), humans: Number(monthStats.humans) },
    botTraffic: botTraffic.map(b => ({ name: b.name, count: Number(b.count), lastSeen: b.last_seen, pages: b.pages })),
    recent: recent.map(r => ({
      id: r.id, path: r.path, ip: r.ip, country: r.country,
      isBot: r.is_bot, botName: r.bot_name, timestamp: r.timestamp,
      referrer: r.referrer, duration: Number(r.duration), userAgent: r.user_agent,
    })),
    topPages: topPages.map(p => ({ path: p.path, count: Number(p.count) })),
  };
}

// Auth
const PASS = import.meta.env.ANALYTICS_PASSWORD || 'starsjoy2026';

export function verifyPassword(password: string): boolean {
  return password === PASS;
}

export function generateToken(password: string): string {
  return Buffer.from(password + ':starsjoy-moda-2026').toString('base64');
}

export function verifyToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    return decoded === PASS + ':starsjoy-moda-2026';
  } catch {
    return false;
  }
}

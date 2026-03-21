import { neon } from '@neondatabase/serverless';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { detectBot } from './bots';

function getSQL() {
  const url = import.meta.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

export async function initDB() {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      session_id TEXT DEFAULT '',
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
  await sql`CREATE INDEX IF NOT EXISTS idx_visits_session ON visits(session_id)`;
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number TEXT DEFAULT '',
      type TEXT NOT NULL,
      username TEXT DEFAULT '',
      amount TEXT DEFAULT '',
      price INTEGER DEFAULT 0,
      transaction_id TEXT DEFAULT '',
      status TEXT DEFAULT '',
      timestamp TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(type)`;
}

export async function addVisit(params: {
  path: string;
  userAgent: string;
  ip: string;
  referrer: string;
  vid: string;
  sessionId: string;
}) {
  const sql = getSQL();
  const { isBot, botName } = detectBot(params.userAgent);

  await sql`
    INSERT INTO visits (id, session_id, path, user_agent, ip, is_bot, bot_name, referrer)
    VALUES (${params.vid}, ${params.sessionId}, ${params.path}, ${params.userAgent}, ${params.ip}, ${isBot}, ${botName}, ${params.referrer})
  `;

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

function getSince(period: string): string {
  const d = new Date();
  if (period === '12months') d.setDate(d.getDate() - 365);
  else if (period === '6months') d.setDate(d.getDate() - 180);
  else if (period === '3months') d.setDate(d.getDate() - 90);
  else if (period === 'month') d.setDate(d.getDate() - 30);
  else if (period === 'week') d.setDate(d.getDate() - 7);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getFilteredStats(period: string = 'today') {
  const sql = getSQL();
  const since = getSince(period);

  // Overview for selected period
  const [overview] = await sql`
    SELECT COUNT(*) as views,
      COUNT(DISTINCT NULLIF(session_id, '')) as sessions,
      COUNT(*) FILTER (WHERE is_bot) as bot_views,
      COUNT(*) FILTER (WHERE NOT is_bot) as human_views,
      COUNT(DISTINCT NULLIF(session_id, '')) FILTER (WHERE is_bot) as bot_sessions,
      COUNT(DISTINCT NULLIF(session_id, '')) FILTER (WHERE NOT is_bot) as human_sessions
    FROM visits WHERE timestamp >= ${since}
  `;

  const botTraffic = await sql`
    SELECT bot_name as name,
      COUNT(*) as pages_crawled,
      -- Bot sessions: unique IP per 15-min window
      COUNT(DISTINCT (ip || '-' || FLOOR(EXTRACT(EPOCH FROM timestamp) / 900)::text)) as sessions,
      MAX(timestamp) as last_seen,
      ARRAY_AGG(DISTINCT path) as pages,
      (ARRAY_AGG(user_agent ORDER BY timestamp DESC))[1] as sample_ua
    FROM visits
    WHERE is_bot = true AND bot_name != '' AND timestamp >= ${since}
    GROUP BY bot_name
    ORDER BY pages_crawled DESC
  `;

  const realUsers = await sql`
    SELECT id, path, ip, country, timestamp, referrer, duration, user_agent, session_id
    FROM visits
    WHERE is_bot = false AND timestamp >= ${since}
    ORDER BY timestamp DESC
    LIMIT 50
  `;

  const recent = await sql`
    SELECT id, path, ip, country, is_bot, bot_name, timestamp, referrer, duration, user_agent, session_id
    FROM visits
    WHERE timestamp >= ${since}
    ORDER BY timestamp DESC
    LIMIT 500
  `;

  const topPages = await sql`
    SELECT path, COUNT(*) as views,
      COUNT(DISTINCT NULLIF(session_id, '')) as sessions,
      COUNT(*) FILTER (WHERE is_bot) as bot_views,
      COUNT(*) FILTER (WHERE NOT is_bot) as human_views
    FROM visits
    WHERE timestamp >= ${since}
    GROUP BY path
    ORDER BY views DESC
    LIMIT 20
  `;

  const countries = await sql`
    SELECT country, COUNT(DISTINCT NULLIF(session_id, '')) as sessions, COUNT(*) as views
    FROM visits
    WHERE NOT is_bot AND country != '' AND country != 'Local' AND country != '—' AND timestamp >= ${since}
    GROUP BY country
    ORDER BY sessions DESC
    LIMIT 15
  `;

  return {
    overview: {
      views: +overview.views,
      sessions: +overview.sessions,
      botViews: +overview.bot_views,
      humanViews: +overview.human_views,
      botSessions: +overview.bot_sessions,
      humanSessions: +overview.human_sessions,
    },
    botTraffic: botTraffic.map(b => ({ name: b.name, pagesCrawled: +b.pages_crawled, sessions: +b.sessions, lastSeen: b.last_seen, pages: b.pages, sampleUA: b.sample_ua || '' })),
    realUsers: realUsers.map(r => ({
      id: r.id, path: r.path, ip: r.ip, country: r.country, sessionId: r.session_id,
      timestamp: r.timestamp, referrer: r.referrer, duration: +r.duration, userAgent: r.user_agent,
    })),
    recent: recent.map(r => ({
      id: r.id, path: r.path, ip: r.ip, country: r.country, sessionId: r.session_id,
      isBot: r.is_bot, botName: r.bot_name, timestamp: r.timestamp,
      referrer: r.referrer, duration: +r.duration, userAgent: r.user_agent,
    })),
    topPages: topPages.map(p => ({
      path: p.path, views: +p.views, sessions: +p.sessions,
      botViews: +p.bot_views, humanViews: +p.human_views,
    })),
    countries: countries.map(c => ({ country: c.country, sessions: +c.sessions, views: +c.views })),
  };
}

// Auth
const ENV_PASS = import.meta.env.ANALYTICS_PASSWORD || 'starsjoy2026';
const HMAC_SECRET = import.meta.env.HMAC_SECRET || 'starsjoy-hmac-key-2026';

export async function getPassword(): Promise<string> {
  try {
    const sql = getSQL();
    const rows = await sql`SELECT value FROM settings WHERE key = 'password'`;
    if (rows.length > 0 && rows[0].value) return rows[0].value;
  } catch {}
  return ENV_PASS;
}

export async function setPassword(newPass: string) {
  const sql = getSQL();
  await sql`
    INSERT INTO settings (key, value) VALUES ('password', ${newPass})
    ON CONFLICT (key) DO UPDATE SET value = ${newPass}
  `;
}

export async function verifyPassword(password: string): Promise<boolean> {
  const current = await getPassword();
  return password === current;
}

export function generateToken(password: string): string {
  return createHmac('sha256', HMAC_SECRET).update(password).digest('hex');
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    if (!token || token.length !== 64) return false;
    const current = await getPassword();
    const expected = generateToken(current);
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ───── ORDERS ─────

export async function addOrder(params: {
  orderNumber: string;
  type: string;
  username: string;
  amount: string;
  price: number;
  transactionId: string;
  status: string;
  timestamp: Date;
}) {
  const sql = getSQL();
  await sql`
    INSERT INTO orders (order_number, type, username, amount, price, transaction_id, status, timestamp)
    VALUES (${params.orderNumber}, ${params.type}, ${params.username}, ${params.amount}, ${params.price}, ${params.transactionId}, ${params.status}, ${params.timestamp})
  `;
}

export async function deleteOrder(id: number) {
  const sql = getSQL();
  await sql`DELETE FROM orders WHERE id = ${id}`;
}

export async function getOrderStats(period: string, from?: string, to?: string) {
  const sql = getSQL();

  let since: string;
  let until: string;

  if (from) {
    since = new Date(from + 'T00:00:00').toISOString();
    until = to ? new Date(to + 'T23:59:59.999').toISOString() : new Date('2099-01-01').toISOString();
  } else {
    since = getSince(period);
    until = new Date('2099-01-01').toISOString();
  }

  const [overview] = await sql`
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(price), 0) as total_revenue,
      COUNT(*) FILTER (WHERE type = 'stars') as stars_count,
      COALESCE(SUM(price) FILTER (WHERE type = 'stars'), 0) as stars_revenue,
      COALESCE(SUM(CASE WHEN type = 'stars' AND amount ~ '^\d+' THEN CAST(SUBSTRING(amount FROM '^\d+') AS INTEGER) ELSE 0 END), 0) as stars_total_amount,
      COUNT(*) FILTER (WHERE type = 'gift') as gift_count,
      COALESCE(SUM(price) FILTER (WHERE type = 'gift'), 0) as gift_revenue,
      COALESCE(SUM(CASE WHEN type = 'gift' AND amount ~ '^\d+' THEN CAST(SUBSTRING(amount FROM '^\d+') AS INTEGER) ELSE 0 END), 0) as gift_total_stars,
      COUNT(*) FILTER (WHERE type = 'premium') as premium_count,
      COALESCE(SUM(price) FILTER (WHERE type = 'premium'), 0) as premium_revenue,
      COALESCE(SUM(CASE WHEN type = 'premium' AND amount ~ '^\d+' THEN CAST(SUBSTRING(amount FROM '^\d+') AS INTEGER) ELSE 0 END), 0) as premium_total_months
    FROM orders WHERE timestamp >= ${since} AND timestamp <= ${until}
  `;

  const recent = await sql`
    SELECT id, order_number, type, username, amount, price, transaction_id, status, timestamp
    FROM orders
    WHERE timestamp >= ${since} AND timestamp <= ${until}
    ORDER BY timestamp DESC
    LIMIT 100
  `;

  const daily = await sql`
    SELECT DATE(timestamp) as date,
      COUNT(*) as orders,
      COALESCE(SUM(price), 0) as revenue
    FROM orders
    WHERE timestamp >= ${since} AND timestamp <= ${until}
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
    LIMIT 30
  `;

  // Top buyers by total spend
  const topBuyers = await sql`
    SELECT username,
      COUNT(*) as orders,
      COALESCE(SUM(price), 0) as total_spent,
      COUNT(*) FILTER (WHERE type = 'stars') as stars_orders,
      COUNT(*) FILTER (WHERE type = 'gift') as gift_orders,
      COUNT(*) FILTER (WHERE type = 'premium') as premium_orders
    FROM orders
    WHERE timestamp >= ${since} AND timestamp <= ${until} AND username != ''
    GROUP BY username
    ORDER BY total_spent DESC
    LIMIT 15
  `;

  // Daily stars amounts (actual star count, not money)
  const dailyStars = await sql`
    SELECT DATE(timestamp) as date,
      COUNT(*) as orders,
      COALESCE(SUM(
        CASE WHEN amount ~ '^\d+' THEN CAST(SUBSTRING(amount FROM '^\d+') AS INTEGER) ELSE 0 END
      ), 0) as total_stars
    FROM orders
    WHERE timestamp >= ${since} AND timestamp <= ${until} AND (type = 'stars' OR type = 'gift')
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
    LIMIT 30
  `;

  // Total stars amount
  const [starsTotal] = await sql`
    SELECT COALESCE(SUM(
      CASE WHEN amount ~ '^\d+' THEN CAST(SUBSTRING(amount FROM '^\d+') AS INTEGER) ELSE 0 END
    ), 0) as total_stars
    FROM orders
    WHERE timestamp >= ${since} AND timestamp <= ${until} AND (type = 'stars' OR type = 'gift')
  `;

  return {
    overview: {
      totalOrders: +overview.total_orders,
      totalRevenue: +overview.total_revenue,
      starsCount: +overview.stars_count,
      starsRevenue: +overview.stars_revenue,
      starsTotalAmount: +overview.stars_total_amount,
      giftCount: +overview.gift_count,
      giftRevenue: +overview.gift_revenue,
      giftTotalStars: +overview.gift_total_stars,
      premiumCount: +overview.premium_count,
      premiumRevenue: +overview.premium_revenue,
      premiumTotalMonths: +overview.premium_total_months,
      totalStars: +starsTotal.total_stars,
    },
    recent: recent.map(r => ({
      id: +r.id,
      orderNumber: r.order_number,
      type: r.type,
      username: r.username,
      amount: r.amount,
      price: +r.price,
      transactionId: r.transaction_id,
      status: r.status,
      timestamp: r.timestamp,
    })),
    daily: daily.map(d => ({
      date: d.date,
      orders: +d.orders,
      revenue: +d.revenue,
    })),
    topBuyers: topBuyers.map(b => ({
      username: b.username,
      orders: +b.orders,
      totalSpent: +b.total_spent,
      starsOrders: +b.stars_orders,
      giftOrders: +b.gift_orders,
      premiumOrders: +b.premium_orders,
    })),
    dailyStars: dailyStars.map(d => ({
      date: d.date,
      orders: +d.orders,
      totalStars: +d.total_stars,
    })),
  };
}

// Export all visits for CSV
export async function getAllVisits(period: string) {
  const sql = getSQL();
  const since = getSince(period);
  const rows = await sql`
    SELECT id, path, ip, country, is_bot, bot_name, timestamp, referrer, duration, session_id
    FROM visits
    WHERE timestamp >= ${since}
    ORDER BY timestamp DESC
    LIMIT 10000
  `;
  return rows.map(r => ({
    id: r.id, path: r.path, ip: r.ip, country: r.country,
    isBot: r.is_bot, botName: r.bot_name, timestamp: r.timestamp,
    referrer: r.referrer, duration: +r.duration, sessionId: r.session_id,
  }));
}

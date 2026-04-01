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

const TZ = 'Asia/Tashkent';
const TZ_OFFSET = 5; // UTC+5

function nowTashkent(): Date {
  const utc = new Date();
  return new Date(utc.getTime() + TZ_OFFSET * 60 * 60 * 1000);
}

function getSince(period: string): string {
  const now = nowTashkent();
  // Start of today in Tashkent
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - TZ_OFFSET * 60 * 60 * 1000);

  if (period === '12months') { todayStart.setUTCDate(todayStart.getUTCDate() - 365); }
  else if (period === '6months') { todayStart.setUTCDate(todayStart.getUTCDate() - 180); }
  else if (period === '3months') { todayStart.setUTCDate(todayStart.getUTCDate() - 90); }
  else if (period === 'month') { todayStart.setUTCDate(todayStart.getUTCDate() - 30); }
  else if (period === 'week') { todayStart.setUTCDate(todayStart.getUTCDate() - 7); }
  // 'today' = todayStart as-is (Tashkent 00:00)

  return todayStart.toISOString();
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

export async function getAnalyticsData(period: string) {
  const sql = getSQL();
  const since = getSince(period);

  // ── Sales revenue grouped by period ──
  let salesByPeriod: Array<{ label: string; revenue: number; orders: number }>;

  if (period === 'today') {
    // Hourly
    const rows = await sql`
      SELECT EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Tashkent')::INTEGER as hour,
        COUNT(*) as orders,
        COALESCE(SUM(price), 0) as revenue
      FROM orders WHERE timestamp >= ${since}
      GROUP BY hour ORDER BY hour ASC
    `;
    salesByPeriod = rows.map(r => ({
      label: String(+r.hour).padStart(2, '0') + ':00',
      revenue: +r.revenue, orders: +r.orders,
    }));
  } else if (period === '12months') {
    // Monthly
    const rows = await sql`
      SELECT TO_CHAR(timestamp AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM') as month,
        TO_CHAR(timestamp AT TIME ZONE 'Asia/Tashkent', 'Mon') as month_name,
        COUNT(*) as orders,
        COALESCE(SUM(price), 0) as revenue
      FROM orders WHERE timestamp >= ${since}
      GROUP BY month, month_name ORDER BY month ASC
    `;
    salesByPeriod = rows.map(r => ({
      label: r.month_name, revenue: +r.revenue, orders: +r.orders,
    }));
  } else if (period === '3months' || period === '6months') {
    // Weekly
    const rows = await sql`
      SELECT DATE_TRUNC('week', timestamp AT TIME ZONE 'Asia/Tashkent')::DATE as week_start,
        COUNT(*) as orders,
        COALESCE(SUM(price), 0) as revenue
      FROM orders WHERE timestamp >= ${since}
      GROUP BY week_start ORDER BY week_start ASC
    `;
    salesByPeriod = rows.map(r => ({
      label: new Date(r.week_start).toLocaleDateString('uz', { day: '2-digit', month: '2-digit' }),
      revenue: +r.revenue, orders: +r.orders,
    }));
  } else {
    // Daily (week, month)
    const rows = await sql`
      SELECT DATE(timestamp AT TIME ZONE 'Asia/Tashkent') as date,
        COUNT(*) as orders,
        COALESCE(SUM(price), 0) as revenue
      FROM orders WHERE timestamp >= ${since}
      GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Tashkent') ORDER BY date ASC
    `;
    salesByPeriod = rows.map(r => ({
      label: new Date(r.date).toLocaleDateString('uz', { day: '2-digit', month: '2-digit' }),
      revenue: +r.revenue, orders: +r.orders,
    }));
  }

  // ── Visits grouped same way ──
  let visitsByPeriod: Array<{ label: string; humans: number; bots: number; total: number }>;

  if (period === 'today') {
    const rows = await sql`
      SELECT EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Tashkent')::INTEGER as hour,
        COUNT(*) FILTER (WHERE NOT is_bot) as humans,
        COUNT(*) FILTER (WHERE is_bot) as bots,
        COUNT(*) as total
      FROM visits WHERE timestamp >= ${since}
      GROUP BY hour ORDER BY hour ASC
    `;
    visitsByPeriod = rows.map(r => ({
      label: String(+r.hour).padStart(2, '0') + ':00',
      humans: +r.humans, bots: +r.bots, total: +r.total,
    }));
  } else if (period === '12months') {
    const rows = await sql`
      SELECT TO_CHAR(timestamp AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM') as month,
        TO_CHAR(timestamp AT TIME ZONE 'Asia/Tashkent', 'Mon') as month_name,
        COUNT(*) FILTER (WHERE NOT is_bot) as humans,
        COUNT(*) FILTER (WHERE is_bot) as bots,
        COUNT(*) as total
      FROM visits WHERE timestamp >= ${since}
      GROUP BY month, month_name ORDER BY month ASC
    `;
    visitsByPeriod = rows.map(r => ({
      label: r.month_name, humans: +r.humans, bots: +r.bots, total: +r.total,
    }));
  } else if (period === '3months' || period === '6months') {
    const rows = await sql`
      SELECT DATE_TRUNC('week', timestamp AT TIME ZONE 'Asia/Tashkent')::DATE as week_start,
        COUNT(*) FILTER (WHERE NOT is_bot) as humans,
        COUNT(*) FILTER (WHERE is_bot) as bots,
        COUNT(*) as total
      FROM visits WHERE timestamp >= ${since}
      GROUP BY week_start ORDER BY week_start ASC
    `;
    visitsByPeriod = rows.map(r => ({
      label: new Date(r.week_start).toLocaleDateString('uz', { day: '2-digit', month: '2-digit' }),
      humans: +r.humans, bots: +r.bots, total: +r.total,
    }));
  } else {
    const rows = await sql`
      SELECT DATE(timestamp AT TIME ZONE 'Asia/Tashkent') as date,
        COUNT(*) FILTER (WHERE NOT is_bot) as humans,
        COUNT(*) FILTER (WHERE is_bot) as bots,
        COUNT(*) as total
      FROM visits WHERE timestamp >= ${since}
      GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Tashkent') ORDER BY date ASC
    `;
    visitsByPeriod = rows.map(r => ({
      label: new Date(r.date).toLocaleDateString('uz', { day: '2-digit', month: '2-digit' }),
      humans: +r.humans, bots: +r.bots, total: +r.total,
    }));
  }

  // ── Combined: merge by label ──
  const allLabels = new Set([
    ...salesByPeriod.map(s => s.label),
    ...visitsByPeriod.map(v => v.label),
  ]);
  const salesMap: Record<string, { revenue: number; orders: number }> = {};
  salesByPeriod.forEach(s => { salesMap[s.label] = { revenue: s.revenue, orders: s.orders }; });
  const visitsMap: Record<string, { humans: number; bots: number; total: number }> = {};
  visitsByPeriod.forEach(v => { visitsMap[v.label] = { humans: v.humans, bots: v.bots, total: v.total }; });

  const combined = [...allLabels].sort().map(label => ({
    label,
    visits: visitsMap[label]?.total || 0,
    orders: salesMap[label]?.orders || 0,
  }));

  return {
    salesByPeriod,
    visitsByPeriod,
    combined,
  };
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
    // Tashkent 00:00 = UTC-5 hours
    since = new Date(from + 'T00:00:00+05:00').toISOString();
    until = to ? new Date(to + 'T23:59:59.999+05:00').toISOString() : new Date('2099-01-01').toISOString();
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
      COALESCE(SUM(CASE WHEN type = 'stars' THEN NULLIF(REGEXP_REPLACE(SPLIT_PART(amount, ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER ELSE 0 END), 0) as stars_total_amount,
      COUNT(*) FILTER (WHERE type = 'gift') as gift_count,
      COALESCE(SUM(price) FILTER (WHERE type = 'gift'), 0) as gift_revenue,
      COALESCE(SUM(CASE WHEN type = 'gift' THEN NULLIF(REGEXP_REPLACE(SPLIT_PART(amount, ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER ELSE 0 END), 0) as gift_total_stars,
      COUNT(*) FILTER (WHERE type = 'premium') as premium_count,
      COALESCE(SUM(price) FILTER (WHERE type = 'premium'), 0) as premium_revenue,
      COALESCE(SUM(CASE WHEN type = 'premium' THEN NULLIF(REGEXP_REPLACE(SPLIT_PART(amount, ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER ELSE 0 END), 0) as premium_total_months
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
    SELECT DATE(timestamp AT TIME ZONE 'Asia/Tashkent') as date,
      COUNT(*) as orders,
      COALESCE(SUM(price), 0) as revenue
    FROM orders
    WHERE timestamp >= ${since} AND timestamp <= ${until}
    GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Tashkent')
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
    SELECT DATE(timestamp AT TIME ZONE 'Asia/Tashkent') as date,
      COUNT(*) as orders,
      COALESCE(SUM(
        NULLIF(REGEXP_REPLACE(SPLIT_PART(amount, ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER
      ), 0) as total_stars
    FROM orders
    WHERE timestamp >= ${since} AND timestamp <= ${until} AND (type = 'stars' OR type = 'gift')
    GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Tashkent')
    ORDER BY date DESC
    LIMIT 30
  `;

  // Total stars amount
  const [starsTotal] = await sql`
    SELECT COALESCE(SUM(
      NULLIF(REGEXP_REPLACE(SPLIT_PART(amount, ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER
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

// Buyer insights: new vs returning customers
export async function getBuyerInsights(period: string) {
  const sql = getSQL();
  const since = getSince(period);

  // All unique buyers in this period with their order count IN THIS PERIOD
  const periodBuyers = await sql`
    SELECT username, COUNT(*) as period_orders,
      MIN(timestamp) as first_in_period, MAX(timestamp) as last_in_period
    FROM orders
    WHERE timestamp >= ${since} AND username != ''
    GROUP BY username
  `;

  if (periodBuyers.length === 0) {
    return { totalBuyers: 0, newBuyers: 0, returningBuyers: 0, newPercent: 0, returningPercent: 0, repeatInPeriod: 0, repeatPercent: 0, avgDaysBetween: null };
  }

  // Get TOTAL order count for each buyer (all time)
  const usernames = periodBuyers.map(b => b.username);
  const allTimeOrders = await sql`
    SELECT username, COUNT(*) as total_orders,
      MIN(timestamp) as first_ever, MAX(timestamp) as last_ever
    FROM orders
    WHERE username = ANY(${usernames})
    GROUP BY username
  `;
  const allTimeMap = new Map(allTimeOrders.map(r => [r.username, r]));

  const totalBuyers = periodBuyers.length;

  // "Qaytib kelgan" = umuman 2+ xaridi bor (barcha vaqt uchun)
  const returningBuyers = periodBuyers.filter(b => {
    const allTime = allTimeMap.get(b.username);
    return allTime && +allTime.total_orders >= 2;
  }).length;
  const newBuyers = totalBuyers - returningBuyers;

  // Repeat in period = shu davr ichida 2+ xarid
  const repeatInPeriod = periodBuyers.filter(b => +b.period_orders >= 2).length;

  // Average days between first and last purchase (all time) for returning buyers
  let avgDaysBetween: number | null = null;
  const returningList = periodBuyers.filter(b => {
    const allTime = allTimeMap.get(b.username);
    return allTime && +allTime.total_orders >= 2;
  });
  if (returningList.length > 0) {
    let totalDays = 0;
    returningList.forEach(b => {
      const allTime = allTimeMap.get(b.username)!;
      const first = new Date(allTime.first_ever).getTime();
      const last = new Date(allTime.last_ever).getTime();
      totalDays += (last - first) / (1000 * 60 * 60 * 24);
    });
    avgDaysBetween = Math.round((totalDays / returningList.length) * 10) / 10;
  }

  return {
    totalBuyers,
    newBuyers,
    returningBuyers,
    newPercent: Math.round((newBuyers / totalBuyers) * 100),
    returningPercent: Math.round((returningBuyers / totalBuyers) * 100),
    repeatInPeriod,
    repeatPercent: Math.round((repeatInPeriod / totalBuyers) * 100),
    avgDaysBetween,
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

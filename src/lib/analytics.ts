import postgres from 'postgres';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { detectBot } from './bots';

// DigitalOcean Postgres + pgBouncer (transaction mode → prepare:false).
let _sql: ReturnType<typeof postgres> | null = null;
function getSQL() {
  if (_sql) return _sql;
  const url = import.meta.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  _sql = postgres(url, { prepare: false });
  return _sql;
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
    ON CONFLICT (id) DO NOTHING
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

export async function getFilteredStats(period: string = 'today', from?: string, to?: string) {
  const sql = getSQL();
  const since = from ? new Date(from + 'T00:00:00+05:00').toISOString() : getSince(period);
  const until = to ? new Date(to + 'T23:59:59.999+05:00').toISOString() : new Date('2099-01-01').toISOString();

  // Overview for selected period
  const [overview] = await sql`
    SELECT COUNT(*) as views,
      COUNT(DISTINCT NULLIF(session_id, '')) as sessions,
      COUNT(*) FILTER (WHERE is_bot) as bot_views,
      COUNT(*) FILTER (WHERE NOT is_bot) as human_views,
      COUNT(DISTINCT NULLIF(session_id, '')) FILTER (WHERE is_bot) as bot_sessions,
      COUNT(DISTINCT NULLIF(session_id, '')) FILTER (WHERE NOT is_bot) as human_sessions
    FROM visits WHERE timestamp >= ${since} AND timestamp <= ${until}
  `;

  const botTraffic = await sql`
    SELECT bot_name as name,
      COUNT(*) as pages_crawled,
      COUNT(DISTINCT (ip || '-' || FLOOR(EXTRACT(EPOCH FROM timestamp) / 900)::text)) as sessions,
      MAX(timestamp) as last_seen,
      ARRAY_AGG(DISTINCT path) as pages,
      (ARRAY_AGG(user_agent ORDER BY timestamp DESC))[1] as sample_ua
    FROM visits
    WHERE is_bot = true AND bot_name != '' AND timestamp >= ${since} AND timestamp <= ${until}
    GROUP BY bot_name
    ORDER BY pages_crawled DESC
  `;

  const realUsers = await sql`
    SELECT id, path, ip, country, timestamp, referrer, duration, user_agent, session_id
    FROM visits
    WHERE is_bot = false AND timestamp >= ${since} AND timestamp <= ${until}
    ORDER BY timestamp DESC
    LIMIT 50
  `;

  const recent = await sql`
    SELECT id, path, ip, country, is_bot, bot_name, timestamp, referrer, duration, user_agent, session_id
    FROM visits
    WHERE timestamp >= ${since} AND timestamp <= ${until}
    ORDER BY timestamp DESC
    LIMIT 500
  `;

  const topPages = await sql`
    SELECT path, COUNT(*) as views,
      COUNT(DISTINCT NULLIF(session_id, '')) as sessions,
      COUNT(*) FILTER (WHERE is_bot) as bot_views,
      COUNT(*) FILTER (WHERE NOT is_bot) as human_views
    FROM visits
    WHERE timestamp >= ${since} AND timestamp <= ${until}
    GROUP BY path
    ORDER BY views DESC
    LIMIT 1000
  `;

  const countries = await sql`
    SELECT country, COUNT(DISTINCT NULLIF(session_id, '')) as sessions, COUNT(*) as views
    FROM visits
    WHERE NOT is_bot AND country != '' AND country != 'Local' AND country != '—' AND timestamp >= ${since} AND timestamp <= ${until}
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

// ───── SALARY (MAOSH) ─────
// Foyda formulasi (modad.astro renderProfit funksiyasi bilan moslashtirilgan):
// Stars/Gift = 12%, Premium/Premium Send = 10%, Premium 1/12 = fixed 18 000 / 48 000 so'm

export function tashkentParts(d: Date = new Date()) {
  const tz = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  return {
    y: tz.getUTCFullYear(),
    m: tz.getUTCMonth() + 1,
    day: tz.getUTCDate(),
  };
}

export function fmtMonth(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const total = (y * 12) + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return fmtMonth(ny, nm);
}

export function activeAttributionMonth(d: Date = new Date()): string {
  const { y, m, day } = tashkentParts(d);
  if (day <= 5) return shiftMonth(fmtMonth(y, m), -1);
  return fmtMonth(y, m);
}

export async function ensureSalaryTable() {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS salary_withdrawals (
      id SERIAL PRIMARY KEY,
      amount BIGINT NOT NULL,
      note TEXT DEFAULT '',
      attributed_month TEXT NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_salary_attr ON salary_withdrawals(attributed_month)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_salary_ts ON salary_withdrawals(timestamp)`;
}

export async function getMonthProfit(month: string): Promise<number> {
  const sql = getSQL();
  const since = new Date(`${month}-01T00:00:00+05:00`).toISOString();
  const next = shiftMonth(month, 1);
  const until = new Date(`${next}-01T00:00:00+05:00`).toISOString();
  const [r] = await sql`
    SELECT
      COALESCE(SUM(price) FILTER (WHERE type = 'stars'), 0) as stars_rev,
      COALESCE(SUM(price) FILTER (WHERE type = 'gift'), 0) as gift_rev,
      COALESCE(SUM(price) FILTER (WHERE type = 'premium'), 0) as premium_rev,
      COALESCE(SUM(price) FILTER (WHERE type = 'premium_send'), 0) as ps_rev,
      COUNT(*) FILTER (WHERE type = 'premium_1_12' AND amount = '1 oy') as p112_one,
      COUNT(*) FILTER (WHERE type = 'premium_1_12' AND amount = '12 oy') as p112_twelve
    FROM orders WHERE timestamp >= ${since} AND timestamp < ${until}
  `;
  return (
    Math.round(+r.stars_rev * 0.12) +
    Math.round(+r.gift_rev * 0.12) +
    Math.round(+r.premium_rev * 0.10) +
    Math.round(+r.ps_rev * 0.10) +
    (+r.p112_one * 18000) +
    (+r.p112_twelve * 48000)
  );
}

export async function sumWithdrawalsForMonth(month: string): Promise<number> {
  const sql = getSQL();
  const [r] = await sql`SELECT COALESCE(SUM(amount), 0) as total FROM salary_withdrawals WHERE attributed_month = ${month}`;
  return +r.total;
}

// Lazy init: birinchi murojaatda joriy oyga belgilanadi va keyin o'zgarmaydi.
// Eski oylar foydasi rollover'ga qo'shilmasligi uchun shu nuqtadan boshlab walk qilamiz.
export async function getTrackingStartMonth(): Promise<string> {
  const sql = getSQL();
  const rows = await sql`SELECT value FROM settings WHERE key = 'salary_tracking_start'`;
  if (rows.length > 0 && /^\d{4}-\d{2}$/.test(rows[0].value)) return rows[0].value;
  const t = tashkentParts();
  const cur = fmtMonth(t.y, t.m);
  await sql`INSERT INTO settings (key, value) VALUES ('salary_tracking_start', ${cur}) ON CONFLICT (key) DO NOTHING`;
  return cur;
}

// Walk-forward bilan har oyning leftover'ini hisoblaydi (zanjirli rollover).
// Tracking start oyidan boshlanadi — eski oylar foydasi qo'shilmaydi.
// Cap: 24 oy (xavfsizlik uchun).
export async function getRolloverInto(month: string): Promise<number> {
  const startMonth = await getTrackingStartMonth();
  if (startMonth >= month) return 0;
  let cursor = startMonth;
  let leftover = 0;
  for (let i = 0; i < 24; i++) {
    if (cursor >= month) break;
    const profit = await getMonthProfit(cursor);
    const withdrawn = await sumWithdrawalsForMonth(cursor);
    leftover = Math.max(0, profit + leftover - withdrawn);
    cursor = shiftMonth(cursor, 1);
  }
  return leftover;
}

export async function listWithdrawals(limit = 200) {
  const sql = getSQL();
  return await sql`SELECT id, amount, note, attributed_month, timestamp FROM salary_withdrawals ORDER BY timestamp DESC LIMIT ${limit}`;
}

export async function addWithdrawal(amount: number, note: string, month: string, timestamp?: Date) {
  const sql = getSQL();
  if (timestamp) {
    const [r] = await sql`
      INSERT INTO salary_withdrawals (amount, note, attributed_month, timestamp)
      VALUES (${amount}, ${note}, ${month}, ${timestamp.toISOString()})
      RETURNING id, amount, note, attributed_month, timestamp
    `;
    return r;
  }
  const [r] = await sql`
    INSERT INTO salary_withdrawals (amount, note, attributed_month)
    VALUES (${amount}, ${note}, ${month})
    RETURNING id, amount, note, attributed_month, timestamp
  `;
  return r;
}

export async function deleteWithdrawal(id: number) {
  const sql = getSQL();
  await sql`DELETE FROM salary_withdrawals WHERE id = ${id}`;
}

// ───── CASHFLOW (KIRIM/CHIQIM) — OYLIK KESIM ─────
// Har oy: kirim (qo'lda) + sotuv (orders'dan auto) + oxirgi qoldiq (qo'lda, keyingi oy boshida)
// Asl foyda = sotuv − iste'mol; iste'mol = (oldingi oy qoldig'i) + kirim − (shu oy qoldig'i)

export async function ensureCashflowTable() {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS cashflow_entries (
      id SERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      kind TEXT NOT NULL,
      amount BIGINT NOT NULL,
      note TEXT DEFAULT '',
      timestamp TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_cashflow_kind ON cashflow_entries(kind)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_cashflow_ts ON cashflow_entries(timestamp)`;
  await sql`
    CREATE TABLE IF NOT EXISTS cashflow_month_qoldiq (
      month TEXT PRIMARY KEY,
      amount BIGINT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function addCashflowKirim(amount: number, note: string, timestamp?: Date) {
  const sql = getSQL();
  if (timestamp) {
    const [r] = await sql`
      INSERT INTO cashflow_entries (source, kind, amount, note, timestamp)
      VALUES ('global', 'kirim', ${amount}, ${note}, ${timestamp.toISOString()})
      RETURNING id, kind, amount, note, timestamp
    `;
    return r;
  }
  const [r] = await sql`
    INSERT INTO cashflow_entries (source, kind, amount, note)
    VALUES ('global', 'kirim', ${amount}, ${note})
    RETURNING id, kind, amount, note, timestamp
  `;
  return r;
}

export async function deleteCashflowEntry(id: number) {
  const sql = getSQL();
  await sql`DELETE FROM cashflow_entries WHERE id = ${id}`;
}

export async function setMonthQoldiq(month: string, amount: number) {
  const sql = getSQL();
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('invalid month');
  await sql`
    INSERT INTO cashflow_month_qoldiq (month, amount, updated_at)
    VALUES (${month}, ${amount}, NOW())
    ON CONFLICT (month) DO UPDATE
    SET amount = EXCLUDED.amount, updated_at = NOW()
  `;
}

export async function deleteMonthQoldiq(month: string) {
  const sql = getSQL();
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('invalid month');
  await sql`DELETE FROM cashflow_month_qoldiq WHERE month = ${month}`;
}

export async function listCashflowKirim(limit = 200) {
  const sql = getSQL();
  const rows = await sql`
    SELECT id, amount, note, timestamp
    FROM cashflow_entries
    WHERE kind = 'kirim'
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
  return rows.map((r: any) => ({ ...r, amount: +r.amount }));
}

// Har oy uchun: kirim, sotuv, qoldiq, boshlang'ich qoldiq, iste'mol, asl foyda
// Birinchi kirim/qoldiq oyidan to joriy oygacha
export async function getMonthlyCashflowBreakdown() {
  const sql = getSQL();

  // Eng erta oy: kirim yoki qoldiq
  const [firstKirim] = await sql`
    SELECT TO_CHAR(DATE(MIN(timestamp) AT TIME ZONE 'Asia/Tashkent'), 'YYYY-MM') as m
    FROM cashflow_entries WHERE kind = 'kirim'
  `;
  const [firstQoldiq] = await sql`SELECT MIN(month) as m FROM cashflow_month_qoldiq`;

  let startMonth: string | null = null;
  if (firstKirim && firstKirim.m) startMonth = firstKirim.m;
  if (firstQoldiq && firstQoldiq.m) {
    if (!startMonth || firstQoldiq.m < startMonth) startMonth = firstQoldiq.m;
  }
  if (!startMonth) return { months: [], currentMonth: fmtMonth(tashkentParts().y, tashkentParts().m) };

  const t = tashkentParts();
  const currentMonth = fmtMonth(t.y, t.m);

  // Per-month kirim
  const kirimRows = await sql`
    SELECT TO_CHAR(DATE(timestamp AT TIME ZONE 'Asia/Tashkent'), 'YYYY-MM') as month,
      COALESCE(SUM(amount), 0) as total,
      COUNT(*) as cnt
    FROM cashflow_entries
    WHERE kind = 'kirim'
    GROUP BY month
  `;
  const kirimByMonth = new Map<string, { amount: number; count: number }>();
  kirimRows.forEach((r: any) => kirimByMonth.set(r.month, { amount: +r.total, count: +r.cnt }));

  // Per-month sotuv (barcha botlar)
  const types = ['stars', 'gift', 'premium', 'premium_send', 'premium_1_12', 'uzgets_stars', 'uzgets_premium'];
  const sotuvRows = await sql`
    SELECT TO_CHAR(DATE(timestamp AT TIME ZONE 'Asia/Tashkent'), 'YYYY-MM') as month,
      COALESCE(SUM(price), 0) as total
    FROM orders
    WHERE type = ANY(${types})
    GROUP BY month
  `;
  const sotuvByMonth = new Map<string, number>();
  sotuvRows.forEach((r: any) => sotuvByMonth.set(r.month, +r.total));

  // Per-month qoldiq
  const qoldiqRows = await sql`SELECT month, amount FROM cashflow_month_qoldiq`;
  const qoldiqByMonth = new Map<string, number>();
  qoldiqRows.forEach((r: any) => qoldiqByMonth.set(r.month, +r.amount));

  // Iterate startMonth → currentMonth
  const months: Array<{
    month: string;
    kirim: number;
    kirimCount: number;
    sotuv: number;
    qoldiq: number | null;
    prevQoldiq: number | null;
    consumed: number | null;
    realProfit: number | null;
    isCurrent: boolean;
  }> = [];

  let cursor = startMonth;
  let prevQoldiq: number | null = 0;
  // Xavfsizlik cheklov: 60 oy
  for (let i = 0; i < 60 && cursor <= currentMonth; i++) {
    const k = kirimByMonth.get(cursor) || { amount: 0, count: 0 };
    const sotuv = sotuvByMonth.get(cursor) || 0;
    const qoldiq = qoldiqByMonth.has(cursor) ? qoldiqByMonth.get(cursor)! : null;
    const isCurrent = cursor === currentMonth;

    let consumed: number | null = null;
    let realProfit: number | null = null;
    if (qoldiq !== null && prevQoldiq !== null) {
      consumed = prevQoldiq + k.amount - qoldiq;
      realProfit = sotuv - consumed;
    }

    months.push({
      month: cursor,
      kirim: k.amount,
      kirimCount: k.count,
      sotuv,
      qoldiq,
      prevQoldiq,
      consumed,
      realProfit,
      isCurrent,
    });

    prevQoldiq = qoldiq;
    cursor = shiftMonth(cursor, 1);
  }

  // Eng yangi tepada
  months.reverse();

  return { months, currentMonth };
}

// ───── MONTHLY PLAN (REJA) ─────

export async function ensurePlanTable() {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS monthly_plans (
      month TEXT PRIMARY KEY,
      target_profit BIGINT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function getPlan(month: string): Promise<number | null> {
  const sql = getSQL();
  const rows = await sql`SELECT target_profit FROM monthly_plans WHERE month = ${month}`;
  if (rows.length === 0) return null;
  return +rows[0].target_profit;
}

export async function setPlan(month: string, target: number) {
  const sql = getSQL();
  await sql`
    INSERT INTO monthly_plans (month, target_profit)
    VALUES (${month}, ${target})
    ON CONFLICT (month) DO UPDATE
    SET target_profit = EXCLUDED.target_profit, updated_at = NOW()
  `;
}

export async function deletePlan(month: string) {
  const sql = getSQL();
  await sql`DELETE FROM monthly_plans WHERE month = ${month}`;
}

// Har bir kun uchun foydani qaytaradi (Tashkent vaqt zonasida).
// Faqat shu oyga tegishli kunlar (1 dan oyning oxirgi kunigacha).
export async function getDailyProfitsForMonth(month: string): Promise<Array<{ day: number; profit: number }>> {
  const sql = getSQL();
  const since = new Date(`${month}-01T00:00:00+05:00`).toISOString();
  const next = shiftMonth(month, 1);
  const until = new Date(`${next}-01T00:00:00+05:00`).toISOString();
  const rows = await sql`
    SELECT
      EXTRACT(DAY FROM (timestamp AT TIME ZONE 'Asia/Tashkent'))::int as day,
      COALESCE(SUM(price) FILTER (WHERE type = 'stars'), 0) as stars_rev,
      COALESCE(SUM(price) FILTER (WHERE type = 'gift'), 0) as gift_rev,
      COALESCE(SUM(price) FILTER (WHERE type = 'premium'), 0) as premium_rev,
      COALESCE(SUM(price) FILTER (WHERE type = 'premium_send'), 0) as ps_rev,
      COUNT(*) FILTER (WHERE type = 'premium_1_12' AND amount = '1 oy') as p112_one,
      COUNT(*) FILTER (WHERE type = 'premium_1_12' AND amount = '12 oy') as p112_twelve
    FROM orders
    WHERE timestamp >= ${since} AND timestamp < ${until}
    GROUP BY day
    ORDER BY day ASC
  `;
  return rows.map((r: any) => ({
    day: +r.day,
    profit:
      Math.round(+r.stars_rev * 0.12) +
      Math.round(+r.gift_rev * 0.12) +
      Math.round(+r.premium_rev * 0.10) +
      Math.round(+r.ps_rev * 0.10) +
      (+r.p112_one * 18000) +
      (+r.p112_twelve * 48000),
  }));
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
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

export async function getAnalyticsData(period: string, source: string = 'all', from?: string, to?: string) {
  const sql = getSQL();
  const since = from ? new Date(from + 'T00:00:00+05:00').toISOString() : getSince(period);
  const types = sourceFilter(source);

  // ── Sales revenue grouped by period ──
  let salesByPeriod: Array<{ label: string; revenue: number; orders: number }>;

  if (period === 'today') {
    // Hourly
    const rows = await sql`
      SELECT EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Tashkent')::INTEGER as hour,
        COUNT(*) as orders,
        COALESCE(SUM(price), 0) as revenue
      FROM orders WHERE timestamp >= ${since} AND type = ANY(${types})
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
      FROM orders WHERE timestamp >= ${since} AND type = ANY(${types})
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
      FROM orders WHERE timestamp >= ${since} AND type = ANY(${types})
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
      FROM orders WHERE timestamp >= ${since} AND type = ANY(${types})
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

// source: 'starsjoy' = stars,gift,premium | 'premium_send' | 'premium_1_12' | 'uzgets' | 'all'
// 'uzgets' alohida silos — 'all' filteriga qo'shilmaydi (foyda va maosh hisobiga ham ta'sir qilmaydi)
function sourceFilter(source: string): string[] {
  if (source === 'starsjoy') return ['stars', 'gift', 'premium'];
  if (source === 'premium_send') return ['premium_send'];
  if (source === 'premium_1_12') return ['premium_1_12'];
  if (source === 'uzgets') return ['uzgets_stars', 'uzgets_premium'];
  return ['stars', 'gift', 'premium', 'premium_send', 'premium_1_12']; // all (uzgets'siz)
}

export async function getOrderStats(period: string, from?: string, to?: string, source: string = 'all') {
  const sql = getSQL();
  const types = sourceFilter(source);

  let since: string;
  let until: string;

  if (from) {
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
      COALESCE(SUM(CASE WHEN type = 'premium' THEN NULLIF(REGEXP_REPLACE(SPLIT_PART(amount, ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER ELSE 0 END), 0) as premium_total_months,
      COUNT(*) FILTER (WHERE type = 'premium_send') as ps_count,
      COALESCE(SUM(price) FILTER (WHERE type = 'premium_send'), 0) as ps_revenue,
      COALESCE(SUM(CASE WHEN type = 'premium_send' THEN NULLIF(REGEXP_REPLACE(SPLIT_PART(amount, ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER ELSE 0 END), 0) as ps_total_months,
      COUNT(*) FILTER (WHERE type = 'premium_1_12') as p112_count,
      COALESCE(SUM(price) FILTER (WHERE type = 'premium_1_12'), 0) as p112_revenue,
      COUNT(*) FILTER (WHERE type = 'premium_1_12' AND amount = '1 oy') as p112_one_count,
      COALESCE(SUM(price) FILTER (WHERE type = 'premium_1_12' AND amount = '1 oy'), 0) as p112_one_revenue,
      COUNT(*) FILTER (WHERE type = 'premium_1_12' AND amount = '12 oy') as p112_twelve_count,
      COALESCE(SUM(price) FILTER (WHERE type = 'premium_1_12' AND amount = '12 oy'), 0) as p112_twelve_revenue,
      COALESCE(SUM(CASE WHEN type = 'premium_1_12' THEN NULLIF(REGEXP_REPLACE(SPLIT_PART(amount, ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER ELSE 0 END), 0) as p112_total_months,
      COUNT(*) FILTER (WHERE type = 'uzgets_stars') as uz_stars_count,
      COALESCE(SUM(price) FILTER (WHERE type = 'uzgets_stars'), 0) as uz_stars_revenue,
      COALESCE(SUM(CASE WHEN type = 'uzgets_stars' THEN NULLIF(REGEXP_REPLACE(SPLIT_PART(amount, ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER ELSE 0 END), 0) as uz_stars_total_amount,
      COUNT(*) FILTER (WHERE type = 'uzgets_premium') as uz_premium_count,
      COALESCE(SUM(price) FILTER (WHERE type = 'uzgets_premium'), 0) as uz_premium_revenue,
      COALESCE(SUM(CASE WHEN type = 'uzgets_premium' THEN NULLIF(REGEXP_REPLACE(SPLIT_PART(amount, ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER ELSE 0 END), 0) as uz_premium_total_months,
      COUNT(*) FILTER (WHERE type = 'uzgets_premium' AND amount = '3 oy') as uz_3_count,
      COALESCE(SUM(price) FILTER (WHERE type = 'uzgets_premium' AND amount = '3 oy'), 0) as uz_3_revenue,
      COUNT(*) FILTER (WHERE type = 'uzgets_premium' AND amount = '6 oy') as uz_6_count,
      COALESCE(SUM(price) FILTER (WHERE type = 'uzgets_premium' AND amount = '6 oy'), 0) as uz_6_revenue,
      COUNT(*) FILTER (WHERE type = 'uzgets_premium' AND amount = '12 oy') as uz_12_count,
      COALESCE(SUM(price) FILTER (WHERE type = 'uzgets_premium' AND amount = '12 oy'), 0) as uz_12_revenue
    FROM orders WHERE timestamp >= ${since} AND timestamp <= ${until} AND type = ANY(${types})
  `;

  const recent = await sql`
    SELECT id, order_number, type, username, amount, price, transaction_id, status, timestamp
    FROM orders
    WHERE timestamp >= ${since} AND timestamp <= ${until} AND type = ANY(${types})
    ORDER BY timestamp DESC
    LIMIT 100
  `;

  const daily = await sql`
    SELECT DATE(timestamp AT TIME ZONE 'Asia/Tashkent') as date,
      COUNT(*) as orders,
      COALESCE(SUM(price), 0) as revenue
    FROM orders
    WHERE timestamp >= ${since} AND timestamp <= ${until} AND type = ANY(${types})
    GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Tashkent')
    ORDER BY date DESC
    LIMIT 30
  `;

  const topBuyers = await sql`
    SELECT username,
      COUNT(*) as orders,
      COALESCE(SUM(price), 0) as total_spent,
      COUNT(*) FILTER (WHERE type = 'stars') as stars_orders,
      COUNT(*) FILTER (WHERE type = 'gift') as gift_orders,
      COUNT(*) FILTER (WHERE type = 'premium') as premium_orders,
      COUNT(*) FILTER (WHERE type = 'premium_send') as ps_orders,
      COUNT(*) FILTER (WHERE type = 'premium_1_12') as p112_orders,
      COUNT(*) FILTER (WHERE type = 'uzgets_stars') as uz_stars_orders,
      COUNT(*) FILTER (WHERE type = 'uzgets_premium') as uz_premium_orders
    FROM orders
    WHERE timestamp >= ${since} AND timestamp <= ${until} AND username != '' AND type = ANY(${types})
    GROUP BY username
    ORDER BY total_spent DESC
    LIMIT 15
  `;

  const dailyStars = await sql`
    SELECT DATE(timestamp AT TIME ZONE 'Asia/Tashkent') as date,
      COUNT(*) as orders,
      COALESCE(SUM(
        NULLIF(REGEXP_REPLACE(SPLIT_PART(amount, ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER
      ), 0) as total_stars
    FROM orders
    WHERE timestamp >= ${since} AND timestamp <= ${until} AND type = ANY(${types}) AND (type = 'stars' OR type = 'gift' OR type = 'uzgets_stars')
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
    WHERE timestamp >= ${since} AND timestamp <= ${until} AND type = ANY(${types}) AND (type = 'stars' OR type = 'gift' OR type = 'uzgets_stars')
  `;

  // Daily premium months (for premium_send view)
  const dailyMonths = await sql`
    SELECT DATE(timestamp AT TIME ZONE 'Asia/Tashkent') as date,
      COUNT(*) as orders,
      COALESCE(SUM(
        NULLIF(REGEXP_REPLACE(SPLIT_PART(amount, ' ', 1), '[^0-9]', '', 'g'), '')::INTEGER
      ), 0) as total_months
    FROM orders
    WHERE timestamp >= ${since} AND timestamp <= ${until} AND type = ANY(${types}) AND (type = 'premium' OR type = 'premium_send' OR type = 'premium_1_12' OR type = 'uzgets_premium')
    GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Tashkent')
    ORDER BY date DESC
    LIMIT 30
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
      psCount: +overview.ps_count,
      psRevenue: +overview.ps_revenue,
      psTotalMonths: +overview.ps_total_months,
      p112Count: +overview.p112_count,
      p112Revenue: +overview.p112_revenue,
      p112OneCount: +overview.p112_one_count,
      p112OneRevenue: +overview.p112_one_revenue,
      p112TwelveCount: +overview.p112_twelve_count,
      p112TwelveRevenue: +overview.p112_twelve_revenue,
      p112TotalMonths: +overview.p112_total_months,
      totalStars: +starsTotal.total_stars,
      uzStarsCount: +overview.uz_stars_count,
      uzStarsRevenue: +overview.uz_stars_revenue,
      uzStarsTotalAmount: +overview.uz_stars_total_amount,
      uzPremiumCount: +overview.uz_premium_count,
      uzPremiumRevenue: +overview.uz_premium_revenue,
      uzPremiumTotalMonths: +overview.uz_premium_total_months,
      uz3Count: +overview.uz_3_count,
      uz3Revenue: +overview.uz_3_revenue,
      uz6Count: +overview.uz_6_count,
      uz6Revenue: +overview.uz_6_revenue,
      uz12Count: +overview.uz_12_count,
      uz12Revenue: +overview.uz_12_revenue,
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
      psOrders: +b.ps_orders,
      p112Orders: +b.p112_orders,
      uzStarsOrders: +b.uz_stars_orders,
      uzPremiumOrders: +b.uz_premium_orders,
    })),
    dailyStars: dailyStars.map(d => ({
      date: d.date,
      orders: +d.orders,
      totalStars: +d.total_stars,
    })),
    dailyMonths: dailyMonths.map(d => ({
      date: d.date,
      orders: +d.orders,
      totalMonths: +d.total_months,
    })),
  };
}

// Buyer insights: new vs returning customers
export async function getBuyerInsights(period: string, source: string = 'all', from?: string, to?: string) {
  const sql = getSQL();
  const since = from ? new Date(from + 'T00:00:00+05:00').toISOString() : getSince(period);
  const until = to ? new Date(to + 'T23:59:59.999+05:00').toISOString() : new Date('2099-01-01').toISOString();
  const types = sourceFilter(source);

  const periodBuyers = await sql`
    SELECT username, COUNT(*) as period_orders,
      MIN(timestamp) as first_in_period, MAX(timestamp) as last_in_period
    FROM orders
    WHERE timestamp >= ${since} AND timestamp <= ${until} AND username != '' AND type = ANY(${types})
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
    WHERE username = ANY(${usernames}) AND type = ANY(${types})
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

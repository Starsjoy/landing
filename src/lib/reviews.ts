import { neon } from '@neondatabase/serverless';

// ---- DB ulanish ----
function getSQL() {
  const url = import.meta.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  product: string;
  author_name: string;
  rating: number;
  body: string;
  status: ReviewStatus;
  created_at: string;
}

let dbReady = false;
export async function initReviewsDB() {
  if (dbReady) return;
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      product TEXT NOT NULL DEFAULT 'premium',
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      ip TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON reviews(product, status)`;
  dbReady = true;
}

// ---- Public: sharh yuborish (pending) ----
export interface SubmitInput {
  product: string;
  author_name: string;
  rating: number;
  body: string;
  ip: string;
}

const MAX_PER_IP_PER_DAY = 2;

export async function submitReview(input: SubmitInput): Promise<{ ok: boolean; error?: string }> {
  const name = input.author_name.trim().slice(0, 60);
  const body = input.body.trim().slice(0, 600);
  const rating = Math.round(Number(input.rating));
  const product = (input.product || 'premium').trim().slice(0, 40);

  if (!name || name.length < 2) return { ok: false, error: 'Ism kiriting' };
  if (!(rating >= 1 && rating <= 5)) return { ok: false, error: "Reyting 1-5 bo'lishi kerak" };
  if (body.length < 3) return { ok: false, error: 'Izoh juda qisqa' };

  const sql = getSQL();
  await initReviewsDB();

  // IP bo'yicha kunlik limit (spam himoyasi)
  if (input.ip) {
    const rows = await sql`
      SELECT COUNT(*)::int AS n FROM reviews
      WHERE ip = ${input.ip} AND product = ${product}
        AND created_at > NOW() - INTERVAL '1 day'
    ` as { n: number }[];
    if (rows[0]?.n >= MAX_PER_IP_PER_DAY) {
      return { ok: false, error: 'Bugun limit tugadi, ertaga urinib ko\'ring' };
    }
  }

  const id = 'rv-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  await sql`
    INSERT INTO reviews (id, product, author_name, rating, body, status, ip)
    VALUES (${id}, ${product}, ${name}, ${rating}, ${body}, 'pending', ${input.ip || ''})
  `;
  return { ok: true };
}

// ---- Ko'rsatish: tasdiqlangan sharhlar (TTL kesh) ----
interface CacheEntry { data: Review[]; expires: number; }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 daqiqa
const cache = new Map<string, CacheEntry>();

export async function getApprovedReviews(product = 'premium'): Promise<Review[]> {
  const now = Date.now();
  const hit = cache.get(product);
  if (hit && hit.expires > now) return hit.data;

  try {
    const sql = getSQL();
    await initReviewsDB();
    const rows = await sql`
      SELECT id, product, author_name, rating, body, status, created_at
      FROM reviews
      WHERE product = ${product} AND status = 'approved'
      ORDER BY created_at DESC
      LIMIT 200
    ` as Review[];
    cache.set(product, { data: rows, expires: now + CACHE_TTL_MS });
    return rows;
  } catch (e) {
    // DB xato bo'lsa — sahifa buzilmasin, bo'sh qaytaramiz
    if (hit) return hit.data;
    return [];
  }
}

export interface Aggregate { ratingValue: number; reviewCount: number; }

export function aggregateOf(reviews: Review[]): Aggregate {
  if (!reviews.length) return { ratingValue: 0, reviewCount: 0 };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return { ratingValue: Math.round((sum / reviews.length) * 10) / 10, reviewCount: reviews.length };
}

// Keshni majburan tozalash (moderatsiyadan keyin darrov ko'rinishi uchun)
export function clearReviewsCache(product?: string) {
  if (product) cache.delete(product);
  else cache.clear();
}

// ---- Admin: moderatsiya ----
export async function getPendingReviews(): Promise<Review[]> {
  const sql = getSQL();
  await initReviewsDB();
  return await sql`
    SELECT id, product, author_name, rating, body, status, created_at
    FROM reviews WHERE status = 'pending'
    ORDER BY created_at ASC LIMIT 200
  ` as Review[];
}

export async function getAllReviews(): Promise<Review[]> {
  const sql = getSQL();
  await initReviewsDB();
  return await sql`
    SELECT id, product, author_name, rating, body, status, created_at
    FROM reviews ORDER BY created_at DESC LIMIT 500
  ` as Review[];
}

export async function setReviewStatus(id: string, status: ReviewStatus): Promise<void> {
  const sql = getSQL();
  await initReviewsDB();
  await sql`UPDATE reviews SET status = ${status} WHERE id = ${id}`;
  clearReviewsCache(); // tasdiq/rad qilingach kesh yangilansin
}

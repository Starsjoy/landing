export const prerender = false;

import type { APIRoute } from 'astro';
import { verifyToken } from '../../lib/analytics';
import {
  submitReview, getPendingReviews, getAllReviews, setReviewStatus, initReviewsDB,
} from '../../lib/reviews';

function clientIp(request: Request): string {
  return request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '';
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// ---- Admin: kutilayotgan/barcha sharhlar ro'yxati ----
export const GET: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('moda_token')?.value || '';
  if (!await verifyToken(token)) return new Response('unauthorized', { status: 401 });
  await initReviewsDB();
  const url = new URL(request.url);
  const all = url.searchParams.get('all') === '1';
  const rows = all ? await getAllReviews() : await getPendingReviews();
  return json({ ok: true, reviews: rows });
};

// ---- POST: public yuborish YOKI admin moderatsiya ----
export const POST: APIRoute = async ({ request, cookies }) => {
  let body: Record<string, any> = {};
  const ct = request.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) {
      body = await request.json();
    } else {
      const form = await request.formData();
      for (const [k, v] of form) body[k] = typeof v === 'string' ? v : '';
    }
  } catch {
    return json({ ok: false, error: 'Notog\'ri so\'rov' }, 400);
  }

  // --- Admin moderatsiya (action bor + valid token) ---
  if (body.action === 'approve' || body.action === 'reject') {
    const token = cookies.get('moda_token')?.value || '';
    if (!await verifyToken(token)) return new Response('unauthorized', { status: 401 });
    const id = String(body.id || '');
    if (!id) return json({ ok: false, error: 'id yo\'q' }, 400);
    await setReviewStatus(id, body.action === 'approve' ? 'approved' : 'rejected');
    return json({ ok: true });
  }

  // --- Public sharh yuborish ---
  // Honeypot: 'website' maydoni odam uchun yashirin; to'lgan bo'lsa = bot
  if (body.website && String(body.website).trim() !== '') {
    return json({ ok: true }); // jimgina tashlab yuboramiz
  }

  const result = await submitReview({
    product: String(body.product || 'premium'),
    author_name: String(body.author_name || body.name || ''),
    rating: Number(body.rating || 0),
    body: String(body.body || body.text || ''),
    ip: clientIp(request),
  });

  if (!result.ok) return json(result, 400);
  return json({ ok: true, message: 'Rahmat! Sharhingiz tekshiruvdan so\'ng chop etiladi.' });
};

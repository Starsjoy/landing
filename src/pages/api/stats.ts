export const prerender = false;

import type { APIRoute } from 'astro';
import { verifyToken, getFilteredStats, getAllVisits, getOrderStats, getAnalyticsData, getBuyerInsights, deleteOrder, setPassword, getPassword, generateToken, initDB } from '../../lib/analytics';

let dbReady = false;

async function ensureDB() {
  if (!dbReady) { await initDB(); dbReady = true; }
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('moda_token')?.value || '';
  if (!await verifyToken(token)) {
    return new Response('unauthorized', { status: 401 });
  }

  await ensureDB();
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'today';

  // CSV export — returns all visits for the period
  if (url.searchParams.get('export') === 'csv') {
    const visits = await getAllVisits(period);
    return new Response(JSON.stringify(visits), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const salesFrom = url.searchParams.get('salesFrom') || undefined;
  const salesTo = url.searchParams.get('salesTo') || undefined;
  const analyticsPeriod = url.searchParams.get('ap') || 'week';

  const [stats, orders, analytics, buyerInsights] = await Promise.all([
    getFilteredStats(period),
    getOrderStats(period, salesFrom, salesTo),
    getAnalyticsData(analyticsPeriod),
    getBuyerInsights(period),
  ]);
  return new Response(JSON.stringify({ ...stats, orders, analytics, buyerInsights }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('moda_token')?.value || '';
  if (!await verifyToken(token)) {
    return new Response('unauthorized', { status: 401 });
  }

  await ensureDB();
  const body = await request.json();

  if (body.action === 'change_password') {
    const { current, newPass } = body;
    const currentPass = await getPassword();
    if (current !== currentPass) {
      return new Response(JSON.stringify({ error: 'Joriy parol noto\'g\'ri' }), { status: 400 });
    }
    if (!newPass || newPass.length < 4) {
      return new Response(JSON.stringify({ error: 'Yangi parol kamida 4 belgi bo\'lishi kerak' }), { status: 400 });
    }
    await setPassword(newPass);
    const newToken = generateToken(newPass);
    cookies.set('moda_token', newToken, { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (body.action === 'delete_order') {
    const { id } = body;
    if (!id) return new Response(JSON.stringify({ error: 'ID kerak' }), { status: 400 });
    await deleteOrder(id);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response('unknown action', { status: 400 });
};

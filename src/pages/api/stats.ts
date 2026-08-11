export const prerender = false;

import type { APIRoute } from 'astro';
import { getRole, getFilteredStats, getAllVisits, getOrderStats, getAnalyticsData, getBuyerInsights, deleteOrder, setPassword, getPassword, generateToken, initDB } from '../../lib/analytics';

let dbReady = false;

async function ensureDB() {
  if (!dbReady) { await initDB(); dbReady = true; }
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('moda_token')?.value || '';
  const role = await getRole(token);
  if (!role) {
    return new Response('unauthorized', { status: 401 });
  }

  await ensureDB();
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'today';

  // CSV export — returns all visits for the period (faqat owner)
  if (url.searchParams.get('export') === 'csv') {
    if (role !== 'owner') return new Response('forbidden', { status: 403 });
    const visits = await getAllVisits(period);
    return new Response(JSON.stringify(visits), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const salesFrom = url.searchParams.get('salesFrom') || undefined;
  const salesTo = url.searchParams.get('salesTo') || undefined;
  const analyticsPeriod = url.searchParams.get('ap') || 'week';
  const source = url.searchParams.get('source') || 'all';

  // Yordamchi admin — faqat Uzgets buyurtmalari. Tashriflar, analitika,
  // xaridor tahlili va boshqa manbalar umuman qaytarilmaydi.
  if (role === 'assistant') {
    const orders = await getOrderStats(period, salesFrom, salesTo, 'uzgets');
    return new Response(JSON.stringify({ orders }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Agar salesFrom bor bo'lsa, visits va buyers ham shu diapazon bo'yicha filter qilinadi
  const effectivePeriod = salesFrom ? 'custom' : period;
  const [stats, orders, analytics, buyerInsights] = await Promise.all([
    getFilteredStats(effectivePeriod, salesFrom, salesTo),
    getOrderStats(period, salesFrom, salesTo, source),
    getAnalyticsData(salesFrom ? 'month' : analyticsPeriod, source, salesFrom, salesTo),
    getBuyerInsights(effectivePeriod, source, salesFrom, salesTo),
  ]);
  return new Response(JSON.stringify({ ...stats, orders, analytics, buyerInsights }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('moda_token')?.value || '';
  // Parol o'zgartirish va buyurtma o'chirish — faqat to'liq huquqli admin
  if (await getRole(token) !== 'owner') {
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

export const prerender = false;

import type { APIRoute } from 'astro';
import {
  verifyToken,
  ensureCashflowTable,
  getMonthlyCashflowBreakdown,
  listCashflowKirim,
  addCashflowKirim,
  deleteCashflowEntry,
  setMonthQoldiq,
  deleteMonthQoldiq,
} from '../../lib/analytics';

let cashflowReady = false;
async function ensure() {
  if (!cashflowReady) { await ensureCashflowTable(); cashflowReady = true; }
}

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get('moda_token')?.value || '';
  if (!await verifyToken(token)) return new Response('unauthorized', { status: 401 });
  await ensure();

  const breakdown = await getMonthlyCashflowBreakdown();
  const entries = await listCashflowKirim(200);

  return new Response(JSON.stringify({ ...breakdown, entries }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('moda_token')?.value || '';
  if (!await verifyToken(token)) return new Response('unauthorized', { status: 401 });
  await ensure();

  const body = await request.json();

  if (body.action === 'add_kirim') {
    const amount = Math.floor(+body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Summa noto'g'ri" }), { status: 400 });
    }
    const note = (body.note || '').toString().slice(0, 200);
    const dateStr = (body.date || '').toString().trim();
    let timestamp: Date | undefined;
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      timestamp = new Date(dateStr + 'T12:00:00+05:00');
      if (isNaN(timestamp.getTime())) {
        return new Response(JSON.stringify({ error: "Sana noto'g'ri" }), { status: 400 });
      }
    }
    const r = await addCashflowKirim(amount, note, timestamp);
    return new Response(JSON.stringify({ ok: true, item: { ...r, amount: +r.amount } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.action === 'set_qoldiq') {
    const month = (body.month || '').toString();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return new Response(JSON.stringify({ error: "Oy noto'g'ri" }), { status: 400 });
    }
    const amount = Math.floor(+body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return new Response(JSON.stringify({ error: "Qoldiq noto'g'ri" }), { status: 400 });
    }
    await setMonthQoldiq(month, amount);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.action === 'delete_qoldiq') {
    const month = (body.month || '').toString();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return new Response(JSON.stringify({ error: "Oy noto'g'ri" }), { status: 400 });
    }
    await deleteMonthQoldiq(month);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.action === 'delete') {
    const id = +body.id;
    if (!id) return new Response(JSON.stringify({ error: 'ID kerak' }), { status: 400 });
    await deleteCashflowEntry(id);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400 });
};

export const prerender = false;

import type { APIRoute } from 'astro';
import {
  getRole,
  ensureUzSalaryTable,
  getUzMonthProfit,
  sumUzWithdrawalsForMonth,
  getUzRolloverInto,
  getUzTrackingStartMonth,
  listUzWithdrawals,
  addUzWithdrawal,
  deleteUzWithdrawal,
  fmtMonth,
  tashkentParts,
} from '../../lib/analytics';

// Uzgets maoshi — yordamchi admin (assistant) va to'liq admin (owner) uchun ochiq.
async function allowed(token: string) {
  const role = await getRole(token);
  return role === 'assistant' || role === 'owner';
}

let ready = false;
async function ensure() {
  if (!ready) { await ensureUzSalaryTable(); ready = true; }
}

/**
 * Berilgan oy uchun: foyda, oldingi qoldiq, olingan va olish mumkin bo'lgan summa.
 * `available` manfiy bo'lishi mumkin — foydadan ortiq olinsa qarz sifatida qoladi
 * va keyingi oyga o'tadi.
 */
async function monthContext(month: string) {
  const trackingStart = await getUzTrackingStartMonth();
  // Kuzatuv boshlanishidan oldingi oylar hisobga olinmaydi
  if (month < trackingStart) {
    const profit = await getUzMonthProfit(month);
    return { month, profit, rollover: 0, pot: 0, withdrawn: 0, available: 0, over: 0, tracked: false };
  }
  const profit = await getUzMonthProfit(month);
  const rollover = await getUzRolloverInto(month);
  const withdrawn = await sumUzWithdrawalsForMonth(month);
  const pot = profit + rollover;
  return {
    month,
    profit,
    rollover,
    pot,
    withdrawn,
    available: pot - withdrawn,
    over: Math.max(0, withdrawn - pot),
    tracked: true,
  };
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('moda_token')?.value || '';
  if (!await allowed(token)) return new Response('unauthorized', { status: 401 });
  await ensure();

  const t = tashkentParts();
  const url = new URL(request.url);
  const asked = url.searchParams.get('month') || '';
  const month = /^\d{4}-\d{2}$/.test(asked) ? asked : fmtMonth(t.y, t.m);

  const trackingStart = await getUzTrackingStartMonth();
  const ctx = await monthContext(month);
  const recent = await listUzWithdrawals(200);

  return new Response(JSON.stringify({
    today: { y: t.y, m: t.m, day: t.day },
    trackingStart,
    ...ctx,
    recent: recent.map((r: any) => ({ ...r, amount: +r.amount })),
  }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('moda_token')?.value || '';
  if (!await allowed(token)) return new Response('unauthorized', { status: 401 });
  await ensure();

  const body = await request.json();
  const bad = (error: string) => new Response(JSON.stringify({ error }), {
    status: 400, headers: { 'Content-Type': 'application/json' },
  });

  if (body.action === 'add') {
    const amount = Math.floor(+body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return bad("Summa noto'g'ri");

    const note = (body.note || '').toString().slice(0, 200);
    const t = tashkentParts();
    const todayStr = `${t.y}-${String(t.m).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
    const dateStr = (body.date || '').toString().trim() || todayStr;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return bad("Sana noto'g'ri");
    if (dateStr > todayStr) return bad('Kelajakdagi sana tanlab bo\'lmaydi');

    const month = dateStr.slice(0, 7);
    const trackingStart = await getUzTrackingStartMonth();
    if (month < trackingStart) return bad(`Hisob ${trackingStart} oyidan boshlangan — undan oldingi sana tanlab bo'lmaydi`);

    // Foydadan ortiq olish taqiqlanmaydi: qoldiq minusga o'tadi va keyingi oyga ko'chadi.

    const timestamp = new Date(dateStr + 'T12:00:00+05:00');
    if (isNaN(timestamp.getTime())) return bad("Sana noto'g'ri");

    const r = await addUzWithdrawal(amount, note, month, timestamp);
    return new Response(JSON.stringify({ ok: true, item: { ...r, amount: +r.amount } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.action === 'delete') {
    const id = +body.id;
    if (!id) return bad('ID kerak');
    await deleteUzWithdrawal(id);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return bad('unknown action');
};

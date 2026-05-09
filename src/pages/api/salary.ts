export const prerender = false;

import type { APIRoute } from 'astro';
import {
  verifyToken,
  ensureSalaryTable,
  getMonthProfit,
  sumWithdrawalsForMonth,
  getRolloverInto,
  listWithdrawals,
  addWithdrawal,
  deleteWithdrawal,
  activeAttributionMonth,
  shiftMonth,
  fmtMonth,
  tashkentParts,
} from '../../lib/analytics';

let salaryReady = false;
async function ensure() {
  if (!salaryReady) { await ensureSalaryTable(); salaryReady = true; }
}

async function buildContext(month: string) {
  const profit = await getMonthProfit(month);
  const rollover = await getRolloverInto(month);
  const pot = profit + rollover;
  const withdrawn = await sumWithdrawalsForMonth(month);
  return { month, profit, rollover, pot, withdrawn };
}

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get('moda_token')?.value || '';
  if (!await verifyToken(token)) return new Response('unauthorized', { status: 401 });
  await ensure();

  const t = tashkentParts();
  const currentMonth = fmtMonth(t.y, t.m);
  const prevMonth = shiftMonth(currentMonth, -1);
  const inClosingWindow = t.day <= 5;

  const current = await buildContext(currentMonth);
  // Joriy oy uchun limit (rollover bilan):
  // - 1-5 (closing window): hozir tavsiya etilmaydi (yangi sikl boshlanmoqda)
  // - 6-end: 50% × pot
  const currentLimit = inClosingWindow ? 0 : Math.floor(current.pot * 0.5);
  const currentAvailable = Math.max(0, currentLimit - current.withdrawn);
  const currentOver = Math.max(0, current.withdrawn - currentLimit);

  let closing: any = null;
  if (inClosingWindow) {
    const closingCtx = await buildContext(prevMonth);
    // Yopilish davrida to'liq potdan olishingiz mumkin
    const closingAvailable = Math.max(0, closingCtx.pot - closingCtx.withdrawn);
    const closingOver = Math.max(0, closingCtx.withdrawn - closingCtx.pot);
    closing = { ...closingCtx, available: closingAvailable, over: closingOver };
  }

  const recent = await listWithdrawals(200);

  return new Response(JSON.stringify({
    today: { y: t.y, m: t.m, day: t.day },
    inClosingWindow,
    defaultAttribMonth: inClosingWindow ? prevMonth : currentMonth,
    current: {
      ...current,
      limit: currentLimit,
      available: currentAvailable,
      over: currentOver,
      phase: inClosingWindow ? 'new_starting' : (t.day <= 15 ? 'first_half' : 'second_half'),
    },
    closing,
    recent: recent.map((r: any) => ({ ...r, amount: +r.amount })),
  }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('moda_token')?.value || '';
  if (!await verifyToken(token)) return new Response('unauthorized', { status: 401 });
  await ensure();

  const body = await request.json();

  if (body.action === 'add') {
    const amount = Math.floor(+body.amount);
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Summa noto'g'ri" }), { status: 400 });
    }
    const note = (body.note || '').toString().slice(0, 200);
    const month = (body.month || activeAttributionMonth()).toString();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return new Response(JSON.stringify({ error: "Oy formati noto'g'ri" }), { status: 400 });
    }
    const r = await addWithdrawal(amount, note, month);
    return new Response(JSON.stringify({ ok: true, item: { ...r, amount: +r.amount } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.action === 'delete') {
    const id = +body.id;
    if (!id) return new Response(JSON.stringify({ error: 'ID kerak' }), { status: 400 });
    await deleteWithdrawal(id);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400 });
};

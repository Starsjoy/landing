export const prerender = false;

import type { APIRoute } from 'astro';
import {
  verifyToken,
  ensureSalaryTable,
  getMonthProfit,
  sumWithdrawalsForMonth,
  getRolloverInto,
  getTrackingStartMonth,
  listWithdrawals,
  addWithdrawal,
  deleteWithdrawal,
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
  const startMonth = await getTrackingStartMonth();
  // Closing context faqat o'tgan oy ham kuzatilgan bo'lsa ko'rinadi
  const showClosing = inClosingWindow && prevMonth >= startMonth;

  const current = await buildContext(currentMonth);
  // Limit qoidasi (foydalanuvchi tushuntiruvi bo'yicha):
  // - Rollover (o'tgan qoldiq) — limitsiz, istalgan vaqt to'liq olinadi
  // - Joriy oy yangi foydasi — faqat 50% (1–oxiri davomida)
  // - Closing window (1-5) yangi oy uchun: hech qanday tavsiya yo'q (yangi sikl boshlanmoqda)
  let currentLimit = 0;
  let phase: 'new_starting' | 'first_half' | 'second_half';
  if (showClosing) {
    currentLimit = 0;
    phase = 'new_starting';
  } else {
    currentLimit = current.rollover + Math.floor(current.profit * 0.5);
    phase = t.day <= 15 ? 'first_half' : 'second_half';
  }
  const currentAvailable = Math.max(0, currentLimit - current.withdrawn);
  const currentOver = Math.max(0, current.withdrawn - currentLimit);

  let closing: any = null;
  if (showClosing) {
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
    showClosing,
    trackingStart: startMonth,
    defaultAttribMonth: showClosing ? prevMonth : currentMonth,
    current: {
      ...current,
      limit: currentLimit,
      available: currentAvailable,
      over: currentOver,
      phase,
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
    const dateStr = (body.date || '').toString().trim();

    let timestamp: Date | undefined;
    let y: number, m: number, day: number;

    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      timestamp = new Date(dateStr + 'T12:00:00+05:00');
      if (isNaN(timestamp.getTime())) {
        return new Response(JSON.stringify({ error: "Sana noto'g'ri" }), { status: 400 });
      }
      const tz = new Date(timestamp.getTime() + 5 * 60 * 60 * 1000);
      y = tz.getUTCFullYear();
      m = tz.getUTCMonth() + 1;
      day = tz.getUTCDate();
    } else {
      const t = tashkentParts();
      y = t.y; m = t.m; day = t.day;
    }

    const cur = fmtMonth(y, m);
    const prev = shiftMonth(cur, -1);
    const start = await getTrackingStartMonth();
    const month = (day <= 5 && prev >= start) ? prev : cur;

    const r = await addWithdrawal(amount, note, month, timestamp);
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

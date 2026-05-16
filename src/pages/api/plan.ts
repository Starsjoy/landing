export const prerender = false;

import type { APIRoute } from 'astro';
import {
  verifyToken,
  ensurePlanTable,
  getPlan,
  setPlan,
  deletePlan,
  getMonthProfit,
  getDailyProfitsForMonth,
  daysInMonth,
  shiftMonth,
  fmtMonth,
  tashkentParts,
} from '../../lib/analytics';

let ready = false;
async function ensure() {
  if (!ready) { await ensurePlanTable(); ready = true; }
}

function validMonth(m: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const token = cookies.get('moda_token')?.value || '';
  if (!await verifyToken(token)) return new Response('unauthorized', { status: 401 });
  await ensure();

  const t = tashkentParts();
  const currentMonth = fmtMonth(t.y, t.m);
  const qMonth = url.searchParams.get('month') || currentMonth;
  if (!validMonth(qMonth)) {
    return new Response(JSON.stringify({ error: 'month format YYYY-MM' }), { status: 400 });
  }

  const isCurrent = qMonth === currentMonth;
  const isPast = qMonth < currentMonth;
  const totalDays = daysInMonth(qMonth);
  // Joriy oy uchun "bugun" = Tashkent kuni; o'tgan oy uchun = totalDays (to'liq)
  let dayToday = totalDays;
  if (isCurrent) dayToday = t.day;
  else if (!isPast) dayToday = 0; // kelajak oy — hali boshlanmagan

  const target = await getPlan(qMonth);
  const profitToDate = await getMonthProfit(qMonth);
  const daily = await getDailyProfitsForMonth(qMonth);

  // Kunlik to'liq breakdown: 1..totalDays
  const dailyMap: Record<number, number> = {};
  daily.forEach((d: any) => { dailyMap[d.day] = d.profit; });
  const breakdown = [];
  let cum = 0;
  for (let d = 1; d <= totalDays; d++) {
    const p = dailyMap[d] || 0;
    if (isCurrent && d > dayToday) {
      breakdown.push({ day: d, profit: 0, cumulative: cum, future: true });
    } else if (!isPast && !isCurrent) {
      breakdown.push({ day: d, profit: 0, cumulative: 0, future: true });
    } else {
      cum += p;
      breakdown.push({ day: d, profit: p, cumulative: cum, future: false });
    }
  }

  // Prognoz: kunlik o'rtachadan oyga chiziqli ekstrapolyatsiya
  let forecast = 0;
  let dailyAvg = 0;
  if (dayToday > 0) {
    dailyAvg = Math.round(profitToDate / dayToday);
    forecast = isCurrent ? Math.round(dailyAvg * totalDays) : profitToDate;
  }

  // Kerakli kunlik pace (bugundan boshlab)
  const daysRemaining = Math.max(0, totalDays - dayToday);
  let dailyPaceNeeded = 0;
  if (target && isCurrent && daysRemaining > 0) {
    const remainingNeeded = Math.max(0, target - profitToDate);
    dailyPaceNeeded = Math.ceil(remainingNeeded / daysRemaining);
  }

  // Bugun uchun kerakli summa (kunlik o'rtacha pace = target / totalDays)
  let dailyTargetAvg = 0;
  if (target) dailyTargetAvg = Math.ceil(target / totalDays);

  // Bugungi sana uchun "kutilgan" foyda (linear pace)
  let expectedToDate = 0;
  if (target && dayToday > 0) expectedToDate = Math.round(target * (dayToday / totalDays));

  // Bugungi foyda (faqat shu kunlik bucket)
  let todayProfit = 0;
  if (isCurrent && dayToday > 0) {
    const todayBucket = breakdown.find((b: any) => b.day === dayToday);
    todayProfit = todayBucket ? todayBucket.profit : 0;
  }

  // Bugun shuncha bo'lsa, prognoz rejaga to'g'ri keladigan summa:
  // forecast = (P / D) × T = target  =>  P = target × D / T (= expectedToDate)
  // P = profit_through_yesterday + today_amount
  // today_amount = expectedToDate - profit_through_yesterday
  let todayNeeded = 0;
  if (target && isCurrent && dayToday > 0) {
    const profitYesterday = Math.max(0, profitToDate - todayProfit);
    todayNeeded = Math.max(0, Math.ceil(expectedToDate - profitYesterday));
  }

  // Signal: yashil / sariq / qizil
  // Yashil: prognoz >= target
  // Sariq: prognoz 90–99% target (10% gacha kam)
  // Qizil: prognoz < 90% target (10%+ kam)
  let signal: 'green' | 'yellow' | 'red' | 'none' = 'none';
  if (target && target > 0) {
    const pct = forecast / target;
    if (pct >= 1.0) signal = 'green';
    else if (pct >= 0.9) signal = 'yellow';
    else signal = 'red';
  }

  // O'tgan oy foydasi va tavsiya: prev_profit * 1.3 (yaxlitlash 100k ga)
  const prevMonth = shiftMonth(qMonth, -1);
  const prevProfit = await getMonthProfit(prevMonth);
  let suggested = 0;
  if (prevProfit > 0) {
    const raw = Math.round(prevProfit * 1.3);
    suggested = Math.ceil(raw / 100000) * 100000; // 100 000 so'mga yaxlit
  }

  return new Response(JSON.stringify({
    month: qMonth,
    isCurrent,
    isPast,
    totalDays,
    dayToday,
    daysRemaining,
    target: target || 0,
    profitToDate,
    forecast,
    dailyAvg,
    dailyTargetAvg,
    dailyPaceNeeded,
    expectedToDate,
    signal,
    suggested,
    prevMonth,
    prevProfit,
    breakdown,
  }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('moda_token')?.value || '';
  if (!await verifyToken(token)) return new Response('unauthorized', { status: 401 });
  await ensure();

  const body = await request.json();

  if (body.action === 'set') {
    const month = (body.month || '').toString();
    if (!validMonth(month)) {
      return new Response(JSON.stringify({ error: "Oy formati noto'g'ri" }), { status: 400 });
    }
    const target = Math.floor(+body.target);
    if (!target || target <= 0) {
      return new Response(JSON.stringify({ error: "Reja noto'g'ri" }), { status: 400 });
    }
    await setPlan(month, target);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (body.action === 'delete') {
    const month = (body.month || '').toString();
    if (!validMonth(month)) {
      return new Response(JSON.stringify({ error: "Oy formati noto'g'ri" }), { status: 400 });
    }
    await deletePlan(month);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400 });
};

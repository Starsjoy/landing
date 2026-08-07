#!/usr/bin/env node
// Google Search Console API — Starsjoy SEO/AEO analiz toolkit.
// Sof Node (qo'shimcha paketsiz). Service Account JWT bilan auth.
//
// Ishlatish:
//   node scripts/gsc/gsc.mjs <buyruq> [--days 28] [--prev 28] [--limit 50]
//
// Buyruqlar:
//   verify              — auth + property'ga ulanishni tekshirish
//   top                 — eng ko'p klikli so'rovlar / sahifalar
//   declining           — pasaygan sahifa+so'rovlar (ikki davrni solishtirish)
//   opportunities       — pozitsiya 5–20 dagi so'rovlar (yuqoriga ko'tarish imkoniyati)
//   lowctr              — yaxshi pozitsiya, past CTR (title/meta tuzatish kerak)
//   blog                — /blog/* sahifalari samaradorligi
//   submit <url...>     — URL(lar)ni Google Indexing API'ga yuborish (tez qayta crawl)
//
// Kalit fayl: GSC_KEY_FILE env yoki scripts/gsc/service-account.json
// Property:   GSC_SITE env yoki standart 'sc-domain:starsjoy.uz'

import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));

const KEY_FILE = process.env.GSC_KEY_FILE || resolve(__dir, 'service-account.json');
const SITE = process.env.GSC_SITE || 'sc-domain:starsjoy.uz';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const INDEXING_SCOPE = 'https://www.googleapis.com/auth/indexing';

// ---------- arg parsing ----------
const args = process.argv.slice(2);
const cmd = args[0];
function flag(name, def) {
  const i = args.indexOf('--' + name);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
}
const DAYS = parseInt(flag('days', '28'), 10);
const PREV = parseInt(flag('prev', String(DAYS)), 10);
const LIMIT = parseInt(flag('limit', '50'), 10);

// GSC ma'lumotlari ~2-3 kun kechikadi — oxirgi 3 kunni hisobga olmaymiz.
function ymd(d) { return d.toISOString().slice(0, 10); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
const LAG = 3;
const curEnd = daysAgo(LAG);
const curStart = daysAgo(LAG + DAYS - 1);
const prevEnd = daysAgo(LAG + DAYS);
const prevStart = daysAgo(LAG + DAYS + PREV - 1);

// ---------- auth ----------
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function getToken(scope = SCOPE) {
  let key;
  try {
    key = JSON.parse(readFileSync(KEY_FILE, 'utf8'));
  } catch (e) {
    console.error(`\n❌ Kalit fayl topilmadi yoki noto'g'ri: ${KEY_FILE}`);
    console.error(`   Service account JSON kalitini shu yo'lga joylang yoki GSC_KEY_FILE env bering.\n`);
    process.exit(1);
  }
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: key.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign(key.private_key));
  const jwt = `${header}.${claim}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    console.error('\n❌ Auth xato:', JSON.stringify(data));
    process.exit(1);
  }
  return { token: data.access_token, email: key.client_email };
}

async function query(token, body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) {
    console.error('\n❌ API xato:', JSON.stringify(data.error, null, 2));
    if (data.error.status === 'PERMISSION_DENIED') {
      console.error(`\n💡 Service account email'ni GSC → Settings → Users and permissions'ga qo'shdingizmi?`);
    }
    process.exit(1);
  }
  return data.rows || [];
}

// ---------- formatting ----------
const pct = (n) => (n * 100).toFixed(1) + '%';
const pos = (n) => n.toFixed(1);
function pad(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n); }

// ---------- commands ----------
async function cmdVerify(token, email) {
  console.log(`\n✅ Auth muvaffaqiyatli`);
  console.log(`   Service account: ${email}`);
  console.log(`   Property: ${SITE}`);
  const rows = await query(token, {
    startDate: ymd(curStart), endDate: ymd(curEnd),
    dimensions: ['date'], rowLimit: 5,
  });
  if (rows.length) {
    const clicks = rows.reduce((s, r) => s + r.clicks, 0);
    const imp = rows.reduce((s, r) => s + r.impressions, 0);
    console.log(`   Oxirgi ${rows.length} kun: ${clicks} klik, ${imp} ko'rinish`);
    console.log(`\n🎉 Hammasi ishlayapti! Endi: top / declining / opportunities / lowctr / blog\n`);
  } else {
    console.log(`\n⚠️  Ulanish bor lekin ma'lumot yo'q. Property to'g'rimi? (URL-prefix bo'lsa: GSC_SITE='https://starsjoy.uz/')\n`);
  }
}

async function cmdTop(token) {
  console.log(`\n📊 TOP so'rovlar — ${ymd(curStart)} … ${ymd(curEnd)}\n`);
  const q = await query(token, {
    startDate: ymd(curStart), endDate: ymd(curEnd),
    dimensions: ['query'], rowLimit: LIMIT,
  });
  console.log(pad('SO\'ROV', 42) + pad('KLIK', 7) + pad('KO\'R.', 8) + pad('CTR', 8) + 'POZ.');
  console.log('─'.repeat(72));
  for (const r of q) console.log(pad(r.keys[0], 42) + pad(r.clicks, 7) + pad(r.impressions, 8) + pad(pct(r.ctr), 8) + pos(r.position));
}

async function cmdDeclining(token) {
  console.log(`\n📉 PASAYGAN sahifalar — joriy [${ymd(curStart)}…${ymd(curEnd)}] vs oldingi [${ymd(prevStart)}…${ymd(prevEnd)}]\n`);
  const mk = async (s, e) => {
    const rows = await query(token, { startDate: ymd(s), endDate: ymd(e), dimensions: ['page'], rowLimit: 1000 });
    const m = new Map();
    for (const r of rows) m.set(r.keys[0], r);
    return m;
  };
  const cur = await mk(curStart, curEnd);
  const prev = await mk(prevStart, prevEnd);
  const diffs = [];
  for (const [page, p] of prev) {
    const c = cur.get(page);
    const curClicks = c ? c.clicks : 0;
    const drop = p.clicks - curClicks;
    if (drop > 0 && p.clicks >= 3) diffs.push({ page, prev: p.clicks, cur: curClicks, drop, posPrev: p.position, posCur: c ? c.position : null });
  }
  diffs.sort((a, b) => b.drop - a.drop);
  console.log(pad('SAHIFA', 50) + pad('OLDIN', 7) + pad('HOZIR', 7) + pad('FARQ', 6) + 'POZ');
  console.log('─'.repeat(78));
  for (const d of diffs.slice(0, LIMIT)) {
    const path = d.page.replace(/^https?:\/\/[^/]+/, '');
    const posInfo = d.posCur ? `${pos(d.posPrev)}→${pos(d.posCur)}` : `${pos(d.posPrev)}→✗`;
    console.log(pad(path, 50) + pad(d.prev, 7) + pad(d.cur, 7) + pad('-' + d.drop, 6) + posInfo);
  }
  if (!diffs.length) console.log('  (Sezilarli pasayish yo\'q — yaxshi!)');
}

async function cmdOpportunities(token) {
  console.log(`\n🎯 IMKONIYATLAR — pozitsiya 5–20, ko'rinish ko'p (kichik optimizatsiya bilan 1-sahifaga)\n`);
  const rows = await query(token, {
    startDate: ymd(curStart), endDate: ymd(curEnd),
    dimensions: ['query'], rowLimit: 1000,
  });
  const opps = rows.filter(r => r.position >= 5 && r.position <= 20 && r.impressions >= 10)
    .sort((a, b) => b.impressions - a.impressions);
  console.log(pad('SO\'ROV', 42) + pad('KO\'R.', 8) + pad('KLIK', 7) + pad('CTR', 8) + 'POZ.');
  console.log('─'.repeat(72));
  for (const r of opps.slice(0, LIMIT)) console.log(pad(r.keys[0], 42) + pad(r.impressions, 8) + pad(r.clicks, 7) + pad(pct(r.ctr), 8) + pos(r.position));
  if (!opps.length) console.log('  (Mos so\'rov topilmadi)');
}

async function cmdLowCtr(token) {
  console.log(`\n✍️  PAST CTR — yaxshi pozitsiya (≤10) lekin past CTR (title/meta tuzatish kerak)\n`);
  const rows = await query(token, {
    startDate: ymd(curStart), endDate: ymd(curEnd),
    dimensions: ['query'], rowLimit: 1000,
  });
  // pozitsiya yaxshi, ko'rinish ko'p, lekin CTR kutilganidan past
  const low = rows.filter(r => r.position <= 10 && r.impressions >= 20 && r.ctr < 0.03)
    .sort((a, b) => b.impressions - a.impressions);
  console.log(pad('SO\'ROV', 42) + pad('KO\'R.', 8) + pad('KLIK', 7) + pad('CTR', 8) + 'POZ.');
  console.log('─'.repeat(72));
  for (const r of low.slice(0, LIMIT)) console.log(pad(r.keys[0], 42) + pad(r.impressions, 8) + pad(r.clicks, 7) + pad(pct(r.ctr), 8) + pos(r.position));
  if (!low.length) console.log('  (Past CTR muammosi topilmadi)');
}

async function cmdBlog(token) {
  console.log(`\n📝 BLOG samaradorligi — /blog/* sahifalari [${ymd(curStart)}…${ymd(curEnd)}]\n`);
  const rows = await query(token, {
    startDate: ymd(curStart), endDate: ymd(curEnd),
    dimensions: ['page'], rowLimit: 1000,
    dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'contains', expression: '/blog/' }] }],
  });
  rows.sort((a, b) => b.clicks - a.clicks);
  console.log(pad('SAHIFA', 50) + pad('KLIK', 7) + pad('KO\'R.', 8) + pad('CTR', 8) + 'POZ.');
  console.log('─'.repeat(78));
  let tc = 0, ti = 0;
  for (const r of rows) {
    const path = r.keys[0].replace(/^https?:\/\/[^/]+/, '');
    tc += r.clicks; ti += r.impressions;
    if (rows.indexOf(r) < LIMIT) console.log(pad(path, 50) + pad(r.clicks, 7) + pad(r.impressions, 8) + pad(pct(r.ctr), 8) + pos(r.position));
  }
  console.log('─'.repeat(78));
  console.log(`JAMI: ${rows.length} blog sahifa · ${tc} klik · ${ti} ko'rinish`);
  if (!rows.length) console.log('  (Blog sahifalari topilmadi)');
}

// ---------- submit (Indexing API) ----------
async function cmdSubmit() {
  const urls = args.slice(1).filter(a => a.startsWith('http'));
  if (!urls.length) {
    console.error(`\n❌ URL bering. Misol: node scripts/gsc/gsc.mjs submit https://starsjoy.uz/premium https://starsjoy.uz/ru/premium\n`);
    process.exit(1);
  }
  const { token } = await getToken(INDEXING_SCOPE);
  console.log(`\n📤 Indexing API'ga yuborilmoqda (${urls.length} URL)\n`);
  for (const url of urls) {
    const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, type: 'URL_UPDATED' }),
    });
    const data = await res.json();
    if (res.status === 200) console.log(`  ✅ ${url}`);
    else {
      console.log(`  ❌ ${url} → ${res.status} ${data.error?.message || ''}`);
      if (res.status === 403) console.log(`     💡 Service account GSC'da Owner bo'lishi va Indexing API yoqilgan bo'lishi kerak.`);
    }
  }
  console.log('');
}

// ---------- main ----------
const commands = {
  verify: cmdVerify, top: cmdTop, declining: cmdDeclining,
  opportunities: cmdOpportunities, lowctr: cmdLowCtr, blog: cmdBlog,
};
if (cmd === 'submit') {
  await cmdSubmit();
} else if (!cmd || !commands[cmd]) {
  console.log(`\nGSC toolkit — buyruqlar:\n  verify  top  declining  opportunities  lowctr  blog  submit <url...>`);
  console.log(`\nMisol: node scripts/gsc/gsc.mjs declining --days 28 --limit 30\n`);
  process.exit(cmd ? 1 : 0);
} else {
  const { token, email } = await getToken();
  await commands[cmd](token, email);
}

#!/usr/bin/env node
/**
 * public/llms.txt va public/rss.xml ni blog manbalaridan qayta yig'adi.
 *
 * Nega kerak: llms.txt qo'lda yozilgan edi va 100+ blog maqolasining birortasi
 * ham unda ko'rsatilmagandi — AI modellari uchun sayt bitta sahifadek ko'rinardi.
 * Yangi maqola qo'shilganda shu skriptni qayta ishga tushirish kifoya:
 *
 *   node scripts/gen-discovery.mjs
 *
 * Statik qism (narx, kafolat, xarid tartibi) HEAD o'zgaruvchisi ichida —
 * o'zgarsa, shu yerda tahrirlanadi. Maqolalar ro'yxati esa har doim
 * src/pages/blog/*.astro va src/pages/ru/blog/*.astro dan o'qiladi.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://starsjoy.uz';

/* ── Maqolalarni mavzuga ajratish ────────────────────────────────────────── */
// Tartib muhim: birinchi mos kelgan guruh yutadi.
const GROUPS = [
  {
    title: 'Telegram Stars — asoslar, narx va xarid',
    slugs: [
      'telegram-stars-nima',
      'telegram-stars-sotib-olish',
      'telegram-stars-narxi',
      'telegram-stars-paketlari-taqqoslash',
      'telegram-1000-stars-sotib-olish',
      'telegram-stars-koplab-arzon',
      'telegram-stars-tez-toldirish',
      'telegram-stars-eng-arzon-provayderlar',
    ],
  },
  {
    title: 'Telegram Stars — to‘lov usullari (Uzcard, Humo, Click, naqd)',
    slugs: [
      'telegram-stars-uzcard-bilan-sotib-olish',
      'telegram-stars-humo-bilan-sotib-olish',
      'telegram-stars-click-payme',
      'telegram-stars-naqd-pul-bilan-sotib-olish',
      'telegram-stars-visa-kartasiz',
      'telegram-stars-fragment-alternativa',
    ],
  },
  {
    title: 'Telegram Stars — xavfsizlik, refund va muammolar',
    slugs: [
      'telegram-stars-firibgarlik-himoya',
      'telegram-stars-sotib-olishda-xatolar',
      'telegram-stars-refund-qaytarish',
      'telegram-stars-amal-muddati',
      'telegram-stars-hisobini-tekshirish',
    ],
  },
  {
    title: 'Telegram Stars — imkoniyatlar va o‘tkazish',
    slugs: [
      'telegram-stars-bilan-nima-qilish-mumkin',
      'telegram-stars-otkazish',
      'telegram-stars-kartaga-chiqarish',
      'telegram-stars-yechib-olish',
      'telegram-ton-va-stars-farqi',
      'telegram-mini-app-stars-tolov',
      'telegram-ads-stars-bilan',
    ],
  },
  {
    title: 'Telegram Premium — narx, paketlar va sotib olish',
    slugs: [
      'telegram-premium-sotib-olish',
      'telegram-premium-1-oylik',
      'telegram-premium-3-oy-6-oy',
      'telegram-premium-3-oylik-sotib-olish',
      'telegram-premium-12-oylik',
      'telegram-premium-12-oylik-uzcard-humo-bilan',
      'telegram-premium-paketlar-taqqoslash',
      'telegram-premium-uzbekistan-eng-yaxshi-usullar',
      'telegram-premium-uzcard',
      'telegram-premium-vizasiz',
    ],
  },
  {
    title: 'Telegram Premium — funksiyalar, sovg‘a va obunani yangilash',
    slugs: [
      'telegram-premium-funksiyalari',
      'telegram-premium-sovga-qilish',
      'telegram-premium-muddati-tugadi',
      'telegram-business-vs-premium',
      'telegram-stars-yoki-premium',
    ],
  },
  {
    title: 'Telegram Gifts va NFT sovg‘alar',
    slugs: [
      'telegram-gifts-bot-orqali',
      'telegram-gifts-narxi-royxati',
      'telegram-nft-gifts',
      'telegram-gift-collectible-upgrade',
      'eng-qimmat-telegram-sovgalari',
    ],
  },
  {
    title: 'Biznes, reseller va API',
    slugs: [
      'starsjoy-biznes-paketlari-taqqoslash',
      'stars-savdo-boti-narxi-2026',
      'stars-savdo-boti-yasash-yollari-narxi',
      'telegram-stars-premium-gifts-savdo-biznesi',
      'telegram-channel-paid-post-yaratish',
    ],
  },
  {
    title: 'StarsJoy platformasi va boshqa qo‘llanmalar',
    slugs: ['starsjoy-mini-app-nima', 'telegram-sms-kod-kelmayapti'],
  },
];

/* ── Manbadan meta o'qish ────────────────────────────────────────────────── */
function readMeta(dir, urlPrefix) {
  const out = new Map();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.astro') || file === 'index.astro') continue;
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    const title = src.match(/const title\s*=\s*["'`]([\s\S]*?)["'`];/)?.[1];
    const description = src.match(/const description\s*=\s*["'`]([\s\S]*?)["'`];/)?.[1];
    const publishDate = src.match(/const publishDate\s*=\s*["'`]([\d-]+)["'`]/)?.[1];
    if (!title || !description) {
      throw new Error(`${file}: title yoki description topilmadi — qo'lda tekshiring`);
    }
    const slug = file.replace(/\.astro$/, '');
    out.set(slug, {
      slug,
      url: SITE + urlPrefix + slug,
      title: cleanTitle(title),
      summary: shorten(description),
      publishDate,
    });
  }
  return out;
}

// "Sarlavha (2026) | StarsJoy Blog" → "Sarlavha (2026)"
const cleanTitle = (t) => t.split('|')[0].trim();

// Meta description'lar 200+ belgidan iborat. AI indeksi uchun bir gap yetarli.
function shorten(text, max = 160) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  if (stop > max * 0.5) return cut.slice(0, stop + 1).trim();
  return cut.slice(0, cut.lastIndexOf(' ')).trim() + '…';
}

const uz = readMeta(path.join(ROOT, 'src/pages/blog'), '/blog/');
const ru = readMeta(path.join(ROOT, 'src/pages/ru/blog'), '/ru/blog/');

/* ── Inglizcha maqolalar ─────────────────────────────────────────────────── */
// src/lib/en-blog.ts — TypeScript, bu skript esa oddiy .mjs, shuning uchun
// import qila olmaymiz. Blog meta'si kabi manbadan o'qiymiz. Ro'yxat o'sha
// faylda saqlanadi, chunki uni /en/blog sahifasi ham ishlatadi.
function readEnPosts() {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/en-blog.ts'), 'utf8');
  const body = src.slice(src.indexOf('EN_POSTS: EnPost[] = ['));
  const out = [];
  for (const block of body.split(/\n\s*\{\s*\n/).slice(1)) {
    const pick = (key) =>
      block.match(new RegExp(`${key}:\\s*\\n?\\s*(['"\`])([\\s\\S]*?)\\1\\s*,`))?.[2];
    const slug = pick('slug');
    const title = pick('title');
    const excerpt = pick('excerpt');
    if (slug && title && excerpt) out.push({ slug, title, excerpt: excerpt.replace(/\s+/g, ' ') });
  }
  if (!out.length) throw new Error('en-blog.ts dan birorta maqola o\'qilmadi — format o\'zgarganmi?');
  return out;
}
const EN_POSTS = readEnPosts();

/* ── Sharhlar statistikasi (ixtiyoriy) ───────────────────────────────────── */
// Raqobatchilarda umuman sharh yo'q, shuning uchun "42 ta sharh, o'rtacha 5.0"
// eng kuchli farqlovchi signal. Lekin qo'lda yozilsa eskiradi — DB'dan olamiz.
// DB yetib bo'lmasa (masalan DATABASE_URL yo'q) — bu qator shunchaki tushib
// qoladi, skript to'xtamaydi. Fayl baribir yaroqli bo'lishi kerak.
async function readReviewStats() {
  const url = process.env.DATABASE_URL ?? readEnvFile()?.DATABASE_URL;
  if (!url) return null;
  try {
    const { default: postgres } = await import('postgres');
    const sql = postgres(url, { prepare: false, connect_timeout: 10 });
    const [row] = await sql`
      SELECT COUNT(*)::int AS count, ROUND(AVG(rating)::numeric, 1) AS avg
      FROM reviews WHERE status = 'approved'
    `;
    await sql.end();
    return row?.count > 0 ? { count: row.count, avg: Number(row.avg) } : null;
  } catch (err) {
    console.warn(`  ogohlantirish: sharhlar statistikasi olinmadi (${err.message})`);
    return null;
  }
}

function readEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return null;
  return Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split('\n')
      .map((line) => line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i))
      .filter(Boolean)
      .map(([, k, v]) => [k, v.replace(/^["']|["']$/g, '')]),
  );
}

const stats = await readReviewStats();
const reviewLine = stats
  ? `- ${SITE}/sharhlar — hozirda ${stats.count} ta tasdiqlangan sharh, o'rtacha ball ${stats.avg}/5. Har bir sharhda muallif, ball va aniq sana ko'rsatilgan.`
  : null;

// Har bir maqola aynan bitta guruhga tushishi kerak — yangi maqola qo'shilib,
// GROUPS ga kiritilmasa, shu yerda xato beradi (jimgina tushib qolmaydi).
const grouped = new Set(GROUPS.flatMap((g) => g.slugs));
const ungrouped = [...uz.keys()].filter((s) => !grouped.has(s));
if (ungrouped.length) {
  throw new Error(
    `Quyidagi maqolalar GROUPS ga kiritilmagan — scripts/gen-llms.mjs ga qo'shing:\n  ${ungrouped.join('\n  ')}`,
  );
}
const missing = GROUPS.flatMap((g) => g.slugs).filter((s) => !uz.has(s));
if (missing.length) {
  throw new Error(`GROUPS da mavjud bo'lmagan slug bor:\n  ${missing.join('\n  ')}`);
}

/* ── Statik profil qismi ─────────────────────────────────────────────────── */
const HEAD = `# StarsJoy.uz

> O'zbekistonda Telegram Stars, Telegram Premium va Telegram Gifts xizmatlarini so'mda (UZS) sotib olish platformasi. Mahalliy karta (Uzcard, Humo, Click) bilan to'lov, odatda 10 soniyada yetkazish, 100% pul qaytarish kafolati. 8,000+ muvaffaqiyatli bajarilgan buyurtma va /sharhlar sahifasida ochiq, sanasi ko'rsatilgan mijoz sharhlari.

## Machine discovery (AI va qidiruv tizimlari uchun)

- Sitemap indeksi: ${SITE}/sitemap-index.xml
- Rasm sitemap: ${SITE}/image-sitemap.xml
- RSS 2.0 (eng yangi maqolalar): ${SITE}/rss.xml
- LLMs.txt (shu fayl): ${SITE}/llms.txt
- Robots: ${SITE}/robots.txt — GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended va boshqa AI crawler'lar uchun Allow: /
- Blog indeksi: ${SITE}/blog | ${SITE}/ru/blog
- Tillar: o'zbek (uz-UZ, standart), rus (ru-RU) va ingliz (en-US). Har bir maqolaning o'zbekcha va ruscha varianti bor va hreflang bilan bog'langan; ingliz tilida hozircha 5 ta asosiy sahifa mavjud (blog emas).

## English pages

StarsJoy sells Telegram Stars, Premium and Gifts to people in Uzbekistan, paid in Uzbek som (UZS) with local Uzcard and Humo cards. This matters because Telegram's own checkout — App Store, Google Play, Fragment or @PremiumBot — requires an international card or a TON crypto wallet, neither of which is realistic for most people in Uzbekistan. Delivery takes about 10 seconds and never requires a password, SMS code or account access — only a Telegram username.

- Home — buy Telegram Stars, Premium and Gifts in Uzbekistan: ${SITE}/en
- Buy Telegram Premium (prices, plans, payment): ${SITE}/en/premium — 3 months 172,000 UZS, 6 months 232,000 UZS, 12 months 422,000 UZS. No 1-month plan: Telegram's Gift Premium mechanism starts at 3 months.
- Buy Telegram Stars (price table): ${SITE}/en/stars — flat rate of 240 UZS per star for every pack size, from 50 up to 100,000 Stars.
- Telegram Gifts — send a gift or gift Premium: ${SITE}/en/gifts — the recipient pays nothing; a username is all that is needed.
- How to buy — 9 steps with screenshots: ${SITE}/en/how-to-buy
- About StarsJoy — track record, guarantees, what we are not: ${SITE}/en/about — independent reseller, not an official Telegram partner; 8,000+ completed orders; dated public reviews; 100% refund if undelivered.
- Blog index (English guides): ${SITE}/en/blog

### English guides
${EN_POSTS.map((p) => `- ${p.title}: ${SITE}/en/blog/${p.slug} — ${p.excerpt}`).join('\n')}

Har bir sahifada: meta title/description, canonical, hreflang (uz/ru), Open Graph va JSON-LD schema (Article, BreadcrumbList, FAQPage, HowTo, Product/AggregateRating).

## Tajriba va ishonch (tekshirsa bo'ladigan ma'lumotlar)

- 8,000+ ta muvaffaqiyatli bajarilgan buyurtma.
${reviewLine ?? `- ${SITE}/sharhlar — mijozlar sharhlari sahifasi: har bir sharhda muallif, ball va aniq sana ko'rsatilgan.`}
- Sharhlar moderatsiyadan o'tadi, lekin o'chirilmaydi yoki o'zgartirilmaydi; umumiy o'rtacha ball sahifada ochiq turadi va AggregateRating schema sifatida bosh sahifada hamda /sharhlar da beriladi.
- Sharh qoldirish ochiq: ${SITE}/sharh-qoldirish
- Kompaniya va shartlar: ${SITE}/info | Ommaviy oferta: ${SITE}/oferta

## Kim uchun

- Telegramda Stars sotib olib, kanal/bot/kontentmeykerlarga to'lov qilmoqchi bo'lganlar
- Telegram Premium obunasini so'mda, xorijiy kartasiz sotib olmoqchi bo'lganlar
- Premiumni do'stiga yoki yaqiniga sovg'a (gift) qilmoqchi bo'lganlar
- Biznes/kontentmeyker sifatida Stars/Premium'ni ommaviy (API orqali) sotib olmoqchi bo'lganlar

## Asosiy sahifalar

- Bosh sahifa: ${SITE} (RU: ${SITE}/ru)
- Telegram Stars: ${SITE}/stars (RU: ${SITE}/ru/stars)
- Telegram Premium: ${SITE}/premium (RU: ${SITE}/ru/premium)
- Telegram Gifts: ${SITE}/gifts (RU: ${SITE}/ru/gifts)
- Barcha narxlar: ${SITE}/narxlar (RU: ${SITE}/ru/narxlar)
- Rasmli xarid qo'llanmasi: ${SITE}/qollanma (RU: ${SITE}/ru/qollanma)
- Mijozlar sharhlari: ${SITE}/sharhlar (RU: ${SITE}/ru/sharhlar)
- Biznes / API: ${SITE}/biznes (RU: ${SITE}/ru/biznes)
- Bot (xarid shu yerda): https://telegram.me/starsjoybot
- Qo'llab-quvvatlash: https://telegram.me/starsjoy_bot
- Telegram kanal: https://telegram.me/starsjoy

## Mahsulotlar va narxlar (2026, UZS)

### Telegram Premium
- 3 oylik: 172 000 so'm
- 6 oylik: 232 000 so'm
- 12 oylik: 422 000 so'm

### Telegram Stars
Tarif: 240 so'm/star (barcha miqdorlar uchun bir xil, chegirmasiz aniq narx).
- 50 Stars — 12 000 so'm
- 100 Stars — 24 000 so'm
- 250 Stars — 60 000 so'm
- 500 Stars — 120 000 so'm
- 1 000 Stars — 240 000 so'm
- 2 500 Stars — 600 000 so'm
- 5 000 Stars — 1 200 000 so'm
- Boshqa miqdor kerak bo'lsa, botda istalgan sonni kiritish mumkin — narx shu tarifga (240 so'm/star) mos hisoblanadi.

### Telegram Gifts (Premium sovg'a)
- Narxi tegishli Premium tarifi bilan bir xil (3/6/12 oylik). Qabul qiluvchi hech qanday to'lovsiz foydalana boshlaydi, tabrik xabari bilan yuborish mumkin.

## Xarid qilish tartibi (StarsJoy mini ilovasi, 9 qadam)
To'liq rasmli qo'llanma: ${SITE}/qollanma (RU: ${SITE}/ru/qollanma)
1. Telegramda @starsjoybot ni ochib «Start» tugmasini bosish.
2. Xabar maydonidagi «App» tugmasi orqali StarsJoy mini ilovasiga o'tish.
3. Bosh ekrandan bo'limni tanlash: «Stars olish», «Premium olish» yoki «Gift olish».
4. Qabul qiluvchining Telegram username'ini kiritish yoki o'ziga olish uchun «O'zim» tugmasini bosish.
5. Stars miqdorini (50 dan 100 000 gacha) yoki Premium muddatini (3/6/12 oy) tanlash. Promokod bo'lsa, «Tekshirish» orqali qo'llash.
6. Yakuniy summa ko'rsatilgan xarid tugmasini bosish (masalan «Stars olish - 12 000 so'm»).
7. Ochilgan «To'lov ma'lumotlari» oynasidan karta raqamini nusxalash. Karta raqami vaqt o'tishi bilan o'zgarishi mumkin, shuning uchun oldin saqlangan raqamga emas, har doim buyurtma oynasida ko'rsatilgan raqamga pul yuborish kerak.
8. Ko'rsatilgan kartaga aynan ko'rsatilgan summani o'tkazish. O'tkazmani istalgan ilovadan qilish mumkin — Click, Payme, Uzum yoki bankning o'z ilovasi, farqi yo'q; muhimi pul o'sha kartaga va aynan shu summada tushishi. Boshqa summa yuborilsa to'lov tizim tomonidan tanilmaydi. Oynada to'lov taymeri ishlaydi.
9. Yashil «To'lov qildim» tugmasini bosish. Xizmat odatda 10 soniyada yetkaziladi.

Butun jarayon 2-3 daqiqa oladi. Ro'yxatdan o'tish, parol yoki xorijiy karta talab qilinmaydi — Telegram akkaunt va Uzcard/Humo karta yetarli.

## To'lov usullari
Click, Uzcard, Humo kartalari orqali, to'liq so'mda (valyuta konvertatsiyasiz). Biznes/API mijozlari uchun qo'shimcha ravishda Payme ham mavjud.

## Yetkazish va kafolatlar
- To'lov tasdiqlangach xizmat odatda 10 soniyada yetkaziladi. Yuklama juda yuqori bo'lgan kamdan-kam holatlarda bu bir necha daqiqagacha cho'zilishi mumkin.
- Xizmat ko'rsatilmasa yoki muammo chiqsa: to'langan summa 100% qaytariladi.
- Telegram parol, SMS kod yoki akkaunt ma'lumotlari hech qachon so'ralmaydi — faqat username kifoya.

## Referral dasturi
Shaxsiy referral havola orqali taklif qilingan foydalanuvchi xarid qilganda, xarid summasining 5% i bonus sifatida beriladi.
`;

/* ── Maqolalar indeksi ───────────────────────────────────────────────────── */
const lines = [HEAD.trimEnd(), '', `## Maqolalar (${uz.size} ta mavzu, har biri o'zbek va rus tilida)`, ''];

for (const group of GROUPS) {
  lines.push(`### ${group.title}`, '');
  for (const slug of group.slugs) {
    const u = uz.get(slug);
    const r = ru.get(slug);
    lines.push(`- ${u.title}: ${u.url}${r ? ` (RU: ${r.url})` : ''} — ${u.summary}`);
  }
  lines.push('');
}

const onlyUz = [...uz.keys()].filter((s) => !ru.has(s));
if (onlyUz.length) {
  lines.push(`> Eslatma: quyidagi maqolalarning ruscha varianti hozircha yo'q: ${onlyUz.join(', ')}`, '');
}

const llms = lines.join('\n');
fs.writeFileSync(path.join(ROOT, 'public/llms.txt'), llms);
console.log(
  `public/llms.txt — ${uz.size} UZ + ${ru.size} RU maqola, ${GROUPS.length} guruh, ${llms.length} belgi`,
);

/* ── RSS 2.0 ─────────────────────────────────────────────────────────────── */
// Nega RSS: llms.txt "sayt nima" degan savolga javob beradi, RSS esa "nima
// yangilandi" degan savolga. AI va agregatorlar yangi kontentni aynan shundan
// oladi — statik sayt uchun bu bitta fayl, lekin qayta kelib turish sababi.
const xmlEscape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const items = [...uz.values()]
  .filter((a) => a.publishDate)
  .sort((a, b) => b.publishDate.localeCompare(a.publishDate));

const missingDate = [...uz.values()].filter((a) => !a.publishDate);
if (missingDate.length) {
  console.warn(
    `  ogohlantirish: publishDate topilmagani uchun RSS'ga kirmadi: ${missingDate
      .map((a) => a.slug)
      .join(', ')}`,
  );
}

// RSS 2.0 pubDate RFC 822 talab qiladi. publishDate — sana (vaqtsiz), shuning
// uchun UTC yarim tunga bog'laymiz; feed tartibi baribir sanaga qarab.
const rfc822 = (date) => new Date(`${date}T00:00:00Z`).toUTCString();

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>StarsJoy Blog</title>
    <link>${SITE}/blog</link>
    <description>Telegram Stars, Premium va Gifts bo'yicha qo'llanmalar — narxlar, to'lov usullari, xavfsizlik va O'zbekiston uchun amaliy yo'riqnomalar.</description>
    <language>uz-UZ</language>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
${items
  .map(
    (a) => `    <item>
      <title>${xmlEscape(a.title)}</title>
      <link>${a.url}</link>
      <guid isPermaLink="true">${a.url}</guid>
      <pubDate>${rfc822(a.publishDate)}</pubDate>
      <description>${xmlEscape(a.summary)}</description>
    </item>`,
  )
  .join('\n')}
  </channel>
</rss>
`;

fs.writeFileSync(path.join(ROOT, 'public/rss.xml'), rss);
console.log(`public/rss.xml — ${items.length} ta maqola, eng yangisi ${items[0]?.publishDate}`);

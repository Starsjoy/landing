/**
 * Blog rejasi (modad → "Reja"): StarsJoy, UzGets va Premium24 maqolalari 4 guruhda.
 *
 * Guruhlar (xaridor yo'li bo'yicha):
 *   sotib   — Sotib olish: qanday/qayerdan olinadi, to'lov usullari
 *   tanlov  — Narx va tanlov: narx, paket, solishtirish, arziydimi
 *   muammo  — Muammo va yordam: kelmadi, faollashmadi, muddati tugadi, qaytarish
 *   malumot — Ma'lumot va ishonch: nima, imkoniyatlar, xavfsizlik
 *
 * Yangi maqola qo'shishda: dublikat (shu loyihadagi chop etilgan va rejadagi maqolalar bilan) bloklanadi,
 * sotuv niyati tabiiy bo'lmasa ogohlantiriladi (egasi "baribir qo'shish" bilan o'tkazishi mumkin).
 * Chop etilganlar saytmap orqali sinxronlanadi.
 */
import postgres from 'postgres';
import SEED from './blog-plan-seed.json';

let _sql: ReturnType<typeof postgres> | null = null;
function getSQL() {
  if (_sql) return _sql;
  const url = import.meta.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  _sql = postgres(url, { prepare: false });
  return _sql;
}

// Dublikat faqat BITTA loyiha ichida tekshiriladi: 4 loyihada bir xil mavzu bo'lishi mumkin.
export const PROJECTS = {
  starsjoy: { name: 'StarsJoy', domain: 'https://starsjoy.uz', blogPath: '/blog' },
  uzgets: { name: 'UzGets', domain: 'https://uzgets.uz', blogPath: '/blog' },
  premium24: { name: 'Premium24', domain: 'https://premium24.uz', blogPath: '/blog' },
  premiumsend: { name: 'PremiumSend', domain: 'https://premiumsend.uz', blogPath: '/maqolalar' },
} as const;
export type Project = keyof typeof PROJECTS;
export const CODES: Record<string, string> = { starsjoy: 'STJ', uzgets: 'UZG', premium24: 'P24', premiumsend: 'PRS' };
export const GROUPS = ['sotib', 'tanlov', 'muammo', 'malumot'] as const;
export type Group = (typeof GROUPS)[number];
export const STATUSES = ['reja', 'yozilmoqda', 'chop', 'toxtatildi'] as const;

export type PlanItem = {
  id: number; num: number | null; project: Project; grp: Group; title: string; keyword: string;
  slug_uz: string | null; slug_ru: string | null; slug_en: string | null;
  money_page: string; status: string; score: number | null;
  clicks: number; buy_clicks: number; note: string; published: string | null; source: string;
};

let ready: Promise<void> | null = null;
export function ensureBlogPlan() {
  if (!ready) ready = (async () => {
    const sql = getSQL();
    await sql`
      CREATE TABLE IF NOT EXISTS blog_plan (
        id SERIAL PRIMARY KEY,
        project TEXT NOT NULL,
        grp TEXT NOT NULL,
        title TEXT NOT NULL,
        keyword TEXT NOT NULL DEFAULT '',
        slug_uz TEXT, slug_ru TEXT, slug_en TEXT,
        money_page TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'reja',
        score INTEGER,
        clicks INTEGER NOT NULL DEFAULT 0,
        buy_clicks INTEGER NOT NULL DEFAULT 0,
        note TEXT NOT NULL DEFAULT '',
        published DATE,
        source TEXT NOT NULL DEFAULT 'seed',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_plan_slug ON blog_plan(project, slug_uz) WHERE slug_uz IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_blog_plan_project ON blog_plan(project)`;
    // Doimiy raqam: STJ-1, P24-3 ... (loyiha ichida, bir marta beriladi, o'zgarmaydi)
    await sql`ALTER TABLE blog_plan ADD COLUMN IF NOT EXISTS num INTEGER`;
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM blog_plan`;
    if (n === 0) {
      // Boshlang'ich ma'lumot: 2026-11-21 holati (GSC 90 kun: klik va xarid niyatidagi klik)
      for (const s of SEED as any[]) {
        await sql`
          INSERT INTO blog_plan (project, grp, title, keyword, slug_uz, slug_ru, slug_en, money_page, status, score, clicks, buy_clicks, note, published, source)
          VALUES (${s.project}, ${s.grp}, ${s.title}, ${s.keyword || ''}, ${s.slug_uz}, ${s.slug_ru}, ${s.slug_en}, ${s.money_page || ''},
                  ${s.status}, ${s.score ?? null}, ${s.clicks || 0}, ${s.buy_clicks || 0}, ${s.note || ''}, ${s.published}, 'seed')
          ON CONFLICT DO NOTHING`;
      }
    }
    // Raqamsizlarga raqam: avval chiqqanlar (sana bo'yicha), keyin rejadagilar
    await sql`
      WITH m AS (SELECT project, COALESCE(MAX(num), 0) AS mx FROM blog_plan GROUP BY project),
           r AS (SELECT id, project, row_number() OVER (PARTITION BY project ORDER BY (status <> 'chop'), published NULLS LAST, id) AS rn
                   FROM blog_plan WHERE num IS NULL)
      UPDATE blog_plan b SET num = m.mx + r.rn FROM r JOIN m USING (project) WHERE b.id = r.id`;
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

export async function listPlan(project: Project): Promise<PlanItem[]> {
  await ensureBlogPlan();
  const sql = getSQL();
  return (await sql`
    SELECT id, num, project, grp, title, keyword, slug_uz, slug_ru, slug_en, money_page, status, score,
           clicks, buy_clicks, note, to_char(published, 'YYYY-MM-DD') AS published, source
      FROM blog_plan WHERE project = ${project}
     ORDER BY (status = 'chop'), score DESC NULLS LAST, buy_clicks DESC, clicks DESC, id`) as unknown as PlanItem[];
}

// ───────── matnni solishtirish uchun normallashtirish ─────────
const STOP = new Set(
  ("telegram tg va bilan uchun qanday nima nimaga mumkin mumkinmi qilish kerak bo'ladi boladi bu ham yoki 2024 2025 2026 2027 " +
    "ozbekistonda ozbekistondan ozbekiston uzbekistan uzbekistane узбекистане узбекистан toliq qollanma barcha usul usullar " +
    "the a an in to for of with how what is are can and or в и на с для как что это ли или kak")
    .split(/\s+/)
);
const SYN: [RegExp, string][] = [
  [/^(sotib|olish|olinadi|olaman|olsa|xarid|buy|buying|purchase|купить|покупка|купит|получить|poluchit|kupit)/, 'olish'],
  [/^(narx|narxi|narxlari|price|prices|cost|цена|цены|стоимость|сколько|qancha|nechpul|necha|tsena)/, 'narx'],
  [/^(oy|oylik|oyga|oyda|month|months|месяц|месяца|mesyac)/, 'oy'],
  [/^(yil|yillik|year|yearly|год|na-god)/, 'yil'],
  [/^(stars|star|yulduz|звезд|zvezd)/, 'stars'],
  [/^(premium|премиум)/, 'premium'],
  [/^(sovga|sovg|hadya|gift|подар|podar)/, 'sovga'],
  [/^(arzon|cheap|cheapest|дешев|deshev)/, 'arzon'],
  [/^(bekor|cancel|отмен|otmen)/, 'bekor'],
  [/^(kelmadi|kelmayapti|tushmadi|korinmayapti|yetib|не пришл)/, 'kelmadi'],
];
const SUFFIX = ['larni', 'larga', 'lardan', 'lari', 'lar', 'ning', 'dagi', 'dan', 'da', 'ga', 'ni', 'si', 'ini', 'mi'];
function stem(w: string): string {
  for (const [re, to] of SYN) if (re.test(w)) return to;
  if (/^[a-z]+$/.test(w) && w.length > 5) {
    for (const s of SUFFIX) if (w.endsWith(s) && w.length - s.length >= 4) return w.slice(0, -s.length);
  }
  if (/^[а-яё]+$/.test(w) && w.length > 5) return w.slice(0, -2);
  return w;
}
export function tokens(s: string): Set<string> {
  const t = (s || '').toLowerCase().replace(/[ʻʼ’‘`']/g, '').replace(/[^a-zа-яё0-9]+/gi, ' ').trim();
  const out = new Set<string>();
  for (const w of t.split(/\s+/)) {
    if (!w || STOP.has(w) || (w.length < 2 && !/\d/.test(w))) continue;
    out.add(stem(w));
  }
  return out;
}
// Faqat shu so'zlardan iborat so'rov ("telegram premium sotib olish") ko'p maqolada uchraydi: dublikat uchun yetarli emas
const GENERIC = new Set(['premium', 'stars', 'olish', 'narx', 'oy', 'yil', 'qaysi', 'eng']);
const nums = (a: Set<string>) => [...a].filter((x) => /^\d+$/.test(x)).sort().join(',');

function similarity(a: Set<string>, b: Set<string>) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return { jac: union ? inter / union : 0, cont: Math.min(a.size, b.size) ? inter / Math.min(a.size, b.size) : 0, inter };
}

export function slugify(s: string) {
  return (s || '').toLowerCase().replace(/[ʻʼ’‘`']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

// ───────── niyat (intent) ─────────
const RE_BUY = /sotib|olish|olinadi|xarid|uzcard|humo|click|payme|uzum|karta|to'la|tola|buy|купит|оплат|карт/i;
const RE_DECIDE = /narx|qancha|nechpul|arzon|qaysi|arziydi|foydali|solishtir|taqqos|yoki|\bvs\b|paket|tejay|farq|price|cheap|worth|which|цен|сколько|дешев|какой|стоит ли/i;
const RE_PROBLEM = /kelmadi|kelmay|ko'rinmay|korinmay|ko'rinmasa|xato|o'tmadi|otmadi|tugadi|bekor|qaytar|faollash|uzaytir|tushmadi|olmayapman|ishlamas|ishlamay|rad etadi|не приш|не работает|отмен|продл|expired|cancel|refund/i;
export function detectGroup(text: string): Group {
  if (RE_PROBLEM.test(text)) return 'muammo';
  if (RE_DECIDE.test(text)) return 'tanlov';
  if (RE_BUY.test(text)) return 'sotib';
  return 'malumot';
}
const GROUP_NAME: Record<Group, string> = { sotib: 'Sotib olish', tanlov: 'Narx va tanlov', muammo: 'Muammo va yordam', malumot: "Ma'lumot va ishonch" };

export type CheckResult = {
  ok: boolean;
  errors: string[];
  duplicates: { id: number; code: string; title: string; status: string; slug_uz: string | null; why: string }[];
  warnings: string[];
  similar: { id: number; code: string; title: string; status: string }[];
  suggestedGroup: Group;
};

export async function checkCandidate(project: Project, c: { grp: string; title: string; keyword: string; slug_uz?: string; money_page: string }, excludeId?: number): Promise<CheckResult> {
  const res: CheckResult = { ok: true, errors: [], duplicates: [], warnings: [], similar: [], suggestedGroup: 'malumot' };
  const title = (c.title || '').trim();
  const kw = (c.keyword || '').trim();
  const slug = slugify(c.slug_uz || title);
  if (title.length < 15) res.errors.push("Sarlavha (H1) juda qisqa: xaridor savolini to'liq yozing.");
  if (!kw) res.errors.push("Asosiy so'rov kiritilmagan: mijoz Google'ga nima yozadi?");
  if (!c.money_page || !/^\//.test(c.money_page)) res.errors.push("Pul sahifasi kiritilmagan (masalan /premium/3-oy): maqola qaysi sahifaga sotadi?");
  if (!(GROUPS as readonly string[]).includes(c.grp)) res.errors.push("Guruh tanlanmagan.");

  // ── Dublikat: shu loyihadagi barcha maqolalar (chop etilgan + rejada) ──
  const items = (await listPlan(project)).filter((i) => i.id !== excludeId && i.status !== 'toxtatildi');
  const cand = tokens(`${title} ${kw}`);
  const candNums = nums(cand);
  const kwTok = tokens(kw);
  for (const it of items) {
    const itSlug = it.slug_uz || it.slug_ru || '';
    if (slug && (itSlug === slug || it.slug_ru === slug || (itSlug.split('-').length >= 4 && slug.startsWith(itSlug + '-')))) {
      res.duplicates.push({ id: it.id, code: `${CODES[project]}-${it.num}`, title: it.title, status: it.status, slug_uz: it.slug_uz, why: 'slug bir xil' });
      continue;
    }
    const other = tokens(`${it.title} ${it.keyword} ${(it.slug_uz || it.slug_ru || it.slug_en || '').replace(/-/g, ' ')}`);
    const s = similarity(cand, other);
    const otherNums = nums(other);
    // Raqamlar faqat ikkalasida ham bo'lsa solishtiriladi ("6 oylik" va "12 oylik" boshqa maqola)
    const sameNums = !candNums || !otherNums || candNums === otherNums;
    // Asosiy so'rovning barcha so'zlari boshqa maqolada bor (raqamlar ham bir xil) → o'sha so'rovni u allaqachon oladi
    const kwCovered = kwTok.size >= 2 && [...kwTok].some((x) => !GENERIC.has(x)) && [...kwTok].every((x) => other.has(x));
    if (sameNums && ((s.inter >= 3 && (s.jac >= 0.6 || s.cont >= 0.85)) || kwCovered)) {
      res.duplicates.push({ id: it.id, code: `${CODES[project]}-${it.num}`, title: it.title, status: it.status, slug_uz: it.slug_uz, why: kwCovered ? "asosiy so'rov shu maqolada" : `bir xil niyat (${Math.round(s.jac * 100)}% mos)` });
    } else if (s.inter >= 2 && (s.jac >= 0.4 || s.cont >= 0.7)) {
      res.similar.push({ id: it.id, code: `${CODES[project]}-${it.num}`, title: it.title, status: it.status });
    }
  }
  if (res.similar.length) res.warnings.push(`O'xshash ${res.similar.length} ta maqola bor: yangi maqola boshqa savolga javob berishi va ularga havola qilishi kerak.`);

  // ── Sotuv niyati: tabiiy va aniq ──
  const text = `${title} ${kw}`;
  const g = detectGroup(text);
  res.suggestedGroup = g;
  if (!RE_BUY.test(text) && !RE_DECIDE.test(text) && !RE_PROBLEM.test(text)) {
    res.warnings.push("Sotuvga ko'prik yo'q: sarlavha yoki so'rovda xarid, narx, tanlov yoki muammo niyati ko'rinmayapti. Xaridor savoli shaklida yozing (masalan \"... qaysi biri foydali?\").");
  }
  if (c.grp && g !== c.grp && (GROUPS as readonly string[]).includes(c.grp)) {
    res.warnings.push(`Niyat bo'yicha bu "${GROUP_NAME[g]}" guruhiga o'xshaydi (siz "${GROUP_NAME[c.grp as Group]}" tanladingiz).`);
  }
  const kwT = tokens(kw), tT = tokens(title);
  if (kwT.size) {
    let hit = 0;
    for (const x of kwT) if (tT.has(x)) hit++;
    if (hit / kwT.size < 0.6) res.warnings.push("Asosiy so'rov sarlavhada tabiiy ko'rinmayapti: so'rovning asosiy so'zlari H1'da bo'lsin.");
  }
  const words = title.toLowerCase().split(/[^a-zа-яё0-9']+/i).filter((w) => w.length > 3);
  const rep = words.find((w, i) => words.indexOf(w) !== i && words.filter((x) => x === w).length >= 3);
  if (rep) res.warnings.push(`"${rep}" so'zi sarlavhada 3+ marta: kalit so'z tiqilgan, tabiiy emas.`);
  if (title.length > 95) res.warnings.push(`Sarlavha uzun (${title.length} belgi): 50 dan 90 belgigacha ideal.`);
  // Tabiiylik: AI yozgandek ko'rinmasin
  if (/[—–]|--/.test(`${title} ${kw} ${c.note || ''}`)) {
    res.errors.push("Uzun chiziq (—, –, --) ishlatilmaydi: AI yozgandek ko'rinadi. O'rniga nuqta, vergul yoki ikki nuqta qo'ying.");
  }
  const AI_PHRASES = /to'liq qo'llanma|toliq qollanma|batafsil qo'llanma|ultimate|yakuniy qo'llanma|siz bilishingiz kerak bo'lgan hamma narsa|hammasi bir joyda|sirlari ochildi|полное руководство|все что нужно знать|complete guide|everything you need to know/i;
  if (AI_PHRASES.test(title)) {
    res.warnings.push("Shablon ibora (\"to'liq qo'llanma\", \"hamma narsa\" kabi) AI matniga o'xshaydi: xaridorning o'z savoli bilan yozing.");
  }
  if (/!{1,}|🔥|💥|\b(ENG ARZON|SHOSHILING|AKSIYA)\b/.test(title) || (title.replace(/[^A-ZА-Я]/g, '').length > title.length * 0.4)) {
    res.warnings.push("Reklama ohangi (undov, katta harf, emoji): blog sarlavhasi savol yoki aniq va'da bo'lsin.");
  }
  if (project === 'premium24' && /^(\S+\s+){0,3}(narxi|sotib olish)/i.test(title) && /^(telegram\s+)?(premium|stars|\d)/i.test(title) && /narxi|sotib olish/i.test(title.split(/[?:]/)[0].slice(0, 45))) {
    res.warnings.push("Premium24 qoidasi: \"X narxi / X sotib olish\" so'rovini paket sahifasi oladi, blog H1'i qaror savoli bo'lsin.");
  }
  res.ok = res.errors.length === 0 && res.duplicates.length === 0;
  return res;
}

export async function addItem(project: Project, c: { grp: Group; title: string; keyword: string; slug_uz?: string; money_page: string; note?: string }) {
  const sql = getSQL();
  const slug = slugify(c.slug_uz || c.title);
  const [row] = await sql`
    INSERT INTO blog_plan (project, grp, title, keyword, slug_uz, money_page, status, note, source, num)
    VALUES (${project}, ${c.grp}, ${c.title.trim()}, ${c.keyword.trim()}, ${slug || null}, ${c.money_page.trim()}, 'reja', ${(c.note || '').trim()}, 'admin',
            (SELECT COALESCE(MAX(num), 0) + 1 FROM blog_plan WHERE project = ${project}))
    RETURNING id, num`;
  return { id: row.id as number, code: `${CODES[project]}-${row.num}` };
}

export async function updateItem(id: number, patch: { status?: string; grp?: string }) {
  const sql = getSQL();
  if (patch.status && (STATUSES as readonly string[]).includes(patch.status)) {
    await sql`UPDATE blog_plan SET status = ${patch.status}, updated_at = NOW(),
                published = CASE WHEN ${patch.status} = 'chop' AND published IS NULL THEN CURRENT_DATE ELSE published END
              WHERE id = ${id}`;
  }
  if (patch.grp && (GROUPS as readonly string[]).includes(patch.grp)) {
    await sql`UPDATE blog_plan SET grp = ${patch.grp}, updated_at = NOW() WHERE id = ${id}`;
  }
}

/** Faqat rejadagi (chop etilmagan) yozuv o'chiriladi */
export async function deleteItem(id: number) {
  const sql = getSQL();
  const r = await sql`DELETE FROM blog_plan WHERE id = ${id} AND status <> 'chop' RETURNING id`;
  return r.length > 0;
}

// ───────── saytmap sinxronlash: yangi chop etilgan maqolalar ─────────
const lastSync: Record<string, number> = {};
async function fetchText(url: string, ms = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'StarsJoy-modad-plan' } });
    return r.ok ? await r.text() : '';
  } catch { return ''; } finally { clearTimeout(t); }
}
export async function syncFromSitemap(project: Project, force = false) {
  if (!force && Date.now() - (lastSync[project] || 0) < 6 * 3600_000) return { added: 0, published: 0, skipped: true };
  lastSync[project] = Date.now();
  const dom = PROJECTS[project].domain;
  let xml = await fetchText(`${dom}/sitemap-index.xml`);
  let locs: string[] = [];
  const subs = [...xml.matchAll(/<loc>([^<]+\.xml)<\/loc>/g)].map((m) => m[1]);
  if (subs.length) for (const s of subs.slice(0, 5)) locs.push(...[...(await fetchText(s)).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  if (!locs.length) { xml = await fetchText(`${dom}/sitemap.xml`); locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]); }
  const bp = PROJECTS[project].blogPath;
  const esc = (dom + bp).replace(/[.]/g, '\\.');
  const slugs = [...new Set(locs.map((u) => u.match(new RegExp(`^${esc}/([a-z0-9-]+)/?$`))?.[1]).filter(Boolean) as string[])];
  if (!slugs.length) return { added: 0, published: 0, skipped: false };

  const sql = getSQL();
  const items = await listPlan(project);
  const bySlug = new Map(items.filter((i) => i.slug_uz).map((i) => [i.slug_uz as string, i]));
  let added = 0, published = 0;
  for (const s of slugs) {
    const it = bySlug.get(s);
    if (it) {
      if (it.status !== 'chop') { await updateItem(it.id, { status: 'chop' }); published++; }
      continue;
    }
    if (added >= 15) continue;
    const html = await fetchText(`${dom}${bp}/${s}`, 6000);
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const t = h1 || html.match(/<title>([^<]+)<\/title>/i)?.[1]?.split('|')[0].trim() || s.replace(/-/g, ' ');
    await sql`
      INSERT INTO blog_plan (project, grp, title, slug_uz, status, published, source, num)
      VALUES (${project}, ${detectGroup(`${t} ${s}`)}, ${t.slice(0, 200)}, ${s}, 'chop', CURRENT_DATE, 'sitemap',
              (SELECT COALESCE(MAX(num), 0) + 1 FROM blog_plan WHERE project = ${project}))
      ON CONFLICT DO NOTHING`;
    added++;
  }
  return { added, published, skipped: false };
}

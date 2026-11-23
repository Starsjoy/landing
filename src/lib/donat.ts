/**
 * Donat (o'yin valyutasi) — sayt sahifalari uchun umumiy ma'lumot.
 * Narxlar backend'dan jonli keladi (StarsPaymee narxi + ustama), shu yerda faqat
 * matnlar va SSR uchun katalogni olish funksiyasi.
 */

export const DONAT_API = 'https://vitahealth.uz';

export type DonatLang = 'uz' | 'ru' | 'en';

export interface DonatItem { id: string; name: string; price: number }
export interface DonatGame {
  slug: string;
  title: string;
  unit: string;
  kind: 'game' | 'giftcard';
  needs_player_id: boolean;
  id_label: string | null;
  id_hint: string | null;
  available: boolean;
  items: DonatItem[];
}
export interface DonatCatalog { enabled: boolean; pay_window_min: number; games: DonatGame[] }

/** SSR: narxlar HTML'da bo'lsin (SEO). 4 soniyada javob bo'lmasa — null, sahifa brauzerda yuklaydi. */
export async function fetchDonatCatalog(): Promise<DonatCatalog | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`${DONAT_API}/api/donat/catalog`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const d = await r.json();
    return d?.success ? { enabled: Boolean(d.enabled), pay_window_min: d.pay_window_min || 8, games: d.games || [] } : null;
  } catch {
    return null;
  }
}

export const fmtSum = (n: number) => Number(n || 0).toLocaleString('ru-RU').replace(/,/g, ' ');

export const minPrice = (g?: DonatGame) => (g && g.items.length ? Math.min(...g.items.map((i) => i.price)) : 0);

/** Har o'yin sahifasi uchun SEO matnlari */
export const GAME_SEO: Record<string, Record<DonatLang, { title: string; h1: string; desc: string; lead: string }>> = {
  'pubg-mobile': {
    uz: {
      title: "PUBG Mobile UC sotib olish — Uzcard va Humo bilan | StarsJoy",
      h1: 'PUBG Mobile UC sotib olish',
      desc: "PUBG Mobile UC sotib olish Player ID orqali: 60, 325, 660, 1800, 3850 va 8100 UC, Prime va Elite Pass. Uzcard va Humo bilan to'lov, UC akkauntingizga avtomatik tushadi.",
      lead: "Player ID'ni kiriting, nikingizni ko'ring, paketni tanlang va kartadan to'lang. UC akkauntingizga avtomatik tushadi, odatda 2–5 daqiqada.",
    },
    ru: {
      title: 'Купить UC PUBG Mobile в Узбекистане — Uzcard и Humo | StarsJoy',
      h1: 'Купить UC для PUBG Mobile',
      desc: 'Пополнение UC PUBG Mobile по Player ID: 60, 325, 660, 1800, 3850 и 8100 UC, Prime и Elite Pass. Оплата картой Uzcard или Humo, UC зачисляются автоматически.',
      lead: 'Введите Player ID, проверьте ник, выберите пакет и оплатите картой. UC зачисляются на аккаунт автоматически, обычно за 2–5 минут.',
    },
    en: {
      title: 'Buy PUBG Mobile UC in Uzbekistan — Uzcard & Humo | StarsJoy',
      h1: 'Buy PUBG Mobile UC',
      desc: 'PUBG Mobile UC top-up by Player ID: 60, 325, 660, 1800, 3850 and 8100 UC, Prime and Elite Pass. Pay with Uzcard or Humo, UC is delivered automatically.',
      lead: 'Enter your Player ID, check your nickname, pick a pack and pay by card. UC lands on your account automatically, usually in 2–5 minutes.',
    },
  },
  'free-fire': {
    uz: {
      title: "Free Fire olmos sotib olish — Uzcard va Humo bilan | StarsJoy",
      h1: 'Free Fire olmos sotib olish',
      desc: "Free Fire olmos (diamonds) sotib olish UID orqali: 110 dan 6160 olmosgacha, haftalik va oylik a'zolik. Uzcard va Humo bilan to'lov, avtomatik yetkazish.",
      lead: "UID'ni kiriting, nikingizni ko'ring, paketni tanlang va kartadan to'lang. Olmoslar akkauntingizga avtomatik tushadi, odatda 1–3 daqiqada.",
    },
    ru: {
      title: 'Купить алмазы Free Fire в Узбекистане — Uzcard и Humo | StarsJoy',
      h1: 'Купить алмазы Free Fire',
      desc: 'Алмазы Free Fire по UID: от 110 до 6160 алмазов, недельная и месячная подписка. Оплата Uzcard или Humo, автоматическое зачисление.',
      lead: 'Введите UID, проверьте ник, выберите пакет и оплатите картой. Алмазы зачисляются автоматически, обычно за 1–3 минуты.',
    },
    en: {
      title: 'Buy Free Fire Diamonds in Uzbekistan — Uzcard & Humo | StarsJoy',
      h1: 'Buy Free Fire Diamonds',
      desc: 'Free Fire diamonds top-up by UID: from 110 to 6160 diamonds, weekly and monthly membership. Pay with Uzcard or Humo, automatic delivery.',
      lead: 'Enter your UID, check your nickname, pick a pack and pay by card. Diamonds land on your account automatically, usually in 1–3 minutes.',
    },
  },
};

/** Yangi o'yinlar uchun SEO matnlari bir xil qolipdan: o'yin nomi, valyuta, yetkazish usuli */
type GameWords = { name: string; cur: Record<DonatLang, string>; packs: string; how: 'id' | 'zone' | 'code' };
const NEW_GAMES: Record<string, GameWords> = {
  'mobile-legends': { name: 'Mobile Legends', cur: { uz: 'olmos', ru: 'алмазы', en: 'diamonds' }, packs: '14, 70, 140, 355, 716, 1446, 2976, Weekly Pass', how: 'zone' },
  roblox: { name: 'Roblox', cur: { uz: 'Robux', ru: 'Robux', en: 'Robux' }, packs: '50, 100, 800, 1000, 2000, 4500, 10000 Robux', how: 'code' },
  'delta-force': { name: 'Delta Force', cur: { uz: 'Delta Coins', ru: 'Delta Coins', en: 'Delta Coins' }, packs: '60, 320, 750, 1480, 3950, 8100', how: 'id' },
  'blood-strike': { name: 'Blood Strike', cur: { uz: 'BC (Gold)', ru: 'BC (Gold)', en: 'BC (Gold)' }, packs: '105, 320, 540, 1100, 2260, 5800 BC, Strike Pass', how: 'id' },
  'honor-of-kings': { name: 'Honor of Kings', cur: { uz: 'token', ru: 'токены', en: 'tokens' }, packs: '80, 240, 400, 830, 2508, 8360, Weekly Card', how: 'id' },
  'arena-breakout': { name: 'Arena Breakout', cur: { uz: 'Bonds', ru: 'Bonds', en: 'Bonds' }, packs: '66, 335, 675, 1690, 3400, 6820 Bonds', how: 'id' },
};
for (const [slug, w] of Object.entries(NEW_GAMES)) {
  const idUz = w.how === 'zone' ? "ID va Zone ID'ni kiriting, nikingizni ko'ring, " : w.how === 'code' ? '' : "Player ID'ni kiriting, nikingizni ko'ring, ";
  const idRu = w.how === 'zone' ? 'Введите ID и Zone ID, проверьте ник, ' : w.how === 'code' ? '' : 'Введите Player ID, проверьте ник, ';
  const idEn = w.how === 'zone' ? 'Enter your ID and Zone ID, check your nickname, ' : w.how === 'code' ? '' : 'Enter your Player ID, check your nickname, ';
  const endUz = w.how === 'code' ? "To'lovdan keyin Robux kodi shu sahifada chiqadi, uni roblox.com/redeem da kiritasiz." : 'Donat akkauntingizga avtomatik tushadi.';
  const endRu = w.how === 'code' ? 'После оплаты код Robux появится на этой странице, активируйте его на roblox.com/redeem.' : 'Донат поступит на аккаунт автоматически.';
  const endEn = w.how === 'code' ? 'After payment the Robux code appears on this page, redeem it at roblox.com/redeem.' : 'The top-up lands on your account automatically.';
  GAME_SEO[slug] = {
    uz: {
      title: `${w.name} ${w.cur.uz} sotib olish — Uzcard va Humo bilan | StarsJoy`,
      h1: `${w.name} ${w.cur.uz} sotib olish`,
      desc: `${w.name} ${w.cur.uz} sotib olish: ${w.packs}. Uzcard va Humo bilan to'lov, ${w.how === 'code' ? 'kod darhol beriladi' : 'akkauntga avtomatik yetkazish'}.`,
      lead: `${idUz}${idUz ? 'paketni' : 'Paketni'} tanlang va kartadan to'lang. ${endUz}`,
    },
    ru: {
      title: `Купить ${w.cur.ru} ${w.name} в Узбекистане — Uzcard и Humo | StarsJoy`,
      h1: `Купить ${w.cur.ru} ${w.name}`,
      desc: `${w.cur.ru[0].toUpperCase() + w.cur.ru.slice(1)} ${w.name}: ${w.packs}. Оплата Uzcard или Humo, ${w.how === 'code' ? 'код сразу после оплаты' : 'автоматическое зачисление'}.`,
      lead: `${idRu}${idRu ? 'выберите' : 'Выберите'} пакет и оплатите картой. ${endRu}`,
    },
    en: {
      title: `Buy ${w.name} ${w.cur.en} in Uzbekistan — Uzcard & Humo | StarsJoy`,
      h1: `Buy ${w.name} ${w.cur.en}`,
      desc: `${w.name} ${w.cur.en}: ${w.packs}. Pay with Uzcard or Humo, ${w.how === 'code' ? 'code right after payment' : 'automatic delivery'}.`,
      lead: `${idEn}${idEn ? 'pick' : 'Pick'} a pack and pay by card. ${endEn}`,
    },
  };
}

export const DONAT_SLUGS = ['pubg-mobile', 'free-fire', 'mobile-legends', 'roblox', 'delta-force', 'blood-strike', 'honor-of-kings', 'arena-breakout'];

export const DONAT_HUB_SEO: Record<DonatLang, { title: string; h1: string; desc: string; lead: string }> = {
  uz: {
    title: "O'yinlarga donat — PUBG UC, Free Fire, Mobile Legends, Roblox | StarsJoy",
    h1: "O'yinlarga donat",
    desc: "PUBG Mobile UC, Free Fire va Mobile Legends olmos, Roblox Robux va boshqa o'yinlar. Uzcard va Humo bilan to'lov, akkauntga avtomatik yetkazish.",
    lead: "O'yinni tanlang, ID'ni kiriting va kartadan to'lang. Donat akkauntingizga avtomatik tushadi.",
  },
  ru: {
    title: 'Донат в игры — UC PUBG, Free Fire, Mobile Legends, Roblox | StarsJoy',
    h1: 'Донат в игры',
    desc: 'Купить UC PUBG Mobile, алмазы Free Fire и Mobile Legends. Оплата Uzcard и Humo, автоматическое зачисление, гарантия StarsJoy.',
    lead: 'Выберите игру, введите ID и оплатите картой. Донат поступит на аккаунт автоматически.',
  },
  en: {
    title: 'Game Top-Up — PUBG UC, Free Fire, Mobile Legends, Roblox | StarsJoy',
    h1: 'Game top-up',
    desc: 'Buy PUBG Mobile UC, Free Fire and Mobile Legends diamonds. Pay with Uzcard or Humo, automatic delivery, StarsJoy guarantee.',
    lead: 'Pick a game, enter your ID and pay by card. The top-up lands on your account automatically.',
  },
};

export const donatPath = (lang: DonatLang, slug?: string) =>
  `${lang === 'uz' ? '' : `/${lang}`}/donat${slug ? `/${slug}` : ''}`;

export const donatHreflangs = (slug?: string) => [
  { lang: 'uz', href: `https://starsjoy.uz${donatPath('uz', slug)}` },
  { lang: 'ru', href: `https://starsjoy.uz${donatPath('ru', slug)}` },
  { lang: 'en', href: `https://starsjoy.uz${donatPath('en', slug)}` },
];

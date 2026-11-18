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
  'standoff-2': {
    uz: {
      title: "Standoff 2 Gold sotib olish — Uzcard va Humo bilan | StarsJoy",
      h1: 'Standoff 2 Gold sotib olish',
      desc: "Standoff 2 Gold sotib olish: 100 dan 10 000 Gold gacha. Uzcard va Humo bilan to'lov, to'lovdan keyin aktivatsiya havolasi darhol beriladi.",
      lead: "Paketni tanlang va kartadan to'lang. To'lovdan keyin shu sahifada aktivatsiya havolasi chiqadi: uni ochib ko'rsatmaga amal qilasiz va Gold akkauntingizga tushadi.",
    },
    ru: {
      title: 'Купить Gold Standoff 2 в Узбекистане — Uzcard и Humo | StarsJoy',
      h1: 'Купить Gold для Standoff 2',
      desc: 'Gold Standoff 2: от 100 до 10 000 Gold. Оплата Uzcard или Humo, ссылка активации сразу после оплаты.',
      lead: 'Выберите пакет и оплатите картой. После оплаты на этой странице появится ссылка активации: откройте её, следуйте инструкции, и Gold поступит на аккаунт.',
    },
    en: {
      title: 'Buy Standoff 2 Gold in Uzbekistan — Uzcard & Humo | StarsJoy',
      h1: 'Buy Standoff 2 Gold',
      desc: 'Standoff 2 Gold from 100 to 10,000 Gold. Pay with Uzcard or Humo, activation link right after payment.',
      lead: 'Pick a pack and pay by card. After payment an activation link appears on this page: open it, follow the steps and the Gold lands on your account.',
    },
  },
};

export const DONAT_HUB_SEO: Record<DonatLang, { title: string; h1: string; desc: string; lead: string }> = {
  uz: {
    title: "O'yinlarga donat — PUBG UC, Free Fire, Standoff 2 | StarsJoy",
    h1: "O'yinlarga donat",
    desc: "PUBG Mobile UC, Free Fire olmos va Standoff 2 Gold sotib olish. Uzcard va Humo bilan to'lov, akkauntga avtomatik yetkazish, StarsJoy kafolati.",
    lead: "O'yinni tanlang, ID'ni kiriting va kartadan to'lang. Donat akkauntingizga avtomatik tushadi.",
  },
  ru: {
    title: 'Донат в игры — UC PUBG, алмазы Free Fire, Gold Standoff 2 | StarsJoy',
    h1: 'Донат в игры',
    desc: 'Купить UC PUBG Mobile, алмазы Free Fire и Gold Standoff 2. Оплата Uzcard и Humo, автоматическое зачисление, гарантия StarsJoy.',
    lead: 'Выберите игру, введите ID и оплатите картой. Донат поступит на аккаунт автоматически.',
  },
  en: {
    title: 'Game Top-Up — PUBG UC, Free Fire, Standoff 2 | StarsJoy',
    h1: 'Game top-up',
    desc: 'Buy PUBG Mobile UC, Free Fire diamonds and Standoff 2 Gold. Pay with Uzcard or Humo, automatic delivery, StarsJoy guarantee.',
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

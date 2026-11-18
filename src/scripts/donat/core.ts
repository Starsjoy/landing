/**
 * Donat do'koni — umumiy mantiq (3 xil UI variant shu yadroni ishlatadi).
 * Holat (state) → variant render() → HTML. Hodisalar data-act / data-in atributlari orqali.
 * Foydalanuvchi ma'lumoti HTML'ga faqat esc() orqali tushadi.
 */

export type Lang = 'uz' | 'ru' | 'en';
export type Item = { id: string; name: string; price: number };
export type Game = {
  slug: string; title: string; unit: string; kind: 'game' | 'giftcard';
  needs_player_id: boolean; needs_server?: boolean; secret_kind?: 'link' | 'code' | null;
  available: boolean; items: Item[];
};
export type Catalog = { enabled: boolean; pay_window_min: number; games: Game[] };
export type OrderState = 'awaiting_payment' | 'delivering' | 'delivered' | 'problem' | 'expired';
export type Order = {
  token?: string; order_id?: number; amount?: number; expires_at?: string;
  card?: { number?: string; name?: string | null; brand?: string | null; type?: string | null } | null;
  game?: string; game_slug?: string; item?: string; player_id?: string | null; server_id?: string | null;
  player_name?: string | null; state?: OrderState; link?: string | null; secret_kind?: 'link' | 'code' | null;
};
export type Nick = { kind: 'ok' | 'bad' | 'wait'; text: string; name?: string | null } | null;

export type State = {
  catalog: Catalog | null;
  slug: string;
  itemId: string;
  pid: string;
  zone: string;
  contact: string;
  nick: Nick;
  checkedFor: string;
  err: string;
  busy: boolean;
  order: Order | null;
  step: number; // A variant: 1 o'yin, 2 paket, 3 ID, 4 tasdiq
  sheet: '' | 'games' | 'pay'; // C variant
  showAll: boolean;
  help: boolean;
  copied: string;
  now: number;
};

// ───────────────────────── matnlar ─────────────────────────
const TXT = {
  uz: {
    sum: "so'm", from: 'dan', game: "O'yin", games: "O'yinlar", chooseGame: "O'yinni tanlang", pack: 'Paket', choosePack: 'Paketni tanlang',
    account: 'Akkaunt', id: "O'yinchi ID", idPh: 'Player ID', zonePh: 'Zone ID', check: 'Tekshirish', checking: 'Tekshirilmoqda…',
    idWhere: 'ID qayerda?', needId: "ID'ni kiriting", needZone: "Zone ID'ni kiriting", notVerified: "Bu o'yinda nik ko'rinmaydi, ID'ni qayta tekshiring",
    found: 'Akkaunt topildi', confirm: 'Tasdiqlash', review: "Buyurtmani tekshiring", next: 'Davom etish', back: 'Orqaga', change: "O'zgartirish",
    currency: 'Valyuta', passes: 'Obuna va passlar', popular: 'Ommabop', more: "Yana {n} ta ko'rsatish", less: "Yig'ish",
    contact: 'Aloqa uchun Telegram yoki telefon', contactOpt: 'ixtiyoriy', contactPh: '@username yoki +998…',
    pay: "To'lash", payFor: "{p} · To'lash", soon: 'Tez orada ishga tushadi', unavailable: 'Vaqtincha mavjud emas', loading: 'Yuklanmoqda…',
    total: 'Jami', youGet: 'Siz olasiz', to: 'Kimga', delivery: 'Yetkazish', auto: 'Avtomatik, 1–5 daqiqa', codeDel: "Kod shu sahifada beriladi", linkDel: 'Havola shu sahifada beriladi',
    noIdCode: "ID kerak emas: to'lovdan keyin Robux kodi beriladi, uni roblox.com/redeem da kiritasiz.",
    noIdLink: "ID kerak emas: to'lovdan keyin aktivatsiya havolasi beriladi, uni ochib Gold'ni olasiz.",
    agree: "Noto'g'ri ID'ga yuborilgan donat qaytarilmaydi.",
    payTitle: "Kartaga o'tkazing", left: 'qoldi', exact: 'Aynan shu summani', card: 'Karta raqami', copy: 'Nusxa', copied: 'Nusxalandi',
    howPay: ['Bank ilovasini oching (Click, Payme, Uzum…)', "Kartaga o'tkazma qiling", 'Summani aynan shunday yozing'],
    wait: "To'lovni kutyapmiz, pul tushishi bilan avtomatik yuboramiz", note: "Boshqa summa yoki bo'lib o'tkazilsa, avtomatik tasdiqlanmaydi.", cancel: 'Bekor qilish',
    st: ["To'landi", 'Yuborilmoqda', 'Yetkazildi'],
    delivering: "To'lov qabul qilindi! Donat yuborilyapti…", deliveredT: 'Tayyor!', deliveredS: '{x} akkauntingizga tushdi',
    problem: "To'lov qabul qilindi, yetkazishda muammo bo'ldi. Hal qilyapmiz, pulingiz kuymaydi.", expired: "To'lov vaqti tugadi. Pul o'tkazgan bo'lsangiz, chekni supportga yuboring.",
    linkT: 'Aktivatsiya havolasi', linkH: "Havolani oching: ko'rsatilgan skinni o'yin bozoriga aytilgan narxda qo'yasiz va Gold tushadi. Havolani hech kimga bermang.", open: 'Havolani ochish',
    codeT: 'Robux kodi', codeH: 'roblox.com/redeem sahifasida kiriting. Kodni hech kimga bermang.', redeem: 'roblox.com/redeem',
    support: 'Supportga yozish', again: 'Yana xarid qilish', order: 'Buyurtma', errNet: "Ulanishda xato, qayta urinib ko'ring.",
    help: {
      'pubg-mobile': "O'yinda chap yuqoridagi avatarga bosing. Nik ostidagi raqam — Player ID (10–11 raqam).",
      'free-fire': "O'yinda chap yuqoridagi profil rasmiga bosing. Nik ostidagi raqam — UID.",
      'mobile-legends': "Chap yuqoridagi avatarga bosing: ID va qavs ichida Zone ID ko'rinadi, masalan 12345678 (1234).",
      _: "O'yinda profilingizni oching: ID nik ostida yoki sozlamalarda ko'rsatiladi.",
    } as Record<string, string>,
    sub: { 'pubg-mobile': 'UC · Prime', 'free-fire': 'Olmos', 'mobile-legends': 'Olmos', 'standoff-2': 'Gold', roblox: 'Robux', 'delta-force': 'Coins', 'blood-strike': 'BC', 'honor-of-kings': 'Token', 'arena-breakout': 'Bonds' } as Record<string, string>,
    unit: { UC: 'UC', Diamonds: 'olmos', Gold: 'Gold', 'Delta Coins': 'Delta Coins', BC: 'BC', Tokens: 'token', Bonds: 'Bonds', Robux: 'Robux' } as Record<string, string>,
    names: [
      [/^Prime \(1 Month\)$/i, 'Prime · 1 oy'], [/^Prime Plus \(1 Month\)$/i, 'Prime Plus · 1 oy'],
      [/^Weekly Membership$/i, "Haftalik a'zolik"], [/^Monthly Membership$/i, "Oylik a'zolik"], [/^Weekly Lite$/i, 'Haftalik Lite'],
      [/^Newbie Bundle$/i, "Yangi o'yinchi to'plami"], [/^Evo Access (\d+)d$/i, 'Evo Access · $1 kun'], [/^Level Up Package (\d+)$/i, 'Level Up · $1-daraja'],
      [/^(\d+) \+ \d+ Diamonds \(First Top-Up Bonus\)$/i, '$1 olmos ×2 (1-xarid)'],
    ] as [RegExp, string][],
  },
  ru: {
    sum: 'сум', from: 'от', game: 'Игра', games: 'Игры', chooseGame: 'Выберите игру', pack: 'Пакет', choosePack: 'Выберите пакет',
    account: 'Аккаунт', id: 'ID игрока', idPh: 'Player ID', zonePh: 'Zone ID', check: 'Проверить', checking: 'Проверяем…',
    idWhere: 'Где найти ID?', needId: 'Введите ID', needZone: 'Введите Zone ID', notVerified: 'В этой игре ник не показывается, перепроверьте ID',
    found: 'Аккаунт найден', confirm: 'Подтвердить', review: 'Проверьте заказ', next: 'Далее', back: 'Назад', change: 'Изменить',
    currency: 'Валюта', passes: 'Подписки и пропуски', popular: 'Популярно', more: 'Показать ещё {n}', less: 'Свернуть',
    contact: 'Telegram или телефон для связи', contactOpt: 'необязательно', contactPh: '@username или +998…',
    pay: 'Оплатить', payFor: '{p} · Оплатить', soon: 'Скоро запуск', unavailable: 'Временно недоступно', loading: 'Загрузка…',
    total: 'Итого', youGet: 'Вы получите', to: 'Кому', delivery: 'Доставка', auto: 'Автоматически, 1–5 мин', codeDel: 'Код выдаётся на этой странице', linkDel: 'Ссылка выдаётся на этой странице',
    noIdCode: 'ID не нужен: после оплаты получите код Robux и активируете его на roblox.com/redeem.',
    noIdLink: 'ID не нужен: после оплаты получите ссылку активации и заберёте Gold.',
    agree: 'Донат на неверный ID не возвращается.',
    payTitle: 'Переведите на карту', left: 'осталось', exact: 'Ровно эту сумму', card: 'Номер карты', copy: 'Копировать', copied: 'Скопировано',
    howPay: ['Откройте банковское приложение (Click, Payme, Uzum…)', 'Сделайте перевод на карту', 'Укажите сумму точно'],
    wait: 'Ждём оплату, отправим автоматически, как только деньги поступят', note: 'Другая сумма или перевод частями не подтверждается автоматически.', cancel: 'Отменить',
    st: ['Оплачено', 'Отправляем', 'Доставлено'],
    delivering: 'Оплата получена! Отправляем донат…', deliveredT: 'Готово!', deliveredS: '{x} зачислено на аккаунт',
    problem: 'Оплата получена, но при доставке возникла проблема. Решаем, деньги не пропадут.', expired: 'Время оплаты истекло. Если вы перевели деньги, отправьте чек в поддержку.',
    linkT: 'Ссылка активации', linkH: 'Откройте ссылку: выставите указанный скин на рынок по указанной цене, и Gold поступит. Никому не передавайте ссылку.', open: 'Открыть ссылку',
    codeT: 'Код Robux', codeH: 'Введите на roblox.com/redeem. Никому не передавайте код.', redeem: 'roblox.com/redeem',
    support: 'Написать в поддержку', again: 'Купить ещё', order: 'Заказ', errNet: 'Ошибка соединения, попробуйте снова.',
    help: {
      'pubg-mobile': 'Нажмите на аватар слева вверху. Число под ником — Player ID (10–11 цифр).',
      'free-fire': 'Нажмите на аватар слева вверху. Число под ником — UID.',
      'mobile-legends': 'Нажмите на аватар: видны ID и Zone ID в скобках, например 12345678 (1234).',
      _: 'Откройте профиль в игре: ID указан под ником или в настройках.',
    } as Record<string, string>,
    sub: { 'pubg-mobile': 'UC · Prime', 'free-fire': 'Алмазы', 'mobile-legends': 'Алмазы', 'standoff-2': 'Gold', roblox: 'Robux', 'delta-force': 'Coins', 'blood-strike': 'BC', 'honor-of-kings': 'Токены', 'arena-breakout': 'Bonds' } as Record<string, string>,
    unit: { UC: 'UC', Diamonds: 'алмазов', Gold: 'Gold', 'Delta Coins': 'Delta Coins', BC: 'BC', Tokens: 'токенов', Bonds: 'Bonds', Robux: 'Robux' } as Record<string, string>,
    names: [
      [/^Prime \(1 Month\)$/i, 'Prime · 1 мес'], [/^Prime Plus \(1 Month\)$/i, 'Prime Plus · 1 мес'],
      [/^Weekly Membership$/i, 'Недельная подписка'], [/^Monthly Membership$/i, 'Месячная подписка'], [/^Weekly Lite$/i, 'Недельная Lite'],
      [/^Newbie Bundle$/i, 'Набор новичка'], [/^Evo Access (\d+)d$/i, 'Evo Access · $1 дн'], [/^Level Up Package (\d+)$/i, 'Level Up · $1 ур.'],
      [/^(\d+) \+ \d+ Diamonds \(First Top-Up Bonus\)$/i, '$1 алмазов ×2 (1-я покупка)'],
    ] as [RegExp, string][],
  },
  en: {
    sum: 'UZS', from: 'from', game: 'Game', games: 'Games', chooseGame: 'Choose a game', pack: 'Pack', choosePack: 'Choose a pack',
    account: 'Account', id: 'Player ID', idPh: 'Player ID', zonePh: 'Zone ID', check: 'Check', checking: 'Checking…',
    idWhere: 'Where is my ID?', needId: 'Enter your ID', needZone: 'Enter your Zone ID', notVerified: 'This game does not show nicknames, double-check the ID',
    found: 'Account found', confirm: 'Confirm', review: 'Review your order', next: 'Continue', back: 'Back', change: 'Change',
    currency: 'Currency', passes: 'Passes & subscriptions', popular: 'Popular', more: 'Show {n} more', less: 'Show less',
    contact: 'Telegram or phone for contact', contactOpt: 'optional', contactPh: '@username or +998…',
    pay: 'Pay', payFor: 'Pay {p}', soon: 'Launching soon', unavailable: 'Temporarily unavailable', loading: 'Loading…',
    total: 'Total', youGet: 'You get', to: 'To', delivery: 'Delivery', auto: 'Automatic, 1–5 min', codeDel: 'Code shown on this page', linkDel: 'Link shown on this page',
    noIdCode: 'No ID needed: you get a Robux code after payment and redeem it at roblox.com/redeem.',
    noIdLink: 'No ID needed: you get an activation link after payment to claim the Gold.',
    agree: 'A top-up sent to a wrong ID cannot be refunded.',
    payTitle: 'Transfer to the card', left: 'left', exact: 'Exactly this amount', card: 'Card number', copy: 'Copy', copied: 'Copied',
    howPay: ['Open your banking app (Click, Payme, Uzum…)', 'Transfer to the card', 'Enter the amount exactly'],
    wait: 'Waiting for your payment, we send automatically once it arrives', note: 'A different or split amount will not be confirmed automatically.', cancel: 'Cancel',
    st: ['Paid', 'Sending', 'Delivered'],
    delivering: 'Payment received! Sending your top-up…', deliveredT: 'Done!', deliveredS: '{x} added to your account',
    problem: 'Payment received, but delivery hit a problem. We are fixing it, your money is safe.', expired: 'Payment time is over. If you already paid, send the receipt to support.',
    linkT: 'Activation link', linkH: 'Open the link: list the shown skin on the market at the given price and the Gold lands. Do not share the link.', open: 'Open link',
    codeT: 'Robux code', codeH: 'Redeem at roblox.com/redeem. Do not share the code.', redeem: 'roblox.com/redeem',
    support: 'Contact support', again: 'Buy again', order: 'Order', errNet: 'Connection error, please try again.',
    help: {
      'pubg-mobile': 'Tap your avatar top-left. The number under your nickname is your Player ID (10–11 digits).',
      'free-fire': 'Tap your avatar top-left. The number under your nickname is your UID.',
      'mobile-legends': 'Tap your avatar: you see the ID and Zone ID in brackets, e.g. 12345678 (1234).',
      _: 'Open your in-game profile: the ID is under your nickname or in settings.',
    } as Record<string, string>,
    sub: { 'pubg-mobile': 'UC · Prime', 'free-fire': 'Diamonds', 'mobile-legends': 'Diamonds', 'standoff-2': 'Gold', roblox: 'Robux', 'delta-force': 'Coins', 'blood-strike': 'BC', 'honor-of-kings': 'Tokens', 'arena-breakout': 'Bonds' } as Record<string, string>,
    unit: { UC: 'UC', Diamonds: 'diamonds', Gold: 'Gold', 'Delta Coins': 'Delta Coins', BC: 'BC', Tokens: 'tokens', Bonds: 'Bonds', Robux: 'Robux' } as Record<string, string>,
    names: [
      [/^Prime \(1 Month\)$/i, 'Prime · 1 month'], [/^Prime Plus \(1 Month\)$/i, 'Prime Plus · 1 month'],
      [/^(\d+) \+ \d+ Diamonds \(First Top-Up Bonus\)$/i, '$1 diamonds ×2 (first top-up)'],
    ] as [RegExp, string][],
  },
};
export type T = (typeof TXT)['uz'];

// ───────────────────────── yordamchilar ─────────────────────────
export const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export const fmt = (n: number) => Number(n || 0).toLocaleString('ru-RU').replace(/[, ]/g, ' ');

export function makeHelpers(lang: Lang) {
  const t = TXT[lang] as T;
  const parse = (name: string) => {
    const m = String(name).match(/^([\d\s.,+]+)\s+(UC|Diamonds|Gold|Delta Coins|BC|Tokens|Bonds|Robux)$/i);
    if (!m) return null;
    const key = Object.keys(t.unit).find((k) => k.toLowerCase() === m[2].toLowerCase()) || m[2];
    return { qty: m[1].trim(), unit: t.unit[key] || m[2] };
  };
  const tr = (name: string) => {
    for (const [re, to] of t.names) if (re.test(name)) return name.replace(re, to);
    return name;
  };
  const pretty = (name: string) => { const p = parse(name); return p ? `${p.qty} ${p.unit}` : tr(name); };
  return { t, parse, tr, pretty };
}

/** Paketlarni guruhlash: valyuta (raqamli) va passlar; "ommabop" — narxi ~60 ming so'mga eng yaqin valyuta paketi
 *  (amalda eng ko'p olinadigan o'rta paket: PUBG 325 UC, Free Fire 572, MLBB 284) */
export function groupItems(g: Game | undefined, parse: (n: string) => unknown) {
  const items = g?.items || [];
  const cur = items.filter((i) => parse(i.name));
  const other = items.filter((i) => !parse(i.name));
  const pool = cur.length ? cur : items;
  const pop = pool.reduce<Item | undefined>((best, i) => (!best || Math.abs(i.price - 60000) < Math.abs(best.price - 60000) ? i : best), undefined);
  return { cur, other, popId: pop?.id || '' };
}

// ───────────────────────── do'kon (controller) ─────────────────────────
export type Renderer = {
  name: string;
  /** butun ilova HTML'i */
  render: (s: State, ctx: Ctx) => string;
  /** render'dan keyin (masalan, tanlangan elementni ko'rinadigan joyga surish) */
  after?: (root: HTMLElement, s: State, ctx: Ctx) => void;
};
export type Ctx = ReturnType<typeof makeHelpers> & {
  lang: Lang; api: string; support: string; game?: Game; item?: Item; needsZone: boolean; ready: boolean; minPrice: (g: Game) => number;
};

const STORE = 'dn_order';

export function mountDonat(root: HTMLElement, opts: { api: string; lang: Lang; catalog: Catalog | null; initialGame?: string; renderers: Record<string, Renderer>; variant: string; support: string }) {
  const H = makeHelpers(opts.lang);
  const { t } = H;
  let renderer = opts.renderers[opts.variant] || Object.values(opts.renderers)[0];
  let pollTimer: number | undefined;
  let tickTimer: number | undefined;
  let checkTimer: number | undefined;
  let activeToken = ''; // faqat shu buyurtma javoblari qabul qilinadi (bekor qilingandan keyin eski javob qaytib kelmasin)

  const s: State = {
    catalog: opts.catalog,
    slug: opts.initialGame && opts.catalog?.games.some((g) => g.slug === opts.initialGame) ? opts.initialGame : opts.catalog?.games[0]?.slug || 'pubg-mobile',
    itemId: '', pid: '', zone: '', contact: '', nick: null, checkedFor: '', err: '', busy: false, order: null,
    step: opts.initialGame ? 2 : 1, sheet: '', showAll: false, help: false, copied: '', now: Date.now(),
  };

  const game = () => s.catalog?.games.find((g) => g.slug === s.slug);
  const item = () => game()?.items.find((i) => i.id === s.itemId);
  const zoneVal = () => s.zone.trim().replace(/[\s()]/g, '');
  const pidVal = () => s.pid.trim().replace(/\s+/g, '');
  const ensureItem = () => {
    const g = game();
    if (g && g.items.length && !g.items.some((i) => i.id === s.itemId)) s.itemId = groupItems(g, H.parse).popId || g.items[0].id;
  };

  function ctx(): Ctx {
    const g = game();
    const needsZone = Boolean(g?.needs_server);
    const idOk = !g?.needs_player_id || (pidVal().length >= 4 && (!needsZone || /^\d{1,8}$/.test(zoneVal())));
    return {
      ...H, lang: opts.lang, api: opts.api, support: opts.support, game: g, item: item(), needsZone,
      ready: Boolean(s.catalog?.enabled && item() && idOk),
      minPrice: (x: Game) => (x.items.length ? Math.min(...x.items.map((i) => i.price)) : 0),
    };
  }

  // ── render (fokus va kursor saqlanadi — inputlar yozish paytida yo'qolmasin)
  function render() {
    ensureItem();
    const a = document.activeElement as HTMLInputElement | null;
    const focusKey = a && root.contains(a) ? a.getAttribute('data-in') : null;
    const sel = focusKey ? [a!.selectionStart, a!.selectionEnd] : null;
    root.className = `dn-root dn-${renderer.name}`;
    root.innerHTML = renderer.render(s, ctx());
    if (focusKey) {
      const el = root.querySelector<HTMLInputElement>(`[data-in="${focusKey}"]`);
      if (el) { el.focus(); try { el.setSelectionRange(sel![0], sel![1]); } catch {} }
    }
    renderer.after?.(root, s, ctx());
  }
  const set = (p: Partial<State>) => { Object.assign(s, p); render(); };

  // ── API
  async function api(path: string, body?: unknown) {
    const r = await fetch(opts.api + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok && d.success !== false, d };
  }

  async function checkPlayer(force = false): Promise<boolean> {
    const g = game();
    if (!g?.needs_player_id) return true;
    const id = pidVal(); const z = g.needs_server ? zoneVal() : '';
    if (!id) { set({ nick: { kind: 'bad', text: t.needId } }); return false; }
    if (g.needs_server && !/^\d{1,8}$/.test(z)) { set({ nick: { kind: 'bad', text: t.needZone } }); return false; }
    const key = `${s.slug}:${id}:${z}`;
    if (!force && s.checkedFor === key) return true;
    set({ nick: { kind: 'wait', text: t.checking } });
    try {
      const { ok, d } = await api('/api/donat/check-player', { game: s.slug, player_id: id, server_id: z || undefined, item: item()?.name });
      if (`${s.slug}:${pidVal()}:${g.needs_server ? zoneVal() : ''}` !== key) return false; // shu orada o'zgargan
      if (!ok) { set({ nick: { kind: 'bad', text: d.error || t.errNet }, checkedFor: '' }); return false; }
      set({ nick: { kind: 'ok', text: d.player_name ? d.player_name : t.notVerified, name: d.player_name || null }, checkedFor: key });
      return true;
    } catch { set({ nick: { kind: 'bad', text: t.errNet } }); return false; }
  }

  async function createOrder() {
    const g = game(); const it = item();
    if (!g || !it || s.busy) return;
    if (!(await checkPlayer())) return;
    set({ busy: true, err: '' });
    try {
      const { ok, d } = await api('/api/donat/order', {
        game: s.slug, item: it.id, player_id: g.needs_player_id ? pidVal() : undefined,
        server_id: g.needs_server ? zoneVal() : undefined, contact: s.contact.trim(), site: location.hostname, lang: opts.lang,
      });
      if (!ok) { set({ busy: false, err: d.error || t.errNet }); return; }
      activeToken = d.token;
      try { localStorage.setItem(STORE, d.token); } catch {}
      history.replaceState(null, '', `${location.pathname}?order=${encodeURIComponent(d.token)}`);
      s.order = {
        ...d, game: g.title, game_slug: g.slug, item: it.name, state: 'awaiting_payment',
        player_id: g.needs_player_id ? pidVal() : null, server_id: g.needs_server ? zoneVal() : null, player_name: s.nick?.name || null,
      };
      s.busy = false; s.sheet = 'pay';
      startTick(); render(); scrollToRoot(); poll(d.token);
    } catch { set({ busy: false, err: t.errNet }); }
  }

  function startTick() {
    clearInterval(tickTimer);
    tickTimer = window.setInterval(() => {
      if (s.order?.state !== 'awaiting_payment') return clearInterval(tickTimer);
      s.now = Date.now();
      // faqat taymer qismini yangilaymiz (butun render emas)
      const end = new Date(s.order.expires_at || 0).getTime();
      const ms = Math.max(0, end - s.now); const sec = Math.round(ms / 1000);
      root.querySelectorAll<HTMLElement>('[data-timer]').forEach((el) => (el.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`));
      root.querySelectorAll<HTMLElement>('[data-progress]').forEach((el) => (el.style.width = `${Math.min(100, (ms / (8 * 60000)) * 100)}%`));
      root.classList.toggle('is-late', sec < 90);
    }, 1000);
  }

  function poll(token: string) {
    clearTimeout(pollTimer);
    if (token !== activeToken) return;
    fetch(`${opts.api}/api/donat/order/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (r) => {
        if (token !== activeToken) return 'stop';
        if (r.status === 404) { try { localStorage.removeItem(STORE); } catch {} history.replaceState(null, '', location.pathname); set({ order: null, sheet: '' }); return 'stop'; }
        const o = await r.json();
        if (token !== activeToken) return 'stop';
        if (!o?.success) return;
        const prev = s.order?.state;
        s.order = { ...(s.order || {}), ...o, card: o.card || s.order?.card, game: o.game, item: o.item };
        if (o.state === 'awaiting_payment') { if (prev !== 'awaiting_payment') { s.sheet = 'pay'; startTick(); render(); } }
        else if (prev !== o.state || o.link) { s.sheet = 'pay'; render(); if (prev !== o.state) scrollToRoot(); }
        if (o.state === 'delivered' || o.state === 'expired') { try { localStorage.removeItem(STORE); } catch {} return 'stop'; }
      })
      .catch(() => {})
      .then((res) => { if (res !== 'stop' && token === activeToken) pollTimer = window.setTimeout(() => poll(token), 4000); });
  }

  function reset() {
    activeToken = '';
    clearTimeout(pollTimer); clearInterval(tickTimer);
    try { localStorage.removeItem(STORE); } catch {}
    history.replaceState(null, '', location.pathname);
    document.documentElement.classList.remove('q-lock');
    set({ order: null, sheet: '', step: s.slug ? 2 : 1, err: '', busy: false, copied: '' });
    scrollToRoot();
  }

  function scrollToRoot() {
    const top = root.getBoundingClientRect().top + window.scrollY - 90;
    if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top, behavior: 'smooth' });
  }

  async function copy(what: string, value: string) {
    try { await navigator.clipboard.writeText(value); set({ copied: what }); setTimeout(() => set({ copied: '' }), 1500); } catch {}
  }

  // ── hodisalar (delegatsiya)
  root.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || !root.contains(el)) return;
    const act = el.dataset.act!; const v = el.dataset.v || '';
    switch (act) {
      case 'game':
        if (v !== s.slug) Object.assign(s, { slug: v, itemId: '', pid: '', zone: '', nick: null, checkedFor: '', err: '', showAll: false, help: false });
        s.sheet = ''; if (renderer.name === 'v1') s.step = 2;
        render(); if (renderer.name === 'v1') scrollToRoot(); break;
      case 'item':
        s.itemId = v; s.err = '';
        if (renderer.name === 'v1') { s.step = game()?.needs_player_id ? 3 : 4; render(); scrollToRoot(); } else render();
        break;
      case 'step': set({ step: Number(v), err: '' }); scrollToRoot(); break;
      case 'next': {
        // A variant: ID qadamidan tasdiqlashga — avval nik tekshiriladi
        if (s.step === 3) checkPlayer().then((ok) => { if (ok) { set({ step: 4 }); scrollToRoot(); } });
        else { set({ step: Math.min(4, s.step + 1) }); scrollToRoot(); }
        break;
      }
      case 'check': checkPlayer(true); break;
      case 'help': set({ help: !s.help }); break;
      case 'more': set({ showAll: !s.showAll }); break;
      case 'sheet': set({ sheet: (v as State['sheet']) }); break;
      case 'pay': {
        const c = ctx();
        if (!c.item) return;
        if (c.game?.needs_player_id && !pidVal()) { set({ nick: { kind: 'bad', text: t.needId } }); root.querySelector<HTMLInputElement>('[data-in="pid"]')?.focus(); return; }
        if (c.needsZone && !zoneVal()) { set({ nick: { kind: 'bad', text: t.needZone } }); root.querySelector<HTMLInputElement>('[data-in="zone"]')?.focus(); return; }
        createOrder(); break;
      }
      case 'copy-amount': copy('amount', String(s.order?.amount || '')); break;
      case 'copy-card': copy('card', String(s.order?.card?.number || '').replace(/\D/g, '')); break;
      case 'copy-code': copy('code', String(s.order?.link || '')); break;
      case 'cancel': {
        // to'lanmagan buyurtmani serverda ham yopamiz (summa bo'shaydi, IP limitiga hisoblanmaydi)
        const tk = activeToken || s.order?.token;
        if (tk && s.order?.state === 'awaiting_payment') fetch(`${opts.api}/api/donat/order/${encodeURIComponent(tk)}/cancel`, { method: 'POST' }).catch(() => {});
        reset(); break;
      }
      case 'again': reset(); break;
    }
  });
  root.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement; const k = el.dataset.in;
    if (!k) return;
    if (k === 'pid') s.pid = el.value;
    if (k === 'zone') s.zone = el.value;
    if (k === 'contact') { s.contact = el.value; return; }
    s.checkedFor = ''; s.nick = null;
    render();
    clearTimeout(checkTimer);
    const g = game();
    if (pidVal().length >= 6 && (!g?.needs_server || zoneVal())) checkTimer = window.setTimeout(() => checkPlayer(), 900);
  });
  root.addEventListener('keydown', (e) => {
    const el = e.target as HTMLInputElement;
    if ((e as KeyboardEvent).key === 'Enter' && (el.dataset.in === 'pid' || el.dataset.in === 'zone')) checkPlayer(true);
  });

  // ── boshlash
  render();
  fetch(`${opts.api}/api/donat/catalog`).then((r) => r.json()).then((d) => {
    if (d?.success) { s.catalog = { enabled: Boolean(d.enabled), pay_window_min: d.pay_window_min || 8, games: d.games || [] }; render(); }
  }).catch(() => {});
  let token = '';
  try { token = new URLSearchParams(location.search).get('order') || localStorage.getItem(STORE) || ''; } catch {}
  if (token) { activeToken = token; poll(token); }

  return {
    setVariant(name: string) {
      if (!opts.renderers[name]) return;
      renderer = opts.renderers[name];
      if (name === 'v1' && !s.order) s.step = s.itemId ? Math.max(1, s.step) : 1;
      render();
    },
  };
}

// ───────────────────────── umumiy bo'laklar (har variant o'z klasslari bilan) ─────────────────────────
export function payBlock(s: State, c: Ctx, cls = 'dp') {
  const { t } = c; const o = s.order!;
  const end = new Date(o.expires_at || 0).getTime(); const ms = Math.max(0, end - s.now); const sec = Math.round(ms / 1000);
  const digits = String(o.card?.number || '').replace(/[^\d*]/g, '').replace(/(.{4})(?=.)/g, '$1 ');
  return `
  <div class="${cls}">
    <div class="${cls}-head">
      <div><div class="${cls}-title">${esc(t.payTitle)}</div><div class="${cls}-what">${what(o, c)}</div></div>
      <div class="${cls}-timer"><b data-timer>${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}</b><span>${esc(t.left)}</span></div>
    </div>
    <div class="${cls}-bar"><span data-progress style="width:${Math.min(100, (ms / (8 * 60000)) * 100)}%"></span></div>
    <div class="${cls}-amount">
      <div class="${cls}-cap">${esc(t.exact)}</div>
      <div class="${cls}-row"><b>${fmt(o.amount || 0)} ${esc(t.sum)}</b><button type="button" class="${cls}-copy${s.copied === 'amount' ? ' ok' : ''}" data-act="copy-amount">${esc(s.copied === 'amount' ? '✓ ' + t.copied : t.copy)}</button></div>
    </div>
    <div class="${cls}-card">
      <div class="${cls}-card-top"><span>${esc(t.card)}</span><b>${esc(String(o.card?.type || o.card?.brand || '').toUpperCase())}</b></div>
      <div class="${cls}-card-num">${esc(digits)}</div>
      <div class="${cls}-card-bot"><span>${esc(o.card?.name || '')}</span><button type="button" class="${cls}-copy ${cls}-copy-w${s.copied === 'card' ? ' ok' : ''}" data-act="copy-card">${esc(s.copied === 'card' ? '✓ ' + t.copied : t.copy)}</button></div>
    </div>
    <ol class="${cls}-how">${t.howPay.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
    <div class="${cls}-wait"><span class="${cls}-dots"><i></i><i></i><i></i></span>${esc(t.wait)}</div>
    <p class="${cls}-note">${esc(t.note)}</p>
    <button type="button" class="${cls}-link" data-act="cancel">${esc(t.cancel)}</button>
  </div>`;
}

export function statusBlock(s: State, c: Ctx, cls = 'ds') {
  const { t } = c; const o = s.order!; const st = o.state!;
  const step = st === 'delivered' ? 2 : st === 'delivering' || st === 'problem' ? 1 : -1;
  const ico = ({ delivering: '🚀', delivered: '🎉', problem: '🛠️', expired: '⌛' } as Record<string, string>)[st] || '🚀';
  const title = st === 'delivered' ? t.deliveredT : st === 'problem' ? t.problem : st === 'expired' ? t.expired : t.delivering;
  const sub = st === 'delivered' && !o.link ? t.deliveredS.replace('{x}', c.pretty(o.item || '')) : '';
  const code = o.link && o.secret_kind === 'code';
  const link = o.link && o.secret_kind !== 'code' && /^https?:\/\//i.test(o.link);
  return `
  <div class="${cls}${st === 'delivered' ? ' done' : ''}">
    ${st !== 'expired' ? `<ol class="${cls}-track">${t.st.map((x, i) => `<li class="${i < step || (st === 'delivered' && i <= step) ? 'done' : ''}${i === step && st !== 'delivered' ? ' now' : ''}${i === step && st === 'problem' ? ' bad' : ''}"><span></span>${esc(x)}</li>`).join('')}</ol>` : ''}
    <div class="${cls}-ico">${ico}</div>
    <div class="${cls}-title">${esc(title)}</div>
    ${sub ? `<div class="${cls}-sub">${esc(sub)}</div>` : ''}
    <div class="${cls}-what">${what(o, c)}</div>
    ${code ? `<div class="${cls}-box"><div class="${cls}-cap">🎟️ ${esc(t.codeT)}</div><div class="${cls}-code"><code>${esc(o.link)}</code><button type="button" class="${cls}-copy${s.copied === 'code' ? ' ok' : ''}" data-act="copy-code">${esc(s.copied === 'code' ? '✓ ' + t.copied : t.copy)}</button></div><a class="${cls}-btn ghost" href="https://www.roblox.com/redeem" target="_blank" rel="noopener noreferrer">${esc(t.redeem)}</a><p>${esc(t.codeH)}</p></div>` : ''}
    ${link ? `<div class="${cls}-box"><div class="${cls}-cap">🔗 ${esc(t.linkT)}</div><a class="${cls}-btn" href="${esc(o.link)}" target="_blank" rel="noopener noreferrer">${esc(t.open)}</a><p>${esc(t.linkH)}</p></div>` : ''}
    <div class="${cls}-actions">
      ${st === 'problem' || st === 'expired' ? `<a class="${cls}-btn ghost" href="${esc(c.support)}" target="_blank" rel="noopener">💬 ${esc(t.support)}</a>` : ''}
      ${st !== 'delivering' ? `<button type="button" class="${cls}-btn ghost" data-act="again">${esc(t.again)}</button>` : ''}
    </div>
  </div>`;
}

export function what(o: Order, c: Ctx) {
  return `<b>${esc(o.game || '')} · ${esc(c.pretty(o.item || ''))}</b>${o.player_id ? ` · ID ${esc(o.player_id)}${o.server_id ? ` (${esc(o.server_id)})` : ''}` : ''}${o.player_name ? ` · ${esc(o.player_name)}` : ''}${o.order_id ? ` · ${esc(c.t.order)} #${esc(o.order_id)}` : ''}`;
}

/** Paket tugmasi ichidagi matn: katta raqam + birlik yoki tarjima qilingan nom */
export function itemLabel(it: Item, c: Ctx) {
  const p = c.parse(it.name);
  return p ? `<b>${esc(p.qty)}</b> <small>${esc(p.unit)}</small>` : esc(c.tr(it.name));
}

export function nickHtml(s: State, cls: string) {
  if (!s.nick) return '';
  const ico = s.nick.kind === 'ok' ? (s.nick.name ? '✓' : 'i') : s.nick.kind === 'bad' ? '!' : '';
  return `<div class="${cls} ${s.nick.kind}">${s.nick.kind === 'wait' ? '<span class="spin"></span>' : `<span class="ico">${ico}</span>`}<span>${esc(s.nick.text)}</span></div>`;
}

export const gameImg = (slug: string, cls = '') => `<img class="${cls}" src="/images/donat/${esc(slug)}.png" alt="" width="64" height="64" loading="lazy" decoding="async">`;

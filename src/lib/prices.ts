/**
 * StarsJoy narxlari — yagona manba.
 *
 * Saytdagi barcha StarsJoy narxlari (sahifalar, bloglar, JSON-LD) shu fayldan olinadi.
 * Narx o'zgarsa faqat shu yerdagi qiymatlar o'zgartiriladi — backend .env (STARS_PRICE_PER_UNIT,
 * VITE_PREMIUM_3/6/12) bilan bir xil bo'lishi shart.
 *
 * Gift narxlari (15/25/50/100 ⭐ sovg'a) bu yerda emas — ular alohida va bu narx o'zgarishiga bog'liq emas.
 * Telegram ilovasidagi narxlar (App Store / Google Play) ham bu yerda emas — ular tashqi narx.
 */

/** 1 Telegram Star narxi, so'm. */
export const STAR_PRICE = 254;

/** Telegram Premium narxlari, so'm. */
export const PREMIUM_PRICE = { 3: 179000, 6: 239000, 12: 429000 } as const;

/** Xarid bonusi: har 100 ⭐ ga +4 ⭐ (4%). */
export const STARS_BONUS_RATE = 0.04;

/** Narxlar shu sanadan amalda (sahifalarda "Narxlar … holatiga"). */
export const PRICES_DATE = '2026-11-15';
export const PRICES_DATE_UZ = '15.11.2026';

/** N ta Stars narxi, so'm. */
export const starsPrice = (n: number) => n * STAR_PRICE;

/** Bonus bilan 1 ⭐ uchun amaldagi narx (yaxlitlangan). */
export const starPriceWithBonus = () => Math.round(STAR_PRICE / (1 + STARS_BONUS_RATE));

/** Premium oylik narxi (yaxlitlangan). */
export const premiumPerMonth = (m: 3 | 6 | 12) => Math.round(PREMIUM_PRICE[m] / m);

/** 12345 → "12,345". */
export function fmt(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 12345 → "12 345" (bo'linmas bo'shliq bilan; ru matnlar va bo'shliqli uslubdagi sahifalar uchun). */
export function fmtS(n: number): string {
  return fmt(n).replace(/,/g, ' ');
}

/** Narx izohi — har bir narx jadvali/bloki yonida ko'rsatiladi. */
export const PRICE_NOTE = {
  uz: "Narxlar soliq va to'lov tizimi komissiyalariga qarab o'zgarishi mumkin. Aniq narx buyurtma paytida ko'rsatiladi.",
  ru: 'Цены могут меняться в зависимости от налогов и комиссий платёжных систем. Точная цена показывается при оформлении заказа.',
  en: 'Prices may change depending on taxes and payment system fees. The exact price is shown when you place an order.',
} as const;

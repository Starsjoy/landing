/**
 * Til versiyalari o'rtasidagi sahifa moslashuvi.
 *
 * O'zbekcha va ruscha sahifalar bir xil slug ishlatadi (`/premium` ↔
 * `/ru/premium`), shuning uchun ular uchun oddiy prefiks yetarli. Inglizcha
 * sahifalar esa inglizcha slug oldi (`/en/how-to-qollanma` emas, `/en/how-to-buy`),
 * shuning uchun aniq jadval kerak.
 *
 * Bu jadval ikki joyda ishlatiladi va ikkalasi ham sinxron bo'lishi shart:
 *  1. NavbarEn — til almashtirish tugmasi
 *  2. Har bir sahifaning `hreflangs` propi — Google hreflang'ni ikki tomonlama
 *     talab qiladi, ya'ni UZ sahifa EN'ga ko'rsatsa, EN ham UZ'ga ko'rsatishi kerak
 */

/** EN sahifa → uning o'zbekcha ekvivalenti */
export const EN_TO_UZ: Record<string, string> = {
  '/en': '/',
  '/en/premium': '/premium',
  '/en/stars': '/stars',
  '/en/gifts': '/gifts',
  '/en/how-to-buy': '/qollanma',
  '/en/about': '/info',
  '/en/blog': '/blog',
  // Blog maqolalari — EN slug o'zbekchadan farq qiladi, shuning uchun har biri
  // alohida yoziladi. Yozuv bo'lmasa NavbarEn dagi 🇺🇿 tugmasi o'quvchini
  // maqolaga emas, bosh sahifaga tashlaydi.
  '/en/blog/most-expensive-telegram-gifts': '/blog/eng-qimmat-telegram-sovgalari',
  '/en/blog/pay-for-telegram-ads-with-stars': '/blog/telegram-ads-stars-bilan',
};

/** O'zbekcha sahifa → uning inglizcha ekvivalenti (yuqoridagining teskarisi) */
export const UZ_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_UZ).map(([en, uz]) => [uz, en]),
);

const SITE = 'https://starsjoy.uz';

/**
 * Bitta sahifa uchun to'liq hreflang ro'yxatini quradi.
 *
 * `uzPath` — o'zbekcha variantning yo'li (`/premium`, `/` va h.k.).
 * Inglizcha varianti bo'lmasa, ro'yxatga `en` qo'shilmaydi — mavjud bo'lmagan
 * URL'ga hreflang berish Google'da xato sifatida ko'rinadi.
 */
export function hreflangsFor(uzPath: string) {
  const ruPath = uzPath === '/' ? '/ru' : `/ru${uzPath}`;
  const out = [
    { lang: 'uz', href: SITE + (uzPath === '/' ? '' : uzPath) },
    { lang: 'ru', href: SITE + ruPath },
  ];
  const enPath = UZ_TO_EN[uzPath];
  if (enPath) out.push({ lang: 'en', href: SITE + enPath });
  return out;
}

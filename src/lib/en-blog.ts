/**
 * Inglizcha blog maqolalari ro'yxati — yagona manba.
 *
 * Uch joyda ishlatiladi va shuning uchun bir joyda saqlanadi:
 *   1. /en/blog indeks sahifasi
 *   2. scripts/gen-discovery.mjs → llms.txt dagi English bo'limi
 *   3. FooterEn dagi havolalar
 *
 * Yangi inglizcha maqola qo'shilganda faqat shu massivga qator qo'shiladi.
 */
export interface EnPost {
  slug: string;
  title: string;
  excerpt: string;
  /** ISO sana */
  date: string;
  tag: 'Stars' | 'Premium' | 'Gifts' | 'Guide';
}

// Eng yangisi birinchi
export const EN_POSTS: EnPost[] = [
  {
    slug: 'pay-for-telegram-ads-with-stars',
    title: 'How to pay for Telegram Ads with Stars',
    excerpt:
      'Who can pay with Stars, how the 30% discount works, where to find Buy Ads, and why Stars bought on a personal account cannot fund a campaign.',
    date: '2026-08-18',
    tag: 'Guide',
  },
  {
    slug: 'most-expensive-telegram-gifts',
    title: 'The most expensive Telegram gifts in 2026',
    excerpt:
      'The record sale on Fragment is a Plush Pepe at 88,888 GRAM. The top 10 collections, why the floor and the record differ by 14x inside one collection, and why a small supply does not mean a high price.',
    date: '2026-08-12',
    tag: 'Gifts',
  },
  {
    slug: 'telegram-stars-or-premium',
    title: 'Telegram Stars or Premium — which one do you need?',
    excerpt:
      'They are two separate products, not two tiers. Stars are money you spend inside Telegram; Premium is a subscription that changes the app. Buying the wrong one is the most common mistake.',
    date: '2026-08-07',
    tag: 'Guide',
  },
  {
    slug: 'telegram-premium-features',
    title: 'What Telegram Premium actually gives you',
    excerpt:
      'Every feature in 2026, grouped by what it changes — files, reading, personalisation, business. Plus the three things Premium does not do that people assume it does.',
    date: '2026-08-07',
    tag: 'Premium',
  },
  {
    slug: 'what-you-can-do-with-telegram-stars',
    title: 'What you can actually do with Telegram Stars',
    excerpt:
      'Eight concrete uses — paid posts, bots and Mini Apps, tips, paid reactions, gifts, ads — and the three things Stars cannot do.',
    date: '2026-08-07',
    tag: 'Stars',
  },
  {
    slug: 'cash-out-telegram-stars',
    title: 'How to cash out Telegram Stars in Uzbekistan',
    excerpt:
      "The official Fragment route needs a TON wallet and a 21-day wait, and is closed to ordinary users. What actually works here — payouts to Uzcard and Humo, without crypto.",
    date: '2026-08-07',
    tag: 'Stars',
  },
  {
    slug: 'is-buying-telegram-stars-safe',
    title: 'Is buying Telegram Stars safe? How to spot a scam',
    excerpt:
      'Delivery needs your username and nothing else. The warning signs that separate a real service from account theft, and what to do if you already gave something away.',
    date: '2026-08-07',
    tag: 'Stars',
  },
  {
    slug: 'telegram-sms-code-not-arriving',
    title: 'Telegram SMS code not arriving: how to get into your account',
    excerpt:
      'Why codes to +998 numbers get dropped, the fix that works in seconds if you are logged in elsewhere, the voice-call option, and the 2FA trap that loses accounts permanently.',
    date: '2026-08-07',
    tag: 'Guide',
  },
  {
    slug: 'telegram-premium-expired',
    title: 'Telegram Premium expired: what you lose and how to renew',
    excerpt:
      'Nothing is deleted — not your chats, not your files, not even the ones over 2 GB. What actually changes, what stays, and how to renew from Uzbekistan.',
    date: '2026-08-07',
    tag: 'Premium',
  },
  {
    slug: 'gift-telegram-premium',
    title: 'How to gift Telegram Premium to someone',
    excerpt:
      'You need their username and nothing else. What it costs, what they receive, why they pay nothing, and the one mistake that cannot be reversed.',
    date: '2026-08-07',
    tag: 'Gifts',
  },
  {
    slug: 'telegram-business-vs-premium',
    title: 'Telegram Business vs Premium: one subscription or two?',
    excerpt:
      'Business is not a separate purchase — it is part of Premium. What each side unlocks, which business features are worth the setup, and what your customers see without a subscription.',
    date: '2026-08-07',
    tag: 'Premium',
  },
];

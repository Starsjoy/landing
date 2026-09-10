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
    slug: 'telegram-star-messages',
    title: 'Telegram Star Messages: Get Paid for Messages From Strangers (2026)',
    excerpt:
      'Telegram Premium users can charge 1-10,000 Stars for a message from someone outside their contacts: how to turn it on, what percentage you keep, and how to refund it.',
    date: '2026-09-10',
    tag: 'Stars',
  },
  {
    slug: 'telegram-stars-giveaway',
    title: 'How to Run a Telegram Stars Giveaway (2026)',
    excerpt:
      "Steps to run a Stars-prize giveaway in a channel or group: who's eligible, how winners are picked, and where to buy Stars cheaply enough to fund a large prize pool.",
    date: '2026-09-10',
    tag: 'Guide',
  },
  {
    slug: 'telegram-channel-subscription-stars',
    title: "How Telegram's paid channel subscriptions work with Stars",
    excerpt:
      'How to set up a recurring monthly paid subscription for a Telegram channel using Stars, and how subscribers join or cancel: pricing, where the Stars go, and how it differs from a paid post.',
    date: '2026-09-09',
    tag: 'Stars',
  },
  {
    slug: 'activate-telegram-premium-gift-code',
    title: 'How to activate a Telegram Premium gift code',
    excerpt:
      'How to activate a Telegram Premium gift code won in a channel giveaway or received via a link: the steps, how long codes stay valid, and what happens if you already have Premium.',
    date: '2026-09-09',
    tag: 'Premium',
  },
  {
    slug: 'cancel-telegram-premium-auto-renewal',
    title: 'How to Turn Off Telegram Premium Auto-Renewal (2026)',
    excerpt:
      'Step-by-step for iOS, Android and @PremiumBot, what happens to your remaining days after cancelling, and what to do if the cancel option is missing.',
    date: '2026-09-06',
    tag: 'Premium',
  },
  {
    slug: 'telegram-stars-glossary',
    title: 'Telegram Stars Glossary: 18 Key Terms Explained (2026)',
    excerpt:
      'Stars, Fragment, Collectible, TON, withdraw and refund explained in plain English — one glossary to understand any Telegram Stars guide.',
    date: '2026-09-06',
    tag: 'Stars',
  },
  {
    slug: 'is-starsjoy-legit',
    title: 'Is StarsJoy Legit? Reviews and Guarantees (2026)',
    excerpt:
      '8,000+ confirmed orders, 78 dated customer reviews averaging 4.9/5, and a 100% refund guarantee if delivery fails — every proof point and how to verify it yourself.',
    date: '2026-09-03',
    tag: 'Guide',
  },
  {
    slug: 'sell-telegram-gift-fragment',
    title: 'How to sell a Telegram gift on Marketplace or Fragment',
    excerpt:
      'Sell a collectible for Stars inside Telegram or export it through Fragment for TON — the exact steps, pricing method, fees and scam protection.',
    date: '2026-08-26',
    tag: 'Gifts',
  },
  {
    slug: 'telegram-stars-premium-statistics-2026',
    title: 'Telegram Stars & Premium Statistics 2026',
    excerpt:
      '1 billion+ users, 15 million Premium subscribers, $870M in H1 2025 revenue and a $220M loss. Stars pricing, what creators actually earn, and the Gifts market — every number sourced.',
    date: '2026-08-23',
    tag: 'Stars',
  },
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

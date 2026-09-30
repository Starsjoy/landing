# StarsJoy Blog — Maqola yozish standarti (10 mezon)

Har bir yangi blog maqolasi quyidagi 10 mezonning **barchasiga** javob berishi shart.

## 1. 🔍 Web search — eng yangi ma'lumot
Har maqoladan oldin websearch qilinadi. Joriy narxlar (so'm/Stars), Telegram 2026 yangi funksiyalari, paket o'zgarishlari, Fragment/raqobatchi holati tekshiriladi. Eskirgan ma'lumot yo'q.

## 2. 🚫 Nol yolg'on
Har raqam, narx, funksiya — manba bilan tasdiqlangan. Noma'lum ma'lumot yozilmaydi (taxmin bo'lsa "taxminan" deb belgilanadi). Soxta statistika/sharh/funksiya qat'iy taqiq.

## 3. 🔁 Dublikat yo'q
Mavjud maqolalar (blog/index.astro) bilan solishtiriladi. Yangi search intent qoplanadi, kalit so'z klasteri takrorlanmaydi. Slug/canonical/title noyob.

## 4. 🎯 SEO + AEO ideal
- SEO: title ≤60 belgi (kalit so'z oldinda), meta 140–160 belgi, bitta H1, mantiqiy H2/H3, OG image, canonical, sitemap.
- AEO: boshida 40–60 so'zlik to'g'ridan-to'g'ri javob, savol-formatdagi H2, FAQ bloki, jadval/ro'yxat.

## 5. 🌐 Uch til pariteti (uz + ru + en) — MAJBURIY
Har bir yangi maqola **uchala tilda** yoziladi: uz (`/blog/`), ru (`/ru/blog/`), en (`/en/blog/`). Bittasi ham tashlab ketilmaydi. RU va EN — sifatli tarjima, mashina tarjimasi emas.

**Har bir maqola uchun tegiladigan fayllar:**

| Fayl | Nima qilinadi |
|---|---|
| `src/pages/blog/<slug>.astro` | UZ maqola (to'liq boilerplate) |
| `src/pages/ru/blog/<slug>.astro` | RU maqola (to'liq boilerplate) |
| `src/pages/en/blog/<en-slug>.astro` | EN maqola — **`BlogPostEn` layout**, faqat kontent |
| `src/pages/blog/index.astro` | UZ indeksga obyekt |
| `src/pages/ru/blog/index.astro` | RU indeksga obyekt |
| `src/lib/en-blog.ts` → `EN_POSTS` | EN qator (bu `/en/blog`, llms.txt va FooterEn uchun yagona manba) |
| `src/lib/i18n.ts` → `EN_TO_UZ` | `'/en/blog/<en-slug>': '/blog/<uz-slug>'` — bo'lmasa NavbarEn dagi 🇺🇿 tugmasi bosh sahifaga tashlaydi |
| `scripts/gen-discovery.mjs` → `GROUPS` | UZ slug (kiritilmasa skript xato beradi) |

**hreflang ikki tomonlama bo'lishi shart.** Google bir tomonlama hreflang'ni butunlay e'tiborsiz qoldiradi:
- EN faylda `BlogPostEn` ga `uzHref` va `ruHref` proplarini bering.
- UZ va RU fayllardagi `hreflangs={[...]}` ro'yxatiga `{ lang: "en", href: "https://starsjoy.uz/en/blog/<en-slug>" }` **qo'shish esdan chiqmasin** — eski maqolalarda faqat uz+ru bor.

**EN slug o'zbekchadan farq qilishi mumkin** (`/en/blog/most-expensive-telegram-gifts` ↔ `/blog/eng-qimmat-telegram-sovgalari`) — inglizcha kalit so'z bo'yicha tanlanadi, transliteratsiya qilinmaydi.

⚠️ `BlogPostEn.astro` dagi style bloki `is:global` — uni oddiy `<style>` ga qaytarmang, aks holda sahifa jimgina stilsiz chiqadi.

⚠️ EN maqola yozishdan oldin mavjud `/en/` sahifalari bilan kannibalizatsiyani tekshiring (masalan `/en/premium` va `/en/stars` ba'zi mavzularni allaqachon qamraydi). Kesishsa — EN versiyani boshqa burchakdan yozing yoki mavjud sahifani kengaytiring.

## 6. 🏷️ JSON-LD schema majburiy
Article/BlogPosting + BreadcrumbList + kontentga mos (FAQPage / HowTo / ItemList). datePublished va dateModified to'g'ri.

## 7. 🔗 Ichki linking + CTA
Kamida 2–3 ta tegishli mavjud maqolaga link + mahsulot sahifasi (/stars, /premium, /gifts) + @starsjoybot CTA.

## 8. 🛡️ E-E-A-T va brend izchilligi
Sana ko'rsatiladi, narxlar so'mda, brend **starsjoy.uz** va **@starsjoybot** (eski vitahealth.uz EMAS). To'lov usullari real (Uzcard/Humo/Click/Payme).

## 9. 📐 Struktura va o'qiluvchanlik
Savol-formatdagi H2, qisqa abzaslar (2–4 qator), jadval/ro'yxat, mobil-friendly. ~1000–1800 so'z, "fluff" yo'q.

## 10. ⚙️ Texnik izchillik (Astro shabloni)
Layout + Navbar/NavbarRu + Footer/FooterRu, sana formati YYYY-MM-DD, tag mavjud taksonomiyadan, blog/index.astro ga obyekt qo'shish, build xatosiz.

---

## Yo'l xaritasi — TOP 10 maqola
1. ~~StarsJoy ishonchlimi? Sharhlar/kafolat~~ — BAJARILDI (2026-09-03) — `starsjoy-ishonchli-sharhlar-kafolat` (Xavfsizlik)
2. ~~Eng arzon Stars provayderlar reytingi~~ — BAJARILDI UZ+RU — `telegram-stars-eng-arzon-provayderlar` (Stars) — ⚠️ **EN versiyasi yo'q, yozish kerak**
3. ~~Premium'ni boshqaga sovg'a qilish~~ — BAJARILDI UZ+RU+EN — `telegram-premium-sovga-qilish` / en: `gift-telegram-premium` (Premium)
4. ~~Stars refund/qaytarish~~ — BAJARILDI (2026-07-12) — `telegram-stars-refund-qaytarish` (Stars)
5. ~~Eng qimmat/noyob sovg'alar TOP~~ — BAJARILDI (2026-08-12) — `eng-qimmat-telegram-sovgalari` (Gifts)
6. ~~Telegram Ads Stars bilan~~ — BAJARILDI UZ+RU+EN — `telegram-ads-stars-bilan` / en: `pay-for-telegram-ads-with-stars` (Biznes)
7. ~~Stars/Premium statistika 2026~~ — BAJARILDI (2026-08-23) — `telegram-stars-premium-statistika-2026` (Stars)
8. ~~Stars atamalari lug'ati~~ — BAJARILDI (2026-09-06) — `telegram-stars-atamalar-lugati` (Stars)
9. ~~Sovg'ani sotish/Fragment~~ — BAJARILDI UZ+RU+EN — `telegram-sovga-sotish-fragment` / en: `sell-telegram-gift-fragment` (Gifts)
10. ~~Stars yoki Premium — qaysi biri~~ — BAJARILDI UZ+RU+EN — `telegram-stars-yoki-premium` / en: `telegram-stars-or-premium` (Premium)
11. ~~Premium avtomatik yangilanishini o'chirish~~ — BAJARILDI (2026-09-06) — `telegram-premium-obunani-bekor-qilish` (Premium)

**Holat (2026-09-16):** Ro'yxatdagi 10 ta mavzuning barchasi UZ+RU'da yozilgan. Yagona ochiq ish — `telegram-stars-eng-arzon-provayderlar` uchun EN maqola qo'shish.

---

## Yo'l xaritasi 2 — Sotuvchi paket bloglari (2026-09-30 tasdiqlangan)

**Maqsad:** eng katta sotuvlar — Premium 12/6/3 oy va Stars 10 000/5000/1000/500 — uchun sotuv intentli, GEO'ga moslangan bloglar.

**Kannibalizatsiya qoidasi:** har paketning sotuv sahifasi bor (`/premium/12-oy`, `/stars/5000` va h.k.) va u **"X sotib olish"** so'rovini oladi. Blog esa **"X narxi / qancha so'm"** so'rovini oladi — to'liq xaridor qo'llanmasi — va sotuv sahifasiga yo'naltiradi. Blog sarlavhasi/H1 "sotib olish" bilan boshlanmaydi.

**Tartib:** Stars va Premium navbatma-navbat — ro'yxat tartibida yoziladi.

| # | Sarlavha (UZ) | UZ/RU slug → EN slug | Kalit so'z | Pul sahifasi | Holat |
|---|---|---|---|---|---|
| 1 | 10 000 Telegram Stars narxi 2026 — qancha so'm? | `telegram-stars-10000-narxi` → `10000-telegram-stars-price` | 10000 stars narxi | /stars/10000 | ✅ BAJARILDI (2026-09-30) UZ+RU+EN |
| 2 | Telegram Premium 6 oylik narxi 2026 — 232 000 so'm | `telegram-premium-6-oylik-narxi` → `telegram-premium-6-months-price` | 6 oylik premium narxi | /premium/6-oy | Yangi |
| 3 | 5000 Telegram Stars narxi 2026 — qancha so'm? | `telegram-stars-5000-narxi` → `5000-telegram-stars-price` | 5000 stars narxi | /stars/5000 | Yangi |
| 4 | Telegram Premium'ni Click va Payme orqali olish (2026) | `telegram-premium-click-payme` → `buy-telegram-premium-with-click-payme` | premium click / payme | /premium/12-oy, 6-oy, 3-oy | Yangi |
| 5 | 500 Telegram Stars narxi 2026 — 120 000 so'm | `telegram-stars-500-narxi` → `500-telegram-stars-price` | 500 stars narxi | /stars/500-ta | Yangi |
| 6 | Telegram Premium 12 oylik narxi 2026 — 422 000 so'm | `telegram-premium-12-oylik` (o'zgarmaydi) + EN qo'shiladi | 12 oylik premium narxi | /premium/12-oy | Qayta yozish |
| 7 | 1000 Telegram Stars narxi 2026 — 240 000 so'm | `telegram-1000-stars-sotib-olish` (o'zgarmaydi) + EN qo'shiladi | 1000 stars narxi | /stars/1000 | Qayta yozish |
| 8 | Telegram Premium 3 oylik narxi 2026 — 172 000 so'm | `telegram-premium-3-oylik-sotib-olish` (o'zgarmaydi) + EN qo'shiladi | 3 oylik premium narxi | /premium/3-oy | Qayta yozish |

"Qayta yozish" = slug/URL saqlanadi, sarlavha, kontent va narxlar sotuv intentiga moslanadi, EN versiya qo'shiladi.

**Har bir blog tuzilmasi:**
1. Qisqa javob (40–60 so'z): narx + @starsjoybot orqali 10 soniyada.
2. Narx hisobi: 1 star / 1 oyga qancha tushadi, Telegram ilovasidagi narx bilan solishtirish.
3. To'lov: bot ko'rsatgan kartaga **Payme, Click yoki istalgan bank ilovasi** orqali o'tkazma; katta summada karta limiti bo'lsa boshqa ilovadan to'lash.
4. Qanday olinadi: faqat username kerak — parol yoki SMS kod so'ralmaydi.
5. Kimga mos + qo'shni paketlar bilan solishtirish.
6. Kafolat — oferta bo'yicha: yetkazilmasa pul to'liq qaytadi, murojaat 24 soat ichida @starsjoy_bot orqali, to'lov screenshoti bilan.
7. 8–10 FAQ + @starsjoybot CTA.

Narxlar sotuv sahifalaridan olingan (2026-09-30) — har blogdan oldin qayta tekshiriladi.

**Qo'shimcha (bloglardan tashqari):** 8 ta sotuv sahifasini (`/premium/*`, `/stars/*`) GEO uchun kuchaytirish — narx jadvali, ilova narxi bilan solishtirish, 10–12 FAQ.

**Mavzu cheklovlari:** Starsjoy qoidalariga (oferta) zid mavzu yo'q; diniy jihatdan munozarali bayramlar (masalan 8-mart) haqida yozilmaydi.

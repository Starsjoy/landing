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

> ⚠️ **Yopilgan (2026-10-19).** 1–5 bajarildi; 6–8 "Yo'l xaritasi 3" ga ko'chirildi. Yangi maqolalar faqat **Yo'l xaritasi 3** bo'yicha yoziladi.

**Maqsad:** eng katta sotuvlar — Premium 12/6/3 oy va Stars 10 000/5000/1000/500 — uchun sotuv intentli, GEO'ga moslangan bloglar.

**Kannibalizatsiya qoidasi:** har paketning sotuv sahifasi bor (`/premium/12-oy`, `/stars/5000` va h.k.) va u **"X sotib olish"** so'rovini oladi. Blog esa **"X narxi / qancha so'm"** so'rovini oladi — to'liq xaridor qo'llanmasi — va sotuv sahifasiga yo'naltiradi. Blog sarlavhasi/H1 "sotib olish" bilan boshlanmaydi.

**Tartib:** Stars va Premium navbatma-navbat — ro'yxat tartibida yoziladi.

| # | Sarlavha (UZ) | UZ/RU slug → EN slug | Kalit so'z | Pul sahifasi | Holat |
|---|---|---|---|---|---|
| 1 | 10 000 Telegram Stars narxi 2026 — qancha so'm? | `telegram-stars-10000-narxi` → `10000-telegram-stars-price` | 10000 stars narxi | /stars/10000 | ✅ BAJARILDI (2026-09-30) UZ+RU+EN |
| 2 | Telegram Premium 6 oylik narxi 2026 — 232 000 so'm | `telegram-premium-6-oylik-narxi` → `telegram-premium-6-months-price` | 6 oylik premium narxi | /premium/6-oy | ✅ BAJARILDI (2026-10-07) UZ+RU+EN |
| 3 | 5000 Telegram Stars narxi 2026 — qancha so'm? | `telegram-stars-5000-narxi` → `5000-telegram-stars-price` | 5000 stars narxi | /stars/5000 | ✅ BAJARILDI (2026-10-07) UZ+RU+EN |
| 4 | Telegram Premium'ni Click va Payme orqali olish (2026) | `telegram-premium-click-payme` → `buy-telegram-premium-with-click-payme` | premium click / payme | /premium/12-oy, 6-oy, 3-oy | ✅ BAJARILDI (2026-10-10) UZ+RU+EN |
| 5 | 500 Telegram Stars narxi 2026 — 120 000 so'm | `telegram-stars-500-narxi` → `500-telegram-stars-price` | 500 stars narxi | /stars/500-ta | ✅ BAJARILDI (2026-10-10) UZ+RU+EN |
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

---

## Yo'l xaritasi 3 — Premium + Stars sotuv bloglari (2026-10-19, AKTIV)

**Bu yagona aktiv reja.** Har safar "blog yoz" deyilganda ro'yxatdagi birinchi bajarilmagan band olinadi, yozilgach `Holat` ustuni `✅ BAJARILDI (sana) UZ+RU+EN` ga o'zgartiriladi.

**Fokus:** faqat Telegram **Premium** (asosiy) va **Stars** sotuvi. Gifts/NFT mavzulari bu rejaga kirmaydi.

**Dublikat tekshiruvi (2026-10-19):** 70 ta mavjud UZ/RU maqolaning H1'i bilan solishtirilgan. Har bir band yangi search intent yoki mavjud maqolani qayta yozish (slug saqlanadi). Yozishdan oldin `ls src/pages/blog/` bilan qayta tekshiriladi.

### Sotuv intenti qoidalari
1. **Har maqola bitta pul sahifasiga xizmat qiladi** (`/premium/12-oy`, `/premium/6-oy`, `/premium/3-oy`, `/stars/100`, `/500-ta`, `/1000`, `/5000`, `/10000`): kamida 3 ta kontekst link + yuqorida va pastda CTA.
2. **Kannibalizatsiya:** pul sahifasi "X sotib olish" so'rovini oladi, blog esa "X narxi / qayerdan / arziydimi" kabi qaror bosqichidagi so'rovlarni oladi. H1 "sotib olish" bilan boshlanmaydi.
3. **Birinchi ekranda** narx (so'mda) + "@starsjoybot orqali, faqat username" + CTA tugmasi.
4. Narxlar yozishdan oldin pul sahifalaridan qayta olinadi, taxmin qilinmaydi.
5. **Uzcard / Humo — asosiy intent.** Premium va Stars maqolalarida title, H1, description va qisqa javobda "Uzcard va Humo bilan" bo'lishi shart. Uni boshqa maqola bilan kannibalizatsiya bahonasida olib tashlash mumkin emas.
6. **Manba sir saqlanadi.** Fragment, TON orqali xarid va Telegram'ning sovg'a (Gift) obunalaridagi chegirmalar **tilga olinmaydi** — na taqqoslash jadvalida, na matnda. Faqat Telegram ilovasi (App Store / Google Play) narxi bilan solishtiriladi.
7. **Yangilanish izohi yozilmaydi.** Maqolada "nima yangilangani" haqida matn bo'lmaydi; faqat sana ("Yangilangan: YYYY-MM-DD" va "Narxlar YYYY-MM-DD holatiga").

### GEO (AI-javob) qoidalari
1. **Qisqa javob bloki** (40–60 so'z): AI to'g'ridan-to'g'ri iqtibos qila oladigan, narx + usul + muddat bor bitta mustaqil paragraf.
2. **Raqamli faktlar jadvali**: paket, so'mdagi narx, 1 oy / 1 star narxi, Telegram ilovasidagi narx bilan farq. Har bir raqamning manbasi va sanasi ko'rsatiladi.
3. **Savol shaklidagi H2'lar** ("... qancha turadi?", "... qayerdan arzon?"), har biri birinchi gapida to'g'ridan-to'g'ri javob beradi.
4. **8–10 ta FAQ** + `FAQPage`, `Article`, `BreadcrumbList` (narx bo'lsa `Product`/`Offer`) JSON-LD.
5. **Entity izchilligi**: "StarsJoy", "@starsjoybot", "starsjoy.uz" doim bir xil yoziladi; muallif va "yangilangan sana" ko'rinadi.
6. `llms.txt`, `rss.xml`, `gen-discovery.mjs`, blog index'lar (uz/ru) va `en-blog.ts` yangilanadi.

### Qayta yozish protokoli (xavfsiz, faqat foyda) — MAJBURIY

Mavjud maqola qayta yozilganda quyidagi 4 bosqich to'liq bajariladi. Bitta mezon ham bajarilmasa, maqola chop etilmaydi.

**A. Oldin — baseline (o'lchamasdan o'zgartirilmaydi)**
1. Google Search Console: oxirgi 28 kunlik ma'lumotlar (URL bo'yicha) — top so'rovlar, kliklar, ko'rinishlar va o'rtacha pozitsiya — pastdagi **Qayta yozish jurnali**ga yoziladi. GSC'ga kirish bo'lmasa, foydalanuvchidan eksport so'raladi.
2. **10+ ko'rinishga ega har bir so'rov "himoyalangan so'rov" hisoblanadi** va yangi matnda saqlanadi (title, H2 yoki FAQ'da).
3. Sahifa biror pul so'rovida **top-3** da bo'lsa, faqat **yumshoq rejim** ishlatiladi: matn tanasi saqlanadi va faqat qo'shiladi; title, H1, meta, qisqa javob, narxlar, linklar va EN yangilanadi.

**B. Saqlanadigan narsalar (ranking signallari yo'qolmasin)**
1. Slug, canonical, `datePublished`, RU/UZ juftligi va mavjud `hreflang` o'zgarmaydi.
2. Matn **qisqarmaydi**: so'zlar soni ≥ eskisi. Ranking olib kelayotgan bo'limlar o'chirilmaydi, faqat yangilanadi yoki pastga suriladi.
3. Mavjud H2 `id` lari (anchor) va rasmlar (`src` + `alt`) saqlanadi.
4. Title'da eski asosiy kalit so'z qoladi, faqat tartibi o'zgaradi. Masalan: "1000 Telegram Stars narxi 2026 — 240 000 so'm, 10 soniyada". H1 sotuv sahifasi bilan raqobatlashmasligi uchun "sotib olish" bilan boshlanmaydi, lekin bu so'z matnda va FAQ'da qoladi.
5. Mavjud JSON-LD o'chirilmaydi, faqat to'ldiriladi.

**C. Majburiy foyda (har biri bo'lishi shart)**
1. **Yangi narxlar**: sotuv sahifasidan olinadi, ko'rinadigan "Narxlar YYYY-MM-DD holatiga" yozuvi bilan.
2. **Qisqa javob** (40–60 so'z): birinchi ekranda turadi, narx + usul + muddat.
3. **Faktlar jadvali**: so'm narxi, 1 star / 1 oy narxi, Telegram ilovasidagi narx bilan farq.
4. **Information gain**: raqobatchilarda yo'q kamida 1 ta noyob fakt yoki hisob (masalan, kunlik narx yoki ilova narxi bilan aniq foiz farqi).
5. **Savol shaklidagi H2'lar** + 8–10 FAQ (`FAQPage`), `Article` (`dateModified` faqat haqiqiy o'zgarishda yangilanadi), `BreadcrumbList`, narx bo'lsa `Offer`.
6. **Ichki linklar**: sotuv sahifasiga 3+ link; 2+ boshqa maqoladan shu maqolaga **kiruvchi** link qo'shiladi; raqobatlashgan maqolalar bilan anchor matnlari ajratiladi (har biri o'z so'rovi bilan).
7. **EN versiya** + uch tomonlama `hreflang` (uz/ru/en, x-default).
8. Muallif, "Yangilangan" sanasi va manbalar ko'rinib turadi (E-E-A-T, GEO ishonchi uchun).

**D. 301 redirect qoidasi (faqat birlashtirishda)**
1. Avval yo'naltiriladigan sahifaning himoyalangan so'rovlari va noyob kontenti maqsad sahifaga ko'chiriladi, keyin 301 qilinadi.
2. Redirect uz va ru uchun alohida qilinadi (`vercel.json` → `redirects`, `permanent: true`), zanjirsiz (A→B, A→B→C emas).
3. Eski URL'ga ichki linklar yangi URL'ga almashtiriladi; eski URL sitemap, `llms.txt`, `rss.xml`, `gen-discovery.mjs` va blog index'lardan olib tashlanadi.

**E. Keyin — nazorat va qaytarish**
1. `npm run build` → sahifa ko'zda tekshiriladi → Rich Results Test → GSC'da "Request indexing".
2. **14 va 28-kun** tekshiruvi: jurnalga yangi ko'rsatkichlar yoziladi.
3. **Qaytarish qoidasi:** 28-kunda himoyalangan so'rovlar bo'yicha kliklar baseline'dan **20%+ past** bo'lsa (mavsumiylik hisobga olinadi) → title, H1 va meta eski versiyaga qaytariladi (`git show <commit>:<fayl>`), qo'shilgan foydali bloklar esa qoldiriladi.
4. Bir klasterda (masalan, Premium paketlari) bir vaqtda **faqat bitta** qayta yozish: natija aniq o'lchanishi uchun keyingisi 14 kundan keyin.
5. Baseline va nazorat GSC API orqali olinadi (`scripts/gsc/service-account.json`, property `sc-domain:starsjoy.uz`): `searchAnalytics/query`, `page equals <URL>` filtri, `query` o'lchami bo'yicha, oxirgi 3 kun (GSC kechikishi) hisobga olinmaydi.

#### Qayta yozish jurnali

| Slug | Sana | Rejim | Baseline (28 kun: klik / ko'rinish / poz.) | Himoyalangan so'rovlar | 14-kun | 28-kun | Xulosa |
|---|---|---|---|---|---|---|---|
| `telegram-premium-12-oylik` (uz/ru) + EN yangi | 2026-10-19 | Yumshoq (top-3: "telegram premium narxi 2026" poz 2.5) | 19.09–16.10: UZ 14 / 420 / 5.1 · RU 9 / 640 / 6.7 · `/premium/12-oy` 1 / 60 / 4.8 | "telegram premium narxi 2026" (11 ko'r., poz 2.5), "telegram premium narxi" (20 ko'r., poz 9.8) — ikkalasi title'da saqlandi | 20.10–01.11 (13 kun) vs 05.10–18.10: UZ 7→8 klik, 205→327 ko'r., poz 5.6→5.0 · RU 5→2 klik, 348→594 ko'r., poz 7.0→6.3. "telegram premium narxi" 43 ko'r., poz 6.2 (9.8 dan); "...narxi 2026" poz 1.6 | 2026-11-16 | 14-kun: ko'rinish va pozitsiya o'sdi; RU klik kam sonli (5→2) — 28-kunda qayta tekshiriladi. Tuzatildi: to'lov oqimi (kartaga o'tkazma), pinned chat 20→10, "SMS ustuvorligi" olib tashlandi. Qo'shildi: narx faktlari bloki, ilova narxi bilan taqqoslash, kunlik narx, kafolat, CTA, 10 FAQ, EN. So'zlar: UZ 1687→2271, RU 1541→2238 |
| `telegram-1000-stars-sotib-olish` (uz/ru) + EN yangi | 2026-11-04 | To'liq (top-3 yo'q, 10+ ko'rinishli so'rov yo'q) | 05.10–01.11: UZ 1 / 38 / 5.5 · RU 2 / 105 / 4.0 · `/stars/1000` 0 / 24 / 6.0 | Yo'q (eng kattasi RU "сколько стоит 1000 звезд в тг" 4 ko'r., poz 5.8 — title/FAQ'da saqlandi) | 2026-11-18 | 2026-12-02 | Fragment/TON eslatmalari olib tashlandi, to'lov oqimi tuzatildi, EN qo'shildi |

**⚠️ #3 (3 oylik) to'xtatildi (2026-11-04).** Rejadagi 301 xavfli: `telegram-premium-3-oy-6-oy` 05.10–01.11 da UZ 71 klik / 983 ko'r. / poz 2.5 ("telegram premium narxi" 373 ko'r., poz 1.4; "3 oylik telegram premium" 75 ko'r., poz 1.1), RU 46 klik / 1796 ko'r. Qayta yoziladigan `telegram-premium-3-oylik-sotib-olish` esa atigi UZ 0 / 10, RU 1 / 17. 301 va bir xil intentli qayta yozish Premium klasteridagi eng kuchli sahifani xavf ostiga qo'yadi — qaror foydalanuvchida.

### Reja (yozish tartibi bo'yicha)

| # | Sarlavha (UZ) | Slug (UZ/RU → EN) | Asosiy so'rov | Pul sahifasi | Turi | Dublikatdan ajratish | Holat |
|---|---|---|---|---|---|---|---|
| 1 | Telegram Premium 12 oylik narxi 2026 — 422 000 so'm | `telegram-premium-12-oylik` → `telegram-premium-12-months-price` | 12 oylik premium narxi | /premium/12-oy | Qayta yozish | Narx + Uzcard/Humo title'da; karta limiti nuanslari `telegram-premium-12-oylik-uzcard-humo-bilan` ga link qilinadi | ✅ BAJARILDI (2026-10-19) UZ+RU+EN — nazorat: 02.11 / 16.11 |
| 2 | 1000 Telegram Stars narxi 2026 — 240 000 so'm | `telegram-1000-stars-sotib-olish` → `1000-telegram-stars-price` | 1000 stars narxi | /stars/1000 | Qayta yozish | H1'dan "sotib olish" olib tashlanadi; `stars-paketlari-taqqoslash` umumiy taqqoslash bo'lib qoladi | ✅ BAJARILDI (2026-11-04) UZ+RU+EN |
| 3 | Telegram Premium 3 oylik narxi 2026 — 172 000 so'm | `telegram-premium-3-oylik-sotib-olish` → `telegram-premium-3-months-price` | 3 oylik premium narxi | /premium/3-oy | Qayta yozish | `telegram-premium-3-oy-6-oy` (uz+ru) shu sahifaga **301** qilinadi (6 oy qismini `6-oylik-narxi` allaqachon qoplaydi) | ⏸ TO'XTATILDI (2026-11-04) — 301 xavfi, yuqoridagi izohga qarang |
| 4 | Eng arzon Telegram Premium 2026 — qayerdan va qancha? | `telegram-premium-eng-arzon` → `cheapest-telegram-premium` | arzon telegram premium | /premium/12-oy | Yangi | `paketlar-taqqoslash` "qaysi paket arzon" haqida; bu maqola "qaysi **yo'l** arzon" (Telegram ilovasi, boshqa botlar, StarsJoy) haqida — Fragment tilga olinmaydi | ✅ BAJARILDI (2026-11-04) UZ+RU+EN |
| 5 | 100 Telegram Stars narxi 2026 — qancha so'm? | `telegram-stars-100-narxi` → `100-telegram-stars-price` | 100 stars narxi | /stars/100 | Yangi | 500/1000/5000 seriyasining yetishmayotgan bo'g'ini; `stars-paketlari-taqqoslash` umumiy bo'lib qoladi | ⏳ |
| 6 | iPhone va Android'da Telegram Premium narxi: ilovada nega qimmat? | `telegram-premium-iphone-android-narxi` → `telegram-premium-price-iphone-android` | iphone telegram premium narxi | /premium/12-oy | Yangi | App Store va Google Play narxi so'mga o'girilib StarsJoy bilan solishtiriladi; mavjud maqolalarda bu mavzu faqat o'tib ketishda tilga olingan | ⏳ |
| 7 | Telegram Premium arziydimi? 2026 hisob-kitob: 1 kunga qancha tushadi | `telegram-premium-arziydimi` → `is-telegram-premium-worth-it` | telegram premium arziydimi | /premium/12-oy | Yangi | `premium-funksiyalari` funksiyalar ro'yxati; bu maqola **qaror** haqida: kunlik narx, kimga foydali va kimga foydasiz | ⏳ |
| 8 | Bir nechta akkauntga Telegram Premium: jamoa, oila va giveaway g'oliblari uchun | `telegram-premium-koplab-akkauntga` → `telegram-premium-for-multiple-accounts` | ko'p akkauntga premium | /premium/12-oy, 3-oy | Yangi | `stars-koplab-arzon` faqat Stars haqida; Premium uchun ko'p miqdorda buyurtma maqolasi yo'q | ⏳ |
| 9 | Telegram Premium'ni Stars bilan olish mumkinmi? (2026) | `telegram-premium-stars-bilan` → `pay-telegram-premium-with-stars` | premium stars bilan | /premium/*, /stars/1000 | Yangi | `stars-yoki-premium` "qaysi birini tanlash" haqida; bu maqola "Stars'ni Premium'ga **ishlatish**" haqida. ⚠️ Telegram'ning amaldagi qoidasi web search bilan tasdiqlanadi, tasdiqlanmasa band almashtiriladi | ⏳ |
| 10 | Telegram username qayerdan topiladi — Premium va Stars olish uchun | `telegram-username-qayerdan-topiladi` → `find-telegram-username` | telegram username qayerda | /premium/12-oy, /stars/1000 | Yangi | Xaridgacha bo'lgan to'siqni olib tashlaydi (username yo'q / bilmaydi); mavjud maqolalarda faqat bir qator bilan tilga olingan | ⏳ |

**Har bir maqola tuzilmasi:** "Yo'l xaritasi 2"dagi 7 bandlik tuzilma + yuqoridagi GEO qoidalari. Kafolat va to'lov matni ofertaga mos bo'lishi kerak.

**Rejadan tashqari ochiq ish:** `telegram-stars-eng-arzon-provayderlar` uchun EN versiya.

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
1. StarsJoy ishonchlimi? Sharhlar/kafolat — `starsjoy-ishonchli-sharhlar` (Xavfsizlik) — *user input kerak*
2. Eng arzon Stars provayderlar reytingi — `telegram-stars-eng-arzon-provayderlar` (Stars) ⬅️ **BIRINCHI**
3. Premium'ni boshqaga sovg'a qilish — `telegram-premium-sovga-qilish` (Premium)
4. Stars refund/qaytarish — `telegram-stars-refund-qaytarish` (Stars)
5. Eng qimmat/noyob sovg'alar TOP — `eng-qimmat-telegram-sovgalari` (Gifts)
6. Telegram Ads Stars bilan — `telegram-ads-stars-bilan` (Biznes)
7. ~~Stars/Premium statistika 2026~~ — BAJARILDI (2026-08-23) — `telegram-stars-premium-statistika-2026` (Stars)
8. Stars atamalari lug'ati — `telegram-stars-atamalar-lugati` (Stars)
9. Sovg'ani sotish/Fragment — `telegram-sovga-sotish-fragment` (Gifts)
10. Stars yoki Premium — qaysi biri — `telegram-stars-yoki-premium` (Premium)

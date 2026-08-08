# StarsJoy — GEO/SEO ish holati (2026-08-07)

Bu hujjat 2026-08-07 dagi seansda qilingan ishlarni va keyingi qadamlarni yozib
qo'yadi. Kontekst: raqobatchi **StarsPaymee (starstg.uz)** AI tavsiyalarida
StarsJoy'dan oldinga chiqqan edi; sabab aniqlanib, tuzatildi.

Commit'lar: `4bd7279` → `c1e4c3a` → `dbaf561` (hammasi `main` da, push qilingan).

---

## Muammoning diagnozi

Raqobatchi bilan yonma-yon solishtirilganda uchta haqiqiy farq topildi:

1. **llms.txt bo'sh edi.** StarsPaymee'ning llms.txt — 183 maqolaning to'liq
   mashina indeksi (URL + tavsif, 3 tilda). Bizniki 81 qator edi va saytdagi
   **102 blog sahifasining birortasiga ham havola bermasdi**. AI uchun sayt
   bitta sahifadek ko'rinardi.
2. **Yetkazish da'vosi.** Ular "~10 soniya" deyishardi, biz "1-5 daqiqa".
   Aslida bizniki 10 soniyadan ham tez — "1-5 daqiqa" ehtiyot yuzasidan
   yozilgan edi.
3. **Narx.** Ular 220 so'm/star, biz 240 so'm/star. **Bu hali ochiq.**

Ular hali ham tekshirib bo'lmaydigan "100 000+ buyurtma / 4 000 faol
foydalanuvchi" da'vosini ishlatadi (ichki qarama-qarshi). Bizning javobimiz —
real raqamlar: 8 000+ buyurtma, 42 ta sanali sharh.

---

## Bajarilgan ishlar

### 1. llms.txt va rss.xml endi avtomatik yig'iladi

`scripts/gen-discovery.mjs` — blog manbalaridan (`src/pages/blog/*.astro`,
`src/pages/ru/blog/*.astro`) `const title` / `const description` /
`const publishDate` ni o'qib, ikkala faylni qayta yozadi.

```bash
node scripts/gen-discovery.mjs
```

- `public/llms.txt` — 51 UZ + 51 RU maqola, 9 ta mavzuli guruh, ~24 KB
- `public/rss.xml` — 51 yozuv, sanaga qarab saralangan (ilgari 404 edi)
- Sharhlar soni va o'rtacha ball DB'dan olinadi (`DATABASE_URL`); DB yetib
  bo'lmasa o'sha qator tushadi, fayl baribir yaroqli qoladi

⚠️ **Yangi maqola qo'shilsa, uning slug'ini shu skriptdagi `GROUPS` massiviga
kiritish shart.** Aks holda skript ataylab xato beradi — maqola indeksdan
jimgina tushib qolmaydi.

⚠️ `public/llms.txt` va `public/rss.xml` ni **qo'lda tahrirlamang** — keyingi
generatsiyada yo'qoladi. Statik matn (narx, kafolat, xarid tartibi) skript
ichidagi `HEAD` shablonida.

### 2. Ishonch signallari

- Bosh sahifaga (UZ+RU) `Organization` + `AggregateRating` JSON-LD qo'shildi
  (`5/5`, `42` sharh — DB'dan jonli). Ilgari faqat `/sharhlar` da edi.
- `robots.txt` da 17 ta AI crawler aniq nomlandi: `OAI-SearchBot`,
  `ChatGPT-User`, `Perplexity-User`, `Applebot` va boshqalar.
  Muhim: bot o'ziga guruh bo'lsa `User-agent: *` ni **butunlay o'qimaydi**,
  shuning uchun `Disallow: /api/` va `/modad` yangi guruhda ham takrorlangan.
- `<link rel="alternate" type="application/rss+xml">` — `Layout.astro` da.

### 3. Yetkazish vaqti: 1-5 daqiqa / 5-15 daqiqa → **10 soniya**

Jami ~64 fayl. Qamrov: bosh sahifa, mahsulot sahifalari, blog matnlari, FAQ
javoblari, JSON-LD (`HowTo` qadamlari va `totalTime`), meta description'lar va
3 ta maqola sarlavhasi.

- `totalTime`: `PT15M`/`PT10M` → `PT3M` (buyurtma 2-3 daqiqa + yetkazish
  10 soniya) — 12 faylda
- Kafolat matnlari yumshatildi: qattiq va'da o'rniga *"odatda 10 soniyada —
  yuklama yuqori bo'lganda biroz cho'zilishi mumkin"*

**Ataylab tegilmagan joylar (o'zgartirmang):**

| Joy | Sabab |
|---|---|
| `telegram-premium-uzbekistan-eng-yaxshi-usullar` (UZ+RU) | @PremiumSendBot / @uzgetsbot / @starsjoybot ni taqqoslaydi — "5-15 daqiqa" umuman mahalliy botlar haqida, faqat bizniki emas |
| Taqqoslash jadvallarida Fragment.com, App Store, Google Play, TON qatorlari | Boshqa usullarning haqiqiy vaqti |
| `telegram-stars-tez-toldirish` sarlavhasi ("5 daqiqada to'ldirish") | Butun jarayonni tavsiflaydi va slug shunga bog'liq |

---

## Nazorat qilinishi kerak bo'lgan tuzoq

Rus tilidagi almashtirishda **`\w` kirill harflarini qamramaydi**. `минут\w*`
regex'i "минуты" dan faqat "минут" ni oldi va 59 joyda buzuq **"10 секунды"**
hosil bo'ldi (topilib tuzatildi). Kelajakda rus matnini regex bilan
almashtirganda `[а-яё]*` ishlating va keyin tekshiring:

```bash
grep -rhoE "10 секунд[а-яё]+" src/pages   # faqat "10 секундное" chiqishi kerak
```

(`5-10 секундное видео` — Premium'ning animatsion avatar funksiyasi haqida,
bu to'g'ri kontent.)

---

## Keyingi qadamlar

### 1. Narx qarori — 240 vs 220 so'm/star (**foydalanuvchi hal qiladi**)

Yetkazish endi teng, narxda raqobatchi hali arzon. Bu sof biznes qarori.

### 2. ~~Ingliz tili versiyasi~~ — 1-bosqich BAJARILDI (2026-08-07, `ff4c639`)

5 ta sahifa jonli: `/en`, `/en/premium`, `/en/stars`, `/en/how-to-buy`,
`/en/about`. Blog maqolalari **ataylab qo'shilmadi** — avval shu 5 tasi AI
trafigida natija beryaptimi ko'ramiz, keyin kengaytiramiz.

Tanlov asosi: AI trafigi (bosh sahifa 6 443, `/premium` 534, `/stars` 267,
`/info` 74% AI) + mavjud inglizcha so'rovlar ("telegram premium uzbekistan",
"telegram premium price in uzbekistan", "telegram stars to uzs" — jami ~200
ko'rinish/90 kun). `/en/gifts` qo'shilmadi: AI trafigi eng past (71).

**Muhim texnik qoidalar:**
- `src/lib/i18n.ts` — EN↔UZ yo'l jadvali (`EN_TO_UZ`) va `hreflangsFor()`.
  Inglizcha slug o'zbekchadan farq qiladi (`/en/how-to-buy` ↔ `/qollanma`),
  shuning uchun oddiy prefiks ishlamaydi. **Yangi EN sahifa qo'shilsa, uni
  shu jadvalga kiritish shart** — aks holda hreflang bir tomonlama bo'ladi
  va Google uni butunlay e'tiborsiz qoldiradi.
- Mavjud 10 ta UZ/RU sahifa endi `hreflangsFor()` ishlatadi va `en`'ga
  ko'rsatadi. Qo'lda yozilgan `hreflangs={[...]}` ro'yxatlarini qaytarmang.
- `NavbarEn`/`FooterEn` faqat mavjud EN sahifalarga havola beradi. Ingliz
  o'quvchini o'zbekcha sahifaga tashlash yomon tajriba — istisno: `/sharhlar`
  va `/oferta` (ular tarjima qilinmagan va shunday belgilangan).
- EN sahifalar UZ/RU manbalaridan qurilgan: `<style>` bloklari **aynan
  ko'chirilgan**. UZ sahifaning dizayni o'zgarsa, EN nusxasini ham yangilash
  kerak (hozircha qo'lda).

Sabab: to'lov Uzcard/Humo, ya'ni xaridor baribir O'zbekistonda. EN sotuvni
emas, **AI ko'rinishini** beradi (raqobatchida `/en/` bor edi, bizda yo'q).

### 3. Google Search Console — index request

`llms.txt` / `rss.xml` uchun **kerak emas** (Google ularni reyting signali
sifatida ishlatmaydi, AI crawler'lar uchun esa console yo'q).

Kerak bo'lganlari — schema yoki meta description o'zgargan sahifalar:

```bash
node scripts/gsc/gsc.mjs submit \
  https://starsjoy.uz/ https://starsjoy.uz/ru \
  https://starsjoy.uz/premium https://starsjoy.uz/ru/premium \
  https://starsjoy.uz/stars https://starsjoy.uz/ru/stars \
  https://starsjoy.uz/narxlar https://starsjoy.uz/ru/narxlar
```

Sarlavhasi o'zgargan 3 ta maqolani ham qo'shish mumkin
(`telegram-1000-stars-sotib-olish`, `telegram-stars-humo-bilan-sotib-olish`,
`telegram-stars-uzcard-bilan-sotib-olish` — UZ va RU).

### 4. Kutish

AI modellari llms.txt'ni darrov qayta o'qimaydi — odatda 1-3 hafta.
Tezlashtiruvchi tugma yo'q.

---

## Trafik tahlilidan chiqqan xulosalar (keyingi ish uchun)

**AI va odam trafigi butunlay boshqacha taqsimlangan.** Ustuvorlik
belgilashda ikkalasini aralashtirmang:

| Sahifa | Odam | AI | AI ulushi |
|---|---|---|---|
| Bosh sahifa | 1 274 | 6 267 | **83%** |
| `/info` | 37 | 106 | **74%** |
| `/blog/telegram-stars-fragment-alternativa` | 19 | 78 | **80%** |
| `/ru/blog/telegram-stars-yechib-olish` | 1 668 | 84 | **5%** |

- `/ru/blog/telegram-stars-yechib-olish` odam reytingida 3-o'rinda, lekin
  bu Belarus/Ukraina trafigi — konversiyasi nol, AI ham deyarli tegmaydi.
  Bunga vaqt sarflamang. (Qarang: `/ru` **money** sahifalari 99% o'zbek,
  RU **blog** klasteri 87% chet el.)
- `/info` odamlar uchun 22-o'rinda, AI uchun esa asosiy ishonch manbasi.
- `/oferta` odam trafigida 6-o'rinda — yuridik sahifa uchun g'ayritabiiy
  yuqori. Ehtimol "StarsJoy rasmiymi?" degan savol bilan kelishadi.
  **Taklif: unga 8 000+ buyurtma, 42 ta sharh va pul qaytarish kafolatini
  qo'shish.**

**Umumiy CTR muammosi (hali hal qilinmagan):** blog sahifalari 1-sahifada
(o'rtacha pozitsiya 4-8) turibdi, lekin CTR past. UZ sahifalar 12-18% olsa,
bir xil pozitsiyadagi ba'zi RU sahifalar 0.7-1.1% oladi. Ko'rinishi ≥200,
pozitsiya ≤10, CTR <3% bo'lgan sahifalarning title/meta'sini qayta yozish —
eng arzon va tez natija beradigan ish.

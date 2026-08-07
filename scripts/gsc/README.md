# GSC Toolkit — Starsjoy SEO/AEO

Google Search Console API orqali real qidiruv ma'lumotlarini tahlil qilish.

## Bir martalik sozlash (Google tomonda)

1. **Google Cloud Console** → [console.cloud.google.com](https://console.cloud.google.com) → loyiha yarating (yoki mavjudini tanlang).
2. **API yoqish:** "APIs & Services" → "Library" → **"Google Search Console API"** ni qidirib → **Enable**.
3. **Service Account yaratish:** "APIs & Services" → "Credentials" → "Create Credentials" → **Service account** → nom bering (masalan `starsjoy-seo`) → Create.
4. **Kalit olish:** yaratilgan service account'ni bosing → "Keys" → "Add Key" → "Create new key" → **JSON** → yuklab oladi.
   - Bu faylni shu papkaga `service-account.json` nomi bilan joylang.
   - `client_email` maydonidagi email'ni nusxalang (masalan `starsjoy-seo@...iam.gserviceaccount.com`).
5. **Search Console'ga ruxsat:** [search.google.com/search-console](https://search.google.com/search-console) → Starsjoy property → **Settings** → "Users and permissions" → "Add user" → yuqoridagi email'ni qo'shing → ruxsat **Full** (yoki Restricted ham yetadi).

## Ishlatish

```bash
node scripts/gsc/gsc.mjs verify          # ulanishni tekshirish
node scripts/gsc/gsc.mjs top             # top so'rovlar
node scripts/gsc/gsc.mjs declining       # pasaygan sahifalar
node scripts/gsc/gsc.mjs opportunities   # pozitsiya 5–20 (ko'tarish imkoniyati)
node scripts/gsc/gsc.mjs lowctr          # past CTR (title/meta tuzatish)
node scripts/gsc/gsc.mjs blog            # blog samaradorligi
```

Flaglar: `--days 28` (davr), `--prev 28` (solishtirish davri), `--limit 50` (qatorlar).

## Sozlamalar (env, ixtiyoriy)

- `GSC_KEY_FILE` — kalit fayl yo'li (standart: `scripts/gsc/service-account.json`)
- `GSC_SITE` — property. Standart `sc-domain:starsjoy.uz`. Agar GSC'da **URL-prefix** property bo'lsa: `GSC_SITE='https://starsjoy.uz/'`.

⚠️ `service-account.json` **hech qachon git'ga commit qilinmaydi** (.gitignore'da bloklangan).

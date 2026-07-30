// /qollanma va /ru/qollanma sahifalari uchun OG rasm yasaydi (1200x630).
// Chapda sarlavha, o'ngda uchta telefon skrinshoti.
//
// Ishga tushirish: npm run og:qollanma

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const shotsDir = path.join(root, 'src/assets/qollanma');

const W = 1200;
const H = 630;

// O'ngda ko'rsatiladigan qadamlar: bosh ekran, bo'lim tanlash, narxlar/paketlar.
// To'lov oynasi (7-qadam) ataylab olinmadi — OG rasm eng ko'p ulashiladigan rasm,
// unda karta rekvizitlari turmagani ma'qul.
const SHOTS = [
  'starsjoy-qadam-1-start-tugmasi.png',
  'starsjoy-qadam-3-bolim-tanlash.png',
  'starsjoy-qadam-5-miqdor-tanlash.png',
];

const SHOT_H = 356;
const SHOT_W = Math.round((SHOT_H * 1080) / 1920); // 200
const SHOT_X = [620, 790, 960];
const SHOT_Y = Math.round((H - SHOT_H) / 2);
const RADIUS = 18;

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const VARIANTS = [
  {
    out: 'og-qollanma.png',
    label: "QO'LLANMA",
    lines: ['9 qadamda', 'Stars va Premium', 'sotib olish'],
    sub: 'Har bir qadam skrinshot bilan  ·  starsjoy.uz',
  },
  {
    out: 'og-qollanma-ru.png',
    label: 'ИНСТРУКЦИЯ',
    lines: ['Покупка Stars', 'и Premium', 'за 9 шагов'],
    sub: 'Каждый шаг со скриншотом  ·  starsjoy.uz',
  },
];

// Skrinshotni yumaloq burchakli qilib tayyorlaydi
async function roundedShot(file) {
  const mask = Buffer.from(
    `<svg width="${SHOT_W}" height="${SHOT_H}"><rect width="${SHOT_W}" height="${SHOT_H}" rx="${RADIUS}" ry="${RADIUS}" fill="#fff"/></svg>`
  );

  return sharp(path.join(shotsDir, file))
    .resize(SHOT_W, SHOT_H, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

function background({ label, lines, sub }) {
  const titleY = 250;
  const lineH = 62;

  const titleSvg = lines
    .map(
      (l, i) =>
        `<text x="64" y="${titleY + i * lineH}" font-family="Helvetica, Arial, sans-serif" font-size="54" font-weight="800" fill="#FFFFFF">${esc(l)}</text>`
    )
    .join('\n  ');

  return Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7C3AED"/>
      <stop offset="50%" stop-color="#6D28D9"/>
      <stop offset="100%" stop-color="#4C1D95"/>
    </linearGradient>
    <radialGradient id="glow" cx="20%" cy="35%" r="65%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.10)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <rect x="64" y="122" width="${label.length * 13 + 36}" height="38" rx="19"
        fill="rgba(255,255,255,0.16)"/>
  <text x="${64 + 18}" y="147"
        font-family="Helvetica, Arial, sans-serif" font-size="16"
        font-weight="700" letter-spacing="2" fill="#FFFFFF">${esc(label)}</text>

  ${titleSvg}

  <text x="64" y="${titleY + lines.length * lineH + 22}"
        font-family="Helvetica, Arial, sans-serif" font-size="21"
        fill="rgba(255,255,255,0.78)">${esc(sub)}</text>

  <text x="64" y="${H - 56}"
        font-family="Helvetica, Arial, sans-serif" font-size="30"
        font-weight="800" fill="#FFFFFF">StarsJoy</text>
</svg>`);
}

for (const v of VARIANTS) {
  const shots = await Promise.all(SHOTS.map(roundedShot));

  const outPath = path.join(root, 'public', v.out);

  await sharp(background(v))
    .composite(
      shots.map((input, i) => ({ input, left: SHOT_X[i], top: SHOT_Y }))
    )
    .png()
    .toFile(outPath);

  console.log(`OG rasm yaratildi: public/${v.out}`);
}

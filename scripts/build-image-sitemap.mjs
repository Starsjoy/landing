// Google Images uchun alohida sitemap yasaydi: public/image-sitemap.xml
//
// Google 2022-yildan beri image sitemap'da faqat <image:loc> ni o'qiydi —
// image:title, image:caption, image:license va image:geo_location qo'llab-quvvatlanmaydi.
// Shuning uchun bu yerda faqat rasm URL'lari beriladi, ma'no esa sahifadagi
// alt matn va caption orqali yetkaziladi.
//
// Ishga tushirish: npm run sitemap:images

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SITE = 'https://starsjoy.uz';
const IMG_DIR = path.join(root, 'public/qollanma');
const OUT = path.join(root, 'public/image-sitemap.xml');

// Bir xil rasmlar ikkala tildagi sahifada ishlatiladi
const PAGES = ['/qollanma', '/ru/qollanma'];

const files = (await fs.readdir(IMG_DIR)).filter((f) => f.endsWith('.webp')).sort();

if (files.length === 0) {
  console.error(`Rasmlar topilmadi: ${IMG_DIR} — avval "npm run images:qollanma" ni bajaring.`);
  process.exit(1);
}

const urls = PAGES.map((page) => {
  const images = files
    .map((f) => `      <image:image>\n        <image:loc>${SITE}/qollanma/${f}</image:loc>\n      </image:image>`)
    .join('\n');

  return `  <url>\n    <loc>${SITE}${page}</loc>\n${images}\n  </url>`;
}).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;

await fs.writeFile(OUT, xml, 'utf-8');

console.log(
  `image-sitemap.xml yaratildi: ${PAGES.length} ta sahifa, har birida ${files.length} ta rasm`
);

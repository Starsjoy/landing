// Qo'llanma skrinshotlarini WebP'ga o'giradi.
// Manba: src/assets/qollanma/*.png (1080x1920)
// Natija: public/qollanma/*.webp — statik, CDN'dan beriladi, schema'da to'g'ridan-to'g'ri URL sifatida ishlatiladi.
//
// Ishga tushirish: npm run images:qollanma

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src/assets/qollanma');
const outDir = path.join(root, 'public/qollanma');

const WIDTH = 540;   // ekranda ~260px, retina uchun ~2x
const HEIGHT = 960;
const QUALITY = 72;

await fs.mkdir(outDir, { recursive: true });

const files = (await fs.readdir(srcDir)).filter((f) => f.endsWith('.png')).sort();

if (files.length === 0) {
  console.error(`Manba rasmlar topilmadi: ${srcDir}`);
  process.exit(1);
}

let totalIn = 0;
let totalOut = 0;

for (const file of files) {
  const inPath = path.join(srcDir, file);
  const outPath = path.join(outDir, file.replace(/\.png$/, '.webp'));

  await sharp(inPath)
    .resize(WIDTH, HEIGHT, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(outPath);

  const [inStat, outStat] = await Promise.all([fs.stat(inPath), fs.stat(outPath)]);
  totalIn += inStat.size;
  totalOut += outStat.size;

  console.log(
    `${file} -> ${path.basename(outPath)}  ${(inStat.size / 1024).toFixed(0)}KB -> ${(outStat.size / 1024).toFixed(0)}KB`
  );
}

console.log(
  `\n${files.length} ta rasm: ${(totalIn / 1024 / 1024).toFixed(2)}MB -> ${(totalOut / 1024).toFixed(0)}KB`
);

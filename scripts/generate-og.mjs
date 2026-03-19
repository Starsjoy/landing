import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const width = 1200;
const height = 630;
const logoSize = 200;

// Create OG image with gradient background + centered logo + text
const svgOverlay = `
<svg width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7C3AED"/>
      <stop offset="50%" stop-color="#6D28D9"/>
      <stop offset="100%" stop-color="#5B21B6"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.08)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <text x="${width/2}" y="${height/2 + logoSize/2 + 50}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="52" font-weight="900" fill="white"
    text-anchor="middle">StarsJoy</text>
  <text x="${width/2}" y="${height/2 + logoSize/2 + 95}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="22" fill="rgba(255,255,255,0.75)"
    text-anchor="middle">Telegram Stars, Premium va Gifts</text>
</svg>`;

const logoPath = path.join(root, 'public', 'logo.png');
const outputPath = path.join(root, 'public', 'og-image.png');

// Create background with SVG overlay
const background = sharp(Buffer.from(svgOverlay))
  .png();

// Resize logo
const logo = await sharp(logoPath)
  .resize(logoSize, logoSize, { fit: 'contain' })
  .png()
  .toBuffer();

// Composite logo onto background
await sharp(Buffer.from(svgOverlay))
  .png()
  .composite([
    {
      input: logo,
      left: Math.round((width - logoSize) / 2),
      top: Math.round((height - logoSize) / 2 - 50),
    }
  ])
  .toFile(outputPath);

console.log('OG image generated:', outputPath);

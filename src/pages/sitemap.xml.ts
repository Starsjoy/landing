import type { APIRoute } from 'astro';

/**
 * `/sitemap.xml` → `/sitemap-index.xml` (301).
 *
 * @astrojs/sitemap `sitemap-index.xml` + `sitemap-0.xml` yaratadi, `sitemap.xml`
 * emas. robots.txt to'g'ri manzilni ko'rsatsa ham, ko'p crawler (jumladan
 * GPTBot, PerplexityBot va tashqi SEO vositalari) avval standart
 * `/sitemap.xml` ni so'raydi va 404 oladi.
 *
 * 301 — doimiy redirect, shuning uchun signal sitemap-index'ga o'tadi.
 */
export const GET: APIRoute = () =>
  new Response(null, {
    status: 301,
    headers: {
      Location: '/sitemap-index.xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });

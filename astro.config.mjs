import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://starsjoy.uz',
  output: 'server',
  trailingSlash: 'never',
  adapter: vercel(),
  integrations: [sitemap({
    i18n: {
      defaultLocale: 'uz',
      locales: {
        uz: 'uz-UZ',
        ru: 'ru-RU',
      },
    },
    filter: (page) =>
      !page.includes('/modad') &&
      !page.includes('/api/') &&
      !page.includes('/admin'),
    changefreq: 'weekly',
    priority: 0.7,
    lastmod: new Date(),
    serialize: (item) => {
      const strip = (u) => (u && u.length > 'https://starsjoy.uz/'.length)
        ? u.replace(/\/$/, '')
        : (u === 'https://starsjoy.uz/' ? 'https://starsjoy.uz' : u);
      const out = { ...item, url: strip(item.url) };
      if (Array.isArray(item.links)) {
        out.links = item.links.map((l) => ({ ...l, url: strip(l.url) }));
      }
      return out;
    },
  })],
  security: { checkOrigin: false },
});

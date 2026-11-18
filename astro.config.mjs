import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://starsjoy.uz',
  output: 'server',
  trailingSlash: 'never',
  adapter: vercel(),
  vite: {
    server: {
      // Faqat lokal dev: /donat sahifasi brauzerdan backend'ga shu proksi orqali murojaat qiladi
      // (vitahealth.uz CORS'i localhost'ni qabul qilmaydi). Production'da ishlatilmaydi.
      proxy: {
        '/donat-api': {
          target: 'https://vitahealth.uz',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/donat-api/, ''),
          configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin')),
        },
      },
      watch: {
        ignored: ['**/.vercel/**', '**/frontend/**', '**/backend/**'],
      },
    },
  },
  integrations: [sitemap({
    i18n: {
      defaultLocale: 'uz',
      locales: {
        uz: 'uz-UZ',
        ru: 'ru-RU',
        en: 'en-US',
      },
    },
    filter: (page) =>
      !page.includes('/modad') &&
      new URL(page).pathname !== '/test' &&
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

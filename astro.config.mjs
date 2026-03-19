import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://starsjoy.uz',
  output: 'static',
  adapter: vercel(),
  integrations: [sitemap()],
  security: { checkOrigin: false },
});

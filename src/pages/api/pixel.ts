export const prerender = false;

import type { APIRoute } from 'astro';
import { addVisit, initDB } from '../../lib/analytics';
import { detectBot } from '../../lib/bots';

let dbReady = false;

// 1x1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export const GET: APIRoute = async ({ request }) => {
  try {
    if (!dbReady) { await initDB(); dbReady = true; }

    const url = new URL(request.url);
    const path = url.searchParams.get('p') || '/';
    const ua = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1';
    const ref = request.headers.get('referer') || '';

    // Skip non-bot (humans tracked via JS)
    const { isBot } = detectBot(ua);
    if (!isBot) {
      return new Response(PIXEL, {
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache' },
      });
    }

    const vid = 'bot-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    const sid = 'bot-' + ip.replace(/[^a-z0-9]/gi, '-');

    await addVisit({
      path,
      userAgent: ua,
      ip,
      referrer: ref,
      vid,
      sessionId: sid,
    });
  } catch (e) {
    console.error('Pixel tracking error:', e);
  }

  return new Response(PIXEL, {
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache' },
  });
};

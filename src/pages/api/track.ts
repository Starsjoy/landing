export const prerender = false;

import type { APIRoute } from 'astro';
import { addVisit, updateDuration, initDB } from '../../lib/analytics';
import { detectBot } from '../../lib/bots';

let dbReady = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!dbReady) { await initDB(); dbReady = true; }

    const body = await request.json();
    const ua = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1';

    // Duration update
    if (body.dur !== undefined && body.vid) {
      await updateDuration(body.vid, Number(body.dur));
      return new Response('ok', { status: 200 });
    }

    // New visit
    if (!body.path || !body.vid) {
      return new Response('bad request', { status: 400 });
    }

    // Skip dashboard and API routes
    if (body.path.startsWith('/modad') || body.path.startsWith('/api')) {
      return new Response('skip', { status: 200 });
    }

    // Skip ignored bots (Vercel screenshot, HeadlessChrome, etc.)
    const { isIgnored } = detectBot(ua);
    if (isIgnored) {
      return new Response('skip', { status: 200 });
    }

    await addVisit({
      path: body.path,
      userAgent: ua,
      ip,
      referrer: body.ref || '',
      vid: body.vid,
      sessionId: body.sid || '',
    });

    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error('Track error:', e);
    return new Response('error', { status: 500 });
  }
};

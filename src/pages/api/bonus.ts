export const prerender = false;

import type { APIRoute } from 'astro';
import { getBonusSummary, getRole, initDB } from '../../lib/analytics';

let dbReady = false;

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get('moda_token')?.value || '';
  if (await getRole(token) !== 'owner') {
    return new Response('unauthorized', { status: 401 });
  }
  if (!dbReady) { await initDB(); dbReady = true; }
  return new Response(JSON.stringify(await getBonusSummary()), {
    headers: { 'Content-Type': 'application/json' },
  });
};

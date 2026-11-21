export const prerender = false;

import type { APIRoute } from 'astro';
import { verifyOwnerToken } from '../../lib/analytics';
import {
  PROJECTS, ensureBlogPlan, listPlan, checkCandidate, addItem, updateItem, deleteItem, syncFromSitemap,
  type Project, type Group,
} from '../../lib/blogPlan';

const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const isProject = (p: unknown): p is Project => typeof p === 'string' && p in PROJECTS;

async function auth(cookies: Parameters<APIRoute>[0]['cookies']) {
  return verifyOwnerToken(cookies.get('moda_token')?.value || '');
}

// GET /api/blog-plan?project=starsjoy[&sync=1]
export const GET: APIRoute = async ({ url, cookies }) => {
  if (!await auth(cookies)) return new Response('unauthorized', { status: 401 });
  const project = url.searchParams.get('project') || 'starsjoy';
  if (!isProject(project)) return json({ error: 'project' }, 400);
  await ensureBlogPlan();
  let sync = null;
  try {
    sync = await syncFromSitemap(project, url.searchParams.get('sync') === '1');
  } catch (e) {
    console.error('blog-plan sync:', (e as Error).message);
  }
  const items = await listPlan(project);
  return json({ project, projects: Object.fromEntries(Object.entries(PROJECTS).map(([k, v]) => [k, v.name])), items, sync });
};

// POST { action: 'check' | 'add', project, grp, title, keyword, slug_uz, money_page, note, force }
//      { action: 'update', id, status?, grp? } | { action: 'delete', id }
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!await auth(cookies)) return new Response('unauthorized', { status: 401 });
  await ensureBlogPlan();
  let b: any;
  try { b = await request.json(); } catch { return json({ error: 'json' }, 400); }

  if (b.action === 'update') {
    const id = Number(b.id);
    if (!Number.isInteger(id)) return json({ error: 'id' }, 400);
    await updateItem(id, { status: b.status, grp: b.grp });
    return json({ ok: true });
  }
  if (b.action === 'delete') {
    const id = Number(b.id);
    if (!Number.isInteger(id)) return json({ error: 'id' }, 400);
    const ok = await deleteItem(id);
    return json({ ok }, ok ? 200 : 409);
  }
  if (b.action === 'check' || b.action === 'add') {
    if (!isProject(b.project)) return json({ error: 'project' }, 400);
    const cand = {
      grp: String(b.grp || ''), title: String(b.title || '').slice(0, 200), keyword: String(b.keyword || '').slice(0, 150),
      slug_uz: String(b.slug_uz || '').slice(0, 90), money_page: String(b.money_page || '').slice(0, 120), note: String(b.note || '').slice(0, 500),
    };
    const check = await checkCandidate(b.project, cand);
    if (b.action === 'check' || !check.ok || (check.warnings.length && b.force !== true)) {
      return json({ ok: false, added: false, check });
    }
    const id = await addItem(b.project, { ...cand, grp: cand.grp as Group });
    return json({ ok: true, added: true, id, check });
  }
  return json({ error: 'action' }, 400);
};

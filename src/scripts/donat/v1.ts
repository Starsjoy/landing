/**
 * A · Bosqichma-bosqich (wizard): har ekranda bitta savol.
 * 1 O'yin → 2 Paket → 3 Akkaunt → 4 Tasdiqlash → To'lov → Holat.
 */
import { esc, fmt, gameImg, groupItems, itemLabel, nickHtml, payBlock, statusBlock, type Renderer } from './core';

export const v1: Renderer = {
  name: 'v1',
  render(s, c) {
    const { t } = c;
    if (s.order?.state === 'awaiting_payment') return `<div class="w-card">${payBlock(s, c, 'dp')}</div>`;
    if (s.order?.state) return `<div class="w-card">${statusBlock(s, c, 'ds')}</div>`;

    const g = c.game;
    const labels = [t.game, t.pack, t.account, t.confirm];
    const total = g && !g.needs_player_id ? 3 : 4;
    const stepIdx = g && !g.needs_player_id && s.step === 4 ? 3 : s.step; // ID'siz o'yinlarda 3 qadam
    const head = `
      <div class="w-head">
        ${s.step > 1 ? `<button type="button" class="w-back" data-act="step" data-v="${s.step === 4 && g && !g.needs_player_id ? 2 : s.step - 1}" aria-label="${esc(t.back)}">‹</button>` : '<span class="w-back-ph"></span>'}
        <div class="w-steps">${labels.filter((_, i) => total === 4 || i !== 2).map((l, i) => `<div class="w-st${i + 1 < stepIdx ? ' done' : ''}${i + 1 === stepIdx ? ' on' : ''}"><span>${i + 1 < stepIdx ? '✓' : i + 1}</span><em>${esc(l)}</em></div>`).join('')}</div>
      </div>
      <div class="w-progress"><span style="width:${(stepIdx / total) * 100}%"></span></div>`;

    let body = '';
    if (s.step === 1 || !g) {
      body = `
        <h3 class="w-h">${esc(t.chooseGame)}</h3>
        <div class="w-games">
          ${(s.catalog?.games || []).map((x) => `
            <button type="button" class="w-game${x.slug === s.slug ? ' on' : ''}" data-act="game" data-v="${esc(x.slug)}">
              ${gameImg(x.slug, 'w-game-img')}
              <span class="w-game-t">${esc(x.title)}</span>
              <span class="w-game-p">${x.items.length ? `${fmt(c.minPrice(x))} ${esc(t.sum)} ${esc(t.from)}` : esc(t.unavailable)}</span>
            </button>`).join('') || `<div class="w-muted">${esc(t.loading)}</div>`}
        </div>`;
    } else if (s.step === 2) {
      const { cur, other, popId } = groupItems(g, c.parse);
      const row = (it: { id: string; name: string; price: number }) => `
        <button type="button" class="w-item${it.id === s.itemId ? ' on' : ''}" data-act="item" data-v="${esc(it.id)}">
          <span class="w-item-n">${itemLabel(it, c)}${it.id === popId ? `<i class="w-pop">${esc(t.popular)}</i>` : ''}</span>
          <span class="w-item-p">${fmt(it.price)} ${esc(t.sum)}</span>
          <span class="w-item-go">›</span>
        </button>`;
      const LIMIT = 4;
      const selIdx = other.findIndex((x) => x.id === s.itemId);
      const collapse = other.length > LIMIT + 1 && !s.showAll && selIdx < LIMIT;
      body = `
        <div class="w-gamebar">${gameImg(g.slug, 'w-gamebar-img')}<div><b>${esc(g.title)}</b><span>${esc(t.choosePack)}</span></div><button type="button" class="w-chip" data-act="step" data-v="1">${esc(t.change)}</button></div>
        ${!g.available || !g.items.length ? `<div class="w-muted">${esc(t.unavailable)}</div>` : ''}
        ${cur.length ? `${other.length ? `<div class="w-group">${esc(t.currency)}</div>` : ''}<div class="w-list">${cur.map(row).join('')}</div>` : ''}
        ${other.length ? `${cur.length ? `<div class="w-group">${esc(t.passes)}</div>` : ''}<div class="w-list">${(collapse ? other.slice(0, LIMIT) : other).map(row).join('')}</div>
          ${other.length > LIMIT + 1 && selIdx < LIMIT ? `<button type="button" class="w-more" data-act="more">${esc(s.showAll ? t.less : t.more.replace('{n}', String(other.length - LIMIT)))}</button>` : ''}` : ''}`;
    } else if (s.step === 3) {
      const help = t.help[g.slug] || t.help._;
      body = `
        <div class="w-gamebar">${gameImg(g.slug, 'w-gamebar-img')}<div><b>${esc(g.title)}</b><span>${esc(c.item ? c.pretty(c.item.name) : '')}</span></div><button type="button" class="w-chip" data-act="step" data-v="2">${esc(t.change)}</button></div>
        <h3 class="w-h">${esc(t.id)}</h3>
        <div class="w-idrow${c.needsZone ? ' zone' : ''}">
          <input class="w-input" data-in="pid" inputmode="numeric" autocomplete="off" maxlength="40" placeholder="${esc(t.idPh)}" value="${esc(s.pid)}">
          ${c.needsZone ? `<input class="w-input" data-in="zone" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="${esc(t.zonePh)}" value="${esc(s.zone)}">` : ''}
        </div>
        ${nickHtml(s, 'w-nick')}
        <button type="button" class="w-help-btn" data-act="help">${s.help ? '−' : '+'} ${esc(t.idWhere)}</button>
        ${s.help ? `<div class="w-help">${esc(help)}</div>` : ''}
        <label class="w-lab">${esc(t.contact)} <em>(${esc(t.contactOpt)})</em></label>
        <input class="w-input" data-in="contact" maxlength="64" placeholder="${esc(t.contactPh)}" value="${esc(s.contact)}">`;
    } else {
      const it = c.item!;
      const deliv = g.kind === 'giftcard' ? (g.secret_kind === 'code' ? t.codeDel : t.linkDel) : t.auto;
      body = `
        <h3 class="w-h">${esc(t.review)}</h3>
        <div class="w-review">
          <div class="w-rv-top">${gameImg(g.slug, 'w-rv-img')}<div><span>${esc(g.title)}</span><b>${esc(c.pretty(it.name))}</b></div></div>
          ${g.needs_player_id ? `<div class="w-rv-row"><span>${esc(t.to)}</span><b>${esc(s.pid)}${c.needsZone ? ` (${esc(s.zone)})` : ''}${s.nick?.name ? ` · ${esc(s.nick.name)}` : ''}</b></div>` : ''}
          <div class="w-rv-row"><span>${esc(t.delivery)}</span><b>${esc(deliv)}</b></div>
          <div class="w-rv-row total"><span>${esc(t.total)}</span><b>${fmt(it.price)} ${esc(t.sum)}</b></div>
        </div>
        ${!g.needs_player_id ? `<div class="w-note">${esc(g.secret_kind === 'code' ? t.noIdCode : t.noIdLink)}</div>` : `<div class="w-note">🛡️ ${esc(t.agree)}</div>`}
        ${s.err ? `<div class="w-err">${esc(s.err)}</div>` : ''}`;
    }

    // pastki tugma
    let cta = '';
    if (s.step === 3) cta = `<button type="button" class="w-cta" data-act="next">${esc(t.next)}</button>`;
    if (s.step === 4 && c.item) cta = s.catalog?.enabled
      ? `<button type="button" class="w-cta${s.busy ? ' busy' : ''}" data-act="pay">${esc(t.payFor.replace('{p}', `${fmt(c.item.price)} ${t.sum}`))}</button>`
      : `<button type="button" class="w-cta" disabled>${esc(t.soon)}</button>`;

    return `<div class="w-card">${head}<div class="w-body" data-step="${s.step}">${body}</div>${cta ? `<div class="w-foot">${cta}</div>` : ''}</div>`;
  },
};

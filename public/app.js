// World Brief frontend (vanilla JS, no build step).
const $ = (s, el = document) => el.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const api = async (url, opts = {}) => {
  const r = await fetch(url, { headers: { 'content-type': 'application/json' }, ...opts });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
};

const state = {
  items: [],
  meta: null,
  cats: new Set(), // empty = all
  regions: new Set(),
  days: Number(localStorage.getItem('wb.days')) || 3,
  view: localStorage.getItem('wb.view') || 'board',
  q: '',
  onlyStarred: false,
  onlyUnread: false,
  hideOther: localStorage.getItem('wb.hideOther') === '1',
  expanded: new Set(), // board columns showing all items
};
const COL_LIMIT = 12;

const catOf = (id) => state.meta.categories.find((c) => c.id === id) || { label: id, color: '#8b8d98' };
const regionLabel = (id) => state.meta.regions.find((r) => r.id === id)?.label || id;

function timeAgo(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 6e4);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.round(h / 24)} 天前`;
}
const fmtTime = (iso) => new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2600);
}

// Items after every filter except category (used for category counts and the trend chart).
function baseFiltered() {
  const q = state.q.trim().toLowerCase();
  const cutoff = Date.now() - state.days * 864e5;
  return state.items.filter((it) =>
    (state.onlyStarred ? it.starred : new Date(it.published) >= cutoff) &&
    (!state.onlyUnread || !it.read) &&
    (!state.hideOther || it.category !== 'society') &&
    (!state.regions.size || it.regions.some((r) => state.regions.has(r))) &&
    (!q || `${it.title} ${it.summary} ${it.source}`.toLowerCase().includes(q)));
}
const catMatch = (it) => !state.cats.size || state.cats.has(it.category);

// ---------- Rendering ----------
function renderFilters(base) {
  const counts = Object.fromEntries(state.meta.categories.map((c) => [c.id, 0]));
  for (const it of base) counts[it.category] = (counts[it.category] || 0) + 1;
  $('#catFilters').innerHTML =
    `<button class="fitem" data-cat="" aria-pressed="${!state.cats.size}"><span class="dot" style="background:var(--text-secondary)"></span>全部<span class="n">${base.length}</span></button>` +
    state.meta.categories.map((c) => `<button class="fitem" data-cat="${c.id}" aria-pressed="${state.cats.has(c.id)}"><span class="dot" style="background:${c.color}"></span>${esc(c.label)}<span class="n">${counts[c.id] || 0}</span></button>`).join('');
  $('#regionFilters').innerHTML = state.meta.regions.map((r) => `<button class="chip" data-region="${r.id}" aria-pressed="${state.regions.has(r.id)}">${esc(r.label)}</button>`).join('');
}

function renderTiles(base) {
  const today = dayKey(Date.now());
  const todayItems = base.filter((it) => dayKey(it.published) === today);
  const lastRun = state.meta.runs[0];
  const focus = ['military', 'health', 'politics'].map(catOf).map((c, i) => {
    const id = ['military', 'health', 'politics'][i];
    return `<div class="tile"><div class="k"><span class="dot" style="background:${c.color}"></span>${esc(c.label)}</div><div class="v">${base.filter((it) => it.category === id).length}</div><div class="d">今日 ${todayItems.filter((it) => it.category === id).length}</div></div>`;
  }).join('');
  $('#tiles').innerHTML =
    `<div class="tile hero"><div class="k">当前范围要闻</div><div class="v">${base.length}</div><div class="d">今日新增 ${todayItems.length} · 来自 ${new Set(base.map((i) => i.source)).size} 个来源</div></div>` +
    focus +
    `<div class="tile"><div class="k">上次采集</div><div class="v" style="font-size:18px;margin-top:8px">${lastRun ? timeAgo(lastRun.at) : '—'}</div><div class="d">${lastRun ? `${lastRun.okFeeds}/${lastRun.totalFeeds} 源成功` : '尚未运行'}</div></div>`;
}
// Stacked daily bars: one column per day, segments per category (fixed display order).
function renderTrend() {
  const q = state.q.trim().toLowerCase();
  const nDays = Math.max(state.days, 7);
  const days = Array.from({ length: nDays }, (_, i) => dayKey(Date.now() - (nDays - 1 - i) * 864e5));
  const cats = state.meta.categories.filter((c) => (!state.hideOther || c.id !== 'society') && catMatch({ category: c.id }));
  const grid = Object.fromEntries(days.map((d) => [d, Object.fromEntries(cats.map((c) => [c.id, 0]))]));
  for (const it of state.items) {
    const d = dayKey(it.published);
    if (!grid[d] || !(it.category in grid[d])) continue;
    if (state.regions.size && !it.regions.some((r) => state.regions.has(r))) continue;
    if (q && !`${it.title} ${it.summary} ${it.source}`.toLowerCase().includes(q)) continue;
    grid[d][it.category]++;
  }
  const totals = days.map((d) => cats.reduce((n, c) => n + grid[d][c.id], 0));
  const max = Math.max(4, ...totals);
  const step = Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1);
  const top = Math.ceil(max / step) * step;

  const el = $('#trendChart');
  const W = el.clientWidth || 600, H = 150, padL = 28, padB = 18, padT = 6;
  const cw = (W - padL) / nDays;
  const bw = Math.min(28, cw * 0.62);
  const y = (v) => H - padB - (v / top) * (H - padB - padT);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="每日新增新闻数量，按分类堆叠">`;
  for (let v = 0; v <= top; v += step) svg += `<line class="gridline" x1="${padL}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${padL - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
  days.forEach((d, i) => {
    const x = padL + i * cw + (cw - bw) / 2;
    let acc = 0;
    const segs = cats.filter((c) => grid[d][c.id] > 0);
    segs.forEach((c, j) => {
      const v = grid[d][c.id];
      const y0 = y(acc), y1 = y(acc + v);
      // 2px surface gap between stacked segments; rounded 4px cap only on the top segment.
      const h = Math.max(1, y0 - y1 - (j > 0 ? 2 : 0));
      const yTop = y1;
      if (j === segs.length - 1) {
        const r = Math.min(4, h, bw / 2);
        svg += `<path fill="${c.color}" d="M${x},${yTop + h} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + bw - r} Q${x + bw},${yTop} ${x + bw},${yTop + r} V${yTop + h} Z"/>`;
      } else svg += `<rect fill="${c.color}" x="${x}" y="${yTop}" width="${bw}" height="${h}"/>`;
      acc += v;
    });
    const label = nDays <= 10 || i % Math.ceil(nDays / 8) === 0 || i === nDays - 1;
    if (label) svg += `<text class="axis" x="${x + bw / 2}" y="${H - 4}" text-anchor="middle">${d.slice(5).replace('-', '/')}</text>`;
    svg += `<rect class="col-hit" data-i="${i}" x="${padL + i * cw}" y="0" width="${cw}" height="${H - padB}"/>`;
  });
  el.innerHTML = svg + '</svg><div class="tip" hidden></div>';

  const tip = $('.tip', el);
  el.querySelectorAll('.col-hit').forEach((r) => {
    r.addEventListener('mouseenter', () => {
      const i = Number(r.dataset.i), d = days[i];
      tip.innerHTML = `<div class="row" style="margin-bottom:4px"><span>${d}</span><b>${totals[i]}</b></div>` +
        cats.filter((c) => grid[d][c.id]).reverse().map((c) => `<div class="row"><span><i class="sw" style="background:${c.color}"></i>${esc(c.label)}</span><b>${grid[d][c.id]}</b></div>`).join('');
      tip.hidden = false;
      const left = padL + i * cw + cw / 2;
      tip.style.left = `${Math.min(Math.max(left - 70, 0), W - 150)}px`;
      tip.style.top = `${Math.max(0, y(totals[i]) - tip.offsetHeight - 8)}px`;
    });
    r.addEventListener('mouseleave', () => { tip.hidden = true; });
  });

  $('#trendLegend').innerHTML = cats.map((c) => `<span><i style="background:${c.color}"></i>${esc(c.label)}</span>`).join('');
  $('#trendTable').innerHTML = `<table><thead><tr><th>日期</th>${cats.map((c) => `<th>${esc(c.label)}</th>`).join('')}<th>合计</th></tr></thead><tbody>` +
    days.map((d, i) => `<tr><td>${d}</td>${cats.map((c) => `<td>${grid[d][c.id]}</td>`).join('')}<td>${totals[i]}</td></tr>`).join('') + '</tbody></table>';
}
function card(it, list) {
  const c = catOf(it.category);
  const fresh = Date.now() - new Date(it.published) < 3 * 36e5;
  const extra = it.tags.filter((t) => t !== it.category).map(catOf);
  return `<article class="card ${it.read ? 'read' : ''}" style="--c:${c.color}" data-id="${it.id}">
    ${list ? '<span class="bar" aria-hidden="true"></span>' : ''}
    <a class="title" href="${esc(it.link)}" target="_blank" rel="noopener noreferrer" data-open="${it.id}">${esc(it.title)}</a>
    <button class="star" data-star="${it.id}" aria-pressed="${it.starred}" aria-label="${it.starred ? '取消收藏' : '收藏'}" title="收藏">${it.starred ? '★' : '☆'}</button>
    ${it.summary && it.summary !== it.title ? `<p class="sum">${esc(it.summary)}</p>` : ''}
    <div class="meta">
      ${fresh ? '<span class="fresh">新</span>' : ''}
      <span>${esc(it.source)}</span><span title="${esc(new Date(it.published).toLocaleString('zh-CN'))}">${timeAgo(it.published)}</span>
      ${list ? `<span class="tag"><i style="background:${c.color}"></i>${esc(c.label)}</span>` : ''}
      ${extra.map((t) => `<span class="tag"><i style="background:${t.color}"></i>${esc(t.label)}</span>`).join('')}
      ${it.regions.map((r) => `<span class="tag">${esc(regionLabel(r))}</span>`).join('')}
    </div>
  </article>`;
}

function renderFeed(items) {
  const feed = $('#feed');
  feed.className = `feed ${state.view}`;
  $('#countLine').textContent = `显示 ${items.length} 条`;
  if (!items.length) {
    feed.innerHTML = `<div class="empty">${state.items.length ? '没有符合条件的新闻，试试放宽筛选。' : '还没有数据，点击右上角「立即采集」开始。'}</div>`;
    return;
  }
  if (state.view === 'list') {
    let html = '', last = '';
    for (const it of items) {
      const d = dayKey(it.published);
      if (d !== last) { html += `<div class="day">${new Date(it.published).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</div>`; last = d; }
      html += card(it, true);
    }
    feed.innerHTML = html;
    return;
  }
  feed.innerHTML = state.meta.categories.map((c) => {
    const list = items.filter((it) => it.category === c.id);
    if (!list.length) return '';
    const open = state.expanded.has(c.id);
    const shown = open ? list : list.slice(0, COL_LIMIT);
    return `<section class="col" style="--c:${c.color}" aria-label="${esc(c.label)}">
      <div class="col-head"><h2>${esc(c.label)}</h2><span class="n">${list.length}</span></div>
      <div class="col-body">${shown.map((it) => card(it, false)).join('')}</div>
      ${list.length > COL_LIMIT ? `<button class="col-more" data-expand="${c.id}">${open ? '收起' : `展开全部 ${list.length} 条`}</button>` : ''}
    </section>`;
  }).join('');
}

function renderStatus() {
  const m = state.meta;
  const next = m.nextRun ? fmtTime(m.nextRun) : '—';
  $('#statusLine').textContent = `${m.running ? '采集中… · ' : ''}每天 ${m.schedule.join(' / ')} 自动采集 · 下次 ${next} · 库内共 ${m.total} 条`;
  $('#exportBtn').href = `/api/digest.md?days=${Math.min(state.days, 30)}`;
}

function render() {
  const base = baseFiltered();
  renderFilters(base);
  renderTiles(base);
  renderTrend();
  renderFeed(base.filter(catMatch));
  renderStatus();
}

// ---------- Data ----------
async function load() {
  const [meta, data] = await Promise.all([api('/api/meta'), api(`/api/items?days=30`)]);
  state.meta = meta;
  state.items = data.items;
  render();
}

async function collect() {
  const btn = $('#collectBtn');
  btn.disabled = true;
  btn.textContent = '采集中…';
  try {
    const run = await api('/api/collect', { method: 'POST' });
    toast(`采集完成：新增 ${run.added} 条，${run.okFeeds}/${run.totalFeeds} 个来源成功`);
    await load();
  } catch (e) {
    toast(`采集失败：${e.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '立即采集';
  }
}

async function patchItem(id, patch) {
  const it = state.items.find((x) => x.id === id);
  if (!it) return;
  Object.assign(it, patch);
  render();
  try { await api(`/api/items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }); } catch (e) { toast(`保存失败：${e.message}`); }
}
// ---------- Settings dialog ----------
let draft = null;
function renderSettings() {
  const lastBy = Object.fromEntries((state.meta.runs[0]?.sources || []).map((s) => [s.id, s]));
  $('#lookback').value = draft.lookbackHours;
  $('#timeList').innerHTML = draft.schedule.map((t) => `<span class="time-pill">${t}<button type="button" data-rm="${t}" aria-label="删除 ${t}">×</button></span>`).join('') || '<span class="subtle">至少保留一个时间</span>';
  $('#feedList').innerHTML = state.meta.feeds.map((f) => {
    const s = lastBy[f.id];
    const st = !s ? '' : s.ok ? `<span class="st ok">✓ ${s.inWindow}</span>` : `<span class="st bad" title="${esc(s.error)}">✗ ${esc(s.error)}</span>`;
    return `<label class="feed-row"><input type="checkbox" data-feed="${f.id}" ${draft.feeds[f.id] ? 'checked' : ''} /> <span title="${esc(f.url)}">${esc(f.name)}</span>${st}</label>`;
  }).join('');
  $('#runList').innerHTML = state.meta.runs.slice(0, 12).map((r) =>
    `<div>${fmtTime(r.at)}  ${({ schedule: '定时', manual: '手动', startup: '启动' })[r.trigger] || r.trigger}  +${r.added}  ${r.okFeeds}/${r.totalFeeds} 源  ${(r.ms / 1000).toFixed(1)}s</div>`).join('') || '<div>暂无记录</div>';
}

function openSettings() {
  draft = {
    schedule: [...state.meta.schedule],
    lookbackHours: state.meta.lookbackHours,
    feeds: Object.fromEntries(state.meta.feeds.map((f) => [f.id, f.enabled])),
  };
  renderSettings();
  $('#settings').showModal();
}

async function saveSettings() {
  draft.lookbackHours = Number($('#lookback').value) || draft.lookbackHours;
  try {
    await api('/api/config', { method: 'POST', body: JSON.stringify(draft) });
    $('#settings').close();
    toast('设置已保存');
    await load();
  } catch (e) { toast(`保存失败：${e.message}`); }
}

// ---------- Events ----------
function setRadio(seg, attr, val) {
  seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset[attr] === String(val))));
}

function bind() {
  setRadio($('#rangeSeg'), 'days', state.days);
  setRadio($('#viewSeg'), 'view', state.view);
  $('#hideOther').checked = state.hideOther;

  $('#rangeSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.days = Number(b.dataset.days); localStorage.setItem('wb.days', state.days);
    setRadio($('#rangeSeg'), 'days', state.days); render();
  });
  $('#viewSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.view = b.dataset.view; localStorage.setItem('wb.view', state.view);
    setRadio($('#viewSeg'), 'view', state.view); render();
  });
  $('#catFilters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    const id = b.dataset.cat;
    if (!id) state.cats.clear();
    else if (e.ctrlKey || e.metaKey) state.cats.has(id) ? state.cats.delete(id) : state.cats.add(id); // Ctrl+click: multi-select
    else state.cats = state.cats.size === 1 && state.cats.has(id) ? new Set() : new Set([id]);
    render();
  });
  $('#regionFilters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-region]'); if (!b) return;
    const id = b.dataset.region;
    state.regions.has(id) ? state.regions.delete(id) : state.regions.add(id);
    render();
  });
  for (const [sel, key] of [['#onlyStarred', 'onlyStarred'], ['#onlyUnread', 'onlyUnread'], ['#hideOther', 'hideOther']]) {
    $(sel).addEventListener('change', (e) => {
      state[key] = e.target.checked;
      if (key === 'hideOther') localStorage.setItem('wb.hideOther', e.target.checked ? '1' : '0');
      render();
    });
  }
  let t;
  $('#search').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; render(); }, 150); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); $('#search').focus(); }
  });

  $('#feed').addEventListener('click', (e) => {
    const star = e.target.closest('[data-star]');
    if (star) { const it = state.items.find((x) => x.id === star.dataset.star); patchItem(it.id, { starred: !it.starred }); return; }
    const open = e.target.closest('[data-open]');
    if (open) { const it = state.items.find((x) => x.id === open.dataset.open); if (!it.read) patchItem(it.id, { read: true }); return; }
    const more = e.target.closest('[data-expand]');
    if (more) { const id = more.dataset.expand; state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id); render(); }
  });

  $('#collectBtn').addEventListener('click', collect);
  $('#toggleTable').addEventListener('click', (e) => {
    const tbl = $('#trendTable'); tbl.hidden = !tbl.hidden;
    e.target.setAttribute('aria-expanded', String(!tbl.hidden));
    e.target.textContent = tbl.hidden ? '表格视图' : '收起表格';
  });

  $('#openSettings').addEventListener('click', openSettings);
  $('#saveSettings').addEventListener('click', saveSettings);
  $('#addTime').addEventListener('click', () => {
    const v = $('#newTime').value;
    if (/^\d\d:\d\d$/.test(v) && !draft.schedule.includes(v)) { draft.schedule = [...draft.schedule, v].sort(); renderSettings(); }
  });
  $('#timeList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    if (draft.schedule.length > 1) { draft.schedule = draft.schedule.filter((x) => x !== b.dataset.rm); renderSettings(); }
  });
  $('#feedList').addEventListener('change', (e) => { if (e.target.dataset.feed) draft.feeds[e.target.dataset.feed] = e.target.checked; });

  window.addEventListener('resize', () => { clearTimeout(bind.r); bind.r = setTimeout(renderTrend, 120); });
}

bind();
load().catch((e) => { $('#statusLine').textContent = `无法连接服务：${e.message}`; });
// Refresh meta/items every 2 minutes so scheduled runs appear without reloading.
setInterval(() => { if (!$('#settings').open) load().catch(() => {}); }, 120000);

// World Brief (全球要闻): local server + scheduler. Run: node server.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './lib/store.mjs';
import { runCollection } from './lib/fetcher.mjs';
import { CATEGORIES, OTHER, REGIONS, DISPLAY_ORDER, classify } from './lib/classify.mjs';

const ORDERED_CATS = DISPLAY_ORDER.map((id) => [...CATEGORIES, OTHER].find((c) => c.id === id));

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(ROOT, 'config.json');
const PUBLIC = path.join(ROOT, 'public');

let config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
const store = new Store(path.join(ROOT, 'data'));
// Re-run the classifier over stored items so keyword edits apply retroactively.
const hints = Object.fromEntries(config.feeds.map((f) => [f.id, f.hint]));
for (const it of store.data.items) Object.assign(it, classify(it, hints[it.sourceId]));

let running = null; // Promise while a collection is in progress

const log = (...a) => console.log(new Date().toLocaleString('zh-CN', { hour12: false }), ...a);

function collect(trigger) {
  if (running) return running;
  log(`开始采集 (${trigger})...`);
  running = runCollection(store, config, trigger)
    .then((run) => {
      log(`采集完成：新增 ${run.added} 条，${run.okFeeds}/${run.totalFeeds} 个来源成功，用时 ${(run.ms / 1000).toFixed(1)}s`);
      for (const s of run.sources.filter((s) => !s.ok)) log(`  ✗ ${s.name}: ${s.error}`);
      return run;
    })
    .finally(() => { running = null; });
  return running;
}

// ---- Scheduler: checks every 20s, fires once per configured HH:MM per day ----
const fired = new Set();
const pad = (n) => String(n).padStart(2, '0');
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

setInterval(() => {
  const now = new Date();
  const key = `${now.toDateString()} ${hhmm(now)}`;
  if (config.schedule.includes(hhmm(now)) && !fired.has(key)) {
    fired.add(key);
    collect('schedule');
  }
}, 20000);

function nextRun() {
  const now = new Date();
  const times = [...config.schedule].sort();
  for (let day = 0; day < 2; day++) {
    for (const t of times) {
      const [h, m] = t.split(':').map(Number);
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, h, m);
      if (d > now) return d.toISOString();
    }
  }
  return null;
}

// When started by the desktop launcher, exit if the launcher goes away (e.g. killed in Task Manager).
const parentPid = Number(process.env.WORLDBRIEF_PARENT_PID);
if (parentPid) {
  setInterval(() => {
    try { process.kill(parentPid, 0); } catch { log('启动器已退出，服务关闭'); process.exit(0); }
  }, 5000).unref();
}

// ---- HTTP ----
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1e5) throw new Error('body too large');
  }
  return raw ? JSON.parse(raw) : {};
}

function itemsWithin(days) {
  const cutoff = Date.now() - days * 864e5;
  return store.data.items
    .filter((it) => new Date(it.published).getTime() >= cutoff || it.starred)
    .sort((a, b) => b.published.localeCompare(a.published));
}

function digestMarkdown(days) {
  const items = itemsWithin(days).filter((it) => new Date(it.published).getTime() >= Date.now() - days * 864e5);
  const cats = ORDERED_CATS;
  let md = `# 全球要闻简报\n\n生成时间：${new Date().toLocaleString('zh-CN', { hour12: false })}　范围：最近 ${days} 天　共 ${items.length} 条\n`;
  for (const c of cats) {
    const list = items.filter((it) => it.category === c.id);
    if (!list.length) continue;
    md += `\n## ${c.label}（${list.length}）\n\n`;
    for (const it of list) md += `- [${it.title.replace(/[[\]]/g, '')}](${it.link}) — ${it.source}，${new Date(it.published).toLocaleString('zh-CN', { hour12: false })}\n`;
  }
  return md;
}
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  try {
    if (p === '/api/items' && req.method === 'GET') {
      const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 3, 1), config.retentionDays);
      return send(res, 200, { items: itemsWithin(days) });
    }
    if (p === '/api/meta' && req.method === 'GET') {
      return send(res, 200, {
        categories: ORDERED_CATS.map(({ id, label, color }) => ({ id, label, color })),
        regions: REGIONS.map(({ id, label }) => ({ id, label })),
        schedule: config.schedule,
        lookbackHours: config.lookbackHours,
        retentionDays: config.retentionDays,
        feeds: config.feeds.map(({ id, name, lang, enabled, url }) => ({ id, name, lang, enabled, url })),
        runs: store.data.runs.slice(0, 20),
        running: !!running,
        nextRun: nextRun(),
        total: store.data.items.length,
      });
    }
    if (p === '/api/collect' && req.method === 'POST') {
      const run = await collect('manual');
      return send(res, 200, run);
    }
    if (p === '/api/config' && req.method === 'POST') {
      const body = await readJson(req);
      if (Array.isArray(body.schedule)) {
        const times = [...new Set(body.schedule.map(String))].filter((t) => TIME_RE.test(t)).sort();
        if (!times.length) return send(res, 400, { error: '至少需要一个有效时间 (HH:MM)' });
        config.schedule = times;
      }
      if (body.feeds && typeof body.feeds === 'object') {
        for (const f of config.feeds) if (typeof body.feeds[f.id] === 'boolean') f.enabled = body.feeds[f.id];
      }
      if (Number.isFinite(body.lookbackHours)) config.lookbackHours = Math.min(Math.max(body.lookbackHours, 6), 720);
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
      return send(res, 200, { ok: true, schedule: config.schedule, nextRun: nextRun() });
    }
    const m = p.match(/^\/api\/items\/([\w]+)$/);
    if (m && req.method === 'PATCH') {
      const body = await readJson(req);
      const patch = {};
      for (const k of ['starred', 'read']) if (typeof body[k] === 'boolean') patch[k] = body[k];
      const it = store.update(m[1], patch);
      return it ? send(res, 200, it) : send(res, 404, { error: 'not found' });
    }
    if (p === '/api/digest.md' && req.method === 'GET') {
      const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 1, 1), config.retentionDays);
      res.setHeader('content-disposition', `attachment; filename="digest-${new Date().toISOString().slice(0, 10)}.md"`);
      return send(res, 200, digestMarkdown(days), 'text/markdown; charset=utf-8');
    }
    if (p.startsWith('/api/')) return send(res, 404, { error: 'not found' });

    // Static files, confined to /public
    const file = path.normalize(path.join(PUBLIC, p === '/' ? 'index.html' : decodeURIComponent(p)));
    if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Not found', 'text/plain');
    return send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
  } catch (e) {
    log('请求出错', p, e.message);
    return send(res, 500, { error: e.message });
  }
});

// Bound to localhost only: no auth, so not exposed to the LAN.
server.listen(config.port, '127.0.0.1', () => {
  log(`全球要闻已启动 → http://localhost:${config.port}`);
  log(`定时采集：每天 ${config.schedule.join('、')}`);
  if (config.runOnStart) collect('startup');
});

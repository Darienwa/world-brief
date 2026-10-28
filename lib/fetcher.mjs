import crypto from 'node:crypto';
import { parseFeed, decodeBody } from './rss.mjs';
import { classify } from './classify.mjs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WorldBrief/1.0';

async function fetchFeed(feed, timeoutMs = 20000) {
  const res = await fetch(feed.url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml, */*' }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return parseFeed(decodeBody(buf, res.headers.get('content-type') || ''));
}

const errMsg = (e) => e?.cause?.code || (e?.name === 'TimeoutError' ? 'TIMEOUT' : e?.message || String(e));

// Fetch all enabled feeds in parallel, classify, and add items published within the lookback window.
export async function runCollection(store, config, trigger = 'manual') {
  const startedAt = new Date();
  const since = startedAt.getTime() - config.lookbackHours * 36e5;
  const feeds = config.feeds.filter((f) => f.enabled);

  const results = await Promise.all(feeds.map(async (feed) => {
    const t0 = Date.now();
    try {
      const entries = await fetchFeed(feed);
      let added = 0, inWindow = 0;
      // Newest first, capped per feed so high-volume wires don't drown out other sources.
      const cap = feed.maxPerRun ?? config.maxPerFeed ?? 40;
      entries.sort((a, b) => (b.published?.getTime() || 0) - (a.published?.getTime() || 0));
      for (const e of entries) {
        if (inWindow >= cap) break;
        // Items without a date are treated as "now" so undated feeds still show up.
        const published = e.published || startedAt;
        if (published.getTime() < since || published.getTime() > startedAt.getTime() + 36e5) continue;
        inWindow++;
        const c = classify(e, feed.hint);
        const ok = store.add({
          id: crypto.createHash('sha1').update(e.link).digest('hex').slice(0, 16),
          title: e.title,
          summary: e.summary.slice(0, 400),
          link: e.link,
          image: e.image || '',
          source: feed.name,
          sourceId: feed.id,
          lang: feed.lang,
          published: published.toISOString(),
          fetchedAt: startedAt.toISOString(),
          ...c,
          starred: false,
          read: false,
        });
        if (ok) added++;
      }
      return { id: feed.id, name: feed.name, ok: true, total: entries.length, inWindow, added, ms: Date.now() - t0 };
    } catch (e) {
      return { id: feed.id, name: feed.name, ok: false, error: errMsg(e), ms: Date.now() - t0 };
    }
  }));

  store.prune(config.retentionDays);
  const run = {
    at: startedAt.toISOString(),
    trigger,
    added: results.reduce((n, r) => n + (r.added || 0), 0),
    okFeeds: results.filter((r) => r.ok).length,
    totalFeeds: results.length,
    sources: results,
    ms: Date.now() - startedAt.getTime(),
  };
  store.addRun(run);
  store.save();
  return run;
}

// JSON file store: data/news.json holds items + run history. Writes are atomic (tmp + rename).
import fs from 'node:fs';
import path from 'node:path';

export class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'news.json');
    fs.mkdirSync(dir, { recursive: true });
    this.data = { items: [], runs: [] };
    if (fs.existsSync(this.file)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      } catch (e) {
        // Keep the unreadable file for inspection instead of overwriting it.
        fs.renameSync(this.file, `${this.file}.corrupt-${Date.now()}`);
      }
    }
    this.index = new Map(this.data.items.map((it) => [it.id, it]));
    this.titleIndex = new Set(this.data.items.map((it) => normTitle(it.title)));
  }

  // Returns true if the item was new.
  add(item) {
    const t = normTitle(item.title);
    if (this.index.has(item.id) || this.titleIndex.has(t)) return false;
    this.data.items.push(item);
    this.index.set(item.id, item);
    this.titleIndex.add(t);
    return true;
  }

  update(id, patch) {
    const it = this.index.get(id);
    if (!it) return null;
    Object.assign(it, patch);
    this.save();
    return it;
  }

  addRun(run) {
    this.data.runs.unshift(run);
    this.data.runs = this.data.runs.slice(0, 200);
  }

  prune(retentionDays) {
    const cutoff = Date.now() - retentionDays * 864e5;
    // Starred items are never pruned.
    this.data.items = this.data.items.filter((it) => it.starred || new Date(it.published).getTime() >= cutoff);
    this.index = new Map(this.data.items.map((it) => [it.id, it]));
    this.titleIndex = new Set(this.data.items.map((it) => normTitle(it.title)));
  }

  save() {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.file);
  }
}

export function normTitle(t = '') {
  return t.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

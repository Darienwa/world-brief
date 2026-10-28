---
name: world-brief
description: 全球要闻工作台 (World Brief) — collect recent world events (politics, military conflict, epidemics/public health, disasters, economy, tech) from RSS sources on a daily schedule, auto-classify them by category and region, and browse them in a local web dashboard. Use when the user asks to gather/summarize recent global news, produce a daily world briefing, check what happened in a category or region, change the collection schedule or news sources, or install/launch the World Brief dashboard.
---

# World Brief（全球要闻）

A zero-dependency Node.js (>= 18) app in this skill folder. It fetches RSS/Atom feeds, classifies items with keyword rules, stores them in `data/news.json`, and serves a dashboard at `http://localhost:4318`.

## Layout

| Path | Purpose |
|---|---|
| `server.mjs` | HTTP server + daily scheduler (`node server.mjs`) |
| `config.json` | schedule times, lookback window, per-feed cap, feed list |
| `lib/classify.mjs` | category / region keyword rules (zh + en) |
| `lib/fetcher.mjs`, `lib/rss.mjs`, `lib/store.mjs` | fetch, parse, dedupe, persist |
| `public/` | dashboard UI (vanilla JS) |
| `launcher/` | Windows tray launcher: `build.ps1` compiles `WorldBrief.exe` and adds a desktop shortcut |

## Common tasks

**Start the dashboard.** From this folder run `node server.mjs` (it collects once on startup when `runOnStart` is true). On Windows, `powershell -ExecutionPolicy Bypass -File launcher\build.ps1` builds `WorldBrief.exe` plus a desktop shortcut「全球要闻」that starts the server hidden, opens the browser, and lives in the tray.

**Get a briefing for the user.** With the server running:
- `curl -X POST http://localhost:4318/api/collect` — fetch now; returns per-source results.
- `curl "http://localhost:4318/api/digest.md?days=1"` — Markdown digest grouped by category.
- `curl "http://localhost:4318/api/items?days=3"` — JSON items (`title, summary, link, source, published, category, tags, regions`).

Summarize from these results; cite the `source` and `link` of each item. If the server isn't running, start it in the background first.

**Change the schedule / sources.** Edit `config.json` (`schedule: ["08:00","20:00"]`, `lookbackHours`, `maxPerFeed`, `feeds[].enabled`) or use the dashboard's 设置 dialog. Restart the server after editing the file by hand. Feeds marked 需代理 need a proxy: set `HTTPS_PROXY` and `NODE_USE_ENV_PROXY=1`, or put the proxy URL in `proxy.txt` when using the exe.

**Tune classification.** Add keywords in `lib/classify.mjs`. Chinese terms match as substrings; Latin terms as whole words, case-sensitive if they contain capitals (`US`, `WHO`). Feeds can carry a `hint` category that gets a score bonus. Stored items are reclassified on every server start.

## Notes

- Binds to `127.0.0.1` only, no auth — don't expose it on a network without adding auth.
- Source mix depends on what the network can reach; report failed sources (`/api/meta` → `runs[0].sources`) rather than silently omitting them.
- Classification is keyword-based and imperfect; when summarizing, re-check category assignments that look wrong.

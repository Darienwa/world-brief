// Minimal RSS 2.0 / RDF / Atom parser, no dependencies.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const unCdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

// Text content: CDATA -> entities -> strip HTML -> entities again (feeds often double-encode)
export function toText(raw = '') {
  let s = decodeEntities(unCdata(raw));
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  return decodeEntities(s).replace(/\s+/g, ' ').trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : '';
}

function attr(block, tagName, attrName) {
  const m = block.match(new RegExp(`<${tagName}\\b[^>]*\\b${attrName}=["']([^"']+)["']`, 'i'));
  return m ? decodeEntities(m[1]) : '';
}

function findImage(block) {
  return (
    attr(block, 'media:content', 'url') ||
    attr(block, 'media:thumbnail', 'url') ||
    (/<enclosure[^>]*type=["']image/i.test(block) ? attr(block, 'enclosure', 'url') : '') ||
    (decodeEntities(unCdata(block)).match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] ||
    ''
  );
}

function atomLink(block) {
  const links = block.match(/<link\b[^>]*>/gi) || [];
  const alt = links.find((l) => /rel=["']alternate["']/i.test(l)) || links.find((l) => !/rel=/i.test(l)) || links[0];
  return alt ? (alt.match(/href=["']([^"']+)["']/i) || [])[1] || '' : '';
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(toText(s));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseFeed(xml) {
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const blocks = xml.match(isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) || [];
  return blocks.map((b) => {
    const link = isAtom ? atomLink(b) : toText(tag(b, 'link')) || attr(b, 'link', 'href') || toText(tag(b, 'guid'));
    const summary = toText(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content:encoded') || tag(b, 'content'));
    return {
      title: toText(tag(b, 'title')),
      link: decodeEntities(link).trim(),
      summary,
      published: parseDate(tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published') || tag(b, 'updated')),
      image: findImage(b),
    };
  }).filter((it) => it.title && it.link);
}

// Decode response bytes honoring the XML-declared or HTTP charset (e.g. GBK feeds).
export function decodeBody(buf, contentType = '') {
  const head = Buffer.from(buf.slice(0, 300)).toString('latin1');
  const cs = (head.match(/encoding=["']([\w-]+)["']/i) || contentType.match(/charset=([\w-]+)/i) || [])[1] || 'utf-8';
  try {
    return new TextDecoder(cs.toLowerCase()).decode(buf);
  } catch {
    return new TextDecoder('utf-8').decode(buf);
  }
}

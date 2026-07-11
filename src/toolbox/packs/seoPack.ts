/**
 * Web & SEO pack — meta tags, structured data, URL builders, SERP checks.
 * Generates copy-paste-ready markup; nothing leaves the device.
 */
import { ToolboxTool } from '../types';

const t = (
  id: string,
  name: string,
  description: string,
  inputHint: string,
  run: (s: string) => string,
  tags: string[] = [],
  example?: string
): ToolboxTool => ({
  id, name, description, category: 'seo', tags: ['seo', 'web', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const bad = (hint: string) => `Format: ${hint}`;
const lines = (s: string): string[] => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

export const seoPack: ToolboxTool[] = [
  t('seo-meta', 'Meta Tags Generator', 'Title + description meta block. Format: title::description', 'title::description', (s) => {
    const p = s.split('::'); if (p.length < 2) return bad('My Page::What this page is about');
    const [title, desc] = [p[0].trim(), p[1].trim()];
    return [
      `<title>${esc(title)}</title>`,
      `<meta name="description" content="${esc(desc)}">`,
      `<meta name="viewport" content="width=device-width, initial-scale=1">`,
      `<meta charset="utf-8">`,
    ].join('\n');
  }, ['meta'], 'Off Grid Tools::280 offline tools that run in your browser'),
  t('seo-og', 'Open Graph Tags', 'Social sharing card markup. Format: title::description::url[::image]', 'title::desc::url[::img]', (s) => {
    const p = s.split('::'); if (p.length < 3) return bad('Title::Description::https://example.com::https://example.com/og.png');
    const tags = [
      `<meta property="og:title" content="${esc(p[0].trim())}">`,
      `<meta property="og:description" content="${esc(p[1].trim())}">`,
      `<meta property="og:url" content="${esc(p[2].trim())}">`,
      `<meta property="og:type" content="website">`,
    ];
    if (p[3]) tags.push(`<meta property="og:image" content="${esc(p[3].trim())}">`);
    tags.push(`<meta name="twitter:card" content="${p[3] ? 'summary_large_image' : 'summary'}">`);
    return tags.join('\n');
  }, ['opengraph', 'social'], 'My App::Offline tools::https://example.com'),
  t('seo-robots', 'robots.txt Builder', 'Allow/disallow rules. Format: allow|disallow paths comma-sep[::sitemap URL]', 'disallow /admin,/tmp[::sitemap]', (s) => {
    const p = s.split('::');
    const m = p[0].trim().match(/^(allow|disallow)\s+(.+)$/i);
    if (!m) return bad('disallow /admin,/private or allow /');
    const paths = m[2].split(',').map((x) => x.trim()).filter(Boolean);
    const out = ['User-agent: *', ...paths.map((path) => `${m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()}: ${path}`)];
    if (p[1]) out.push('', `Sitemap: ${p[1].trim()}`);
    return out.join('\n');
  }, ['robots'], 'disallow /admin,/private::https://example.com/sitemap.xml'),
  t('seo-sitemap', 'sitemap.xml Skeleton', 'Sitemap from a URL list (one per line).', 'URLs, one per line', (s) => {
    const urls = lines(s); if (!urls.length) return 'Paste URLs, one per line.';
    const today = new Date().toISOString().slice(0, 10);
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((u) => `  <url><loc>${esc(u)}</loc><lastmod>${today}</lastmod></url>`),
      '</urlset>',
    ].join('\n');
  }, ['sitemap'], 'https://example.com/\nhttps://example.com/about'),
  t('seo-utm', 'UTM URL Builder', 'Campaign-tagged URL. Format: url::source::medium::campaign', 'url::source::medium::campaign', (s) => {
    const p = s.split('::').map((x) => x.trim()); if (p.length < 4) return bad('https://example.com::newsletter::email::launch');
    const sep = p[0].includes('?') ? '&' : '?';
    return `${p[0]}${sep}utm_source=${encodeURIComponent(p[1])}&utm_medium=${encodeURIComponent(p[2])}&utm_campaign=${encodeURIComponent(p[3])}`;
  }, ['utm', 'campaign'], 'https://example.com::newsletter::email::launch'),
  t('seo-title-check', 'Title Length Check', 'SERP pixel budget check for a page title (~60 chars).', 'title text', (s) => {
    const title = s.trim(); if (!title) return 'Enter a page title.';
    const n = title.length;
    return `${n} characters\n${n <= 60 ? 'Fits standard SERP display ✓' : `Likely truncated — trim ~${n - 60} chars`}\nSweet spot: 50–60.`;
  }, ['title', 'serp'], 'Offline Toolbox — 280 tools that run without internet'),
  t('seo-desc-check', 'Meta Description Check', 'Length check (~155 chars) with cut preview.', 'description text', (s) => {
    const d = s.trim(); if (!d) return 'Enter a meta description.';
    return `${d.length} characters\n${d.length <= 155 ? 'Fits standard snippet ✓' : `Likely cut at: "${d.slice(0, 152)}…"`}\nSweet spot: 120–155.`;
  }, ['description', 'serp'], 'Every tool runs in your browser with zero network calls.'),
  t('seo-keyword-density', 'Keyword Density', 'How often a phrase appears in text. Format: phrase::text', 'phrase::text', (s) => {
    const idx = s.indexOf('::'); if (idx < 0) return bad('offline tools::your page text');
    const phrase = s.slice(0, idx).trim().toLowerCase();
    const body = s.slice(idx + 2).toLowerCase();
    const totalWords = (body.match(/[a-z0-9']+/g) ?? []).length;
    if (!phrase || !totalWords) return bad('phrase::text');
    let count = 0, pos = 0;
    while ((pos = body.indexOf(phrase, pos)) !== -1) { count++; pos += phrase.length; }
    const density = ((count * phrase.split(/\s+/).length) / totalWords) * 100;
    return `"${phrase}" appears ${count}× in ${totalWords} words\nDensity: ${density.toFixed(2)}% ${density > 3 ? '(high — may read as stuffing)' : density > 0.5 ? '(healthy)' : '(low)'}`;
  }, ['keywords'], 'offline tools::These offline tools run offline. Offline tools work anywhere.'),
  t('seo-hreflang', 'Hreflang Tags', 'Alternate-language links. Format: url-base::lang codes comma-sep', 'url::en,de,fr', (s) => {
    const p = s.split('::'); if (p.length < 2) return bad('https://example.com::en,de,fr-CA');
    const langs = p[1].split(',').map((x) => x.trim()).filter(Boolean);
    if (!langs.length) return bad('https://example.com::en,de');
    const base = p[0].trim().replace(/\/$/, '');
    return [
      ...langs.map((l) => `<link rel="alternate" hreflang="${l}" href="${base}/${l.toLowerCase()}/">`),
      `<link rel="alternate" hreflang="x-default" href="${base}/">`,
    ].join('\n');
  }, ['hreflang', 'i18n'], 'https://example.com::en,de,fr'),
  t('seo-canonical', 'Canonical + Favicon Block', 'Canonical link and favicon set. Input: page URL', 'URL', (s) => {
    const u = s.trim(); if (!/^https?:\/\//.test(u)) return 'Enter a full URL (https://…).';
    return [
      `<link rel="canonical" href="${esc(u)}">`,
      `<link rel="icon" href="/favicon.ico" sizes="any">`,
      `<link rel="icon" href="/icon.svg" type="image/svg+xml">`,
      `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
      `<link rel="manifest" href="/site.webmanifest">`,
    ].join('\n');
  }, ['canonical', 'favicon'], 'https://example.com/tools'),
  t('seo-jsonld-article', 'JSON-LD Article', 'Structured data for an article. Format: headline::author::date(YYYY-MM-DD)', 'headline::author::date', (s) => {
    const p = s.split('::').map((x) => x.trim()); if (p.length < 3) return bad('My Post::Ada Lovelace::2026-07-10');
    return `<script type="application/ld+json">\n${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Article',
      headline: p[0], author: { '@type': 'Person', name: p[1] }, datePublished: p[2],
    }, null, 2)}\n</script>`;
  }, ['jsonld', 'schema'], 'My Post::Ada Lovelace::2026-07-10'),
  t('seo-jsonld-faq', 'JSON-LD FAQ', 'FAQ rich-result markup. Format: q1|a1 per line', 'question|answer lines', (s) => {
    const rows = lines(s).map((l) => l.split('|')).filter((p) => p.length >= 2);
    if (!rows.length) return 'One "question|answer" per line.';
    return `<script type="application/ld+json">\n${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: rows.map(([q, ...a]) => ({ '@type': 'Question', name: q.trim(), acceptedAnswer: { '@type': 'Answer', text: a.join('|').trim() } })),
    }, null, 2)}\n</script>`;
  }, ['jsonld', 'faq'], 'Does it work offline?|Yes, every tool runs locally.'),
  t('seo-slug-check', 'URL Slug Audit', 'Checks a slug for length, stopwords, and characters.', 'slug', (s) => {
    const slug = s.trim().toLowerCase();
    if (!slug) return 'Enter a URL slug.';
    const issues: string[] = [];
    if (/[^a-z0-9-]/.test(slug)) issues.push('Contains characters outside a-z, 0-9, hyphen.');
    if (slug.length > 60) issues.push(`Long (${slug.length} chars) — aim under 60.`);
    if (/--/.test(slug)) issues.push('Double hyphens.');
    if (/^-|-$/.test(slug)) issues.push('Leading/trailing hyphen.');
    const stop = slug.split('-').filter((w) => ['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in'].includes(w));
    if (stop.length) issues.push(`Stopwords present: ${stop.join(', ')} (optional to remove).`);
    return issues.length ? `Issues:\n${issues.map((i) => `• ${i}`).join('\n')}` : `"${slug}" looks clean ✓ (${slug.length} chars, ${slug.split('-').length} words)`;
  }, ['slug', 'url'], 'the-best-offline-tools-2026'),
];

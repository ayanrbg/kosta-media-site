// Kosta Media — генератор статических страниц.
//
// Собирает по одной HTML-странице на каждый язык из src/template.html + i18n.js,
// плюс sitemap.xml и llms.txt. Весь контент попадает в HTML статически —
// краулерам и ИИ-ботам не нужно выполнять JS, чтобы его прочитать.
//
// Запуск:  node build.js
// После правок в i18n.js или src/template.html — пересобрать и закоммитить результат.

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Загружаем словарь ───
global.window = {};
require('./i18n.js');
const I18N = global.window.KM_I18N;
const KM_LANGS = global.window.KM_LANGS;

// ─── Конфиг ───
const SITE = 'https://kosta.media';
const APPLY_URL = 'https://www.tiktok.com/tcn/scout_creators?use_spark=1&agency_scout_source=qr_code_leads&ShareLinkID=7636055606712926216';
const WA_URL = 'https://wa.me/message/WUIBSOCSSUKEG1';
const TG_URL = 'https://t.me/kosta_tiktok';
const OG_IMAGE = SITE + '/assets/og-cover.png';

// Внутренний код языка -> директория, ISO-коды для hreflang/OG.
// Русский лежит в корне: он и есть основная версия сайта.
const LOCALES = [
  { code: 'ru', dir: '',    htmlLang: 'ru', hreflang: 'ru', ogLocale: 'ru_RU' },
  { code: 'en', dir: 'en/', htmlLang: 'en', hreflang: 'en', ogLocale: 'en_US' },
  { code: 'kz', dir: 'kk/', htmlLang: 'kk', hreflang: 'kk', ogLocale: 'kk_KZ' },
  { code: 'uz', dir: 'uz/', htmlLang: 'uz', hreflang: 'uz', ogLocale: 'uz_UZ' },
  { code: 'kg', dir: 'ky/', htmlLang: 'ky', hreflang: 'ky', ogLocale: 'ky_KG' },
];

const urlFor = (loc) => SITE + '/' + loc.dir;

// ─── Утилиты ───
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
// Для текста внутри HTML-узлов кавычки экранировать не нужно.
function escText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Блоки контента (структура повторяет app.js — она источник разметки) ───
const PERKS = [
  { icon: '🎁', tKey: 'perk1_t', dKey: 'perk1_d', accent: 'var(--pink)',   span: 1 },
  { icon: '0%', tKey: 'perk5_t', dKey: 'perk5_d', accent: 'var(--cyan)',   span: 2, big: true },
  { icon: '🛡', tKey: 'perk3_t', dKey: 'perk3_d', accent: 'var(--orange)', span: 1 },
  { icon: '👥', tKey: 'perk2_t', dKey: 'perk2_d', accent: 'var(--pink)',   span: 1 },
  { icon: '🏆', tKey: 'perk4_t', dKey: 'perk4_d', accent: 'var(--yellow)', span: 1 },
  { icon: '💬', tKey: 'perk6_t', dKey: 'perk6_d', accent: 'var(--cyan)',   span: 1 },
];
const HOW = [
  { tKey: 'how1_t', dKey: 'how1_d', c: 'var(--cyan)' },
  { tKey: 'how2_t', dKey: 'how2_d', c: 'var(--pink)' },
  { tKey: 'how3_t', dKey: 'how3_d', c: 'var(--orange)' },
  { tKey: 'how4_t', dKey: 'how4_d', c: 'var(--yellow)' },
];
const TIERS = [
  { labelKey: 'prizes_tier2', glyph: '🚀', accent: 'var(--pink)' },
  { labelKey: 'prizes_tier3', glyph: '💎', accent: 'var(--orange)' },
  { labelKey: 'prizes_tier4', glyph: '👑', accent: 'var(--yellow)' },
];
const QUOTES = [
  { qKey: 'proof_q1', name: '@maria_live', role: '124k', accent: 'var(--cyan)' },
  { qKey: 'proof_q2', name: '@aibek',      role: '38k',  accent: 'var(--pink)' },
  { qKey: 'proof_q3', name: '@nargiza',    role: '92k',  accent: 'var(--orange)' },
];
const FAQ = [
  ['faq1_q', 'faq1_a'], ['faq2_q', 'faq2_a'], ['faq3_q', 'faq3_a'],
  ['faq4_q', 'faq4_a'], ['faq5_q', 'faq5_a'],
];

// ─── Рендер секций ───
function renderPerks(t) {
  return PERKS.map((p, i) =>
    `<div class="card perk-card reveal${p.span === 2 ? ' span-2' : ''}" style="transition-delay:${i * 80}ms">` +
    `<div class="perk-accent-line" style="background:${p.accent}"></div>` +
    `<div class="perk-icon${p.big ? ' big' : ''}" style="color:${p.accent};text-shadow:0 0 30px ${p.accent}80">${p.icon}</div>` +
    `<h3 class="t-h3" style="margin:0 0 10px">${escText(t(p.tKey))}</h3>` +
    `<p class="t-body" style="margin:0;font-size:14px">${escText(t(p.dKey))}</p>` +
    `</div>`
  ).join('\n');
}

function renderHow(t) {
  return HOW.map((s, i) =>
    `<div class="card how-step reveal" style="transition-delay:${i * 100}ms">` +
    `<div class="how-number" style="border:1px solid ${s.c};color:${s.c};box-shadow:0 0 24px ${s.c}40">0${i + 1}</div>` +
    `<div class="how-spacer"></div>` +
    `<h3 class="t-h3" style="margin:0 0 10px">${escText(t(s.tKey))}</h3>` +
    `<p class="t-body" style="margin:0;font-size:14px">${escText(t(s.dKey))}</p>` +
    `</div>`
  ).join('\n');
}

function renderPrizes(t) {
  return TIERS.map((tier, i) =>
    `<div class="card prize-card reveal" style="transition-delay:${i * 80}ms;background:linear-gradient(180deg, ${tier.accent}10, transparent 60%)">` +
    `<div class="prize-glyph" style="filter:drop-shadow(0 0 24px ${tier.accent})">${tier.glyph}</div>` +
    `<div class="t-mono" style="color:${tier.accent};margin-bottom:8px">TIER ${i + 1}</div>` +
    `<h3 class="t-h3" style="margin:0 0 12px">${escText(t(tier.labelKey))}</h3>` +
    `<div class="prize-tier">🎁 ${escText(t('prizes_label'))}</div>` +
    `</div>`
  ).join('\n');
}

function renderQuotes(t) {
  return QUOTES.map((q, i) =>
    `<div class="card reveal" style="transition-delay:${i * 100}ms">` +
    `<div class="quote-mark" style="color:${q.accent}">"</div>` +
    `<p class="quote-text">${escText(t(q.qKey))}</p>` +
    `<div class="quote-author">` +
    `<div class="quote-avatar" style="background:linear-gradient(135deg,${q.accent},${q.accent}80)"></div>` +
    `<div><div class="quote-name">${q.name}</div>` +
    `<div class="quote-role">${q.role} followers</div></div></div>` +
    `</div>`
  ).join('\n');
}

function renderFAQ(t) {
  // Первый пункт открыт — так же, как это делает app.js при загрузке.
  return FAQ.map((pair, i) =>
    `<button class="faq-item reveal${i === 0 ? ' open' : ''}" style="transition-delay:${i * 60}ms">` +
    `<span class="faq-num">0${i + 1}</span>` +
    `<span class="faq-content">` +
    `<span class="faq-question">${escText(t(pair[0]))}</span>` +
    `<span class="faq-answer">${escText(t(pair[1]))}</span>` +
    `</span>` +
    `<span class="faq-toggle">+</span>` +
    `</button>`
  ).join('\n');
}

function renderTicker(t) {
  const items = [
    t('proof_streamers'), '·', t('proof_years'), '·',
    t('perk5_t'), '·', t('proof_support'), '·',
    'TikTok Live', '·', 'CCA region', '·',
  ];
  const repeated = items.concat(items, items, items);
  return repeated.map((item) =>
    `<span style="font-family:Unbounded;font-size:18px;font-weight:600;letter-spacing:-0.01em;` +
    `color:${item === '·' ? 'var(--cyan)' : 'var(--ink-2)'}">${escText(item)}</span>`
  ).join('');
}

function renderHeroTitle(t) {
  const parts = t('hero_title').split('|');
  const br = (s) => escText(s).replace(/\n/g, '<br>');
  const logo = (s) => s.replace(/TikTok/g, '<span class="tiktok-logo">TikTok</span>');
  return '<span>' + logo(br(parts[0])) + '</span>' +
    (parts[1] ? '<br><span class="gradient-text">' + br(parts[1].trim()) + '</span>' : '');
}

function renderHeroFree(t) {
  const parts = t('hero_free').split('·');
  return '<span class="accent">0%</span> <span>·</span> <span>' +
    escText(parts.slice(1).join('·').trim() || 'free') + '</span>' +
    ' <span>·</span> <span class="note">' + escText(t('badge_note')) + '</span>';
}

// ─── Переключатель языка: настоящие ссылки, а не кнопки ───
function renderLangLinks(current) {
  return LOCALES.map((loc) => {
    const info = KM_LANGS.find((l) => l.code === loc.code);
    const active = loc.code === current.code;
    return `<a class="lang-option${active ? ' active' : ''}" href="/${loc.dir}" hreflang="${loc.hreflang}"` +
      `${active ? ' aria-current="true"' : ''} data-lang="${loc.code}">` +
      `<span class="lang-option-code">${info.label}</span>` +
      `<span class="lang-option-name">${escText(info.name)}</span></a>`;
  }).join('');
}

function renderFooterLangs(current) {
  return LOCALES.map((loc) => {
    const info = KM_LANGS.find((l) => l.code === loc.code);
    const active = loc.code === current.code;
    return `<a href="/${loc.dir}" hreflang="${loc.hreflang}"${active ? ' aria-current="true" class="active"' : ''}>` +
      `${escText(info.name)}</a>`;
  }).join('');
}

// ─── hreflang и og:locale ───
function renderHreflang() {
  const links = LOCALES.map((loc) =>
    `  <link rel="alternate" hreflang="${loc.hreflang}" href="${urlFor(loc)}">`
  );
  links.push(`  <link rel="alternate" hreflang="x-default" href="${SITE}/">`);
  return links.join('\n');
}

function renderOgLocales(current) {
  const out = [`  <meta property="og:locale" content="${current.ogLocale}">`];
  LOCALES.filter((l) => l.code !== current.code).forEach((l) => {
    out.push(`  <meta property="og:locale:alternate" content="${l.ogLocale}">`);
  });
  return out.join('\n');
}

// ─── JSON-LD ───
function renderJsonLd(loc, t) {
  const graph = [
    {
      '@type': 'Organization',
      '@id': SITE + '/#organization',
      name: 'Kosta Media',
      alternateName: 'Kosta Media TikTok LIVE Agency',
      url: SITE + '/',
      logo: { '@type': 'ImageObject', url: SITE + '/assets/logo.png', width: 1024, height: 1024 },
      image: OG_IMAGE,
      description: t('org_description'),
      slogan: t('perk5_t'),
      knowsAbout: [
        'TikTok LIVE', 'TikTok LIVE agency', 'live streaming monetization',
        'TikTok gifts and diamonds', 'TikTok account bans and appeals',
      ],
      knowsLanguage: ['ru', 'en', 'uz', 'kk', 'ky'],
      areaServed: [
        { '@type': 'Country', name: 'Kazakhstan' },
        { '@type': 'Country', name: 'Uzbekistan' },
        { '@type': 'Country', name: 'Kyrgyzstan' },
      ],
      sameAs: [WA_URL, TG_URL],
      contactPoint: [{
        '@type': 'ContactPoint',
        contactType: 'customer support',
        url: WA_URL,
        availableLanguage: ['ru', 'en', 'uz', 'kk', 'ky'],
      }],
      makesOffer: {
        '@type': 'Offer',
        priceSpecification: { '@type': 'PriceSpecification', price: 0, priceCurrency: 'USD' },
        itemOffered: {
          '@type': 'Service',
          name: t('how3_t'),
          serviceType: 'TikTok LIVE agency',
          description: t('perk5_d'),
        },
      },
    },
    {
      '@type': 'WebSite',
      '@id': SITE + '/#website',
      url: SITE + '/',
      name: 'Kosta Media',
      inLanguage: LOCALES.map((l) => l.hreflang),
      publisher: { '@id': SITE + '/#organization' },
    },
    {
      '@type': 'WebPage',
      '@id': urlFor(loc) + '#webpage',
      url: urlFor(loc),
      name: t('seo_title'),
      description: t('seo_description'),
      inLanguage: loc.hreflang,
      isPartOf: { '@id': SITE + '/#website' },
      about: { '@id': SITE + '/#organization' },
      primaryImageOfPage: OG_IMAGE,
    },
    {
      '@type': 'FAQPage',
      '@id': urlFor(loc) + '#faq',
      inLanguage: loc.hreflang,
      mainEntity: FAQ.map((pair) => ({
        '@type': 'Question',
        name: t(pair[0]),
        acceptedAnswer: { '@type': 'Answer', text: t(pair[1]) },
      })),
    },
  ];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
  // </script> внутри JSON-LD сломал бы разметку. Данных таких нет, но страхуемся.
  return json.replace(/<\//g, '<\\/').split('\n').map((l) => '  ' + l).join('\n');
}

// ─── Сборка страницы ───
function buildPage(loc, template) {
  const dict = I18N[loc.code];
  const t = (key) => (dict[key] !== undefined ? dict[key] : (I18N.ru[key] !== undefined ? I18N.ru[key] : key));
  const isRoot = loc.dir === '';
  const root = isRoot ? '' : '../';

  let html = template;

  // Сначала блоки, потом одиночные токены — порядок важен,
  // потому что блоки могут содержать {{t:...}} внутри себя.
  const blocks = {
    '{{HREFLANG}}': renderHreflang(),
    '{{OG_LOCALES}}': renderOgLocales(loc),
    '{{JSONLD}}': renderJsonLd(loc, t),
    '{{PERKS}}': renderPerks(t),
    '{{HOW}}': renderHow(t),
    '{{PRIZES}}': renderPrizes(t),
    '{{QUOTES}}': renderQuotes(t),
    '{{FAQ}}': renderFAQ(t),
    '{{TICKER}}': renderTicker(t),
    '{{HERO_TITLE}}': renderHeroTitle(t),
    '{{HERO_FREE}}': renderHeroFree(t),
    '{{LANG_LINKS}}': renderLangLinks(loc),
    '{{FOOTER_LANGS}}': renderFooterLangs(loc),
  };
  for (const [token, value] of Object.entries(blocks)) {
    html = html.split(token).join(value);
  }

  const scalars = {
    '{{HTML_LANG}}': loc.htmlLang,
    '{{TITLE}}': esc(t('seo_title')),
    '{{DESCRIPTION}}': esc(t('seo_description')),
    '{{OG_TITLE}}': esc(t('og_title')),
    '{{OG_DESCRIPTION}}': esc(t('og_description')),
    '{{CANONICAL}}': urlFor(loc),
    '{{ROOT}}': root,
    '{{APPLY_URL}}': esc(APPLY_URL),
    '{{WA_URL}}': esc(WA_URL),
    '{{TG_URL}}': esc(TG_URL),
    '{{LANG_CODE}}': KM_LANGS.find((l) => l.code === loc.code).label,
    '{{LANG_CODE_INTERNAL}}': loc.code,
    '{{IS_ROOT}}': String(isRoot),
    '{{PHONE_LABEL}}': escText(t('perk1_t').toUpperCase()),
    '{{STAT_STREAMERS}}': escText(t('proof_streamers').split(' ').slice(1).join(' ')),
    '{{STAT_YEARS}}': escText(t('proof_years').split(' ').slice(1).join(' ')),
    '{{STAT_COMMISSION}}': escText(t('perk5_t')),
    '{{STAT_SUPPORT}}': escText(t('proof_support').split(' ').slice(1).join(' ') || 'support'),
  };
  for (const [token, value] of Object.entries(scalars)) {
    html = html.split(token).join(value);
  }

  // {{t:key}} — простые строки из словаря
  html = html.replace(/\{\{t:([a-z0-9_]+)\}\}/gi, (_, key) => escText(t(key)));

  const leftover = html.match(/\{\{[^}]+\}\}/g);
  if (leftover) throw new Error('Незаполненные токены в ' + (loc.dir || '/') + ': ' + [...new Set(leftover)].join(', '));

  return html;
}

// ─── sitemap.xml с hreflang-альтернативами ───
function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const alts = LOCALES.map((l) =>
    `      <xhtml:link rel="alternate" hreflang="${l.hreflang}" href="${urlFor(l)}"/>`
  ).join('\n') + `\n      <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>`;

  const urls = LOCALES.map((loc) =>
    `  <url>\n` +
    `    <loc>${urlFor(loc)}</loc>\n` +
    alts + '\n' +
    `    <lastmod>${today}</lastmod>\n` +
    `    <changefreq>weekly</changefreq>\n` +
    `    <priority>${loc.dir === '' ? '1.0' : '0.8'}</priority>\n` +
    `  </url>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urls + `\n</urlset>\n`;
}

// ─── llms.txt — краткая выжимка для ИИ-агентов ───
function buildLlmsTxt() {
  const t = (key) => I18N.ru[key];
  const faq = FAQ.map((p) => `- **${t(p[0])}** ${t(p[1])}`).join('\n');
  const perks = PERKS.map((p) => `- **${t(p.tKey)}** — ${t(p.dKey)}`).join('\n');
  const how = HOW.map((s, i) => `${i + 1}. **${t(s.tKey)}** — ${t(s.dKey)}`).join('\n');

  return `# Kosta Media

> ${t('org_description')}

Официальное агентство-партнёр TikTok по контракту. Не представители платформы.

## Факты

- Регион: Казахстан, Узбекистан, Кыргызстан и другие страны региона CCA
- Специализация: TikTok LIVE (прямые эфиры), не обычный контент-маркетинг
- Комиссия со стримера: 0%. Агентству платит TikTok
- Стримеров в агентстве: 500+
- На рынке: 2 года
- Поддержка: 24/7
- Языки работы: русский, английский, узбекский, казахский, киргизский
- Порог входа по подписчикам: жёсткого нет
- Выход из агентства: в любой момент, без штрафов

## Что получает стример

${perks}

## Как подключиться

${how}

## Частые вопросы

${faq}

## Контакты

- Сайт: ${SITE}/
- WhatsApp: ${WA_URL}
- Telegram: ${TG_URL}
- Заявка через TikTok: ${APPLY_URL}

## Языковые версии

${LOCALES.map((l) => `- ${l.hreflang}: ${urlFor(l)}`).join('\n')}
`;
}

// ─── site.webmanifest ───
function buildManifest() {
  const t = (key) => I18N.ru[key];
  return JSON.stringify({
    name: 'Kosta Media',
    short_name: 'Kosta Media',
    description: t('seo_description'),
    lang: 'ru',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#07070a',
    theme_color: '#07070a',
    icons: [
      { src: '/assets/logo-glyph-128.png', sizes: '128x128', type: 'image/png' },
      { src: '/assets/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }, null, 2) + '\n';
}

// ─── llms-full.txt — полный текст сайта для ИИ-агентов ───
// llms.txt даёт выжимку, llms-full.txt — всё содержимое целиком.
function buildLlmsFull() {
  const out = [];
  out.push('# Kosta Media — полное содержимое сайта\n');
  out.push('> ' + I18N.ru.org_description + '\n');

  for (const loc of LOCALES) {
    const dict = I18N[loc.code];
    const t = (key) => (dict[key] !== undefined ? dict[key] : I18N.ru[key]);
    out.push('\n---\n');
    out.push('## ' + urlFor(loc) + ' (' + loc.hreflang + ')\n');
    out.push('**' + t('seo_title') + '**\n');
    out.push(t('seo_description') + '\n');
    out.push('### ' + t('badge_official'));
    out.push(t('hero_title').replace(/\|/g, ' ').replace(/\n/g, ' ') + ' — ' + t('hero_sub'));
    out.push(t('hero_free') + '. ' + t('badge_note') + '\n');

    out.push('### ' + t('perks_title'));
    PERKS.forEach((p) => out.push('- **' + t(p.tKey) + '** — ' + t(p.dKey)));
    out.push('');

    out.push('### ' + t('how_title'));
    HOW.forEach((s, i) => out.push((i + 1) + '. **' + t(s.tKey) + '** — ' + t(s.dKey)));
    out.push('');

    out.push('### ' + t('prizes_title'));
    out.push(t('prizes_sub'));
    TIERS.forEach((tier) => out.push('- ' + t(tier.labelKey) + ' — ' + t('prizes_label')));
    out.push('');

    out.push('### ' + t('proof_title'));
    out.push([t('proof_streamers'), t('proof_years'), t('perk5_t'), t('proof_support')].join(' · '));
    QUOTES.forEach((q) => out.push('> ' + t(q.qKey) + ' — ' + q.name + ', ' + q.role));
    out.push('');

    out.push('### ' + t('faq_title'));
    FAQ.forEach((pair) => out.push('**' + t(pair[0]) + '**\n' + t(pair[1]) + '\n'));
  }

  out.push('\n---\n');
  out.push('## Контакты\n');
  out.push('- Сайт: ' + SITE + '/');
  out.push('- WhatsApp: ' + WA_URL);
  out.push('- Telegram: ' + TG_URL);
  out.push('- Заявка через TikTok: ' + APPLY_URL);

  return out.join('\n') + '\n';
}

// ─── Запуск ───
function main() {
  const template = fs.readFileSync(path.join(__dirname, 'src', 'template.html'), 'utf8');
  const written = [];

  for (const loc of LOCALES) {
    const html = buildPage(loc, template);
    const dir = path.join(__dirname, loc.dir);
    if (loc.dir) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'index.html');
    fs.writeFileSync(file, html, 'utf8');
    written.push({ file: (loc.dir || '') + 'index.html', bytes: Buffer.byteLength(html) });
  }

  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), buildSitemap(), 'utf8');
  fs.writeFileSync(path.join(__dirname, 'llms.txt'), buildLlmsTxt(), 'utf8');
  fs.writeFileSync(path.join(__dirname, 'llms-full.txt'), buildLlmsFull(), 'utf8');
  fs.writeFileSync(path.join(__dirname, 'site.webmanifest'), buildManifest(), 'utf8');

  written.forEach((w) => console.log('  ' + w.file.padEnd(20) + (w.bytes / 1024).toFixed(1) + ' KB'));
  console.log('  sitemap.xml          ' + LOCALES.length + ' URL');
  console.log('  llms.txt');
  console.log('  llms-full.txt');
  console.log('  site.webmanifest');
  console.log('\nГотово: ' + LOCALES.length + ' страниц.');
}

main();

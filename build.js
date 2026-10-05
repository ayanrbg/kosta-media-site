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
const crypto = require('crypto');

// Метка версии для styles.css и app.js. Файлы отдаются с длинным кэшем,
// поэтому без неё правки доезжали бы до вернувшихся посетителей только через
// сутки. Меняется вместе с содержимым файла — старый кэш сбрасывается сам.
function assetVersion(file) {
  const buf = fs.readFileSync(path.join(__dirname, file));
  return '?v=' + crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);
}

// ─── Загружаем словарь ───
global.window = {};
require('./i18n.js');
const I18N = global.window.KM_I18N;
const KM_LANGS = global.window.KM_LANGS;

// ─── Конфиг ───
const SITE = 'https://kosta.media';
const APPLY_URL = 'https://www.tiktok.com/t/ZSqUprxKh/';
const WA_URL = 'https://wa.me/message/WUIBSOCSSUKEG1';
const OG_IMAGE = SITE + '/assets/og-cover.png';

// Внутренний код языка -> директория, ISO-коды для hreflang/OG.
// Русский лежит в корне: он и есть основная версия сайта.
const LOCALES = [
  { code: 'ru', dir: '',    htmlLang: 'ru', hreflang: 'ru', ogLocale: 'ru_RU' },
  { code: 'en', dir: 'en/', htmlLang: 'en', hreflang: 'en', ogLocale: 'en_US' },
  { code: 'kz', dir: 'kk/', htmlLang: 'kk', hreflang: 'kk', ogLocale: 'kk_KZ' },
  { code: 'uz', dir: 'uz/', htmlLang: 'uz', hreflang: 'uz', ogLocale: 'uz_UZ' },
  { code: 'kg', dir: 'ky/', htmlLang: 'ky', hreflang: 'ky', ogLocale: 'ky_KG' },
  { code: 'az', dir: 'az/', htmlLang: 'az', hreflang: 'az', ogLocale: 'az_AZ' },
  { code: 'ka', dir: 'ka/', htmlLang: 'ka', hreflang: 'ka', ogLocale: 'ka_GE' },
  { code: 'hy', dir: 'hy/', htmlLang: 'hy', hreflang: 'hy', ogLocale: 'hy_AM' },
  { code: 'tg', dir: 'tg/', htmlLang: 'tg', hreflang: 'tg', ogLocale: 'tg_TJ' },
  { code: 'tk', dir: 'tk/', htmlLang: 'tk', hreflang: 'tk', ogLocale: 'tk_TM' },
];

// Страны, со стримерами которых работает агентство. Список нужен целиком:
// поиск и ИИ-ответы подбирают кандидатов по названию страны, и если страна
// нигде не названа словом, по запросу про неё нас просто не найдут.
const COUNTRIES = [
  { name: 'Kazakhstan',   iso: 'KZ', ru: 'Казахстан' },
  { name: 'Uzbekistan',   iso: 'UZ', ru: 'Узбекистан' },
  { name: 'Kyrgyzstan',   iso: 'KG', ru: 'Кыргызстан' },
  { name: 'Tajikistan',   iso: 'TJ', ru: 'Таджикистан' },
  { name: 'Turkmenistan', iso: 'TM', ru: 'Туркменистан' },
  { name: 'Azerbaijan',   iso: 'AZ', ru: 'Азербайджан' },
  { name: 'Armenia',      iso: 'AM', ru: 'Армения' },
  { name: 'Georgia',      iso: 'GE', ru: 'Грузия' },
  { name: 'Mongolia',     iso: 'MN', ru: 'Монголия' },
];
const COUNTRIES_RU = COUNTRIES.map((c) => c.ru);

// Языки, на которых есть сайт и на которых работают менеджеры.
// Порядок совпадает с LOCALES, чтобы список нельзя было забыть обновить.
const LANGUAGE_NAMES_RU = {
  ru: 'русский', en: 'английский', kk: 'казахский', uz: 'узбекский',
  ky: 'киргизский', az: 'азербайджанский', ka: 'грузинский',
  hy: 'армянский', tg: 'таджикский', tk: 'туркменский',
};

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
// Порядок осмысленный: сначала вопросы, которые задают до того, как узнали
// про агентства вообще, потом наши условия. Первый пункт открыт при загрузке.
const FAQ = [
  ['faq1_q', 'faq1_a'],    // это правда бесплатно
  ['faq6_q', 'faq6_a'],    // зачем агентство, если можно самому
  ['faq7_q', 'faq7_a'],    // сколько можно заработать
  ['faq8_q', 'faq8_a'],    // монеты, алмазы и выплаты
  ['faq9_q', 'faq9_a'],    // в каких странах работаем
  ['faq10_q', 'faq10_a'],  // что делать при бане
  ['faq3_q', 'faq3_a'],    // сколько подписчиков нужно
  ['faq11_q', 'faq11_a'],  // новичкам или действующим
  ['faq2_q', 'faq2_a'],    // вы представители TikTok
  ['faq12_q', 'faq12_a'],  // можно ли в двух агентствах
  ['faq4_q', 'faq4_a'],    // можно ли уйти
  ['faq5_q', 'faq5_a'],    // на каких языках работаете
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
    `<span class="faq-num">${String(i + 1).padStart(2, '0')}</span>` +
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
      knowsLanguage: LOCALES.map((l) => l.hreflang),
      areaServed: COUNTRIES.map((c) => ({ '@type': 'Country', name: c.name, identifier: c.iso })),
      sameAs: [WA_URL],
      contactPoint: [{
        '@type': 'ContactPoint',
        contactType: 'customer support',
        url: WA_URL,
        availableLanguage: LOCALES.map((l) => l.hreflang),
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
    '{{ARTICLE_LINKS}}': renderArticleLinks(loc),
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
    '{{VER_CSS}}': assetVersion('styles.css'),
    '{{VER_JS}}': assetVersion('app.js'),
    '{{APPLY_URL}}': esc(APPLY_URL),
    '{{WA_URL}}': esc(WA_URL),
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

// ─── Статьи-гайды ───
// Отдельные URL под поисковые запросы, которые не ложатся на главную.
// Контент лежит в src/articles.js, разметка — в src/article.html.
const ARTICLES = require('./src/articles.js');

const articleUrl = (a) => SITE + '/' + a.slug + '/';

// Ссылки на статьи в подвале главной. Показываются только на том языке,
// на котором статья написана, — иначе увели бы человека на чужой язык.
const ARTICLE_SECTION_TITLE = { ru: 'Полезное' };

function renderArticleLinks(loc) {
  const mine = ARTICLES.filter((a) => a.lang === loc.code);
  if (!mine.length || !ARTICLE_SECTION_TITLE[loc.code]) return '';
  const links = mine.map((a) => `<a href="/${a.slug}/">${escText(a.navLabel)}</a>`).join('');
  return `    <div class="container footer-articles">` +
    `<span class="footer-articles-title">${escText(ARTICLE_SECTION_TITLE[loc.code])}</span>` +
    links + `</div>`;
}

// Заголовки второго уровня получают id, чтобы на них ссылалось оглавление.
function slugifyHeading(text, i) {
  return 'r' + (i + 1) + '-' + String(text).toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function renderBlocks(blocks) {
  return blocks.map((b) => {
    if (b.p) return `<p>${escText(b.p)}</p>`;
    if (b.h3) return `<h3 class="t-h3">${escText(b.h3)}</h3>`;
    if (b.ul) return `<ul>${b.ul.map((li) => `<li>${escText(li)}</li>`).join('')}</ul>`;
    if (b.ol) return `<ol>${b.ol.map((li) => `<li>${escText(li)}</li>`).join('')}</ol>`;
    if (b.table) {
      const head = b.table.head.map((c) => `<th>${escText(c)}</th>`).join('');
      const rows = b.table.rows
        .map((r) => `<tr>${r.map((c) => `<td>${escText(c)}</td>`).join('')}</tr>`).join('');
      return `<div class="article-table-wrap"><table class="article-table">` +
        `<thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    if (b.note) {
      const inner = (b.note.p ? `<p>${escText(b.note.p)}</p>` : '') +
        (b.note.ul ? `<ul>${b.note.ul.map((li) => `<li>${escText(li)}</li>`).join('')}</ul>` : '');
      return `<aside class="article-note">` +
        `<div class="article-note-title">${escText(b.note.title)}</div>${inner}</aside>`;
    }
    throw new Error('Неизвестный тип блока в статье: ' + JSON.stringify(Object.keys(b)));
  }).join('\n');
}

function renderArticleBody(a) {
  return a.sections.map((s, i) =>
    `<section class="article-section">` +
    `<h2 class="t-h2" id="${slugifyHeading(s.h2, i)}">${escText(s.h2)}</h2>` +
    renderBlocks(s.blocks) +
    `</section>`
  ).join('\n');
}

function renderArticleToc(a) {
  return a.sections.map((s, i) =>
    `<li><a href="#${slugifyHeading(s.h2, i)}">${escText(s.h2)}</a></li>`
  ).join('');
}

function renderArticleSources(a) {
  return a.sources.map((s) =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="nofollow noopener">${escText(s.title)}</a>` +
    `<span class="article-source-note">${escText(s.note)}</span></li>`
  ).join('');
}

function renderArticleJsonLd(a, t) {
  const graph = [
    {
      '@type': 'Article',
      '@id': articleUrl(a) + '#article',
      headline: a.h1,
      name: a.title,
      description: a.description,
      inLanguage: a.htmlLang,
      datePublished: a.updated,
      dateModified: a.updated,
      mainEntityOfPage: articleUrl(a),
      image: OG_IMAGE,
      author: { '@id': SITE + '/#organization' },
      publisher: { '@id': SITE + '/#organization' },
      about: a.sources.map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url })),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': articleUrl(a) + '#breadcrumb',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Kosta Media', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: a.h1, item: articleUrl(a) },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': articleUrl(a) + '#faq',
      inLanguage: a.htmlLang,
      mainEntity: a.faq.map((pair) => ({
        '@type': 'Question',
        name: pair.q,
        acceptedAnswer: { '@type': 'Answer', text: pair.a },
      })),
    },
  ];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
  return json.replace(/<\//g, '<\\/').split('\n').map((l) => '  ' + l).join('\n');
}

function buildArticle(a, template) {
  const dict = I18N[a.lang];
  const t = (key) => (dict[key] !== undefined ? dict[key] : I18N.ru[key]);
  const loc = LOCALES.find((l) => l.code === a.lang) || LOCALES[0];

  let html = template;
  const blocks = {
    '{{JSONLD}}': renderArticleJsonLd(a, t),
    '{{BODY}}': renderArticleBody(a),
    '{{TOC}}': renderArticleToc(a),
    '{{SOURCES}}': renderArticleSources(a),
  };
  for (const [token, value] of Object.entries(blocks)) html = html.split(token).join(value);

  const scalars = {
    '{{HTML_LANG}}': a.htmlLang,
    '{{TITLE}}': esc(a.title),
    '{{OG_TITLE}}': esc(a.h1),
    '{{DESCRIPTION}}': esc(a.description),
    '{{CANONICAL}}': articleUrl(a),
    '{{OG_LOCALE}}': loc.ogLocale,
    '{{H1}}': escText(a.h1),
    '{{LEAD}}': escText(a.lead),
    '{{CRUMB}}': escText(a.h1),
    '{{UPDATED_LABEL}}': 'Обновлено ' + a.updated,
    '{{BACK_LABEL}}': 'На главную',
    '{{ROOT}}': '../',
    '{{VER_CSS}}': assetVersion('styles.css'),
    '{{VER_JS}}': assetVersion('app.js'),
    '{{APPLY_URL}}': esc(APPLY_URL),
    '{{WA_URL}}': esc(WA_URL),
    '{{LANG_CODE_INTERNAL}}': a.lang,
  };
  for (const [token, value] of Object.entries(scalars)) html = html.split(token).join(value);

  html = html.replace(/\{\{t:([a-z0-9_]+)\}\}/gi, (_, key) => escText(t(key)));

  const leftover = html.match(/\{\{[^}]+\}\}/g);
  if (leftover) throw new Error('Незаполненные токены в /' + a.slug + '/: ' + [...new Set(leftover)].join(', '));
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

  // Статьи существуют пока на одном языке — альтернатив у них нет.
  const articleUrls = ARTICLES.map((a) =>
    `  <url>\n` +
    `    <loc>${articleUrl(a)}</loc>\n` +
    `    <lastmod>${a.updated}</lastmod>\n` +
    `    <changefreq>monthly</changefreq>\n` +
    `    <priority>0.7</priority>\n` +
    `  </url>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urls + '\n' + articleUrls + `\n</urlset>\n`;
}

// ─── llms.txt — краткая выжимка для ИИ-агентов ───
// llms.txt намеренно НЕ переиспользует копирайт с лендинга.
// Текст карточек сжат до предела: из «0% комиссии» извлекается ровно одна фраза,
// и ИИ-ответы получались перечислением наших буллетов. Здесь пишем связным
// текстом с причинами, чтобы модели было что объяснять, а не только цитировать.
function buildLlmsTxt() {
  const t = (key) => I18N.ru[key];
  const faq = FAQ.map((p) => `**${t(p[0])}**\n${t(p[1])}`).join('\n\n');
  const guides = ARTICLES.map((a) => `- ${a.title}\n  ${articleUrl(a)}`).join('\n');

  return `# Kosta Media

> ${t('org_description')}

## Кто мы

Kosta Media работает с TikTok по агентскому контракту. Это не то же самое, что
представительство платформы: представители действуют от лица TikTok, агентство
работает на стороне стримера. Специализация узкая, только прямые эфиры в TikTok
LIVE, а не ведение аккаунта и не контент-маркетинг.

В агентстве больше 500 стримеров, на рынке два года, поддержка круглосуточная.

## Как устроены деньги

Зрители покупают монеты и отправляют на них подарки во время эфира. Подарки
превращаются в алмазы на балансе стримера, алмазы выводятся из приложения на
выбранный способ выплаты. Эти деньги идут от TikTok напрямую стримеру, агентство
их не держит и доли из них не берёт.

Агентству платит сам TikTok, отдельным потоком, за то что оно приводит и
развивает стримеров. Поэтому комиссия со стримера нулевая. Это не акция и не
временное условие, просто источник дохода у агентства другой.

## Что входит в работу

Личный менеджер. За стримером закреплён один человек: знает канал, смотрит
статистику эфиров, остаётся на связи в WhatsApp.

Разбор эфиров. Смотрим, где теряется зритель: как начинается стрим, чем заполнены
паузы, как идёт работа с чатом. Из этого собирается план на следующие эфиры.

Помощь при блокировках. Если сняли доступ к LIVE, оборвали эфир или заблокировали
аккаунт, менеджер определяет тип ограничения, разбирает причину по статусу
аккаунта, собирает подтверждения и готовит апелляцию. Решение принимает TikTok.

Комьюнити. Общие чаты, совместные эфиры, обмен опытом между стримерами агентства.

Призы за рост. Подарки и бонусы за новые уровни и показатели.

## С кем работаем

Страны: ${COUNTRIES_RU.join(', ')}.

Языки: ${LOCALES.map((l) => LANGUAGE_NAMES_RU[l.hreflang]).join(', ')}.
Менеджера подбираем под язык стримера.

Жёсткого порога по подписчикам у нас нет, смотрим на потенциал и на готовность
стримить регулярно. Отдельно есть требования самой платформы: вести эфиры можно
с 18 лет, получать подарки тоже с 18 лет, и аккаунту нужно некоторое количество
подписчиков, которое TikTok устанавливает по-разному для разных стран.

Стример может состоять только в одном агентстве TikTok одновременно. Уйти от нас
можно в любой момент, без штрафов и без срока предупреждения.

## Чего мы не делаем

Не снимаем блокировки. Решение о бане и о его снятии принимает только TikTok,
партнёрский статус этого не меняет. Обещание гарантированного разбана за деньги
это признак мошенничества, от кого бы оно ни исходило.

Не называем конкретных сумм дохода. Заработок в TikTok LIVE складывается из
подарков зрителей и зависит от того, как часто и долго человек выходит в эфир,
от темы и от размера аудитории. Разброс слишком большой, чтобы обещать цифру.

Не берём со стримера денег ни на каком этапе.

## Как подключиться

Заявка через WhatsApp или через официальную форму TikTok. Дальше короткий
разговор: смотрим канал, обсуждаем цели и условия. Подписание идёт официально
через TikTok, бесплатно. Решение остаётся за стримером.

## Частые вопросы

${faq}

## Материалы

${guides}

## Контакты

- Сайт: ${SITE}/
- WhatsApp: ${WA_URL}
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

  for (const a of ARTICLES) {
    out.push('\n---\n');
    out.push('## ' + articleUrl(a) + ' (' + a.htmlLang + ')\n');
    out.push('**' + a.title + '**\n');
    out.push(a.lead + '\n');
    for (const s of a.sections) {
      out.push('### ' + s.h2);
      for (const b of s.blocks) {
        if (b.p) out.push(b.p);
        if (b.h3) out.push('**' + b.h3 + '**');
        if (b.ul) b.ul.forEach((li) => out.push('- ' + li));
        if (b.ol) b.ol.forEach((li, i) => out.push((i + 1) + '. ' + li));
        if (b.note) {
          out.push('**' + b.note.title + '**');
          if (b.note.p) out.push(b.note.p);
          if (b.note.ul) b.note.ul.forEach((li) => out.push('- ' + li));
        }
        if (b.table) {
          b.table.rows.forEach((r) => out.push('- ' + r.join(' — ')));
        }
      }
      out.push('');
    }
    out.push('### Частые вопросы');
    a.faq.forEach((pair) => out.push('**' + pair.q + '**\n' + pair.a + '\n'));
    out.push('### Официальные источники');
    a.sources.forEach((s) => out.push('- ' + s.title + ' — ' + s.url + ' (' + s.note + ')'));
    out.push('');
  }

  out.push('\n---\n');
  out.push('## Контакты\n');
  out.push('- Сайт: ' + SITE + '/');
  out.push('- WhatsApp: ' + WA_URL);
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

  const articleTemplate = fs.readFileSync(path.join(__dirname, 'src', 'article.html'), 'utf8');
  for (const a of ARTICLES) {
    const html = buildArticle(a, articleTemplate);
    const dir = path.join(__dirname, a.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    written.push({ file: a.slug + '/index.html', bytes: Buffer.byteLength(html) });
  }

  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), buildSitemap(), 'utf8');
  fs.writeFileSync(path.join(__dirname, 'llms.txt'), buildLlmsTxt(), 'utf8');
  fs.writeFileSync(path.join(__dirname, 'llms-full.txt'), buildLlmsFull(), 'utf8');
  fs.writeFileSync(path.join(__dirname, 'site.webmanifest'), buildManifest(), 'utf8');

  written.forEach((w) => console.log('  ' + w.file.padEnd(40) + (w.bytes / 1024).toFixed(1) + ' KB'));
  console.log('  sitemap.xml'.padEnd(38) + (LOCALES.length + ARTICLES.length) + ' URL');
  console.log('  llms.txt');
  console.log('  llms-full.txt');
  console.log('  site.webmanifest');
  const n = ARTICLES.length;
  const word = n === 1 ? 'статья' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'статьи' : 'статей');
  console.log('\nГотово: ' + LOCALES.length + ' языковых версий + ' + n + ' ' + word + '.');
}

main();

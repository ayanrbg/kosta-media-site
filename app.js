// Kosta Media — Production JS
// Handles: i18n, reveal-on-scroll, counters, FAQ accordion, nav scroll, sticky CTA, mobile menu

(function () {
  'use strict';

  // ─── Config ───
  const WA_LINK = 'https://wa.me/message/WUIBSOCSSUKEG1';
  const TG_USERNAME = 'kosta_tiktok';

  const PREFILL = {
    ru: 'Здравствуйте! Хочу вступить в агентство Kosta Media. Мой TikTok: @',
    en: 'Hi! I want to join Kosta Media agency. My TikTok: @',
    uz: "Salom! Kosta Media agentligiga qo'shilmoqchiman. TikTok: @",
    kz: 'Сәлеметсіз бе! Kosta Media агенттігіне қосылғым келеді. TikTok: @',
    kg: 'Салам! Kosta Media агенттигине кошулгум келет. TikTok: @',
  };

  let currentLang = window.KM_DETECT();

  // ─── i18n rendering ───
  function t(key) {
    return (window.KM_I18N[currentLang] || window.KM_I18N.ru)[key] || key;
  }

  function getWaLink() {
    return WA_LINK;
  }

  function getTgLink() {
    return 'https://t.me/' + TG_USERNAME;
  }

  function setLang(code) {
    currentLang = code;
    try { localStorage.setItem('km_lang', code); } catch (e) { }
    var htmlLang = code === 'kz' ? 'kk' : (code === 'kg' ? 'ky' : code);
    document.documentElement.lang = htmlLang;
    renderAll();
  }

  function renderAll() {
    var waLink = getWaLink();
    var tgLink = getTgLink();

    // Lang dropdown current label
    var currentCodeEl = document.getElementById('lang-current-code');
    if (currentCodeEl) {
      var langInfo = window.KM_LANGS.find(function (l) { return l.code === currentLang; });
      currentCodeEl.textContent = langInfo ? langInfo.label : currentLang.toUpperCase();
    }

    // Lang popup options
    renderLangPopup();

    // All [data-i18n] elements
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.dataset.i18n);
    });

    // Hero title (special: two lines, second line is gradient)
    var heroTitle = document.getElementById('hero-title');
    if (heroTitle) {
      var parts = t('hero_title').split('|');
      var br = function(s) { return s.replace(/\n/g, '<br>'); };
      var logo = function(s) { return s.replace(/TikTok/g, '<span class="tiktok-logo">TikTok</span>'); };
      heroTitle.innerHTML = '<span>' + logo(br(parts[0])) + '</span>' +
        (parts[1] ? '<br><span class="gradient-text">' + br(parts[1].trim()) + '</span>' : '');
    }

    // Hero free line
    var heroFree = document.getElementById('hero-free');
    if (heroFree) {
      var parts = t('hero_free').split('·');
      heroFree.innerHTML = '<span class="accent">0%</span> <span>·</span> <span>' +
        (parts.slice(1).join('·').trim() || 'free') + '</span>' +
        ' <span>·</span> <span class="note">' + t('badge_note') + '</span>';
    }

    // Phone mockup label
    var phoneLabel = document.getElementById('phone-counter-label');
    if (phoneLabel) phoneLabel.textContent = t('perk1_t').toUpperCase();

    // Marquee
    renderMarquee();

    // Links
    document.querySelectorAll('[data-wa-link]').forEach(function (a) { a.href = waLink; });
    document.querySelectorAll('[data-tg-link]').forEach(function (a) { a.href = tgLink; });

    // Perks
    var perks = [
      { icon: '🎁', tKey: 'perk1_t', dKey: 'perk1_d', accent: 'var(--pink)', span: 1 },
      { icon: '0%', tKey: 'perk5_t', dKey: 'perk5_d', accent: 'var(--cyan)', span: 2, big: true },
      { icon: '🛡', tKey: 'perk3_t', dKey: 'perk3_d', accent: 'var(--orange)', span: 1 },
      { icon: '👥', tKey: 'perk2_t', dKey: 'perk2_d', accent: 'var(--pink)', span: 1 },
      { icon: '🏆', tKey: 'perk4_t', dKey: 'perk4_d', accent: 'var(--yellow)', span: 1 },
      { icon: '💬', tKey: 'perk6_t', dKey: 'perk6_d', accent: 'var(--cyan)', span: 1 },
    ];
    var perksGrid = document.getElementById('perks-grid');
    if (perksGrid) {
      perksGrid.innerHTML = '';
      perks.forEach(function (p, i) {
        var div = document.createElement('div');
        div.className = 'card perk-card reveal' + (p.span === 2 ? ' span-2' : '');
        div.style.transitionDelay = (i * 80) + 'ms';
        div.innerHTML =
          '<div class="perk-accent-line" style="background:' + p.accent + '"></div>' +
          '<div class="perk-icon' + (p.big ? ' big' : '') + '" style="color:' + p.accent +
          ';text-shadow:0 0 30px ' + p.accent + '80">' + p.icon + '</div>' +
          '<h3 class="t-h3" style="margin:0 0 10px">' + t(p.tKey) + '</h3>' +
          '<p class="t-body" style="margin:0;font-size:14px">' + t(p.dKey) + '</p>';
        perksGrid.appendChild(div);
      });
      observeReveals(perksGrid);
    }

    // How steps
    var howSteps = [
      { tKey: 'how1_t', dKey: 'how1_d', c: 'var(--cyan)' },
      { tKey: 'how2_t', dKey: 'how2_d', c: 'var(--pink)' },
      { tKey: 'how3_t', dKey: 'how3_d', c: 'var(--orange)' },
      { tKey: 'how4_t', dKey: 'how4_d', c: 'var(--yellow)' },
    ];
    var howGrid = document.getElementById('how-grid');
    if (howGrid) {
      howGrid.innerHTML = '';
      howSteps.forEach(function (s, i) {
        var div = document.createElement('div');
        div.className = 'card how-step reveal';
        div.style.transitionDelay = (i * 100) + 'ms';
        div.innerHTML =
          '<div class="how-number" style="border:1px solid ' + s.c + ';color:' + s.c +
          ';box-shadow:0 0 24px ' + s.c + '40">0' + (i + 1) + '</div>' +
          '<div class="how-spacer"></div>' +
          '<h3 class="t-h3" style="margin:0 0 10px">' + t(s.tKey) + '</h3>' +
          '<p class="t-body" style="margin:0;font-size:14px">' + t(s.dKey) + '</p>';
        howGrid.appendChild(div);
      });
      observeReveals(howGrid);
    }

    // Prizes
    var tiers = [
      { labelKey: 'prizes_tier2', glyph: '🚀', accent: 'var(--pink)' },
      { labelKey: 'prizes_tier3', glyph: '💎', accent: 'var(--orange)' },
      { labelKey: 'prizes_tier4', glyph: '👑', accent: 'var(--yellow)' },
    ];
    var prizesGrid = document.getElementById('prizes-grid');
    if (prizesGrid) {
      prizesGrid.innerHTML = '';
      tiers.forEach(function (tier, i) {
        var div = document.createElement('div');
        div.className = 'card prize-card reveal';
        div.style.transitionDelay = (i * 80) + 'ms';
        div.style.background = 'linear-gradient(180deg, ' + tier.accent + '10, transparent 60%)';
        div.innerHTML =
          '<div class="prize-glyph" style="filter:drop-shadow(0 0 24px ' + tier.accent + ')">' + tier.glyph + '</div>' +
          '<div class="t-mono" style="color:' + tier.accent + ';margin-bottom:8px">TIER ' + (i + 1) + '</div>' +
          '<h3 class="t-h3" style="margin:0 0 12px">' + t(tier.labelKey) + '</h3>' +
          '<div class="prize-tier">🎁 ' + t('prizes_label') + '</div>';
        prizesGrid.appendChild(div);
      });
      observeReveals(prizesGrid);
    }

    // Proof quotes
    var quotes = [
      { qKey: 'proof_q1', name: '@maria_live', role: '124k', accent: 'var(--cyan)' },
      { qKey: 'proof_q2', name: '@aibek', role: '38k', accent: 'var(--pink)' },
      { qKey: 'proof_q3', name: '@nargiza', role: '92k', accent: 'var(--orange)' },
    ];
    var quotesGrid = document.getElementById('quotes-grid');
    if (quotesGrid) {
      quotesGrid.innerHTML = '';
      quotes.forEach(function (q, i) {
        var div = document.createElement('div');
        div.className = 'card reveal';
        div.style.transitionDelay = (i * 100) + 'ms';
        div.innerHTML =
          '<div class="quote-mark" style="color:' + q.accent + '">"</div>' +
          '<p class="quote-text">' + t(q.qKey) + '</p>' +
          '<div class="quote-author">' +
          '<div class="quote-avatar" style="background:linear-gradient(135deg,' + q.accent + ',' + q.accent + '80)"></div>' +
          '<div><div class="quote-name">' + q.name + '</div>' +
          '<div class="quote-role">' + q.role + ' followers</div></div></div>';
        quotesGrid.appendChild(div);
      });
      observeReveals(quotesGrid);
    }

    // Stat labels
    document.querySelectorAll('[data-stat-label]').forEach(function (el) {
      var key = el.dataset.statLabel;
      if (key === 'streamers') el.textContent = t('proof_streamers').split(' ').slice(1).join(' ');
      else if (key === 'years') el.textContent = t('proof_years').split(' ').slice(1).join(' ');
      else if (key === 'commission') el.textContent = t('perk5_t');
      else if (key === 'support') el.textContent = (t('proof_support').split(' ').slice(1).join(' ') || 'support');
    });

    // FAQ
    renderFAQ();
  }

  // ─── Marquee ───
  function renderMarquee() {
    var tickerEl = document.getElementById('ticker');
    if (!tickerEl) return;
    var items = [
      t('proof_streamers'), '·',
      t('proof_years'), '·',
      '0% ' + t('perk5_t'), '·',
      t('proof_support'), '·',
      'TikTok Live', '·',
      'CCA region', '·',
    ];
    // Repeat 4x for seamless loop
    var repeated = items.concat(items, items, items);
    tickerEl.innerHTML = '';
    repeated.forEach(function (item) {
      var span = document.createElement('span');
      span.style.fontFamily = 'Unbounded';
      span.style.fontSize = '18px';
      span.style.fontWeight = '600';
      span.style.letterSpacing = '-0.01em';
      span.style.color = item === '·' ? 'var(--cyan)' : 'var(--ink-2)';
      span.textContent = item;
      tickerEl.appendChild(span);
    });
  }

  // ─── FAQ ───
  var faqOpen = 0;
  function renderFAQ() {
    var faqList = document.getElementById('faq-list');
    if (!faqList) return;
    var items = [
      ['faq1_q', 'faq1_a'],
      ['faq2_q', 'faq2_a'],
      ['faq3_q', 'faq3_a'],
      ['faq4_q', 'faq4_a'],
      ['faq5_q', 'faq5_a'],
    ];
    faqList.innerHTML = '';
    items.forEach(function (pair, i) {
      var btn = document.createElement('button');
      btn.className = 'faq-item reveal' + (faqOpen === i ? ' open' : '');
      btn.style.transitionDelay = (i * 60) + 'ms';
      btn.innerHTML =
        '<span class="faq-num">0' + (i + 1) + '</span>' +
        '<span class="faq-content">' +
        '<span class="faq-question">' + t(pair[0]) + '</span>' +
        '<span class="faq-answer">' + t(pair[1]) + '</span>' +
        '</span>' +
        '<span class="faq-toggle">+</span>';
      btn.addEventListener('click', function () {
        faqOpen = faqOpen === i ? -1 : i;
        renderFAQ();
      });
      faqList.appendChild(btn);
    });
    observeReveals(faqList);
  }

  // ─── Animated counters ───
  function initCounters() {
    document.querySelectorAll('[data-counter]').forEach(function (el) {
      if (el.dataset.counted) return;
      var to = parseInt(el.dataset.counter, 10);
      var suffix = el.dataset.suffix || '';
      var duration = 2000;

      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !el.dataset.counted) {
            el.dataset.counted = '1';
            var start = performance.now();
            function tick(now) {
              var progress = Math.min(1, (now - start) / duration);
              var eased = 1 - Math.pow(1 - progress, 3);
              el.textContent = Math.round(eased * to).toLocaleString('ru-RU') + suffix;
              if (progress < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
            obs.unobserve(el);
          }
        });
      }, { threshold: 0.4 });
      obs.observe(el);
    });
  }

  // ─── Reveal on scroll ───
  function observeReveals(root) {
    var elements = (root || document).querySelectorAll('.reveal:not(.in)');
    elements.forEach(function (el) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var delay = parseInt(el.style.transitionDelay, 10) || 0;
            setTimeout(function () { el.classList.add('in'); }, delay);
            obs.unobserve(el);
          }
        });
      }, { threshold: 0.15 });
      obs.observe(el);
    });
  }

  // ─── Nav scroll state ───
  function initNavScroll() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    });
  }

  // ─── Mobile menu ───
  function initMobileMenu() {
    var btn = document.getElementById('menu-btn');
    var menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function () {
      var isOpen = menu.classList.toggle('open');
      btn.textContent = isOpen ? '×' : '≡';
    });
    menu.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open');
        btn.textContent = '≡';
      });
    });
  }

  // ─── Sticky CTA ───
  function initStickyCTA() {
    var sticky = document.querySelector('.sticky-cta');
    if (!sticky) return;
    window.addEventListener('scroll', function () {
      sticky.classList.toggle('visible', window.scrollY > 600);
    });
  }

  // ─── Lang dropdown ───
  function renderLangPopup() {
    var popup = document.getElementById('lang-popup');
    if (!popup) return;
    popup.innerHTML = '';
    window.KM_LANGS.forEach(function (lang) {
      var btn = document.createElement('button');
      btn.className = 'lang-option' + (lang.code === currentLang ? ' active' : '');
      btn.innerHTML = '<span class="lang-option-code">' + lang.label + '</span>' +
        '<span class="lang-option-name">' + lang.name + '</span>';
      btn.addEventListener('click', function () {
        setLang(lang.code);
        closeLangDropdown();
      });
      popup.appendChild(btn);
    });
  }

  function closeLangDropdown() {
    var dropdown = document.getElementById('lang-dropdown');
    var toggle = document.getElementById('lang-current');
    if (dropdown) dropdown.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function initLangSwitch() {
    var dropdown = document.getElementById('lang-dropdown');
    var toggle = document.getElementById('lang-current');
    if (!dropdown || !toggle) return;

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = dropdown.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', function (e) {
      if (!dropdown.contains(e.target)) {
        closeLangDropdown();
      }
    });
  }

  // ─── Init ───
  document.addEventListener('DOMContentLoaded', function () {
    initLangSwitch();
    initNavScroll();
    initMobileMenu();
    initStickyCTA();
    setLang(currentLang); // initial render
    initCounters();
    observeReveals();
  });
})();

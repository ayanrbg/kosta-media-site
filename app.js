// Kosta Media — Production JS
//
// Весь текст страницы теперь рендерится статически на этапе сборки (build.js),
// поэтому здесь остаётся только поведение: аккордеон FAQ, счётчики, появление
// блоков при скролле, меню, sticky CTA, переключатель языка и deep-link'и
// для встроенных браузеров TikTok/Instagram.

(function () {
  'use strict';

  var TG_USERNAME = 'kosta_tiktok';
  var APPLY_URL = 'https://www.tiktok.com/tcn/scout_creators?use_spark=1&agency_scout_source=qr_code_leads&ShareLinkID=7636055606712926216';

  // ─── Язык: страница объявляет его сама ───
  var currentLang = window.KM_LANG || 'ru';
  var isRoot = window.KM_IS_ROOT === true;

  function savedLang() {
    try { return localStorage.getItem('km_lang'); } catch (e) { return null; }
  }

  // Если посетитель раньше сам выбрал язык — уважаем выбор и на корне.
  // Намеренно не определяем язык по navigator: у краулеров нет localStorage,
  // поэтому бот всегда получает корневую (русскую) версию без редиректов.
  var LANG_DIRS = { ru: '', en: 'en/', kz: 'kk/', uz: 'uz/', kg: 'ky/' };
  if (isRoot) {
    var pref = savedLang();
    if (pref && LANG_DIRS[pref] !== undefined && pref !== 'ru') {
      window.location.replace('/' + LANG_DIRS[pref]);
      return;
    }
  }

  // ─── Аналитика ───
  // Отправляем одно событие cta_click со свойствами вместо отдельного события
  // на каждую кнопку: в Zaraz тогда нужно настроить один триггер, а не пять.
  // Приёмник определяется автоматически — Zaraz, gtag или dataLayer.
  function track(name, props) {
    try {
      var data = props || {};
      data.lang = currentLang;
      if (window.zaraz && typeof window.zaraz.track === 'function') {
        window.zaraz.track(name, data);
      } else if (typeof window.gtag === 'function') {
        window.gtag('event', name, data);
      } else {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(Object.assign({ event: name }, data));
      }
    } catch (e) { /* аналитика не должна ломать страницу */ }
  }

  // Откуда именно нажали — определяем по месту кнопки в разметке,
  // чтобы не засорять шаблон атрибутами.
  function placeOf(el) {
    if (!el || !el.closest) return 'other';
    if (el.closest('.sticky-cta')) return 'sticky';
    if (el.closest('.mobile-menu')) return 'menu';
    if (el.closest('.nav')) return 'nav';
    if (el.closest('#hero')) return 'hero';
    if (el.closest('.final-cta-card')) return 'cta';
    return 'other';
  }

  // ─── Deep links для in-app браузеров ───
  function handleDeepLink(e, androidIntent, iosUrl, fallbackUrl) {
    var ua = navigator.userAgent || navigator.vendor || window.opera;
    var isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    var isAndroid = /Android/.test(ua);
    var isInApp = /Instagram|FBAV|FBAN|TikTok|Bytedance|trill|Snapchat|Line|Viber|Telegram|wv/i.test(ua);

    if (!isInApp) return; // обычный браузер откроет ссылку сам

    e.preventDefault();
    if (isAndroid && androidIntent) {
      window.location.href = androidIntent;
      setTimeout(function () { window.location.href = fallbackUrl; }, 1500);
    } else if (isIOS && iosUrl) {
      window.location.href = iosUrl;
      setTimeout(function () { window.location.href = fallbackUrl; }, 1500);
    } else {
      window.location.href = fallbackUrl;
    }
  }

  function initDeepLinks() {
    var tiktokEncoded = encodeURIComponent(APPLY_URL);
    var tiktokAndroid = 'intent://webview?url=' + tiktokEncoded +
      '#Intent;package=com.zhiliaoapp.musically;scheme=snssdk1233;end;';
    var tiktokIOS = 'snssdk1233://webview?url=' + tiktokEncoded;

    var tgFallback = 'https://t.me/' + TG_USERNAME;
    var tgAndroid = 'intent://resolve?domain=' + TG_USERNAME +
      '#Intent;package=org.telegram.messenger;scheme=tg;end;';
    var tgIOS = 'tg://resolve?domain=' + TG_USERNAME;

    document.querySelectorAll('[data-apply-link]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        track('cta_click', { action: 'apply', place: placeOf(a) });
        handleDeepLink(e, tiktokAndroid, tiktokIOS, APPLY_URL);
      });
    });

    document.querySelectorAll('[data-tg-link]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        track('cta_click', { action: 'telegram', place: placeOf(a) });
        handleDeepLink(e, tgAndroid, tgIOS, tgFallback);
      });
    });

    // WhatsApp открывается в новой вкладке и deep-link ему не нужен —
    // здесь только отметка о клике.
    document.querySelectorAll('[data-wa-link]').forEach(function (a) {
      a.addEventListener('click', function () {
        track('cta_click', { action: 'whatsapp', place: placeOf(a) });
      });
    });
  }

  // ─── FAQ аккордеон (разметка уже в HTML) ───
  function initFAQ() {
    var items = document.querySelectorAll('.faq-item');
    items.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        var wasOpen = btn.classList.contains('open');
        items.forEach(function (o) { o.classList.remove('open'); });
        if (!wasOpen) {
          btn.classList.add('open');
          // Какие вопросы открывают — видно, что людей на самом деле волнует.
          var q = btn.querySelector('.faq-question');
          track('faq_open', { number: i + 1, question: q ? q.textContent : '' });
        }
      });
    });
  }

  // ─── Анимированные счётчики ───
  function initCounters() {
    document.querySelectorAll('[data-counter]').forEach(function (el) {
      var to = parseInt(el.dataset.counter, 10);
      var suffix = el.dataset.suffix || '';
      var duration = 2000;

      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || el.dataset.counted) return;
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
        });
      }, { threshold: 0.4 });
      obs.observe(el);
    });
  }

  // ─── Появление при скролле ───
  function observeReveals() {
    document.querySelectorAll('.reveal:not(.in)').forEach(function (el) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var delay = parseInt(el.style.transitionDelay, 10) || 0;
          setTimeout(function () { el.classList.add('in'); }, delay);
          obs.unobserve(el);
        });
      }, { threshold: 0.15 });
      obs.observe(el);
    });
  }

  // ─── Состояние навигации при скролле ───
  function initNavScroll() {
    var nav = document.querySelector('.nav');
    var sticky = document.querySelector('.sticky-cta');
    if (!nav && !sticky) return;
    window.addEventListener('scroll', function () {
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
      if (sticky) sticky.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });
  }

  // ─── Мобильное меню ───
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

  // ─── Переключатель языка ───
  // Пункты — обычные ссылки на /en/, /kk/ и т.д., чтобы их видели краулеры.
  // JS только открывает список и запоминает выбор.
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
        dropdown.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        dropdown.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.querySelectorAll('[data-lang]').forEach(function (a) {
      a.addEventListener('click', function () {
        try { localStorage.setItem('km_lang', a.dataset.lang); } catch (err) { }
        track('lang_switch', { to: a.dataset.lang });
      });
    });
  }

  // ─── Init ───
  function init() {
    // Язык намеренно НЕ запоминаем при обычном заходе на языковую страницу:
    // иначе переход по чужой ссылке на /uz/ навсегда переключил бы человеку
    // корень сайта. Запись делает только явный клик по переключателю.
    initLangSwitch();
    initNavScroll();
    initMobileMenu();
    initDeepLinks();
    initFAQ();
    initCounters();
    observeReveals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

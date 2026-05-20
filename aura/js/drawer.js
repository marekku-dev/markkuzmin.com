// drawer.js — боковое оглавление (drawer / TOC panel).
// Поддерживает три режима:
//   mobile  (< 768px)  — overlay поверх всей страницы, класс mobile-open
//   tablet  (768–1279px) — tablet-overlay, класс tablet-open
//   desktop (≥ 1280px) — panel.style.display toggle (только там, где нет постоянной панели)
//
// Navbar и contents подгружаются асинхронно, поэтому ждём aura:navbar-ready.

(function () {
  var MOBILE_MAX  = 768;
  var TABLET_MAX  = 1280;

  function isMobile()  { return window.innerWidth <  MOBILE_MAX; }
  function isTablet()  { return window.innerWidth >= MOBILE_MAX && window.innerWidth < TABLET_MAX; }

  function init() {
    var toggle   = document.getElementById('toc-collapse');
    var contents = document.getElementById('contents-panel');
    var overlay  = document.getElementById('mobile-overlay');
    if (!toggle || !contents) return;

    // Планшетный overlay создаём один раз и добавляем в body
    var tabletOverlay = document.querySelector('.tablet-overlay');
    if (!tabletOverlay) {
      tabletOverlay = document.createElement('div');
      tabletOverlay.className = 'tablet-overlay';
      document.body.appendChild(tabletOverlay);
    }

    // ── Мобильный режим ──────────────────────────────────────────────
    function openMobile() {
      contents.classList.add('mobile-open');
      if (overlay) overlay.classList.add('visible');
      document.body.classList.add('drawer-open');
    }
    function closeMobile() {
      contents.classList.remove('mobile-open');
      if (overlay) overlay.classList.remove('visible');
      document.body.classList.remove('drawer-open');
    }

    // ── Планшетный режим ─────────────────────────────────────────────
    function openTablet()  {
      contents.classList.add('tablet-open');
      tabletOverlay.classList.add('visible');
    }
    function closeTablet() {
      contents.classList.remove('tablet-open');
      tabletOverlay.classList.remove('visible');
    }

    // ── Десктопный режим (toggle display) ───────────────────────────
    function setWidth(w) { document.documentElement.style.setProperty('--contents-width', w); }
    function toggleDesktop() {
      if (contents.style.display === 'none') { contents.style.display = ''; setWidth('280px'); }
      else                                   { contents.style.display = 'none'; setWidth('0px'); }
    }

    // ── Бургер-кнопка ────────────────────────────────────────────────
    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      if (isMobile()) { contents.classList.contains('mobile-open') ? closeMobile() : openMobile(); return; }
      if (isTablet()) { contents.classList.contains('tablet-open') ? closeTablet() : openTablet(); return; }
      toggleDesktop();
    });

    // ── Дополнительная кнопка "открыть" (только на планшете) ─────────
    var contentsToggle = document.getElementById('contents-toggle');
    if (contentsToggle) {
      contentsToggle.addEventListener('click', function () {
        if (isTablet()) openTablet();
      });
    }

    // ── Закрытие через overlay ───────────────────────────────────────
    if (overlay) overlay.addEventListener('click', closeMobile);
    tabletOverlay.addEventListener('click', closeTablet);

    // ── Клик по пункту оглавления — закрываем drawer ─────────────────
    contents.addEventListener('click', function (e) {
      if (!isMobile()) return;
      var target = e.target.closest('li[data-target], a');
      if (target) closeMobile();
    });

    // ── Escape ───────────────────────────────────────────────────────
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeTablet(); closeMobile(); }
    });

    // ── Ресайз ───────────────────────────────────────────────────────
    window.addEventListener('resize', function () {
      if (!isMobile())  closeMobile();
      if (!isTablet()) { closeTablet(); if (contents.style.display !== 'none') setWidth('280px'); }
    });
  }

  window.addEventListener('aura:navbar-ready', init);
  // На случай, если navbar уже подгружен к моменту запуска скрипта
  if (document.getElementById('toc-collapse')) init();
})();

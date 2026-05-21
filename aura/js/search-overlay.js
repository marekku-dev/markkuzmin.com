// search-overlay.js
// Инпут находится в .contents-footer (#search-overlay-input).
// При фокусе открывается оверлей в третьей колонке (.search-overlay).
// Результаты обновляются по мере ввода.
// Закрытие: Esc / ⌘/ / клик мимо оверлея и инпута.

(function () {

  // ── Поисковый индекс ─────────────────────────────────────────────
  // Каждый элемент: { id, title, paragraphs: [string, ...] }
  // Одна секция может дать несколько карточек — по одной на каждый
  // параграф/блок с совпадением.
  var SECTIONS = [];

  function buildIndex() {
    if (SECTIONS.length) return;
    document.querySelectorAll('.text-column[id]').forEach(function (el) {
      var h3 = el.querySelector('h3');
      var title = h3 ? h3.textContent.trim() : '';
      // Собираем текстовые блоки: p, li, blockquote
      var blocks = [];
      el.querySelectorAll('p, li, blockquote p').forEach(function (node) {
        var t = node.textContent.replace(/\s+/g, ' ').trim();
        if (t.length > 20) blocks.push(t);
      });
      SECTIONS.push({ id: el.id, title: title, blocks: blocks });
    });
  }

  // ── Хелперы поиска ───────────────────────────────────────────────
  function escapeRe(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlight(str, query) {
    var re = new RegExp('(' + escapeRe(query) + ')', 'gi');
    return str.replace(re, '<mark>$1</mark>');
  }

  function excerpt(text, query, len) {
    len = len || 180;
    var re = new RegExp(escapeRe(query), 'i');
    var idx = text.search(re);
    if (idx === -1) return text.slice(0, len) + '…';
    var start = Math.max(0, idx - 60);
    var end = Math.min(text.length, start + len);
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  }

  function search(query) {
    if (!query) return [];
    var q = query.trim().toLowerCase();
    var results = [];
    SECTIONS.forEach(function (s) {
      var inTitle = s.title.toLowerCase().includes(q);
      // Находим все блоки с совпадением
      var matchingBlocks = s.blocks.filter(function (b) {
        return b.toLowerCase().includes(q);
      });
      if (inTitle || matchingBlocks.length) {
        if (matchingBlocks.length) {
          // Одна карточка на каждый совпавший блок
          matchingBlocks.forEach(function (block) {
            results.push({
              id: s.id,
              title: highlight(s.title, query),
              excerpt: highlight(excerpt(block, query), query),
              score: inTitle ? 2 : 1
            });
          });
        } else {
          // Совпадение только в заголовке — одна карточка
          results.push({
            id: s.id,
            title: highlight(s.title, query),
            excerpt: '',
            score: 2
          });
        }
      }
    });
    results.sort(function (a, b) { return b.score - a.score; });
    return results;
  }

  // ── DOM ──────────────────────────────────────────────────────────
  // input/clearBtn — десктопные (в drawer); mobileInput/mobileClearBtn —
  // дубль внутри оверлея, нужен потому что на мобиле drawer закрывается
  // при открытии оверлея и десктопный инпут становится недоступен.
  var overlay, input, mobileInput, clearBtn, mobileClearBtn, closeBtn,
      elEmpty, elEmptyTitle, elDemoLabel, elDemo,
      elNoResults, elResults, elCount, elItems, elKbd;

  // Timestamp последнего открытия — нужен, чтобы игнорировать «фантомные»
  // клики, прилетающие сразу после открытия оверлея (см. обработчик
  // демо-карточек и outside-click handler).
  var openedAt = 0;

  function inputs() {
    return [input, mobileInput].filter(Boolean);
  }

  function activeInput() {
    // Mobile input живёт внутри overlay и доступен на мобиле;
    // desktop input — в drawer и нужен на десктопе/таблете.
    if (window.innerWidth <= 768 && mobileInput) return mobileInput;
    return input;
  }

  function syncValue(source) {
    inputs().forEach(function (el) {
      if (el !== source) el.value = source.value;
    });
  }

  function initSearchOverlay() {
    overlay     = document.getElementById('search-overlay');
    input       = document.getElementById('search-overlay-input');
    mobileInput = document.getElementById('search-overlay-input-mobile');
    clearBtn    = document.getElementById('search-overlay-clear');
    mobileClearBtn = document.getElementById('search-overlay-clear-mobile');
    closeBtn    = document.getElementById('search-overlay-close');
    elEmpty      = document.getElementById('so-empty');
    elEmptyTitle = document.getElementById('so-empty-title');
    elDemoLabel  = document.getElementById('so-demo-label');
    elDemo       = document.getElementById('so-demo');
    elNoResults  = document.getElementById('so-no-results');
    elResults   = document.getElementById('so-results');
    elCount     = document.getElementById('so-count');
    elItems     = document.getElementById('so-items');
    elKbd       = document.getElementById('contents-search-kbd');

    if (!overlay || !input) return;

    inputs().forEach(function (el) {
      // ── Тап/клик по инпуту → открыть оверлей ──
      // pointerdown срабатывает раньше focus и click, позволяет preventDefault
      // на мобиле чтобы браузер не генерировал призрачный click после touchend.
      el.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        if (!overlay.classList.contains('is-open')) {
          e.preventDefault();          // отменяем призрачный click на мобиле
          openSearchOverlay();
          // Ставим фокус на правильный инпут — на мобиле drawer
          // закрывается, поэтому фокус должен быть на mobileInput.
          setTimeout(function () {
            var target = activeInput();
            if (target) target.focus();
          }, 50);
        }
      });

      // Любой click по инпуту не должен пузыриться до document — иначе
      // глобальный outside-click handler примет его за «клик мимо».
      el.addEventListener('click', function (e) {
        e.stopPropagation();
      });

      // ── Фокус на инпут → открыть оверлей (десктоп: Tab без клика) ──
      el.addEventListener('focus', function () {
        openSearchOverlay();
      });

      // ── Ввод → синхронизируем оба инпута и запускаем поиск ──
      el.addEventListener('input', function () {
        syncValue(el);
        runSearch();
      });

      // ── Esc внутри инпута ──
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeSearchOverlay();
        }
      });
    });

    // ── Кнопки очистки (десктоп и мобиле) ──
    // На десктопе/планшете: если строка пустая — закрываем оверлей;
    // если есть текст — очищаем и остаёмся.
    function wireClear(btn, srcInput) {
      if (!btn) return;
      btn.addEventListener('click', function () {
        if (window.innerWidth > 768) {
          closeSearchOverlay();
          return;
        }
        srcInput.value = '';
        syncValue(srcInput);
        runSearch();
        srcInput.focus();
      });
    }
    wireClear(clearBtn, input);
    wireClear(mobileClearBtn, mobileInput);

    // ── Крестик в углу оверлея ──
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        closeSearchOverlay();
      });
    }

    // ── Chips (быстрые запросы) ──
    if (elEmpty) {
      elEmpty.querySelectorAll('.sr-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          var q = chip.dataset.query || chip.textContent;
          var target = activeInput();
          if (target) {
            target.value = q;
            syncValue(target);
            runSearch();
            target.focus();
          }
        });
      });
    }

    // ── Demo-карточки — скролл к секции ──
    if (overlay) {
      overlay.querySelectorAll('.sr-card--demo').forEach(function (card) {
        card.addEventListener('click', function (e) {
          // На мобиле тап по инпуту в drawer триггерит pointerdown→open,
          // drawer уезжает, и синтетический click после touchend приземляется
          // уже на демо-карточку под пальцем. Игнорируем такие «фантомные»
          // клики в первые ~400мс после открытия.
          if (Date.now() - openedAt < 400) {
            e.preventDefault();
            return;
          }
          var href = card.getAttribute('href');
          if (href && href !== '#') {
            e.preventDefault();
            closeSearchOverlay();
            setTimeout(function () { scrollToSection(href.replace(/^.*#/, '')); }, 50);
          }
        });
      });
    }

    // ── Глобальные события ──

    // ⌘/ — тоггл
    document.addEventListener('keydown', function (e) {
      var platform = ((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '').toUpperCase();
      var isMac = platform.includes('MAC');
      var modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && e.key === '/') {
        e.preventDefault();
        if (overlay.classList.contains('is-open')) {
          closeSearchOverlay();
        } else {
          var target = activeInput();
          if (target) target.focus(); // откроет через focus-listener
        }
        return;
      }
      // Esc глобально
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
        closeSearchOverlay();
      }
    });

    // Клик мимо — закрыть только на мобиле.
    // На десктопе/планшете оверлей закрывается только через Esc, ⌘/ или крестик.
    document.addEventListener('click', function (e) {
      if (!overlay.classList.contains('is-open')) return;
      if (window.innerWidth > 768) return;
      if (Date.now() - openedAt < 350) return;
      var wrap = document.getElementById('contents-search-wrap');
      if (overlay.contains(e.target)) return;
      if (wrap && wrap.contains(e.target)) return;
      closeSearchOverlay();
    });
  }

  // ── Поиск ────────────────────────────────────────────────────────
  function runSearch() {
    // Берём значение из любого инпута, где оно есть (они синхронизированы).
    var src = activeInput() || input;
    var q = src ? src.value.trim() : '';

    // крестик и ⌘/ взаимоисключают друг друга
    if (clearBtn)       clearBtn.style.display       = q ? 'block' : 'none';
    if (mobileClearBtn) mobileClearBtn.style.display = q ? 'block' : 'none';
    if (elKbd)          elKbd.style.display          = q ? 'none'  : '';

    // заголовок — обновляем только при 3+ символах
    if (elEmptyTitle) {
      elEmptyTitle.textContent = q && q.length >= 3
        ? "Search ‘" + q + "’ across all chapters"
        : "Search across all chapters";
    }

    // демо-карточки видны только при пустом запросе
    if (elDemoLabel) elDemoLabel.style.display = q ? 'none' : '';
    if (elDemo)      elDemo.style.display      = q ? 'none' : '';

    if (!q || q.length < 3) {
      hide(elNoResults);
      hide(elResults);
      return;
    }

    buildIndex();
    var hits = search(q);

    if (!hits.length) {
      var noQ = document.getElementById('so-no-q');
      if (noQ) noQ.textContent = q;
      show(elNoResults);
      hide(elResults);
      return;
    }

    hide(elNoResults);

    elItems.innerHTML = hits.map(function (h) {
      return '<a class="sr-card" href="#' + h.id + '">' +
        '<span class="sr-card__title">' + h.title + '</span>' +
        '<span class="sr-card__excerpt">' + h.excerpt + '</span>' +
        '</a>';
    }).join('');

    elItems.querySelectorAll('.sr-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        e.preventDefault();
        var hash = card.getAttribute('href').replace(/^.*#/, '');
        closeSearchOverlay();
        setTimeout(function () { scrollToSection(hash); }, 50);
      });
    });

    var n = hits.length;
    elCount.textContent = n + ' result' + (n === 1 ? '' : 's');
    show(elResults);
  }

  // ── Скролл к секции ──────────────────────────────────────────────
  function scrollToSection(id) {
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    var isMobile = window.innerWidth <= 768;
    if (isMobile) {
      window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 70, behavior: 'smooth' });
    } else {
      var scroller = document.querySelector('.chapter');
      if (scroller) scroller.scrollTo({ top: target.offsetTop - 300, behavior: 'smooth' });
    }
  }

  // ── Открытие / закрытие ──────────────────────────────────────────
  function openSearchOverlay() {
    if (!overlay) return;
    if (overlay.classList.contains('is-open')) return;
    // На мобиле и планшете закрываем drawer, чтобы он не перекрывал оверлей.
    if (window.innerWidth <= 768) {
      var savedScroll = window.pageYOffset;
      var panel = document.getElementById('contents-panel');
      var mobileOverlay = document.getElementById('mobile-overlay');
      if (panel) panel.classList.remove('mobile-open');
      if (mobileOverlay) mobileOverlay.classList.remove('visible');
      document.body.classList.remove('drawer-open');
      window.scrollTo(0, savedScroll);
    } else if (window.innerWidth < 1280) {
      var panel = document.getElementById('contents-panel');
      var tabletOverlay = document.querySelector('.tablet-overlay');
      if (panel) panel.classList.remove('tablet-open');
      if (tabletOverlay) tabletOverlay.classList.remove('visible');
    }
    overlay.classList.add('is-open');
    overlay.removeAttribute('aria-hidden');
    document.body.classList.add('search-overlay-active');
    openedAt = Date.now();
    hide(elNoResults);
    hide(elResults);
  }

  function closeSearchOverlay() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('search-overlay-active');
    inputs().forEach(function (el) {
      el.value = '';
      el.blur();
    });
    if (clearBtn)       clearBtn.style.display       = 'none';
    if (mobileClearBtn) mobileClearBtn.style.display = 'none';
    if (elKbd)          elKbd.style.display          = '';
    if (elEmptyTitle)   elEmptyTitle.textContent     = 'Search across all chapters';
    if (elDemoLabel)    elDemoLabel.style.display    = '';
    if (elDemo)         elDemo.style.display         = '';
  }

  // ── Утилиты ──────────────────────────────────────────────────────
  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  // ── Экспорт ──────────────────────────────────────────────────────
  window.openSearchOverlay  = openSearchOverlay;
  window.closeSearchOverlay = closeSearchOverlay;
  window.initSearchOverlay  = initSearchOverlay;

})();

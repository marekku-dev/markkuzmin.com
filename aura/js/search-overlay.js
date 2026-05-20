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
  var overlay, input, clearBtn, closeBtn,
      elEmpty, elEmptyTitle, elDemoLabel, elDemo,
      elNoResults, elResults, elCount, elItems, elKbd;

  function initSearchOverlay() {
    overlay     = document.getElementById('search-overlay');
    input       = document.getElementById('search-overlay-input');
    clearBtn    = document.getElementById('search-overlay-clear');
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

    // ── Фокус на инпут → открыть оверлей ──
    input.addEventListener('focus', function () {
      openSearchOverlay();
    });

    // ── Ввод → поиск ──
    input.addEventListener('input', runSearch);

    // ── Esc внутри инпута ──
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSearchOverlay();
      }
    });

    // ── Кнопка очистки ──
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        input.value = '';
        runSearch();
        input.focus();
      });
    }

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
          input.value = chip.dataset.query || chip.textContent;
          runSearch();
          input.focus();
        });
      });
    }

    // ── Demo-карточки — скролл к секции ──
    if (overlay) {
      overlay.querySelectorAll('.sr-card--demo').forEach(function (card) {
        card.addEventListener('click', function (e) {
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
          input.focus(); // откроет через focus-listener
        }
        return;
      }
      // Esc глобально
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
        closeSearchOverlay();
      }
    });

    // Клик мимо — закрыть (но не если клик по самому инпуту/wrap)
    document.addEventListener('click', function (e) {
      if (!overlay.classList.contains('is-open')) return;
      var wrap = document.getElementById('contents-search-wrap');
      if (overlay.contains(e.target)) return;
      if (wrap && wrap.contains(e.target)) return;
      closeSearchOverlay();
    });
  }

  // ── Поиск ────────────────────────────────────────────────────────
  function runSearch() {
    var q = input ? input.value.trim() : '';

    // крестик и ⌘/ взаимоисключают друг друга
    if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
    if (elKbd)    elKbd.style.display    = q ? 'none'  : '';

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
    overlay.classList.add('is-open');
    overlay.removeAttribute('aria-hidden');
    document.body.classList.add('search-overlay-active');
    hide(elNoResults);
    hide(elResults);
  }

  function closeSearchOverlay() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('search-overlay-active');
    if (input) {
      input.value = '';
      input.blur();
    }
    if (clearBtn)     clearBtn.style.display     = 'none';
    if (elKbd)        elKbd.style.display        = '';
    if (elEmptyTitle) elEmptyTitle.textContent   = 'Search across all chapters';
    if (elDemoLabel)  elDemoLabel.style.display  = '';
    if (elDemo)       elDemo.style.display       = '';
  }

  // ── Утилиты ──────────────────────────────────────────────────────
  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  // ── Экспорт ──────────────────────────────────────────────────────
  window.openSearchOverlay  = openSearchOverlay;
  window.closeSearchOverlay = closeSearchOverlay;
  window.initSearchOverlay  = initSearchOverlay;

})();

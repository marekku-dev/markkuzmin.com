function initPage() {
// Scroll spy
// Поддерживаем оба формата: data-target="id" и <a href="page.html#id">
const navItems = document.querySelectorAll('.chapter-main li');
const chapterEl = document.querySelector('.chapter');

function getTargetId(item) {
  if (item.dataset.target) return item.dataset.target;
  const a = item.querySelector('a');
  if (a) {
    const hash = a.getAttribute('href').split('#')[1];
    return hash || null;
  }
  return null;
}

function scrollspyHandler() {
  const isMobile = window.innerWidth <= 768;
  const scrollTop = isMobile ? window.pageYOffset : chapterEl.scrollTop;
  let current = '';

  navItems.forEach(item => {
    const id = getTargetId(item);
    const target = id ? document.getElementById(id) : null;
    if (target && target.offsetTop <= scrollTop + 400) {
      current = id;
    }
  });

  navItems.forEach(item => {
    if (getTargetId(item) === current) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Подписываемся на оба скроллера; переподписку делаем на ресайз
let currentScroller = null;
function bindScrollspy() {
  if (currentScroller) currentScroller.removeEventListener('scroll', scrollspyHandler);
  currentScroller = window.innerWidth <= 768 ? window : chapterEl;
  if (currentScroller) currentScroller.addEventListener('scroll', scrollspyHandler, { passive: true });
}
if (chapterEl) {
  bindScrollspy();
  window.addEventListener('resize', bindScrollspy);
}

// Универсальный плавный скролл к якорю — используется и для подразделов,
// и для кликабельных заголовков глав в оглавлении.
// mode: 'section' (по умолчанию) — отступ сверху, чтобы заголовок секции
//       не упирался в верх; 'chapter' — скролл к самому верху главы,
//       чтобы целиком показать обложку с авторами и названием.
function smoothScrollToId(id, mode) {
  if (!id) return false;
  const target = document.getElementById(id);
  if (!target) return false;
  const isMobileView = window.innerWidth <= 768;
  const isChapterScroll = mode === 'chapter';
  if (isMobileView) {
    const offset = isChapterScroll ? 0 : 70;
    const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  } else {
    const offset = isChapterScroll ? 0 : 300;
    chapterEl.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
  }
  return true;
}

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    const id = getTargetId(item);
    if (!id) return;
    if (!document.getElementById(id)) return;
    e.preventDefault();
    smoothScrollToId(id);
  });
});

// Кликабельные заголовки крупных глав (.contents-chapter a).
// Скроллим только если якорь существует на текущей странице;
// иначе пропускаем — пусть браузер сам перейдёт по ссылке.
const chapterHeadingLinks = document.querySelectorAll('.contents-chapter a');
chapterHeadingLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href') || '';
    const hash = href.split('#')[1];
    if (!hash) return;
    if (!document.getElementById(hash)) return;
    e.preventDefault();
    smoothScrollToId(hash, 'chapter');
    // Обновим URL, чтобы хеш был корректным (без перезагрузки)
    if (history.replaceState) {
      history.replaceState(null, '', '#' + hash);
    }
  });
});



// Table of contents panel
const toggle = document.getElementById('contents-toggle');
const panel = document.getElementById('contents-panel');
const tocCollapse = document.getElementById('toc-collapse');
const wrapper = document.querySelector('.book__wrapper');

// ── Tablet overlay ──────────────────────────────────────────────
// Create once and reuse; separate from the mobile overlay.
const tabletOverlay = document.createElement('div');
tabletOverlay.className = 'tablet-overlay';
document.body.appendChild(tabletOverlay);

// ── Helpers ─────────────────────────────────────────────────────
function isTablet() {
  return window.innerWidth >= 768 && window.innerWidth < 1280;
}

function isMobile() {
  return window.innerWidth < 768;
}

const CONTENTS_WIDTH = {
  collapsed: '0px',
  normal: '280px',
  expanded: '400px'
};

function setContentsWidth(width) {
  document.documentElement.style.setProperty('--contents-width', width);
}

// ── Expanded overlay panel (⌘K / Contents header click) ─────────
function openPanel() {
  if (isTablet()) {
    // On tablet the drawer must be visible first, then we just keep it open
    openTabletDrawer();
    return;
  }
  panel.classList.add('is-open');
  setContentsWidth(CONTENTS_WIDTH.expanded);
}

function closePanel() {
  panel.classList.remove('is-open');
  if (!isTablet()) {
    setContentsWidth(CONTENTS_WIDTH.normal);
  }
}

function togglePanel() {
  if (isTablet()) {
    panel.classList.contains('tablet-open') ? closeTabletDrawer() : openTabletDrawer();
    return;
  }
  panel.classList.contains('is-open') ? closePanel() : openPanel();
}

// ── Tablet drawer ────────────────────────────────────────────────
function openTabletDrawer() {
  panel.classList.add('tablet-open');
  tabletOverlay.classList.add('visible');
  panel.style.display = '';       // make sure it's not hidden from desktop logic
}

function closeTabletDrawer() {
  panel.classList.remove('tablet-open');
  panel.classList.remove('is-open');
  tabletOverlay.classList.remove('visible');
}

tabletOverlay.addEventListener('click', () => {
  closeTabletDrawer();
});

// ── "hide contents" / "show contents" button ─────────────────────
// On desktop: hides/shows the column.
// On tablet:  opens/closes the drawer.
function hideContents() {
  if (isTablet()) {
    closeTabletDrawer();
    tocCollapse.classList.add('is-collapsed');
    return;
  }
  setContentsWidth(CONTENTS_WIDTH.collapsed);
  panel.style.display = 'none';
  tocCollapse.classList.add('is-collapsed');
}

function showContents() {
  if (isTablet()) {
    openTabletDrawer();
    tocCollapse.classList.remove('is-collapsed');
    return;
  }
  setContentsWidth(CONTENTS_WIDTH.normal);
  panel.style.display = '';
  tocCollapse.classList.remove('is-collapsed');
}

// ── Event listeners ───────────────────────────────────────────────
tocCollapse.addEventListener('click', (e) => {
  e.preventDefault();
  // Determine current state:
  // - tablet: drawer open?
  // - desktop: panel hidden?
  if (isTablet()) {
    panel.classList.contains('tablet-open') ? hideContents() : showContents();
  } else {
    panel.style.display === 'none' ? showContents() : hideContents();
  }
});

toggle.addEventListener('click', (e) => {
  e.preventDefault();
  togglePanel();
});

document.addEventListener('keydown', (e) => {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const modifier = isMac ? e.metaKey : e.ctrlKey;

  if (modifier && (e.key === 'k')) {
    e.preventDefault();
    togglePanel();
  }


  if (e.key === 'Escape') {
    if (isTablet()) {
      closeTabletDrawer();
    } else {
      closePanel();
    }
  }
});

document.addEventListener('click', (e) => {
  if (isTablet()) return; // tablet close handled by overlay + button
  if (panel.classList.contains('is-open') &&
      !panel.contains(e.target) &&
      !toggle.contains(e.target)) {
    closePanel();
  }
});

// ── Cleanup on resize ────────────────────────────────────────────
// If user resizes from tablet → desktop, reset tablet state.
window.addEventListener('resize', () => {
  if (!isTablet()) {
    panel.classList.remove('tablet-open');
    tabletOverlay.classList.remove('visible');
    // Restore desktop defaults if they weren't manually hidden
    if (panel.style.display !== 'none') {
      setContentsWidth(CONTENTS_WIDTH.normal);
    }
  }
});



// Copy link
document.querySelector('.share').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  if (btn.classList.contains('is-copied')) return;

  const originalHTML = btn.innerHTML;
  await navigator.clipboard.writeText(window.location.href);
  btn.textContent = 'Copied!';
  btn.classList.add('is-copied');

  setTimeout(() => {
    btn.innerHTML = originalHTML;
    btn.classList.remove('is-copied');
  }, 2000);
});



// Contributors toggle
const contributorsToggle = document.getElementById('contributors-toggle');
const contributorsBlock = document.getElementById('contributors-block');

if (contributorsToggle && contributorsBlock) {
  contributorsToggle.addEventListener('click', () => {
    contributorsBlock.classList.toggle('is-open');
  });
}

// Subscribe toggle
const subscribeBtn = document.getElementById('subscribe-btn');
const subscribeForm = document.getElementById('subscribe-form');
const subscribeSubmit = document.getElementById('subscribe-submit');
const subscribeEmail = document.getElementById('subscribe-email');
const subscribeThanks = document.getElementById('subscribe-thanks');

if (subscribeBtn && subscribeForm) {
  subscribeBtn.addEventListener('click', () => {
    const isOpen = subscribeForm.classList.toggle('is-open');
    subscribeBtn.setAttribute('aria-expanded', isOpen);
    if (isOpen) subscribeEmail.focus();
  });

  subscribeSubmit.addEventListener('click', handleSubscribe);
  subscribeEmail.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubscribe();
  });

  function handleSubscribe() {
    const email = subscribeEmail.value.trim();
    if (!email || !email.includes('@')) {
      subscribeEmail.style.borderColor = '#C25B1A';
      subscribeEmail.focus();
      setTimeout(() => { subscribeEmail.style.borderColor = ''; }, 1200);
      return;
    }
    subscribeForm.classList.remove('is-open');
    subscribeBtn.setAttribute('aria-expanded', 'false');
    subscribeBtn.style.display = 'none';
    subscribeThanks.classList.add('is-visible');
  }
}
}

// scroll-to-hash — скролл к якорю при загрузке страницы (например, из search.html).
// На десктопе скролл внутри .chapter, на мобиле — у window.
(function () {
  var hash = window.location.hash;
  if (!hash) return;
  var target = document.querySelector(hash);
  if (!target) return;
  setTimeout(function () {
    var isMobile = window.innerWidth <= 768;
    // Якоря на крупные главы (обложку и превью следующей главы) скроллим
    // без верхнего отступа, чтобы видеть обложку с авторами целиком.
    var isChapterAnchor = target.classList.contains('chapter-cover');
    var offset;
    if (isChapterAnchor) {
      offset = 0;
    } else {
      offset = isMobile ? 70 : 80;
    }
    if (isMobile) {
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    } else {
      var scroller = document.querySelector('.chapter');
      if (scroller) scroller.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
    }
  }, 80);
})();

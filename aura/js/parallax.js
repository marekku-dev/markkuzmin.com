// parallax.js — параллакс для плашек скептика (.skeptic).
// На десктопе скролл идёт внутри .chapter, на мобиле — у window,
// но на мобиле эффект отключён через CSS (transform: none !important).

(function () {
  var skeptics = Array.from(document.querySelectorAll('.skeptic'));
  if (!skeptics.length) return;

  var SPEED = 0.2; // 0 = не двигается, 1 = вместе со страницей

  function getScroller() {
    return window.innerWidth <= 768 ? window : document.querySelector('.chapter');
  }

  function update() {
    // На мобиле параллакс выключен — CSS принудительно сбрасывает transform
    if (window.innerWidth <= 768) return;
    var scroller = document.querySelector('.chapter');
    if (!scroller) return;
    var scrollerRect = scroller.getBoundingClientRect();
    var scrollerCenterY = scrollerRect.top + scrollerRect.height / 2;
    skeptics.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      var centerY = rect.top + rect.height / 2;
      var offset = (centerY - scrollerCenterY) * SPEED;
      el.style.transform = 'translateY(' + offset + 'px)';
    });
  }

  // rAF-throttle: вызываем update не чаще одного раза за кадр
  var rafPending = false;
  function onScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () { update(); rafPending = false; });
  }

  // Подписываемся на оба источника скролла, переподписываемся при ресайзе
  var currentScroller = null;
  function bind() {
    if (currentScroller) currentScroller.removeEventListener('scroll', onScroll);
    currentScroller = getScroller();
    currentScroller.addEventListener('scroll', onScroll, { passive: true });
  }
  bind();
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(bind, 100);
  });
  update();
})();

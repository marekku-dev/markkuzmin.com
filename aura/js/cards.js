(function () {
    const chapterEl = document.querySelector('.chapter');
    const MOBILE_BREAKPOINT = 768;

    function isMobile() {
      return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    // На мобилке .chapter не скроллится — слушаем window.
    // На десктопе скроллит внутренний .chapter.
    function getScroller() {
      return isMobile() ? window : (chapterEl || window);
    }

    // Инициализируем каждую галерею независимо
    const sections = document.querySelectorAll('.scroll-section');
    if (!sections.length) return;

    sections.forEach(function (section) {
      const cards         = section.querySelectorAll('.scroll-card');
      const desktopImages = section.querySelectorAll('.scroll-image');
      const mobileImages  = section.querySelectorAll('.scroll-image--mobile');
      if (!cards.length) return;

      // ── Индикаторы (точки) ──────────────────────────────────────
      function buildDots() {
        const dots = document.createElement('div');
        dots.className = 'gallery-dots';
        const els = Array.from({ length: cards.length }, function (_, i) {
          const d = document.createElement('button');
          d.className = 'gallery-dot';
          d.setAttribute('aria-label', 'Слайд ' + (i + 1));
          dots.appendChild(d);
          return d;
        });
        return { dots, els };
      }

      const imagesEl = section.querySelector('.scroll-images');

      const desktop = buildDots();
      const mobile  = buildDots();
      if (imagesEl) {
        imagesEl.appendChild(desktop.dots);
        mobile.dots.classList.add('gallery-dots--mobile');
        imagesEl.appendChild(mobile.dots);
      }

      function getActiveIndex() {
        let closest = 0;
        let minDist = Infinity;
        const mid = window.innerHeight / 2;

        cards.forEach(function (card, i) {
          const rect = card.getBoundingClientRect();
          const cardMid = rect.top + rect.height / 2;
          const dist = Math.abs(cardMid - mid);
          if (dist < minDist) {
            minDist = dist;
            closest = i;
          }
        });

        return closest;
      }

      let currentIndex = -1;

      function update() {
        const idx = getActiveIndex();
        if (idx === currentIndex) return;
        currentIndex = idx;

        desktopImages.forEach(function (img, i) {
          img.classList.toggle('active', i === idx);
        });

        mobileImages.forEach(function (img, i) {
          img.classList.toggle('active', i === idx);
        });

        desktop.els.forEach(function (d, i) {
          d.classList.toggle('gallery-dot--active', i === idx);
        });

        mobile.els.forEach(function (d, i) {
          d.classList.toggle('gallery-dot--active', i === idx);
        });
      }

      // rAF-throttle: вызываем update не чаще одного раза за кадр
      var rafPending = false;
      function onScroll() {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(function () { update(); rafPending = false; });
      }

      let currentScroller = null;
      function bind() {
        if (currentScroller) currentScroller.removeEventListener('scroll', onScroll);
        currentScroller = getScroller();
        currentScroller.addEventListener('scroll', onScroll, { passive: true });
      }
      bind();
      var resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          bind();
          currentIndex = -1;
          update();
        }, 100);
      });
      currentIndex = -1;
      update();
    });
  })();

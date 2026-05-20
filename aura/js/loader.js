// loader.js — загрузка HTML-компонентов (_navbar.html, _contents.html)
// и первичная инициализация страницы.
//
// Активный пункт navbar задаётся через переменную window.AURA_ACTIVE_NAV
// (id элемента, например 'nav-book' или 'nav-search').
// Если переменная не задана — ни один пункт не подсвечивается.
//
// Подключается последним, после всех остальных скриптов.

(async function () {
  async function loadComponent(url, mountId) {
    const res = await fetch(url);
    const html = await res.text();
    document.getElementById(mountId).outerHTML = html;
  }

  await Promise.all([
    loadComponent('_navbar.html',   'navbar-mount'),
    loadComponent('_contents.html', 'contents-mount'),
  ]);

  // Подсвечиваем активный пункт navbar (задаётся каждой страницей отдельно)
  var activeNavId = window.AURA_ACTIVE_NAV;
  if (activeNavId) {
    var activeLink = document.getElementById(activeNavId);
    if (activeLink) activeLink.classList.add('active');
  }

  // Scroll spy и клики по навигации — инициализируются в main.js
  if (typeof initPage === 'function') initPage();
})();

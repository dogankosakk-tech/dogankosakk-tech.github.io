(function () {
  var current = {};
  var STORAGE_KEY = 'casagaz_lang';

  function getLang() {
    var path = (window.location.pathname || '').replace(/\/+$/, '') || '/';
    /* URL öncelikli: /en veya /en/... ise İngilizce, aksi halde Türkçe (karışık dil olmasın) */
    if (path === '/en' || path.indexOf('/en/') === 0) return 'en';
    return 'tr';
  }

  /** Path without locale prefix: /en/portfolio/website -> /portfolio/website */
  function getPathWithoutLocale(path) {
    path = (path || window.location.pathname || '').replace(/\/+$/, '') || '/';
    return path.replace(/^\/en\/?/, '/') || '/';
  }

  /** URL prefix for current locale: '' for TR, '/en' for EN */
  function getLocalePrefix(lang) {
    return (lang || getLang()) === 'en' ? '/en' : '';
  }

  /** Full path for a given path in a given locale (for links) */
  function localePath(path, lang) {
    var norm = (path || '/').split('#')[0].replace(/^\/en\/?/, '/').replace(/^\//, '/') || '/';
    var prefix = getLocalePrefix(lang || getLang());
    var out = prefix + (norm === '/' ? '' : norm);
    if (!out) out = '/';
    if ((path || '').indexOf('#') >= 0) out += '#' + (path.split('#')[1] || '');
    return out;
  }

  function setLang(lang, options) {
    if (lang !== 'tr' && lang !== 'en') return Promise.resolve();
    localStorage.setItem(STORAGE_KEY, lang);
    if (options && options.redirect) {
      var pathWithoutLocale = getPathWithoutLocale(window.location.pathname);
      var newPath = getLocalePrefix(lang) + (pathWithoutLocale === '/' ? '' : pathWithoutLocale);
      if (!newPath || newPath === '/en') newPath = lang === 'en' ? '/en/' : '/';
      window.location.href = newPath + (window.location.search || '') + (window.location.hash || '');
      return Promise.resolve();
    }
    document.documentElement.lang = lang;
    return loadLocale(lang).then(apply);
  }

  function t(key) {
    var val = key.split('.').reduce(function (o, k) { return o && o[k]; }, current);
    return val != null ? val : key;
  }

  function loadLocale(lang) {
    return fetch('/locales/' + lang + '.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { current = data; });
  }

  function updateLocaleLinks() {
    var lang = getLang();
    var prefix = getLocalePrefix(lang);
    document.querySelectorAll('a[href^="/"]').forEach(function (el) {
      var href = el.getAttribute('href') || '';
      if (href === '/' || href === '/#') {
        el.setAttribute('href', lang === 'en' ? '/en/' : '/');
        return;
      }
      var sharp = href.indexOf('#');
      var pathPart = sharp >= 0 ? href.slice(0, sharp) : href;
      var hashPart = sharp >= 0 ? href.slice(sharp) : '';
      var pathNorm = pathPart.replace(/^\/en\/?/, '/').replace(/^\//, '/') || '/';
      var newPath = pathNorm === '/' ? (prefix === '/en' ? '/en/' : '/') : (prefix + pathNorm);
      if (!newPath) newPath = '/';
      el.setAttribute('href', newPath + hashPart);
    });
  }

  function apply() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var text = t(key);
      if (key === 'footer.copy') text = text.replace('{year}', new Date().getFullYear());
      el.textContent = text;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    updateLocaleLinks();
  }

  function setupLangSwitcher() {
    var lang = getLang();
    document.querySelectorAll('[data-lang]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
      b.removeEventListener('click', b._i18nClick);
      b._i18nClick = function () {
        var l = b.getAttribute('data-lang');
        setLang(l, { redirect: true });
      };
      b.addEventListener('click', b._i18nClick);
    });
  }

  function init() {
    var lang = getLang();
    if (lang === 'en') localStorage.setItem(STORAGE_KEY, 'en');
    document.documentElement.lang = lang;
    loadLocale(lang).then(function () {
      apply();
      setupLangSwitcher();
    });
  }

  window.i18n = {
    t: t,
    apply: apply,
    setLang: setLang,
    getLang: getLang,
    getPathWithoutLocale: getPathWithoutLocale,
    getLocalePrefix: getLocalePrefix,
    localePath: localePath,
    init: init
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

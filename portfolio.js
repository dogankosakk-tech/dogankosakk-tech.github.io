(function () {
  const choiceEl = document.getElementById('portfolio-choice');
  const resultsEl = document.getElementById('portfolio-results');
  const grid = document.getElementById('portfolio-grid');
  const loading = document.getElementById('portfolio-loading');
  const empty = document.getElementById('portfolio-empty');
  const backBtn = document.getElementById('portfolio-back');
  const resultsTitle = document.getElementById('portfolio-results-title');
  const popupWebsite = document.getElementById('portfolio-popup-website');
  const popupGallery = document.getElementById('portfolio-popup-gallery');
  const iframe = document.getElementById('popup-website-iframe');
  const openTabLink = document.getElementById('popup-website-open-tab');
  const fallbackLink = document.getElementById('popup-website-fallback-link');
  const blockedMsg = document.getElementById('popup-website-blocked');
  const screenshotWrap = document.getElementById('popup-website-screenshot-wrap');
  const screenshotImg = document.getElementById('popup-website-screenshot-img');
  const screenshotLoading = document.getElementById('popup-website-screenshot-loading');
  const galleryContent = document.getElementById('popup-gallery-content');
  const galleryTitle = document.getElementById('popup-gallery-title');

  var allItems = [];
  var selectedCategory = '';

  if (document.getElementById('year')) document.getElementById('year').textContent = new Date().getFullYear();

  function isVideoUrl(url) {
    if (!url) return false;
    var u = (url.split('?')[0] || '').toLowerCase();
    return /\.(mp4|webm|ogg|mov)(\?|$)/.test(u);
  }

  function isExternalUrl(url) {
    try {
      var a = document.createElement('a');
      a.href = url;
      var linkHost = (a.hostname || '').toLowerCase();
      var siteHost = (window.location.hostname || '').toLowerCase();
      if (!linkHost) return true;
      if (linkHost === siteHost) return false;
      if (siteHost === 'localhost' && (linkHost === '127.0.0.1' || linkHost === 'localhost')) return false;
      return true;
    } catch (e) { return true; }
  }

  function openWebsitePopup(link, title) {
    if (!link) return;
    popupWebsite.classList.add('open');
    document.getElementById('popup-website-title').textContent = title || (window.i18n && window.i18n.t ? window.i18n.t('portfolio.preview') : 'Önizleme');
    openTabLink.href = link;
    fallbackLink.href = link;
    openTabLink.target = '_blank';
    if (isExternalUrl(link)) {
      iframe.src = 'about:blank';
      iframe.style.display = 'none';
      if (screenshotWrap) screenshotWrap.style.display = 'none';
      if (screenshotImg) screenshotImg.src = '';
      blockedMsg.style.display = 'none';
      blockedMsg.querySelector('p').textContent = (window.i18n && window.i18n.t ? window.i18n.t('portfolio.previewFailed') : 'Önizleme alınamadı. Siteyi aşağıdaki butonla yeni sekmede açabilirsiniz.');
      if (screenshotLoading) screenshotLoading.style.display = 'flex';
      var previewUrl = '/api/preview-screenshot?url=' + encodeURIComponent(link) + '&fullPage=1&_=' + Date.now();
      if (screenshotImg) {
        screenshotImg.onload = function () {
          if (screenshotLoading) screenshotLoading.style.display = 'none';
          if (screenshotWrap) screenshotWrap.style.display = 'block';
        };
        screenshotImg.onerror = function () {
          if (screenshotLoading) screenshotLoading.style.display = 'none';
          blockedMsg.style.display = 'flex';
        };
        screenshotImg.src = previewUrl;
      } else {
        if (screenshotLoading) screenshotLoading.style.display = 'none';
        blockedMsg.style.display = 'flex';
      }
    } else {
      if (screenshotWrap) screenshotWrap.style.display = 'none';
      if (screenshotLoading) screenshotLoading.style.display = 'none';
      blockedMsg.style.display = 'none';
      iframe.style.display = 'block';
      iframe.src = link;
    }
  }

  function openGalleryPopup(mediaUrls, title) {
    if (!mediaUrls || !mediaUrls.length) return;
    popupGallery.classList.add('open');
    if (galleryTitle) galleryTitle.textContent = title || (window.i18n && window.i18n.t ? window.i18n.t('portfolio.gallery') : 'Galeri');
    galleryContent.innerHTML = '';
    mediaUrls.forEach(function (url) {
      if (isVideoUrl(url)) {
        var video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.preload = 'metadata';
        galleryContent.appendChild(video);
      } else {
        var img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.loading = 'lazy';
        galleryContent.appendChild(img);
      }
    });
  }

  function closePopups() {
    popupWebsite.classList.remove('open');
    popupGallery.classList.remove('open');
    iframe.src = 'about:blank';
    if (screenshotImg) screenshotImg.src = '';
    if (screenshotWrap) screenshotWrap.style.display = 'none';
    if (screenshotLoading) screenshotLoading.style.display = 'none';
  }

  document.querySelectorAll('[data-close-popup]').forEach(function (el) {
    el.addEventListener('click', closePopups);
  });
  if (popupWebsite) popupWebsite.addEventListener('click', function (e) { if (e.target === popupWebsite) closePopups(); });
  if (popupGallery) popupGallery.addEventListener('click', function (e) { if (e.target === popupGallery) closePopups(); });

  function renderCards(items) {
    grid.innerHTML = '';
    if (!items || items.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    var cacheBust = '&_=' + Date.now();
    var fullPage = '&fullPage=1';
    items.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'portfolio-card';
      var categoryKey = item.category === 'photo' ? 'portfolio.photoCategory' : 'portfolio.websiteCategory';
      var mediaUrls = item.mediaUrls && item.mediaUrls.length ? item.mediaUrls : (item.imageUrl ? [item.imageUrl] : []);
      var coverUrl = mediaUrls[0] || item.imageUrl;
      var useScreenshot = item.category === 'website' && item.link && isExternalUrl(item.link);
      var imgHtml;
      if (useScreenshot) {
        var previewApiUrl = '/api/preview-screenshot?url=' + encodeURIComponent(item.link) + fullPage + cacheBust;
        imgHtml = '<div class="portfolio-card-image portfolio-card-image--screenshot">' +
          '<span class="portfolio-card-placeholder portfolio-card-preview-loading" data-i18n="portfolio.loading">Yükleniyor…</span>' +
          '<img src="' + previewApiUrl + '" alt="" loading="lazy" data-cover /></div>';
      } else if (coverUrl) {
        imgHtml = '<div class="portfolio-card-image"><img src="' + coverUrl + '" alt="" loading="lazy" /></div>';
      } else {
        imgHtml = '<div class="portfolio-card-image"><span class="portfolio-card-placeholder" data-i18n="portfolio.preview">Önizleme</span></div>';
      }
      card.innerHTML =
        imgHtml +
        '<div class="portfolio-card-body">' +
        '<span class="portfolio-card-category" data-i18n="' + categoryKey + '"></span>' +
        '<h3 class="portfolio-card-title">' + (item.title || 'İş') + '</h3>' +
        (item.description ? '<p class="portfolio-card-desc">' + item.description + '</p>' : '') +
        (item.category === 'website' && item.link ? '<span class="portfolio-card-link" data-i18n="portfolio.previewLink"></span>' : '') +
        (item.category === 'photo' && mediaUrls.length ? '<span class="portfolio-card-link">' + mediaUrls.length + ' <span data-i18n="portfolio.mediaCount">medya →</span></span>' : '') +
        '</div>';
      if (useScreenshot) {
        var img = card.querySelector('img[data-cover]');
        var placeholder = card.querySelector('.portfolio-card-preview-loading');
        if (img && placeholder) {
          img.onload = function () { placeholder.style.display = 'none'; };
          img.onerror = function () {
            placeholder.style.display = '';
            if (window.i18n && window.i18n.t) placeholder.textContent = window.i18n.t('portfolio.preview');
            else placeholder.textContent = 'Önizleme';
            img.style.display = 'none';
          };
        }
      }
      if (item.category === 'website' && item.link) {
        card.classList.add('portfolio-card-clickable');
        card.addEventListener('click', function (e) {
          if (e.target.tagName === 'A') return;
          openWebsitePopup(item.link, item.title);
        });
      } else if (item.category === 'photo' && mediaUrls.length) {
        card.classList.add('portfolio-card-clickable');
        card.addEventListener('click', function () {
          openGalleryPopup(mediaUrls, item.title);
        });
      } else if (item.link) {
        card.querySelector('.portfolio-card-body').innerHTML += '<a href="' + item.link + '" class="portfolio-card-link" target="_blank" rel="noopener">Projeyi görüntüle →</a>';
      }
      grid.appendChild(card);
    });
    if (window.i18n && window.i18n.apply) window.i18n.apply();
  }

  function showChoice() {
    choiceEl.classList.remove('portfolio-choice--exiting', 'portfolio-choice--hidden');
    resultsEl.classList.remove('portfolio-results--visible');
    resultsEl.classList.add('portfolio-results--hidden');
    resultsEl.setAttribute('aria-hidden', 'true');
  }

  function getCategoryFromPath() {
    var path = (window.i18n && window.i18n.getPathWithoutLocale) ? window.i18n.getPathWithoutLocale(window.location.pathname) : (window.location.pathname || '').replace(/^\/en\/?/, '/').replace(/\/+$/, '') || '/';
    if (path === '/portfolio/website') return 'website';
    if (path === '/portfolio/photo') return 'photo';
    return null;
  }

  function getLocalePrefix() {
    return (window.i18n && window.i18n.getLocalePrefix) ? window.i18n.getLocalePrefix() : '';
  }

  function showResults(category) {
    selectedCategory = category;
    var titleKey = category === 'photo' ? 'portfolio.photoCategory' : 'portfolio.websiteCategory';
    if (resultsTitle) {
      resultsTitle.setAttribute('data-i18n', titleKey);
      resultsTitle.textContent = '';
    }
    var filtered = allItems.filter(function (item) { return item.category === category; });
    renderCards(filtered);

    choiceEl.classList.add('portfolio-choice--exiting');
    setTimeout(function () {
      choiceEl.classList.add('portfolio-choice--hidden');
      resultsEl.classList.remove('portfolio-results--hidden');
      resultsEl.setAttribute('aria-hidden', 'false');
      resultsEl.offsetHeight;
      resultsEl.classList.add('portfolio-results--visible');
    }, 480);
    history.pushState({ portfolio: 'results', category: category }, '', getLocalePrefix() + '/portfolio/' + category);
  }

  choiceEl.querySelectorAll('.portfolio-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = this.getAttribute('data-category');
      if (cat) showResults(cat);
    });
  });

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      resultsEl.classList.remove('portfolio-results--visible');
      setTimeout(function () {
        choiceEl.classList.remove('portfolio-choice--hidden', 'portfolio-choice--exiting');
        choiceEl.classList.add('portfolio-choice--entering');
        resultsEl.classList.add('portfolio-results--hidden');
        resultsEl.setAttribute('aria-hidden', 'true');
        setTimeout(function () { choiceEl.classList.remove('portfolio-choice--entering'); }, 400);
      }, 300);
      history.pushState(null, '', getLocalePrefix() + '/portfolio');
    });
  }

  window.addEventListener('popstate', function () {
    var cat = getCategoryFromPath();
    if (cat) {
      selectedCategory = cat;
      var titleKey = cat === 'photo' ? 'portfolio.photoCategory' : 'portfolio.websiteCategory';
      if (resultsTitle) {
        resultsTitle.setAttribute('data-i18n', titleKey);
        resultsTitle.textContent = '';
      }
      renderCards(allItems.filter(function (item) { return item.category === cat; }));
      choiceEl.classList.add('portfolio-choice--hidden');
      resultsEl.classList.remove('portfolio-results--hidden');
      resultsEl.setAttribute('aria-hidden', 'false');
      resultsEl.classList.add('portfolio-results--visible');
    } else {
      resultsEl.classList.remove('portfolio-results--visible');
      setTimeout(function () {
        choiceEl.classList.remove('portfolio-choice--hidden', 'portfolio-choice--exiting');
        choiceEl.classList.add('portfolio-choice--entering');
        resultsEl.classList.add('portfolio-results--hidden');
        resultsEl.setAttribute('aria-hidden', 'true');
        setTimeout(function () { choiceEl.classList.remove('portfolio-choice--entering'); }, 400);
      }, 300);
    }
  });

  loading.classList.remove('portfolio-loading--hidden');
  choiceEl.classList.add('portfolio-choice--hidden');
  resultsEl.classList.add('portfolio-results--hidden');

  function loadPortfolioItems() {
    return fetch('/api/portfolio')
      .then(function (r) {
        if (r.ok) return r.json();
        throw new Error('API not available');
      })
      .catch(function () {
        return fetch('/data/portfolio.json').then(function (r) {
          if (r.ok) return r.json();
          throw new Error('Data not found');
        });
      });
  }

  loadPortfolioItems()
    .then(function (items) {
      allItems = Array.isArray(items) ? items : [];
      loading.classList.add('portfolio-loading--hidden');
      var cat = getCategoryFromPath();
      if (cat) {
        choiceEl.classList.add('portfolio-choice--hidden');
        resultsEl.classList.remove('portfolio-results--hidden');
        resultsEl.setAttribute('aria-hidden', 'false');
        resultsEl.offsetHeight;
        resultsEl.classList.add('portfolio-results--visible');
        selectedCategory = cat;
        var titleKey = cat === 'photo' ? 'portfolio.photoCategory' : 'portfolio.websiteCategory';
        if (resultsTitle) {
          resultsTitle.setAttribute('data-i18n', titleKey);
          resultsTitle.textContent = '';
        }
        renderCards(allItems.filter(function (item) { return item.category === cat; }));
      } else {
        choiceEl.classList.remove('portfolio-choice--hidden');
        choiceEl.classList.add('portfolio-choice--entering');
        setTimeout(function () { choiceEl.classList.remove('portfolio-choice--entering'); }, 400);
      }
    })
    .catch(function () {
      loading.classList.add('portfolio-loading--hidden');
      choiceEl.classList.remove('portfolio-choice--hidden');
      choiceEl.innerHTML = '<p class="portfolio-empty">Yüklenemedi. Lütfen sayfayı yenileyin.</p>';
    });

  var navToggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navToggle.classList.toggle('open');
      navLinks.classList.toggle('open');
      document.body.classList.toggle('nav-open', navLinks.classList.contains('open'));
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('open');
        navToggle.classList.remove('open');
        document.body.classList.remove('nav-open');
      });
    });
  }
})();

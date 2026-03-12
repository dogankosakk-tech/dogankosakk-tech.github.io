/**
 * Paket sayfalarında tek configurator (website veya photo) için fiyat güncelleme ve animasyonlar
 */
(function () {
  'use strict';

  if (document.getElementById('year')) {
    document.getElementById('year').textContent = new Date().getFullYear();
  }

  // ——— Mobil nav (paket sayfalarında) ———
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

  // ——— Paket sayfası: scroll animasyonları ———
  var packageAnimate = document.querySelectorAll('[data-animate-package]');
  if (packageAnimate.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -60px 0px', threshold: 0.1 }
    );
    packageAnimate.forEach(function (el) { observer.observe(el); });
  }

  // ——— 3D tilt: hero icon (mouse ile hafif dönüş) ———
  var heroIcon = document.querySelector('.package-hero-icon[data-tilt-3d]');
  if (heroIcon) {
    var iconWrap = heroIcon.closest('.package-hero-icon-wrap');
    var tiltMax = 12;
    function onIconMove(e) {
      if (!iconWrap) return;
      var r = iconWrap.getBoundingClientRect();
      var x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      var y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      heroIcon.classList.add('no-float');
      heroIcon.style.transform = 'scale(1) translateY(0) rotateX(' + (-y * tiltMax) + 'deg) rotateY(' + (x * tiltMax) + 'deg)';
    }
    function onIconLeave() {
      heroIcon.classList.remove('no-float');
      heroIcon.style.transform = '';
    }
    iconWrap.addEventListener('mouseenter', function () { heroIcon.classList.add('no-float'); });
    iconWrap.addEventListener('mousemove', onIconMove);
    iconWrap.addEventListener('mouseleave', onIconLeave);
  }

  // ——— 3D tilt: feature kartları (mouse ile) ———
  var featureCards = document.querySelectorAll('.package-feature-card');
  var tiltConfig = { max: 8 };
  featureCards.forEach(function (card) {
    function getBounds() { return card.getBoundingClientRect(); }
    function onMove(e) {
      var b = getBounds();
      var x = (e.clientX - b.left - b.width / 2) / b.width;
      var y = (e.clientY - b.top - b.height / 2) / b.height;
      var rx = -y * tiltConfig.max;
      var ry = x * tiltConfig.max;
      card.style.transform = 'translateY(-6px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
      card.style.boxShadow = '0 20px 50px rgba(0,0,0,0.35), 0 0 40px rgba(0, 212, 255, 0.08)';
    }
    function onLeave() {
      card.style.transform = '';
      card.style.boxShadow = '';
    }
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
  });

  // ——— Configurator: sadece bu sayfada olan paneli güncelle ———
  var toggleSteps = ['website-seo', 'website-blog'];

  document.querySelectorAll('.configurator-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var step = btn.getAttribute('data-step');
      var group = btn.closest('.configurator-options');
      if (group && toggleSteps.indexOf(step) !== -1) {
        btn.classList.toggle('selected');
      } else if (group) {
        group.querySelectorAll('.configurator-option').forEach(function (o) { o.classList.remove('selected'); });
        btn.classList.add('selected');
      }
      updatePrices();
    });
  });

  function getWebsiteTotal() {
    var panel = document.querySelector('.configurator[data-config="website"]');
    if (!panel) return 15000;
    var theme = 15000, products = 0, seo = 0, blog = 0, consultancy = 0;
    panel.querySelectorAll('.configurator-option[data-step="website-theme"].selected').forEach(function (o) { theme = Number(o.getAttribute('data-value')) || 15000; });
    panel.querySelectorAll('.configurator-option[data-step="website-products"].selected').forEach(function (o) { products = Number(o.getAttribute('data-value')) || 0; });
    panel.querySelectorAll('.configurator-option[data-step="website-seo"].selected').forEach(function (o) { seo = Number(o.getAttribute('data-value')) || 0; });
    panel.querySelectorAll('.configurator-option[data-step="website-blog"].selected').forEach(function (o) { blog = Number(o.getAttribute('data-value')) || 0; });
    panel.querySelectorAll('.configurator-option[data-step="website-consultancy"].selected').forEach(function (o) { consultancy = Number(o.getAttribute('data-value')) || 0; });
    return theme + products + seo + blog + consultancy;
  }

  function photoDiscountRate(count) {
    if (count >= 50) return 0.8;
    if (count >= 10) return 0.9;
    return 1;
  }
  function videoDiscountRate(count) {
    if (count >= 5) return 0.9;
    return 1;
  }
  function getPhotoTotal() {
    var b = getPhotoTotalBreakdown();
    return b.total;
  }

  function getPhotoTotalBreakdown() {
    var countInput = document.getElementById('photo-count-input');
    var videoInput = document.getElementById('photo-video-input');
    var photoCount = 10, videoCount = 0;
    if (countInput) photoCount = Math.max(0, parseInt(countInput.value, 10) || 0);
    else {
      var panel = document.querySelector('.configurator[data-config="photo"]');
      if (panel) {
        panel.querySelectorAll('.configurator-option[data-step="photo-count"].selected').forEach(function (o) { photoCount = Number(o.getAttribute('data-value')) || 0; });
        panel.querySelectorAll('.configurator-option[data-step="photo-video"].selected').forEach(function (o) { videoCount = Number(o.getAttribute('data-value')) || 0; });
      }
    }
    if (videoInput) videoCount = Math.max(0, parseInt(videoInput.value, 10) || 0);
    var photoRate = photoDiscountRate(photoCount);
    var videoRate = videoDiscountRate(videoCount);
    var photoRaw = 150 * photoCount;
    var videoRaw = 400 * videoCount;
    var photoDiscounted = Math.round(photoRaw * photoRate);
    var videoDiscounted = Math.round(videoRaw * videoRate);
    var rawTotal = photoRaw + videoRaw;
    var total = photoDiscounted + videoDiscounted;
    var discountAmount = rawTotal - total;
    var discountPercent = rawTotal > 0 ? Math.round((1 - total / rawTotal) * 100) : 0;
    var photoPct = photoRate < 1 ? Math.round((1 - photoRate) * 100) : 0;
    var videoPct = videoRate < 1 ? Math.round((1 - videoRate) * 100) : 0;
    return {
      total: total,
      rawTotal: Math.round(rawTotal),
      discountAmount: discountAmount,
      discountPercent: discountPercent,
      photoRaw: Math.round(photoRaw),
      photoDiscounted: photoDiscounted,
      videoRaw: Math.round(videoRaw),
      videoDiscounted: videoDiscounted,
      photoDiscountPct: photoPct,
      videoDiscountPct: videoPct
    };
  }

  function updatePrices() {
    var webEl = document.getElementById('config-website-total');
    if (webEl) webEl.textContent = '₺' + getWebsiteTotal().toLocaleString('tr-TR');

    var photoTotalEl = document.getElementById('config-photo-total');
    var photoOriginalEl = document.getElementById('config-photo-original');
    var photoSavingsEl = document.getElementById('config-photo-savings');
    var photoBadgeEl = document.getElementById('config-photo-discount-badge');
    if (photoTotalEl) {
      var b = getPhotoTotalBreakdown();
      photoTotalEl.textContent = '₺' + b.total.toLocaleString('tr-TR');
      if (photoOriginalEl) {
        if (b.discountAmount > 0) {
          photoOriginalEl.textContent = '₺' + b.rawTotal.toLocaleString('tr-TR');
          photoOriginalEl.style.display = 'inline';
        } else {
          photoOriginalEl.textContent = '';
          photoOriginalEl.style.display = 'none';
        }
      }
      if (photoSavingsEl) {
        if (b.discountAmount > 0) {
          photoSavingsEl.textContent = '₺' + b.discountAmount.toLocaleString('tr-TR') + ' tasarruf';
          photoSavingsEl.style.display = 'block';
        } else {
          photoSavingsEl.textContent = '';
          photoSavingsEl.style.display = 'none';
        }
      }
      if (photoBadgeEl) {
        if (b.discountPercent > 0) {
          photoBadgeEl.textContent = '%' + b.discountPercent + ' İndirim';
          photoBadgeEl.style.display = 'inline-flex';
        } else {
          photoBadgeEl.textContent = '';
          photoBadgeEl.style.display = 'none';
        }
      }
    }
  }

  var countInput = document.getElementById('photo-count-input');
  var videoInput = document.getElementById('photo-video-input');
  if (countInput) { countInput.addEventListener('input', updatePrices); countInput.addEventListener('change', updatePrices); }
  if (videoInput) { videoInput.addEventListener('input', updatePrices); videoInput.addEventListener('change', updatePrices); }

  updatePrices();

  // ——— Foto paketi: "Bu fiyatla talep oluştur" → sipariş formunu göster ———
  var photoCta = document.getElementById('config-photo-cta');
  var orderFormSection = document.getElementById('package-order-form');
  var orderForm = document.getElementById('package-order-form-fields');
  var orderSuccess = document.getElementById('order-form-success');
  if (photoCta && orderFormSection) {
    photoCta.addEventListener('click', function () {
      if (orderForm) orderForm.style.display = '';
      if (orderSuccess) orderSuccess.style.display = 'none';
      var total = getPhotoTotal();
      var count = (document.getElementById('photo-count-input') && parseInt(document.getElementById('photo-count-input').value, 10)) || 0;
      var video = (document.getElementById('photo-video-input') && parseInt(document.getElementById('photo-video-input').value, 10)) || 0;
      var details = count + ' fotoğraf, ' + video + ' video';
      if (document.getElementById('photo-order-details')) document.getElementById('photo-order-details').textContent = details;
      if (document.getElementById('photo-order-total')) document.getElementById('photo-order-total').textContent = '₺' + total.toLocaleString('tr-TR');
      if (document.getElementById('order-options')) document.getElementById('order-options').value = JSON.stringify({ photoCount: count, videoCount: video });
      if (document.getElementById('order-total')) document.getElementById('order-total').value = String(total);
      orderFormSection.style.display = 'block';
      orderFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ——— Website paketi: "Bu fiyatla talep oluştur" → sipariş formunu göster ———
  var websiteCta = document.getElementById('config-website-cta');
  if (websiteCta && orderFormSection) {
    websiteCta.addEventListener('click', function () {
      if (orderForm) orderForm.style.display = '';
      if (orderSuccess) orderSuccess.style.display = 'none';
      var total = getWebsiteTotal();
      var panel = document.querySelector('.configurator[data-config="website"]');
      var parts = [];
      var opts = {};
      if (panel) {
        panel.querySelectorAll('.configurator-option[data-step="website-theme"].selected').forEach(function (o) {
          var name = (o.querySelector('.configurator-option-name') || {}).textContent || '';
          parts.push('Tema: ' + name);
          opts.theme = name;
        });
        panel.querySelectorAll('.configurator-option[data-step="website-products"].selected').forEach(function (o) {
          var name = (o.querySelector('.configurator-option-name') || {}).textContent || '';
          parts.push('Ürün: ' + name);
          opts.products = name;
        });
        var seo = panel.querySelectorAll('.configurator-option[data-step="website-seo"].selected').length > 0;
        var blog = panel.querySelectorAll('.configurator-option[data-step="website-blog"].selected').length > 0;
        var consultancy = panel.querySelectorAll('.configurator-option[data-step="website-consultancy"].selected').length > 0;
        if (seo) { parts.push('Gelişmiş SEO'); opts.seo = true; }
        if (blog) { parts.push('Blog kurulumu'); opts.blog = true; }
        if (consultancy) { parts.push('Aylık danışmanlık (₺50.000/ay)'); opts.consultancy = true; }
      }
      var details = parts.length ? parts.join(', ') : 'Shopify mağaza kurulumu';
      if (document.getElementById('website-order-details')) document.getElementById('website-order-details').textContent = details;
      if (document.getElementById('website-order-total')) document.getElementById('website-order-total').textContent = '₺' + total.toLocaleString('tr-TR');
      if (document.getElementById('order-options')) document.getElementById('order-options').value = JSON.stringify(opts);
      if (document.getElementById('order-total')) document.getElementById('order-total').value = String(total);
      orderFormSection.style.display = 'block';
      orderFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (orderForm) {
    orderForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target;
      var payload = {
        packageType: (form.querySelector('[name="packageType"]') || {}).value || 'photo',
        options: (form.querySelector('[name="options"]') || {}).value || '{}',
        total: (form.querySelector('[name="total"]') || {}).value || '0',
        name: (form.querySelector('#order-name') || {}).value || '',
        email: (form.querySelector('#order-email') || {}).value || '',
        phone: (form.querySelector('#order-phone') || {}).value || '',
        message: (form.querySelector('#order-message') || {}).value || ''
      };
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.id) {
            form.style.display = 'none';
            if (orderSuccess) orderSuccess.style.display = 'block';
          }
        })
        .catch(function () { alert('Gönderim sırasında bir hata oluştu. Lütfen tekrar deneyin.'); });
    });
  }
})();

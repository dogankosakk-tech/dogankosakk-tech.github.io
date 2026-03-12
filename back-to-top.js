/**
 * Yukarı çık butonu: kaydırınca görünür, daire scroll ile dolar, tıklanınca en üste gider.
 * Sayfada #back-to-top varsa çalışır (index, portfolio, paket sayfaları).
 */
(function () {
  'use strict';
  var btn = document.getElementById('back-to-top');
  var fill = document.querySelector('.back-to-top-fill');
  if (!btn) return;

  var threshold = 400;
  var circleLength = 2 * Math.PI * 20;

  function onScroll() {
    var y = window.scrollY;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var visible = maxScroll > 80 && y > threshold;
    btn.classList.toggle('visible', visible);
    if (fill) {
      var p = maxScroll <= 0 ? 0 : Math.min(1, y / maxScroll);
      fill.setAttribute('stroke-dashoffset', String(circleLength * (1 - p)));
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

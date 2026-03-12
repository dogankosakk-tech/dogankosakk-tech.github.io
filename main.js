/**
 * CASAGAZ TECH — Professional front-end behavior
 * Scroll animations, 3D hero, card tilt, cursor glow, navigation
 */
(function () {
  'use strict';

  const DOM = {
    header: document.querySelector('.header'),
    navToggle: document.querySelector('.nav-toggle'),
    navLinks: document.querySelector('.nav-links'),
    contactForm: document.getElementById('contact-form'),
    yearEl: document.getElementById('year'),
    cursorGlow: document.getElementById('cursor-glow'),
    hero3d: document.getElementById('hero-3d'),
  };

  // ——— Year in footer ———
  if (DOM.yearEl) DOM.yearEl.textContent = new Date().getFullYear();

  // ——— Header scroll ———
  let lastScrollY = window.scrollY;
  const scrollThreshold = 60;

  function onScroll() {
    const y = window.scrollY;
    if (DOM.header) {
      DOM.header.classList.toggle('scrolled', y > scrollThreshold);
    }
    lastScrollY = y;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ——— Mobile nav ———
  if (DOM.navToggle && DOM.navLinks) {
    DOM.navToggle.addEventListener('click', () => {
      DOM.navToggle.classList.toggle('open');
      DOM.navLinks.classList.toggle('open');
      document.body.classList.toggle('nav-open', DOM.navLinks.classList.contains('open'));
    });
    DOM.navLinks.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        DOM.navLinks.classList.remove('open');
        DOM.navToggle.classList.remove('open');
        document.body.classList.remove('nav-open');
      });
    });
  }

  // ——— Smooth scroll for anchors ———
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const id = this.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ——— Intersection Observer: reveal on scroll ———
  const revealOptions = {
    root: null,
    rootMargin: '0px 0px -80px 0px',
    threshold: 0.1,
  };

  const revealCallback = (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  };

  const revealObserver = new IntersectionObserver(revealCallback, revealOptions);
  document.querySelectorAll('[data-animate]').forEach((el) => revealObserver.observe(el));

  // Hero: show hero elements on load (no need to scroll)
  const hero = document.getElementById('hero');
  if (hero) {
    const heroAnimated = hero.querySelectorAll('[data-animate]');
    const delay = 400;
    setTimeout(() => {
      heroAnimated.forEach((el) => el.classList.add('visible'));
    }, delay);
  }

  // ——— 3D Tilt for cards ———
  const tiltCards = document.querySelectorAll('[data-tilt]');
  const tiltConfig = { max: 8, perspective: 1000 };

  tiltCards.forEach((card) => {
    const face = card.querySelector('.card-3d') || card;
    let bounds;

    function getBounds() {
      bounds = face.getBoundingClientRect();
    }

    function onMove(e) {
      getBounds();
      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;
      const w = bounds.width;
      const h = bounds.height;
      const centerX = w / 2;
      const centerY = h / 2;
      const rotateX = ((y - centerY) / h) * -tiltConfig.max;
      const rotateY = ((x - centerX) / w) * tiltConfig.max;
      face.style.transform = `perspective(${tiltConfig.perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }

    function onLeave() {
      face.style.transform = '';
    }

    card.addEventListener('mouseenter', getBounds);
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
  });

  // ——— Cursor glow (desktop only) ———
  if (DOM.cursorGlow && window.matchMedia('(pointer: fine)').matches) {
    let mouseX = 0,
      mouseY = 0;
    let glowX = 0,
      glowY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (DOM.cursorGlow.style.opacity !== '1') DOM.cursorGlow.style.opacity = '0.4';
    });

    function animateGlow() {
      glowX += (mouseX - glowX) * 0.08;
      glowY += (mouseY - glowY) * 0.08;
      DOM.cursorGlow.style.left = glowX + 'px';
      DOM.cursorGlow.style.top = glowY + 'px';
      requestAnimationFrame(animateGlow);
    }
    animateGlow();
  }

  // ——— Hero 3D scene (Three.js) ———
  function initHero3D() {
    const container = DOM.hero3d;
    if (!container || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0b, 0);
    container.appendChild(renderer.domElement);

    const neonColors = [0x00d4ff, 0x00ff88, 0xe8ff00];
    const meshes = [];

    function createShape(geom, color, x, y, z, scale) {
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.25,
        wireframe: true,
      });
      const mesh = new THREE.Mesh(geom, material);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(scale);
      mesh.userData = { speed: 0.3 + Math.random() * 0.4, rotY: (Math.random() - 0.5) * 0.02, rotX: (Math.random() - 0.5) * 0.02 };
      scene.add(mesh);
      meshes.push(mesh);
    }

    const geometry = [
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.TetrahedronGeometry(1, 0),
      new THREE.IcosahedronGeometry(1, 0),
    ];
    for (let i = 0; i < 14; i++) {
      const g = geometry[i % geometry.length];
      const c = neonColors[i % neonColors.length];
      createShape(g, c, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 12, 0.8 + Math.random() * 1.2);
    }

    let time = 0;
    function animate() {
      requestAnimationFrame(animate);
      time += 0.01;
      meshes.forEach((m, i) => {
        m.rotation.x += m.userData.rotX;
        m.rotation.y += m.userData.rotY;
        m.position.y += Math.sin(time + i * 0.5) * 0.002;
      });
      renderer.render(scene, camera);
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);
    animate();
  }

  if (DOM.hero3d) {
    if (typeof THREE !== 'undefined') {
      initHero3D();
    } else {
      window.addEventListener('load', () => setTimeout(initHero3D, 100));
    }
  }

  // ——— Contact form → WhatsApp ———
  const WHATSAPP_NUMBER = '905378792022';
  if (DOM.contactForm) {
    DOM.contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (DOM.contactForm.querySelector('#name') || {}).value || '';
      const email = (DOM.contactForm.querySelector('#email') || {}).value || '';
      const pkg = (DOM.contactForm.querySelector('#package') || {}).value || '';
      const message = (DOM.contactForm.querySelector('#message') || {}).value || '';
      const text = [
        'Merhaba, CASAGAZ TECH sitesinden iletişim talebi.',
        '',
        'Ad Soyad: ' + name,
        'E-posta: ' + email,
        'Paket: ' + (DOM.contactForm.querySelector('#package option:checked') || {}).textContent || pkg,
        '',
        'Mesaj: ' + message,
      ].join('\n');
      const url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text);
      window.open(url, '_blank');
    });
  }

  })();

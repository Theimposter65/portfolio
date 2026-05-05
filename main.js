// =============================================
//  Mr Imposter — Portfolio Main JS
// =============================================

// ---- Touch / pointer detection ----
// We only enable mouse-parallax on devices that have a real fine pointer.
const HAS_FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

// ---- Shared mouse state (single global listener) ----
let mouseNX = 0, mouseNY = 0; // normalized to [-0.5, 0.5]
if (HAS_FINE_POINTER) {
  window.addEventListener('mousemove', (e) => {
    mouseNX = (e.clientX / window.innerWidth  - 0.5) * 0.4;
    mouseNY = (e.clientY / window.innerHeight - 0.5) * 0.4;
  }, { passive: true });
}

// ---- Scroll progress + chapter nav (rAF-throttled) ----
const progressBar = document.getElementById('scroll-progress-bar');
const SECTIONS = ['hero', 'about', 'contact'];
let scrollScheduled = false;

function onScroll() {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    const scrolled = window.scrollY;
    const total    = document.body.scrollHeight - window.innerHeight;
    const pct      = total > 0 ? (scrolled / total) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';

    const mid = scrolled + window.innerHeight * 0.5;
    let active = SECTIONS[0];
    for (const id of SECTIONS) {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= mid) active = id;
    }
    document.querySelectorAll('.chapter-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.section === active);
    });

    scrollScheduled = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });

// ---- Chapter nav clicks ----
document.querySelectorAll('.chapter-item').forEach((item) => {
  item.addEventListener('click', () => {
    const target = document.getElementById(item.dataset.section);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ---- Text scramble (runs once per element) ----
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!?_—';
function scramble(el) {
  if (el.dataset.scrambled === '1') return;
  el.dataset.scrambled = '1';
  const text = el.dataset.text || el.textContent;
  let iteration = 0;
  const interval = setInterval(() => {
    el.textContent = text.split('').map((char, i) => {
      if (char === ' ') return ' ';
      if (i < iteration) return text[i];
      return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }).join('');
    if (iteration >= text.length) {
      el.textContent = text;
      clearInterval(interval);
    }
    iteration += 0.4;
  }, 40);
}

// ---- IntersectionObserver: scramble + fade, each only once ----
const onceObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    if (entry.target.classList.contains('scramble-text')) scramble(entry.target);
    if (entry.target.classList.contains('fade-up')) entry.target.classList.add('visible');
    obs.unobserve(entry.target);
  });
}, { threshold: 0.2 });

document.querySelectorAll('.scramble-text').forEach((el) => onceObserver.observe(el));
document.querySelectorAll('.pre-label, .hero-sub, .body-text p, .contact-sub, .circle-btn, .contact-icon-btn')
  .forEach((el) => { el.classList.add('fade-up'); onceObserver.observe(el); });

// =============================================
//  Three.js particle backgrounds
// =============================================

function createParticleCanvas(canvasId, options = {}) {
  if (typeof THREE === 'undefined') return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.z = options.cameraZ || 5;

  function resize() {
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const count   = options.count || 1200;
  const spread  = options.spread || 8;
  const geo     = new THREE.BufferGeometry();
  const pos     = new Float32Array(count * 3);
  const speeds  = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    speeds[i]      = 0.0005 + Math.random() * 0.001;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    size: options.size || 0.025,
    color: options.color || 0x00ff88,
    transparent: true,
    opacity: options.opacity || 0.6,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(geo, mat);
  scene.add(particles);

  if (options.lines) {
    const lineMat = new THREE.LineBasicMaterial({ color: options.color || 0x00ff88, transparent: true, opacity: 0.06 });
    const lineGeo = new THREE.BufferGeometry();
    const linePos = [];
    const threshold = 2.5;
    const cap = Math.min(count, 200);
    for (let i = 0; i < cap; i++) {
      for (let j = i + 1; j < cap; j++) {
        const dx = pos[i*3] - pos[j*3];
        const dy = pos[i*3+1] - pos[j*3+1];
        const dz = pos[i*3+2] - pos[j*3+2];
        if (Math.sqrt(dx*dx + dy*dy + dz*dz) < threshold) {
          linePos.push(pos[i*3], pos[i*3+1], pos[i*3+2]);
          linePos.push(pos[j*3], pos[j*3+1], pos[j*3+2]);
        }
      }
    }
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePos), 3));
    scene.add(new THREE.LineSegments(lineGeo, lineMat));
  }

  // Animation loop with proper visibility-based pause/resume.
  let running = false;
  let frameId = null;

  function tick() {
    if (!running) return;
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] += speeds[i];
      if (positions[i * 3 + 1] > spread / 2) positions[i * 3 + 1] = -spread / 2;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    particles.rotation.y += 0.0003;
    particles.rotation.x += 0.0001;
    if (HAS_FINE_POINTER) {
      camera.position.x += (mouseNX - camera.position.x) * 0.03;
      camera.position.y += (-mouseNY - camera.position.y) * 0.03;
      camera.lookAt(scene.position);
    }
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(tick);
  }
  function start() {
    if (running) return;
    running = true;
    frameId = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
  }

  start();

  const section = canvas.closest('section');
  if (section) {
    const secObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { e.isIntersecting ? start() : stop(); });
    }, { threshold: 0 });
    secObs.observe(section);
  }
}

// Wait until three.js (deferred) is loaded before kicking off canvases.
window.addEventListener('load', () => {
  createParticleCanvas('hero-canvas',    { count: 1400, spread: 10, size: 0.03,  color: 0x00ff88, opacity: 0.5,  cameraZ: 6, lines: false });
  createParticleCanvas('about-canvas',   { count: 800,  spread: 9,  size: 0.02,  color: 0xff9500, opacity: 0.4,  cameraZ: 6, lines: true  });
  createParticleCanvas('contact-canvas', { count: 700,  spread: 8,  size: 0.022, color: 0x00e5ff, opacity: 0.35, cameraZ: 5, lines: true  });
});

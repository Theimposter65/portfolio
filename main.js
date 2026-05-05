// =============================================
//  Mr Imposter — Portfolio Main JS
// =============================================

// ---- Custom Cursor ----
const cursorDot  = document.createElement('div'); cursorDot.id  = 'cursor';
const cursorRing = document.createElement('div'); cursorRing.id = 'cursor-ring';
document.body.append(cursorDot, cursorRing);

let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;
document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
(function animateCursor() {
  cursorDot.style.left  = mouseX + 'px';
  cursorDot.style.top   = mouseY + 'px';
  ringX += (mouseX - ringX) * 0.12;
  ringY += (mouseY - ringY) * 0.12;
  cursorRing.style.left = ringX + 'px';
  cursorRing.style.top  = ringY + 'px';
  requestAnimationFrame(animateCursor);
})();

document.querySelectorAll('a, button, #hamburger').forEach(el => {
  el.addEventListener('mouseenter', () => { cursorDot.style.transform = 'translate(-50%,-50%) scale(2.5)'; });
  el.addEventListener('mouseleave', () => { cursorDot.style.transform = 'translate(-50%,-50%) scale(1)'; });
});

// ---- Hamburger Menu ----
function toggleMenu() {
  document.getElementById('hamburger').classList.toggle('open');
  document.getElementById('nav-menu').classList.toggle('open');
}

// ---- Scroll Progress ----
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const total    = document.body.scrollHeight - window.innerHeight;
  const pct      = total > 0 ? (scrolled / total) * 100 : 0;
  document.getElementById('scroll-progress-bar').style.width = pct + '%';
  updateChapterNav();
});

// ---- Chapter Nav ----
function updateChapterNav() {
  const sections = ['hero', 'about', 'contact'];
  const scrollMid = window.scrollY + window.innerHeight * 0.5;
  let active = sections[0];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.offsetTop <= scrollMid) active = id;
  });
  document.querySelectorAll('.chapter-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === active);
  });
}
document.querySelectorAll('.chapter-item').forEach(item => {
  item.addEventListener('click', () => {
    const target = document.getElementById(item.dataset.section);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ---- Text Scramble ----
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!?_—';
function scramble(el) {
  const text = el.dataset.text;
  let iteration = 0;
  const interval = setInterval(() => {
    el.textContent = text.split('').map((char, i) => {
      if (char === ' ') return ' ';
      if (i < iteration) return text[i];
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
    if (iteration >= text.length) clearInterval(interval);
    iteration += 0.4;
  }, 40);
}

// ---- Intersection Observer for scramble + fade ----
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      if (entry.target.classList.contains('scramble-text')) {
        scramble(entry.target);
      }
      if (entry.target.classList.contains('fade-up')) {
        entry.target.classList.add('visible');
      }
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.scramble-text, .fade-up').forEach(el => observer.observe(el));

// ---- Add fade-up to content blocks ----
document.querySelectorAll('.pre-label, .hero-sub, .body-text p, .achievement-card, .contact-link, .circle-btn, .contact-sub').forEach(el => {
  el.classList.add('fade-up');
  observer.observe(el);
});

// =============================================
//  THREE.JS PARTICLE SYSTEMS
// =============================================

function createParticleCanvas(canvasId, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.z = options.cameraZ || 5;

  // Resize handler
  function resize() {
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ---- Particles ----
  const count   = options.count || 1200;
  const geo     = new THREE.BufferGeometry();
  const pos     = new Float32Array(count * 3);
  const speeds  = new Float32Array(count);
  const spread  = options.spread || 8;

  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    speeds[i]      = 0.0005 + Math.random() * 0.001;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    size:         options.size || 0.025,
    color:        options.color || 0x00ff88,
    transparent:  true,
    opacity:      options.opacity || 0.6,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(geo, mat);
  scene.add(particles);

  // Optional: connection lines (constellation)
  if (options.lines) {
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.06 });
    const lineGeo = new THREE.BufferGeometry();
    const linePos = [];
    const threshold = 2.5;
    for (let i = 0; i < Math.min(count, 200); i++) {
      for (let j = i + 1; j < Math.min(count, 200); j++) {
        const dx = pos[i*3] - pos[j*3];
        const dy = pos[i*3+1] - pos[j*3+1];
        const dz = pos[i*3+2] - pos[j*3+2];
        if (Math.sqrt(dx*dx+dy*dy+dz*dz) < threshold) {
          linePos.push(pos[i*3], pos[i*3+1], pos[i*3+2]);
          linePos.push(pos[j*3], pos[j*3+1], pos[j*3+2]);
        }
      }
    }
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePos), 3));
    scene.add(new THREE.LineSegments(lineGeo, lineMat));
  }

  // Mouse parallax
  let mx = 0, my = 0;
  document.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth  - 0.5) * 0.4;
    my = (e.clientY / window.innerHeight - 0.5) * 0.4;
  });

  // Animate
  let frame;
  function animate() {
    frame = requestAnimationFrame(animate);
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] += speeds[i];
      if (positions[i * 3 + 1] > spread / 2) positions[i * 3 + 1] = -spread / 2;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    particles.rotation.y += 0.0003;
    particles.rotation.x += 0.0001;
    camera.position.x += (mx - camera.position.x) * 0.03;
    camera.position.y += (-my - camera.position.y) * 0.03;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
  }
  animate();

  // Pause when section not visible (performance)
  const section = canvas.closest('section');
  if (section) {
    const secObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) cancelAnimationFrame(frame);
        else animate();
      });
    }, { threshold: 0 });
    secObs.observe(section);
  }
}

// Hero — bright green large particles
createParticleCanvas('hero-canvas', {
  count: 1400, spread: 10, size: 0.03, color: 0x00ff88, opacity: 0.5, cameraZ: 6, lines: false
});

// About — amber/orange particles with lines (constellation)
createParticleCanvas('about-canvas', {
  count: 800, spread: 9, size: 0.02, color: 0xff9500, opacity: 0.4, cameraZ: 6, lines: true
});

// Contact — teal/cyan particles
createParticleCanvas('contact-canvas', {
  count: 700, spread: 8, size: 0.022, color: 0x00e5ff, opacity: 0.35, cameraZ: 5, lines: true
});

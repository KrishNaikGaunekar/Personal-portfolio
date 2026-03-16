/* ═══════════════════════════════════════════════════
   KRISH NAIK GAUNEKAR — Portfolio App
   Scroll-driven frame canvas + GSAP + Lenis
═══════════════════════════════════════════════════ */

history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 300;  // must match the number of frames in /frames/
const IMAGE_SCALE  = 0.85; // 0.82–0.90: padded cover, avoids cropping

/* ─────────────────────────────────────────────────
   ELEMENTS
───────────────────────────────────────────────── */
const loader          = document.getElementById('loader');
const loaderBar       = document.getElementById('loader-bar');
const loaderPct       = document.getElementById('loader-percent');
const canvasWrap      = document.getElementById('canvas-wrap');
const canvas          = document.getElementById('canvas');
const ctx             = canvas.getContext('2d');
const heroSection     = document.getElementById('hero');
const darkOverlay     = document.getElementById('dark-overlay');
const marqueeWrap     = document.getElementById('marquee-wrap');
const scrollContainer = document.getElementById('scroll-container');

/* ─────────────────────────────────────────────────
   CANVAS RESIZE
───────────────────────────────────────────────── */
const dpr = window.devicePixelRatio || 1;

function resizeCanvas() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); drawFrame(currentFrameIdx); });

/* ─────────────────────────────────────────────────
   FRAME ANIMATION — pre-extracted image sequence
───────────────────────────────────────────────── */
const frames          = new Array(TOTAL_FRAMES);
let   currentFrameIdx = 0;
const bgColor         = '#f7f6f3';

function drawFrame(index) {
  const i   = Math.max(0, Math.min(Math.floor(index), TOTAL_FRAMES - 1));
  const img = frames[i];
  if (!img || !img.complete || !img.naturalWidth) return;

  const W     = canvas.width  / dpr;
  const H     = canvas.height / dpr;
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight) * IMAGE_SCALE;
  const dw    = img.naturalWidth  * scale;
  const dh    = img.naturalHeight * scale;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

function seekToProgress(progress) {
  const idx = Math.min(Math.round(progress * (TOTAL_FRAMES - 1)), TOTAL_FRAMES - 1);
  if (idx === currentFrameIdx) return;
  currentFrameIdx = idx;
  drawFrame(idx);
}

/* ─────────────────────────────────────────────────
   LOADER — tracks frame loading progress
───────────────────────────────────────────────── */
let initDone = false;

function setProgress(pct) {
  loaderBar.style.width = pct + '%';
  loaderPct.textContent = Math.round(pct) + '%';
}

function tryInit() {
  if (initDone) return;
  initDone = true;
  setProgress(100);
  drawFrame(0);
  setTimeout(bootSite, 300);
}

function loadFrames() {
  setProgress(5);
  let loaded = 0;
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const img = new Image();
    const n   = String(i + 1).padStart(4, '0');
    img.src   = `frames/frame_${n}.webp`;
    img.onload = img.onerror = () => {
      loaded++;
      setProgress(5 + Math.round((loaded / TOTAL_FRAMES) * 90));
      if (loaded === TOTAL_FRAMES) tryInit();
    };
    frames[i] = img;
  }
  setTimeout(tryInit, 15000); // fallback to prevent infinite hang on slow connections
}

loadFrames();

/* ─────────────────────────────────────────────────
   BOOT — called once video is ready (or timed out)
───────────────────────────────────────────────── */
function bootSite() {
  loader.classList.add('hidden');
  drawFrame(0);
  initLenis();

  // Small delay lets the browser fully paint the layout before measuring sections
  setTimeout(() => {
    positionSections();
    initHeroEntrance();
    initHeroTransition();
    initFrameScrub();
    initSectionAnimations();
    initCounters();
    initMarquee();
    initDarkOverlay(0.56, 0.72);
    // Refresh after all triggers are created so positions are accurate
    ScrollTrigger.refresh();
  }, 100);
  // Second refresh after fonts/layout settle
  setTimeout(() => ScrollTrigger.refresh(), 900);
}

/* ─────────────────────────────────────────────────
   LENIS SMOOTH SCROLL
   NOTE: Do NOT use scrollerProxy with Lenis — it
   hijacks native scroll events directly. scrollerProxy
   is for custom overflow scroll containers only.
───────────────────────────────────────────────── */
function initLenis() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  // Sync Lenis scroll events → ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);

  // Drive Lenis from GSAP's ticker so they share a clock
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ─────────────────────────────────────────────────
   FRAME SCRUB — bind frame index to scroll progress
───────────────────────────────────────────────── */
function initFrameScrub() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => seekToProgress(self.progress),
  });
}

/* ─────────────────────────────────────────────────
   HERO CIRCLE-WIPE → CANVAS REVEAL
───────────────────────────────────────────────── */
function initHeroTransition() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      heroSection.style.opacity = Math.max(0, 1 - p * 14);
      const wipe   = Math.min(1, Math.max(0, (p - 0.005) / 0.07));
      const radius = wipe * 80;
      canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;
    }
  });
}

/* ─────────────────────────────────────────────────
   HERO ENTRANCE ANIMATION (plays once on load)
───────────────────────────────────────────────── */
function initHeroEntrance() {
  const words    = document.querySelectorAll('.hero-word');
  const tagline  = document.querySelector('.hero-tagline');
  const hint     = document.querySelector('.scroll-indicator');
  const headshot = document.querySelector('.hero-headshot');

  gsap.timeline({ defaults: { ease: 'power4.out' } })
    .to(headshot, { opacity: 1, duration: 1.0, ease: 'power3.out' }, 0.2)
    .to(words,    { y: '0%', opacity: 1, stagger: 0.08, duration: 1.1 }, 0.3)
    .to(tagline,  { y: 0,    opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.4')
    .to(hint,     { opacity: 1, duration: 0.6 }, '-=0.3');
}

/* ─────────────────────────────────────────────────
   SECTION POSITIONING
   Absolute-position each section at the midpoint
   of its enter/leave range within the scroll container.
───────────────────────────────────────────────── */
function positionSections() {
  const totalH = scrollContainer.offsetHeight;
  document.querySelectorAll('.scroll-section').forEach(section => {
    const enter = parseFloat(section.dataset.enter) / 100;
    const leave = parseFloat(section.dataset.leave) / 100;
    section.style.top = ((enter + leave) / 2 * totalH) + 'px';
  });
}

/* ─────────────────────────────────────────────────
   SECTION ANIMATIONS
   One ScrollTrigger per section using the section
   itself as the trigger element. Since sections are
   position:absolute they have correct viewport coords.
───────────────────────────────────────────────── */
function buildTimeline(type, children) {
  const tl = gsap.timeline({ paused: true });
  switch (type) {
    case 'fade-up':
      tl.from(children, { y: 50,  opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' }); break;
    case 'slide-left':
      tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' }); break;
    case 'slide-right':
      tl.from(children, { x: 80,  opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' }); break;
    case 'scale-up':
      tl.from(children, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1.0, ease: 'power2.out' }); break;
    case 'rotate-in':
      tl.from(children, { y: 40, rotation: 3, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out' }); break;
    case 'stagger-up':
      tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out' }); break;
    case 'clip-reveal':
      tl.from(children, { clipPath: 'inset(100% 0 0 0)', opacity: 0, stagger: 0.15, duration: 1.2, ease: 'power4.inOut' }); break;
    default:
      tl.from(children, { opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out' });
  }
  return tl;
}

function initSectionAnimations() {
  document.querySelectorAll('.scroll-section').forEach(section => {
    const type    = section.dataset.animation;
    const persist = section.dataset.persist === 'true';
    const sel     = '.section-label, .section-heading, .section-body, .section-note, .cta-email, .cta-button, .stat';
    const children = section.querySelectorAll(sel);
    if (!children.length) return;

    const tl = buildTimeline(type, children);

    ScrollTrigger.create({
      trigger:     section,
      start:       'top 75%',
      end:         'bottom 25%',
      onEnter:      () => { tl.play(); section.style.pointerEvents = 'auto'; },
      onLeave:      () => { if (!persist) { tl.reverse(); section.style.pointerEvents = 'none'; } },
      onEnterBack:  () => { tl.play(); section.style.pointerEvents = 'auto'; },
      onLeaveBack:  () => { if (!persist) { tl.reverse(); section.style.pointerEvents = 'none'; } },
    });
  });
}

/* ─────────────────────────────────────────────────
   COUNTER ANIMATIONS
───────────────────────────────────────────────── */
function initCounters() {
  document.querySelectorAll('.stat-number').forEach(el => {
    const target   = parseFloat(el.dataset.value);
    const decimals = parseInt(el.dataset.decimals || '0');

    ScrollTrigger.create({
      trigger: el.closest('.scroll-section'),
      start: 'top 75%',
      onEnter() {
        gsap.fromTo(el,
          { textContent: 0 },
          {
            textContent: target,
            duration: 2,
            ease: 'power1.out',
            snap: { textContent: decimals === 0 ? 1 : Math.pow(0.1, decimals) },
            onUpdate() {
              const v = parseFloat(el.textContent);
              el.textContent = isNaN(v) ? '0' : v.toFixed(decimals);
            }
          }
        );
      },
      onLeaveBack() { el.textContent = '0'; }
    });
  });
}

/* ─────────────────────────────────────────────────
   MARQUEE
───────────────────────────────────────────────── */
function initMarquee() {
  const text  = marqueeWrap.querySelector('.marquee-text');
  const speed = parseFloat(marqueeWrap.dataset.scrollSpeed) || -30;

  gsap.to(text, {
    xPercent: speed,
    ease: 'none',
    scrollTrigger: { trigger: scrollContainer, start: 'top top', end: 'bottom bottom', scrub: true }
  });

  // Fade in/out across scroll range 25–82%
  const showStart = 0.25, showEnd = 0.82, fade = 0.05;
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let o = 0;
      if      (p >= showStart && p <= showStart + fade) o = (p - showStart) / fade;
      else if (p > showStart + fade && p < showEnd - fade) o = 1;
      else if (p >= showEnd - fade && p <= showEnd) o = 1 - (p - (showEnd - fade)) / fade;
      marqueeWrap.style.opacity = o;
    }
  });
}

/* ─────────────────────────────────────────────────
   DARK OVERLAY (stats section)
───────────────────────────────────────────────── */
function initDarkOverlay(enter, leave) {
  const fade = 0.04;
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let o = 0;
      if      (p >= enter - fade && p <= enter) o = (p - (enter - fade)) / fade;
      else if (p > enter && p < leave)          o = 0.92;
      else if (p >= leave && p <= leave + fade) o = 0.92 * (1 - (p - leave) / fade);
      darkOverlay.style.opacity = o;
    }
  });
}

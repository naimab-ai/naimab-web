/* ══════════════════════════════════════════════
   Naimab — Main Script
   ══════════════════════════════════════════════ */

// ── Entrance animations (perfectly.so-inspired) ──
const reduceMotionQuery = typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false };

function prefersReducedMotion() {
  return Boolean(reduceMotionQuery && reduceMotionQuery.matches);
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

const ANIMATION_META_KEYS = new Set(['offset', 'easing', 'composite']);

function applyInlineFrameStyles(element, frame) {
  if (!element || !frame) return;

  Object.entries(frame).forEach(([prop, value]) => {
    if (ANIMATION_META_KEYS.has(prop)) return;
    element.style[prop] = String(value);
  });
}

function animateElementWithFallback(element, keyframes, options = {}, onFinish) {
  if (!element || !Array.isArray(keyframes) || keyframes.length === 0) {
    if (typeof onFinish === 'function') onFinish();
    return null;
  }

  let isFinished = false;
  const finish = () => {
    if (isFinished) return;
    isFinished = true;
    element.style.transition = '';
    if (typeof onFinish === 'function') onFinish();
  };

  if (prefersReducedMotion() && !options.allowReducedMotion) {
    const finalFrame = keyframes[keyframes.length - 1];
    applyInlineFrameStyles(element, finalFrame);
    finish();
    return { cancel: finish };
  }

  if (typeof element.animate === 'function') {
    const animation = element.animate(keyframes, options);
    if (animation && animation.finished && typeof animation.finished.finally === 'function') {
      animation.finished.catch(() => {}).finally(finish);
    } else {
      const totalDuration =
        Math.max(0, Number(options.delay) || 0) +
        Math.max(0, Number(options.duration) || 0);
      window.setTimeout(finish, totalDuration);
    }
    return animation;
  }

  const firstFrame = keyframes[0];
  const finalFrame = keyframes[keyframes.length - 1];
  const duration = Math.max(0, Number(options.duration) || 0);
  const delay = Math.max(0, Number(options.delay) || 0);
  const easing = options.easing || 'ease';
  const transitionProps = Array.from(new Set(
    keyframes.reduce((props, frame) => {
      Object.keys(frame || {}).forEach((prop) => {
        if (!ANIMATION_META_KEYS.has(prop)) {
          props.push(prop);
        }
      });
      return props;
    }, []),
  ));

  applyInlineFrameStyles(element, firstFrame);
  void element.offsetWidth;

  const runTransition = () => {
    if (transitionProps.length > 0) {
      element.style.transition = transitionProps
        .map((prop) => `${prop} ${duration}ms ${easing}`)
        .join(', ');
    }
    applyInlineFrameStyles(element, finalFrame);
    window.setTimeout(finish, duration);
  };

  if (delay > 0) {
    window.setTimeout(runTransition, delay);
  } else {
    window.requestAnimationFrame(runTransition);
  }

  return { cancel: finish };
}

function createIntersectionObserver(callback, options) {
  if (typeof IntersectionObserver === 'function') {
    return new IntersectionObserver(callback, options);
  }

  return {
    observe(target) {
      callback([{ isIntersecting: true, target }]);
    },
    unobserve() {},
    disconnect() {},
  };
}

function createResizeObserver(callback) {
  if (typeof ResizeObserver === 'function') {
    return new ResizeObserver(callback);
  }

  return {
    observe() {
      window.addEventListener('resize', callback);
    },
    unobserve() {
      window.removeEventListener('resize', callback);
    },
    disconnect() {
      window.removeEventListener('resize', callback);
    },
  };
}

const REVEAL_PRESETS = {
  'soft-up': {
    duration: 1080,
    easing: 'cubic-bezier(0.56, 0.22, 0.05, 0.99)',
    initial(distance = 80) {
      return {
        opacity: '0.001',
        transform: `translateY(${distance}px)`,
        filter: 'blur(0px)',
      };
    },
    keyframes(distance = 80) {
      return [
        { opacity: 0.001, transform: `translateY(${distance}px)`, filter: 'blur(0px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
      ];
    },
  },
  'blur-up': {
    duration: 950,
    easing: 'cubic-bezier(0.56, 0.22, 0.05, 0.99)',
    initial(distance = 80) {
      return {
        opacity: '0.001',
        transform: `translateY(${distance}px)`,
        filter: 'blur(10px)',
      };
    },
    keyframes(distance = 80) {
      return [
        { opacity: 0.001, transform: `translateY(${distance}px)`, filter: 'blur(10px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
      ];
    },
  },
  'spring-up': {
    duration: 1320,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    initial(distance = 170) {
      return {
        opacity: '0.001',
        transform: `translateY(${distance}px)`,
        filter: 'blur(0px)',
      };
    },
    keyframes(distance = 170) {
      return [
        { opacity: 0.001, transform: `translateY(${distance}px)`, filter: 'blur(0px)' },
        { opacity: 1, transform: 'translateY(-18px)', filter: 'blur(0px)', offset: 0.72 },
        { opacity: 1, transform: 'translateY(6px)', filter: 'blur(0px)', offset: 0.88 },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
      ];
    },
  },
  'hero-rise': {
    duration: 2100,
    easing: 'cubic-bezier(0.56, 0.22, 0.05, 0.99)',
    initial(distance = 560) {
      return {
        opacity: '0.001',
        transform: `translateY(${distance}px)`,
        filter: 'blur(0px)',
      };
    },
    keyframes(distance = 560) {
      return [
        { opacity: 0.001, transform: `translateY(${distance}px)`, filter: 'blur(0px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
      ];
    },
  },
  'blur-left': {
    duration: 920,
    easing: 'cubic-bezier(0.56, 0.22, 0.05, 0.99)',
    initial(distance = 50) {
      return {
        opacity: '0.001',
        transform: `translateX(-${distance}px)`,
        filter: 'blur(5px)',
      };
    },
    keyframes(distance = 50) {
      return [
        { opacity: 0.001, transform: `translateX(-${distance}px)`, filter: 'blur(5px)' },
        { opacity: 1, transform: 'translateX(0)', filter: 'blur(0px)' },
      ];
    },
  },
  'blur-right': {
    duration: 920,
    easing: 'cubic-bezier(0.56, 0.22, 0.05, 0.99)',
    initial(distance = 50) {
      return {
        opacity: '0.001',
        transform: `translateX(${distance}px)`,
        filter: 'blur(5px)',
      };
    },
    keyframes(distance = 50) {
      return [
        { opacity: 0.001, transform: `translateX(${distance}px)`, filter: 'blur(5px)' },
        { opacity: 1, transform: 'translateX(0)', filter: 'blur(0px)' },
      ];
    },
  },
  'fade-in': {
    duration: 700,
    easing: 'ease',
    initial() {
      return {
        opacity: '0.001',
        transform: 'none',
        filter: 'blur(0px)',
      };
    },
    keyframes() {
      return [
        { opacity: 0.001, transform: 'none', filter: 'blur(0px)' },
        { opacity: 1, transform: 'none', filter: 'blur(0px)' },
      ];
    },
  },
};

const DEFAULT_REVEAL_DISTANCES = {
  'soft-up': 80,
  'blur-up': 80,
  'spring-up': 170,
  'hero-rise': 560,
  'blur-left': 50,
  'blur-right': 50,
  'fade-in': 0,
};

const REDUCED_REVEAL_PRESET = {
  duration: 260,
  easing: 'ease-out',
  initial() {
    return {
      opacity: '0.001',
      transform: 'none',
      filter: 'none',
    };
  },
  keyframes() {
    return [
      { opacity: 0.001, transform: 'none', filter: 'none' },
      { opacity: 1, transform: 'none', filter: 'none' },
    ];
  },
};

function getRevealConfigValue(target, key) {
  const value = target && target.dataset ? target.dataset[key] : null;
  if (value) return value;
  if (target && target.parentElement && target.parentElement.dataset) {
    return target.parentElement.dataset[key] || null;
  }
  return null;
}

function getRevealNumber(target, key) {
  const value = Number(getRevealConfigValue(target, key));
  return Number.isFinite(value) ? value : null;
}

function getRevealPreset(target) {
  const explicitPreset = getRevealConfigValue(target, 'revealPreset');
  if (explicitPreset && REVEAL_PRESETS[explicitPreset]) {
    return explicitPreset;
  }

  if (target.classList.contains('hero-image-in') || target.classList.contains('dashboard-wrap')) {
    return 'hero-rise';
  }

  if (target.classList.contains('compare-negative')) {
    return 'blur-left';
  }

  if (target.classList.contains('compare-positive')) {
    return 'blur-right';
  }

  if (
    target.classList.contains('pro-tag') ||
    target.classList.contains('stat-card') ||
    target.classList.contains('hero-stagger')
  ) {
    return 'spring-up';
  }

  if (
    target.classList.contains('mockup-screen') ||
    target.classList.contains('compare-card') ||
    target.classList.contains('faq-item')
  ) {
    return 'soft-up';
  }

  return 'blur-up';
}

function getRevealDistance(target, presetName) {
  const explicitDistance = getRevealNumber(target, 'revealDistance');
  if (explicitDistance !== null) return explicitDistance;

  if (target.classList.contains('hero-image-in')) return 560;
  if (target.classList.contains('hero-stagger')) return 170;
  if (target.classList.contains('mockup-screen')) return 120;
  if (target.classList.contains('compare-card') || target.classList.contains('faq-item')) return 80;
  if (target.classList.contains('pro-tag')) return 90;

  return DEFAULT_REVEAL_DISTANCES[presetName] ?? 80;
}

function applyRevealStyles(target, styles) {
  target.style.opacity = styles.opacity;
  target.style.transform = styles.transform;
  target.style.filter = styles.filter;
  target.style.willChange = 'transform, opacity, filter';
}

function resetRevealStyles(target) {
  target.style.opacity = '1';
  target.style.transform = 'none';
  target.style.filter = 'none';
  target.style.willChange = 'auto';
}

function createLetterRevealFragment(text, options = {}) {
  const fragment = document.createDocumentFragment();
  const { gradient = false } = options;

  Array.from(text).forEach((char) => {
    if (char === ' ') {
      fragment.appendChild(document.createTextNode(' '));
      return;
    }

    const outer = document.createElement('span');
    outer.className = 'letter-reveal';

    const inner = document.createElement('span');
    inner.className = 'letter-reveal-inner';
    if (gradient) {
      inner.classList.add('gradient-letter');
    }
    inner.textContent = char;

    outer.appendChild(inner);
    fragment.appendChild(outer);
  });

  return fragment;
}

function buildRevealLetters(target) {
  if (!target || target.dataset.revealLetters !== 'true' || target.dataset.revealLettersBuilt === 'true') {
    return;
  }

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent) return;
      const parentElement = node.parentElement;
      const gradient = Boolean(parentElement && parentElement.classList.contains('gradient-text'));
      node.parentNode.replaceChild(createLetterRevealFragment(node.textContent, { gradient }), node);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node;
    if (
      element.classList.contains('letter-reveal') ||
      element.classList.contains('letter-reveal-inner')
    ) {
      return;
    }

    Array.from(element.childNodes).forEach(processNode);
  }

  Array.from(target.childNodes).forEach(processNode);
  target.dataset.revealLettersBuilt = 'true';
}

function getRevealPieces(target) {
  if (!target) return [];
  if (target.dataset.revealLetters === 'true') {
    return Array.from(target.querySelectorAll('.letter-reveal-inner'));
  }
  if (target.dataset.revealWords === 'true') {
    return Array.from(target.querySelectorAll('.word-reveal-inner'));
  }
  return [];
}

function resetRevealPieceStyles(piece) {
  piece.style.opacity = '1';
  piece.style.transform = 'none';
  piece.style.filter = 'none';
  piece.style.willChange = 'auto';
}

function armRevealPieces(target) {
  buildRevealLetters(target);

  const pieces = getRevealPieces(target);
  if (pieces.length === 0) return;

  target.__revealPieces = pieces;

  pieces.forEach((piece) => {
    if (prefersReducedMotion()) {
      resetRevealPieceStyles(piece);
      return;
    }

    piece.style.opacity = '0.001';
    piece.style.transform = 'translateY(10px)';
    piece.style.filter = 'blur(10px)';
    piece.style.willChange = 'transform, opacity, filter';
  });
}

function animateRevealPieces(target, delay = 0) {
  const pieces = target.__revealPieces || getRevealPieces(target);
  if (pieces.length === 0) return;

  const isLetterReveal = target.dataset.revealLetters === 'true';
  const pieceDelay = isLetterReveal ? 22 : 42;
  const initialDelay = isLetterReveal ? 90 : 120;
  const duration = isLetterReveal ? 760 : 880;

  pieces.forEach((piece, index) => {
    if (prefersReducedMotion()) {
      resetRevealPieceStyles(piece);
      return;
    }

    animateElementWithFallback(piece, [
      { opacity: 0.001, filter: 'blur(10px)', transform: 'translateY(10px)' },
      { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0)' },
    ], {
      duration,
      delay: delay + initialDelay + index * pieceDelay,
      easing: 'cubic-bezier(0.56, 0.22, 0.05, 0.99)',
      fill: 'forwards',
    }, () => {
      resetRevealPieceStyles(piece);
    });
  });
}

function armRevealTarget(target) {
  if (!target || target.dataset.revealArmed === 'true') return;

  const presetName = getRevealPreset(target);
  const preset = REVEAL_PRESETS[presetName];
  const distance = getRevealDistance(target, presetName);

  target.dataset.revealArmed = 'true';
  target.dataset.revealPreset = presetName;
  target.dataset.revealDistance = String(distance);
  target.classList.add('reveal-target');
  armRevealPieces(target);

  if (prefersReducedMotion()) {
    applyRevealStyles(target, REDUCED_REVEAL_PRESET.initial());
    return;
  }

  applyRevealStyles(target, preset.initial(distance));
}

function animateRevealTarget(target, delay = 0) {
  if (!target || target.dataset.revealDone === 'true') return;

  const resolvedDelay = delay || getRevealNumber(target, 'revealDelay') || 0;

  if (prefersReducedMotion()) {
    animateElementWithFallback(target, REDUCED_REVEAL_PRESET.keyframes(), {
      duration: REDUCED_REVEAL_PRESET.duration,
      delay: resolvedDelay,
      easing: REDUCED_REVEAL_PRESET.easing,
      fill: 'forwards',
      allowReducedMotion: true,
    }, () => {
      resetRevealStyles(target);
      target.dataset.revealDone = 'true';
    });
    return;
  }

  const presetName = target.dataset.revealPreset || getRevealPreset(target);
  const preset = REVEAL_PRESETS[presetName];
  const distance = Number(target.dataset.revealDistance || getRevealDistance(target, presetName));

  animateElementWithFallback(target, preset.keyframes(distance), {
    duration: preset.duration,
    delay: resolvedDelay,
    easing: preset.easing,
    fill: 'forwards',
  }, () => {
    resetRevealStyles(target);
    target.dataset.revealDone = 'true';
  });

  animateRevealPieces(target, resolvedDelay);
}

function getRevealTargets(group) {
  if (group.matches('p, h1, h2, h3, h4')) return [group];

  const children = Array.from(group.children).filter((child) => {
    return !child.matches('script, style');
  });

  return children.length > 0 ? children : [group];
}

function getGroupStagger(group, targets) {
  const explicitStagger = getRevealNumber(group, 'revealStagger');
  if (explicitStagger !== null) return explicitStagger;
  if (targets.length >= 8) return 55;
  if (targets.length >= 5) return 70;
  return 100;
}

function armRevealGroup(group) {
  const targets = getRevealTargets(group);
  targets.forEach(armRevealTarget);
  group.__revealTargets = targets;
}

function animateRevealGroup(group) {
  if (group.dataset.revealDone === 'true') return;

  const targets = group.__revealTargets || getRevealTargets(group);
  const stagger = getGroupStagger(group, targets);

  targets.forEach((target, index) => {
    animateRevealTarget(target, index * stagger);
  });

  group.dataset.revealDone = 'true';
}

function getHeroSequence() {
  const intro = [];
  const heroSection = document.querySelector('main section');
  if (!heroSection) return intro;

  const badge = heroSection.querySelector('.section-label.hero-stagger');
  const title = heroSection.querySelector('.hero-title.hero-stagger');
  const subtext = heroSection.querySelector('p.hero-stagger');
  const buttons = Array.from(heroSection.querySelectorAll('.hero-actions > *'));
  const statCards = Array.from(heroSection.querySelectorAll('.stat-card'));
  const dashboard = heroSection.querySelector('.hero-image-in');

  if (badge) intro.push({ target: badge, delay: 100 });
  if (title) intro.push({ target: title, delay: 180 });
  if (subtext) intro.push({ target: subtext, delay: 320 });
  buttons.forEach((button, index) => intro.push({ target: button, delay: 500 + index * 90 }));
  statCards.forEach((card, index) => intro.push({ target: card, delay: 650 + index * 90 }));
  if (dashboard) intro.push({ target: dashboard, delay: 260 });

  return intro;
}

let revealSystemPrepared = false;
let revealSystemStarted = false;
let preparedRevealGroups = [];
let preparedHeroSequence = [];

function prepareRevealSystem() {
  if (revealSystemPrepared) return;
  revealSystemPrepared = true;

  preparedRevealGroups = Array.from(document.querySelectorAll('[data-animate]'));
  preparedRevealGroups.forEach(armRevealGroup);
  preparedHeroSequence = getHeroSequence();
  preparedHeroSequence.forEach(({ target }) => armRevealTarget(target));

  const heroStatsGrid = document.querySelector('main section .hero-stagger.grid');
  if (heroStatsGrid) {
    resetRevealStyles(heroStatsGrid);
  }

  const heroButtonsRow = document.querySelector('main section .hero-actions');
  if (heroButtonsRow) {
    resetRevealStyles(heroButtonsRow);
  }
}

function startHeroSequence() {
  const heroSequence = preparedHeroSequence.length > 0 ? preparedHeroSequence : getHeroSequence();

  if (!prefersReducedMotion()) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        heroSequence.forEach(({ target, delay }) => animateRevealTarget(target, delay));
      });
    });
  } else {
    heroSequence.forEach(({ target }) => animateRevealTarget(target));
  }

}

function initializeRevealSystem() {
  if (revealSystemStarted) return;
  revealSystemStarted = true;

  prepareRevealSystem();
  const revealGroups = preparedRevealGroups;
  const revealObserver = createIntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateRevealGroup(entry.target);
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -12% 0px' });

  revealGroups.forEach((group) => revealObserver.observe(group));

  startHeroSequence();
}

const brandIntro = document.getElementById('brand-intro');
const brandIntroLive = document.getElementById('brand-intro-live');
const BRAND_INTRO_TEXT = 'Naimab';
const BRAND_INTRO_EXIT_DURATION = 1000;

function createBrandIntroLetter(char) {
  const letter = document.createElement('span');
  letter.className = 'brand-intro-letter';
  letter.textContent = char;
  return letter;
}

async function waitForBrandIntroFonts() {
  if (!document.fonts || typeof document.fonts.load !== 'function') return;

  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('400 96px Halant'),
        document.fonts.load('500 16px Geist'),
      ]),
      wait(280),
    ]);
  } catch (error) {
    // Fall back to the already-rendered font stack if remote fonts are slow.
  }
}

let panelRiseAnimation = null;

async function playBrandIntroReveal() {
  if (!brandIntroLive) return;
  brandIntroLive.textContent = '';

  const panel = document.querySelector('.brand-intro-panel');

  // Create all letters at once (hidden via CSS)
  const letters = Array.from(BRAND_INTRO_TEXT).map((char) => {
    const letter = createBrandIntroLetter(char);
    brandIntroLive.appendChild(letter);
    return letter;
  });

  // Animate panel container rising from below
  if (panel) {
    panelRiseAnimation = animateElementWithFallback(panel, [
      { transform: 'translateY(160px)', opacity: 0.001 },
      { transform: 'translateY(0)', opacity: 1 },
    ], {
      duration: 1600,
      easing: 'cubic-bezier(0.56, 0.22, 0.05, 0.99)',
      fill: 'forwards',
    });
  }

  // Stagger per-letter blur reveal after a delay
  await wait(400);

  for (let i = 0; i < letters.length; i++) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        letters[i].classList.add('is-visible');
      });
    });
    if (i < letters.length - 1) await wait(75);
  }
}

async function playReducedMotionBrandIntro() {
  if (!brandIntroLive || !brandIntro) return;

  brandIntroLive.textContent = '';
  Array.from(BRAND_INTRO_TEXT).forEach((char) => {
    const letter = createBrandIntroLetter(char);
    letter.classList.add('is-visible');
    brandIntroLive.appendChild(letter);
  });

  brandIntro.classList.add('is-caption-visible');
  await wait(220);
  document.body.classList.remove('preload-intro');
  initializeRevealSystem();
  brandIntro.classList.add('is-exiting');
  await wait(220);
  brandIntro.classList.add('is-hidden');
}

async function runBrandIntro() {
  if (!brandIntro || !brandIntroLive) return;

  if (prefersReducedMotion()) {
    await waitForBrandIntroFonts();
    await playReducedMotionBrandIntro();
    return;
  }

  await waitForBrandIntroFonts();
  await wait(80);
  await playBrandIntroReveal();

  brandIntro.classList.add('is-caption-visible');
  await wait(900);

  // Cancel panel rise before starting exit
  if (panelRiseAnimation) {
    panelRiseAnimation.cancel();
    panelRiseAnimation = null;
  }

  // Begin crossfade: reveal site-shell and start brand exit simultaneously
  document.body.classList.remove('preload-intro');
  brandIntro.classList.add('is-exiting');

  // Slide panel off-screen
  const panel = document.querySelector('.brand-intro-panel');
  if (panel) {
    animateElementWithFallback(panel, [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(-400px)', opacity: 0 },
    ], {
      duration: 900,
      easing: 'cubic-bezier(0.96, -0.02, 0.38, 1.01)',
      fill: 'forwards',
    });
  }

  // Start hero reveals during the crossfade so content emerges as brand dissolves
  await wait(200);
  initializeRevealSystem();

  await wait(BRAND_INTRO_EXIT_DURATION - 200);
  brandIntro.classList.add('is-hidden');
}

function bootLandingExperience() {
  prepareRevealSystem();

  runBrandIntro()
    .catch(() => {
      if (brandIntro) {
        brandIntro.classList.add('is-hidden');
      }
    })
    .finally(() => {
      // Ensure landing is always visible and reveal system is always initialized,
      // even if the intro promise rejected or was skipped.
      document.body.classList.remove('preload-intro');
      initializeRevealSystem();
    });
}

bootLandingExperience();

// ── Smooth scrolling (desktop inertia) ──
const smoothScrollEnabled =
  !prefersReducedMotion() &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const smoothScrollState = {
  current: window.scrollY,
  target: window.scrollY,
  rafId: 0,
};

function getMaxScrollTop() {
  return Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
}

function clampScrollTarget(value) {
  return Math.min(Math.max(value, 0), getMaxScrollTop());
}

function normalizeWheelDelta(event) {
  if (event.deltaMode === 1) return event.deltaY * 18;
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

function hasScrollableAncestor(startNode) {
  let node = startNode;

  while (node && node !== document.body && node !== document.documentElement) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY);
      if (canScrollY && node.scrollHeight > node.clientHeight + 1) {
        return true;
      }
    }

    node = node.parentNode;
  }

  return false;
}

function stopSmoothScroll() {
  if (!smoothScrollState.rafId) return;
  cancelAnimationFrame(smoothScrollState.rafId);
  smoothScrollState.rafId = 0;
  smoothScrollState.current = window.scrollY;
  smoothScrollState.target = window.scrollY;
}

function tickSmoothScroll() {
  smoothScrollState.target = clampScrollTarget(smoothScrollState.target);
  const delta = smoothScrollState.target - smoothScrollState.current;

  if (Math.abs(delta) < 0.4) {
    smoothScrollState.current = smoothScrollState.target;
    window.scrollTo(0, smoothScrollState.current);
    smoothScrollState.rafId = 0;
    return;
  }

  smoothScrollState.current += delta * 0.11;
  window.scrollTo(0, smoothScrollState.current);
  smoothScrollState.rafId = requestAnimationFrame(tickSmoothScroll);
}

function startSmoothScroll() {
  if (smoothScrollState.rafId) return;
  smoothScrollState.rafId = requestAnimationFrame(tickSmoothScroll);
}

function smoothScrollToPosition(position) {
  smoothScrollState.current = window.scrollY;
  smoothScrollState.target = clampScrollTarget(position);
  startSmoothScroll();
}

function getAnchorScrollTarget(anchor) {
  const href = anchor.getAttribute('href');
  if (!href || !href.startsWith('#')) return null;
  if (href === '#') return 0;

  const target = document.querySelector(href);
  if (!target) return null;

  const header = document.getElementById('main-header');
  const headerOffset = ((header && header.offsetHeight) || 0) + 20;
  return target.getBoundingClientRect().top + window.scrollY - headerOffset;
}

function isTypingContext() {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
    return true;
  }

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);
}

if (smoothScrollEnabled) {
  document.documentElement.classList.add('is-inertia-scroll');

  window.addEventListener('wheel', (event) => {
    if (
      event.ctrlKey ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
      hasScrollableAncestor(event.target) ||
      document.body.style.overflow === 'hidden'
    ) {
      return;
    }

    event.preventDefault();
    smoothScrollState.current = window.scrollY;
    smoothScrollState.target = clampScrollTarget(
      smoothScrollState.target + normalizeWheelDelta(event)
    );
    startSmoothScroll();
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      isTypingContext() ||
      document.body.style.overflow === 'hidden'
    ) {
      return;
    }

    let nextTarget = null;

    switch (event.key) {
      case 'ArrowDown':
        nextTarget = smoothScrollState.target + 100;
        break;
      case 'ArrowUp':
        nextTarget = smoothScrollState.target - 100;
        break;
      case 'PageDown':
        nextTarget = smoothScrollState.target + window.innerHeight * 0.9;
        break;
      case 'PageUp':
        nextTarget = smoothScrollState.target - window.innerHeight * 0.9;
        break;
      case 'Home':
        nextTarget = 0;
        break;
      case 'End':
        nextTarget = getMaxScrollTop();
        break;
      case ' ':
        nextTarget = smoothScrollState.target + (event.shiftKey ? -1 : 1) * window.innerHeight * 0.9;
        break;
      default:
        return;
    }

    event.preventDefault();
    smoothScrollState.current = window.scrollY;
    smoothScrollState.target = clampScrollTarget(nextTarget);
    startSmoothScroll();
  }, { passive: false });

  window.addEventListener('scroll', () => {
    if (smoothScrollState.rafId) return;
    smoothScrollState.current = window.scrollY;
    smoothScrollState.target = window.scrollY;
  }, { passive: true });

  window.addEventListener('resize', () => {
    smoothScrollState.current = window.scrollY;
    smoothScrollState.target = clampScrollTarget(smoothScrollState.target);
  }, { passive: true });

  window.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopSmoothScroll();
    }
  });

  window.addEventListener('mousedown', () => {
    if (smoothScrollState.rafId) {
      stopSmoothScroll();
    }
  }, { passive: true });

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const anchorTarget = getAnchorScrollTarget(anchor);
      if (anchorTarget === null) {
        stopSmoothScroll();
        return;
      }

      event.preventDefault();
      smoothScrollToPosition(anchorTarget);
    });
  });
}

// ── Header scroll effect ──
const header = document.getElementById('main-header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 10) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}, { passive: true });

// ── Mobile menu ──
const burgerBtn = document.getElementById('burger-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileBackdrop = document.getElementById('mobile-backdrop');
const mobileOverlay = document.getElementById('mobile-overlay');
const burger1 = document.getElementById('burger-1');
const burger2 = document.getElementById('burger-2');
const burger3 = document.getElementById('burger-3');
let menuOpen = false;

function openMobileMenu() {
  menuOpen = true;
  mobileOverlay.classList.remove('pointer-events-none');
  mobileMenu.classList.add('is-open');
  mobileBackdrop.style.opacity = '1';
  mobileBackdrop.classList.remove('pointer-events-none');
  mobileBackdrop.classList.add('pointer-events-auto');
  burger1.style.transform = 'rotate(45deg) translate(4px, 4px)';
  burger2.style.opacity = '0';
  burger3.style.transform = 'rotate(-45deg) translate(3px, -3px)';
  burger3.style.width = '1.5rem';
  document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
  menuOpen = false;
  mobileMenu.classList.remove('is-open');
  mobileBackdrop.style.opacity = '0';
  mobileBackdrop.classList.add('pointer-events-none');
  mobileBackdrop.classList.remove('pointer-events-auto');
  setTimeout(() => { mobileOverlay.classList.add('pointer-events-none'); }, 350);
  burger1.style.transform = '';
  burger2.style.opacity = '';
  burger3.style.transform = '';
  burger3.style.width = '';
  document.body.style.overflow = '';
}

burgerBtn.addEventListener('click', () => menuOpen ? closeMobileMenu() : openMobileMenu());
mobileBackdrop.addEventListener('click', closeMobileMenu);

// ── Counter animation ──
const counters = document.querySelectorAll('[data-count]');
const counterObserver = createIntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.count);
      const duration = 1500;
      const start = performance.now();

      function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const current = Math.round(target * eased);

        if (target >= 10000) {
          el.textContent = current.toLocaleString() + '+';
        } else if (el.dataset.suffix) {
          el.textContent = current + el.dataset.suffix;
        } else {
          const suffix = el.textContent.replace(/[0-9,]/g, '').trim();
          if (suffix.includes('%')) {
            el.textContent = current + '%';
          } else {
            el.textContent = current;
          }
        }

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.classList.add('is-done');
        }
      }
      requestAnimationFrame(step);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });
counters.forEach(el => counterObserver.observe(el));

// ── FAQ Accordion ──
const faqQuestions = document.querySelectorAll('.faq-question-btn');
const faqAnswers = document.querySelectorAll('.faq-answer');

if (faqQuestions.length > 0) {
  faqQuestions.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      const isActive = btn.classList.contains('is-active');

      // Close all
      faqQuestions.forEach(q => q.classList.remove('is-active'));
      faqAnswers.forEach(a => a.classList.remove('is-active'));

      // Toggle clicked (if wasn't active)
      if (!isActive) {
        btn.classList.add('is-active');
        if (faqAnswers[index]) faqAnswers[index].classList.add('is-active');
      }
    });
  });
}

// ── Waitlist Modal ──
const modal = document.getElementById('waitlist-modal');
const modalContentEl = modal ? modal.querySelector('.modal-content') : null;
const modalClose = document.getElementById('modal-close');
const modalBackdropEl = modal ? modal.querySelector('.modal-backdrop') : null;
const modalForm = document.getElementById('waitlist-form');
const modalEmailInput = document.getElementById('waitlist-email');
const modalNameInput = document.getElementById('waitlist-name');
const emailError = document.getElementById('email-error');
const turnstileMeta = document.querySelector('meta[name="turnstile-site-key"]');
const turnstileSiteKey = turnstileMeta && typeof turnstileMeta.content === 'string'
  ? turnstileMeta.content.trim()
  : '';
let turnstileLoaderPromise = null;
let waitlistTurnstileId = null;

function openModal() {
  if (!modal) return;
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    const currentNameInput = document.getElementById('waitlist-name');
    if (currentNameInput) currentNameInput.focus();
  }, 350);
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
  const currentForm = document.getElementById('waitlist-form');
  const currentEmailError = document.getElementById('email-error');
  const currentEmailInput = document.getElementById('waitlist-email');
  if (currentForm) currentForm.reset();
  if (currentEmailError) currentEmailError.classList.remove('is-visible');
  if (currentEmailInput) currentEmailInput.classList.remove('is-error');
  setWaitlistGeneralError('');
  restoreModalForm();
}

let originalModalHTML = modalContentEl ? modalContentEl.innerHTML : '';

function restoreModalForm() {
  if (modalContentEl && originalModalHTML && !modalContentEl.querySelector('#waitlist-form')) {
    modalContentEl.innerHTML = originalModalHTML;
    waitlistTurnstileId = null;
    bindModalForm();
  }
}

function getWaitlistGeneralError() {
  return document.getElementById('waitlist-general-error');
}

function getWaitlistSupport() {
  return document.getElementById('waitlist-support');
}

function hideWaitlistSupportFallback() {
  const supportEl = getWaitlistSupport();
  if (!supportEl) return;
  supportEl.hidden = true;
}

function buildWaitlistSupportMailto(name, email) {
  const params = new URLSearchParams({
    subject: 'Access request',
    body: [
      `Name: ${name || '-'}`,
      `Email: ${email || '-'}`,
      '',
      'Hi Naimab team,',
      '',
      'I could not request access from the website, so I am sending my request by email.',
    ].join('\n'),
  });

  return `mailto:hello@naimab.com?${params.toString()}`;
}

function showWaitlistSupportFallback(name, email) {
  const supportEl = getWaitlistSupport();
  const supportLink = document.getElementById('waitlist-support-link');
  if (!supportEl || !supportLink) return;

  supportLink.href = buildWaitlistSupportMailto(name, email);
  supportEl.hidden = false;
}

function setWaitlistGeneralError(message) {
  const errorEl = getWaitlistGeneralError();
  if (!errorEl) return;
  hideWaitlistSupportFallback();
  errorEl.textContent = message;
  errorEl.classList.toggle('is-visible', Boolean(message));
}

function isWaitlistEmailDeliveryUnavailable(payload) {
  const errorMessage = payload && typeof payload.error === 'string' ? payload.error : '';
  return (payload && payload.code === 'EMAIL_DELIVERY_UNAVAILABLE') ||
    errorMessage.includes('Email delivery is temporarily unavailable');
}

function isWaitlistServerSideFailure(payload, response) {
  return response.status >= 500 || Boolean(payload && payload.code === 'VERIFICATION_UNAVAILABLE');
}

function ensureTurnstileLoaded() {
  if (!turnstileSiteKey) return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileLoaderPromise) return turnstileLoaderPromise;

  turnstileLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile || null);
    script.onerror = () => reject(new Error('Failed to load verification widget'));
    document.head.appendChild(script);
  });

  return turnstileLoaderPromise;
}

async function ensureWaitlistTurnstile() {
  const slot = document.getElementById('waitlist-turnstile');
  if (!slot || !turnstileSiteKey) return null;
  if (waitlistTurnstileId !== null && window.turnstile) {
    return waitlistTurnstileId;
  }

  const turnstile = await ensureTurnstileLoaded();
  if (!turnstile) return null;

  slot.hidden = false;
  waitlistTurnstileId = turnstile.render(slot, {
    sitekey: turnstileSiteKey,
    theme: 'light',
  });
  return waitlistTurnstileId;
}

function bindModalForm() {
  const form = document.getElementById('waitlist-form');
  const emailInput = document.getElementById('waitlist-email');
  const errEl = document.getElementById('email-error');
  const companyInput = document.getElementById('company-name');

  if (form) {
    void ensureWaitlistTurnstile().catch(() => {
      setWaitlistGeneralError('Verification widget failed to load. Please refresh and try again.');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      const name = document.getElementById('waitlist-name') ? document.getElementById('waitlist-name').value.trim() : '';
      const company = companyInput ? companyInput.value.trim() : '';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      let turnstileToken = '';

      setWaitlistGeneralError('');

      if (!emailRegex.test(email)) {
        emailInput.classList.add('is-error');
        errEl.classList.add('is-visible');
        return;
      }

      emailInput.classList.remove('is-error');
      errEl.classList.remove('is-visible');

      if (turnstileSiteKey) {
        try {
          const widgetId = await ensureWaitlistTurnstile();
          if (widgetId !== null && window.turnstile) {
            turnstileToken = window.turnstile.getResponse(widgetId);
          }
        } catch (error) {
          setWaitlistGeneralError('Verification widget failed to load. Please refresh and try again.');
          return;
        }
      }

      if (turnstileSiteKey && !turnstileToken) {
        setWaitlistGeneralError('Please complete the verification challenge.');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.6'; }

      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, company, turnstileToken }),
        });
        const payload = await res.json().catch(() => null);

        const content = modal.querySelector('.modal-content');
        if (res.ok) {
          content.innerHTML = '<div class="text-center py-6">' +
            '<div class="size-16 rounded-full bg-dark/10 flex items-center justify-center mx-auto mb-4">' +
              '<span class="material-symbols-outlined text-dark text-3xl">check_circle</span>' +
            '</div>' +
            '<h3 class="text-xl font-bold mb-2">You\'re in.</h3>' +
            '<p class="text-muted text-sm mb-6">Check your inbox — we just sent you your access link.</p>' +
            '<button class="btn-primary w-full py-3" id="waitlist-success-close" type="button">' +
              'Got it' +
            '</button>' +
            '</div>';
          const closeBtn = document.getElementById('waitlist-success-close');
          if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
          }
        } else {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
          const errorMessage = payload && typeof payload.error === 'string'
            ? payload.error
            : 'Something went wrong. Please try again.';

          if (isWaitlistEmailDeliveryUnavailable(payload)) {
            errEl.classList.remove('is-visible');
            setWaitlistGeneralError(errorMessage);
            showWaitlistSupportFallback(name, email);
          } else if (isWaitlistServerSideFailure(payload, res)) {
            errEl.classList.remove('is-visible');
            setWaitlistGeneralError(errorMessage);
          } else {
            errEl.textContent = errorMessage;
            errEl.classList.add('is-visible');
          }
          if (window.turnstile && waitlistTurnstileId !== null) {
            window.turnstile.reset(waitlistTurnstileId);
          }
          console.error('Waitlist signup failed', { status: res.status });
        }
      } catch (error) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
        errEl.classList.remove('is-visible');
        setWaitlistGeneralError('Network error. Please try again.');
        if (window.turnstile && waitlistTurnstileId !== null) {
          window.turnstile.reset(waitlistTurnstileId);
        }
        console.error('Waitlist signup request failed', error);
      }
    });
  }

  if (emailInput) {
    emailInput.addEventListener('input', () => {
      emailInput.classList.remove('is-error');
      if (errEl) errEl.classList.remove('is-visible');
      setWaitlistGeneralError('');
    });
  }
}

// Connect all waitlist buttons
document.querySelectorAll('.waitlist-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (menuOpen) closeMobileMenu();
    openModal();
  });
});

if (modalClose) modalClose.addEventListener('click', closeModal);
if (modalBackdropEl) modalBackdropEl.addEventListener('click', closeModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) {
    closeModal();
  }
});

bindModalForm();

// ── Memory Graph Animation ──
(function initMemoryGraph() {
  const wrap = document.querySelector('.memory-graph-wrap');
  const canvas = document.getElementById('memory-graph-canvas');
  const statusEl = document.getElementById('memory-graph-status');
  if (!wrap || !canvas) return;

  const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
  if (!ctx) {
    if (statusEl) {
      statusEl.textContent = 'AI memory graph';
      statusEl.style.opacity = '0.5';
    }
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  let W, H, cx, cy, maxR;
  let elapsed = 0, lastTs = 0, rafId = 0, isRunning = false;

  const ACCENT = [218, 182, 151];
  const DARK   = [43, 24, 10];
  const MUTED  = [148, 135, 124];
  const rgba   = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  const easeOut   = t => 1 - (1 - t) ** 3;
  const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

  // 3D perspective constants
  const FOV = 500;
  const PARALLAX_X = 0.14;
  const PARALLAX_Y = 0.09;

  // Mouse tracking for 3D parallax
  let mouseNX = 0, mouseNY = 0, targetMX = 0, targetMY = 0;
  wrap.addEventListener('mousemove', e => {
    const rect = wrap.getBoundingClientRect();
    targetMX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    targetMY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });
  wrap.addEventListener('mouseleave', () => { targetMX = 0; targetMY = 0; });

  function resize() {
    const r = wrap.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2;
    cy = H / 2 - 6;
    maxR = Math.min(W, H) * 0.37;
  }

  const nodes = [
    { label: 'Sleep',     orbit: 0.68, speed:  0.12, size: 10, baseAngle: 0 },
    { label: 'Deadlines', orbit: 0.90, speed: -0.08, size: 8.5, baseAngle: 0.75 },
    { label: 'Fatigue',   orbit: 0.55, speed:  0.10, size: 9,  baseAngle: 1.45 },
    { label: 'Walks',     orbit: 0.78, speed: -0.14, size: 8,  baseAngle: 2.15 },
    { label: 'Meetings',  orbit: 0.95, speed:  0.06, size: 7,  baseAngle: 2.85 },
    { label: 'Stress',    orbit: 0.62, speed: -0.11, size: 11, baseAngle: 3.55 },
    { label: 'Focus',     orbit: 0.85, speed:  0.09, size: 8,  baseAngle: 4.25 },
    { label: 'Recovery',  orbit: 0.50, speed: -0.07, size: 8.5, baseAngle: 5.05 },
  ];

  nodes.forEach((n, i) => {
    n.x = 0; n.y = 0; n.z = 0; n.alpha = 0;
    n.px = 0; n.py = 0; n.ps = 1;
    n.phase = Math.random() * Math.PI * 2;
    n.appearAt = 1.5 + i * 0.35;
    n.flashEnd = 0;
    n.corePulse = -1;
  });

  const edges = [
    { from: 1, to: 5, weight: 0.9 },
    { from: 5, to: 2, weight: 0.8 },
    { from: 5, to: 0, weight: 0.7 },
    { from: 3, to: 5, weight: 0.6 },
    { from: 4, to: 2, weight: 0.5 },
    { from: 0, to: 6, weight: 0.65 },
    { from: 7, to: 0, weight: 0.7 },
    { from: 7, to: 3, weight: 0.55 },
    { from: 1, to: 6, weight: 0.6 },
  ];

  edges.forEach(e => {
    e.alpha = 0;
    e.appearAt = Math.max(nodes[e.from].appearAt, nodes[e.to].appearAt) + 0.6;
    e.pulseProgress = -1;
    e.pulseDir = 1;
  });

  const particles = Array.from({ length: 28 }, () => ({
    x: Math.random(), y: Math.random(),
    r: Math.random() * 1.2 + 0.4,
    vy: -(Math.random() * 0.0006 + 0.0002),
    vx: (Math.random() - 0.5) * 0.0003,
    a: Math.random() * 0.12 + 0.03,
    z: (Math.random() - 0.5) * 120,
  }));

  const rings = [];
  let lastRingTime = -3;

  const convergence = 0;
  let lastPulseTime = 0;
  let lastCorePulseTime = 0;
  const phrases = ['Tracking real work\u2026', 'Building your baseline\u2026', 'Modeling your pattern\u2026', 'Flagging drift early\u2026'];
  let currentPhrase = -1;

  /* ── 3D projection helper ── */
  function project(x, y, z) {
    const pf = FOV / (FOV + z);
    return {
      x: cx + (x - cx) * pf + z * mouseNX * PARALLAX_X,
      y: cy + (y - cy) * pf + z * mouseNY * PARALLAX_Y,
      s: pf,
    };
  }

  /* ── Reduced motion ── */
  if (prefersReducedMotion()) {
    resize();
    nodes.forEach(n => {
      n.alpha = 1;
      const orb = n.orbit * maxR;
      n.x = cx + Math.cos(n.baseAngle) * orb;
      n.y = cy + Math.sin(n.baseAngle) * orb * 0.72;
      n.z = Math.sin(n.baseAngle) * orb * 0.45;
      const p = project(n.x, n.y, n.z);
      n.px = p.x; n.py = p.y; n.ps = p.s;
    });
    edges.forEach(e => { e.alpha = e.weight; });
    drawFrame(10);
    wrap.style.opacity = '0.001';
    if (statusEl) {
      statusEl.textContent = 'AI memory graph';
      statusEl.style.opacity = '0.5';
    }
    const reducedObserver = createIntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateElementWithFallback(wrap, [
          { opacity: 0.001 },
          { opacity: 1 },
        ], {
          duration: 260,
          easing: 'ease-out',
          fill: 'forwards',
          allowReducedMotion: true,
        });
        reducedObserver.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    reducedObserver.observe(wrap);
    return;
  }

  /* ── Update ── */
  function update(t) {
    // Smooth mouse lerp
    mouseNX += (targetMX - mouseNX) * 0.06;
    mouseNY += (targetMY - mouseNY) * 0.06;


    // Nodes
    nodes.forEach(n => {
      n.alpha = easeOut(Math.min(1, Math.max(0, (t - n.appearAt) / 0.8)));
      const angle = n.baseAngle + t * n.speed;
      const wobble = Math.sin(t * 0.5 + n.phase) * 3;
      const orb = n.orbit * maxR * (1 - convergence * 0.25);
      n.x = cx + Math.cos(angle) * (orb + wobble);
      n.y = cy + Math.sin(angle) * (orb + wobble) * 0.72;
      n.z = Math.sin(angle) * (orb + wobble) * 0.45;

      // Project to 3D
      const p = project(n.x, n.y, n.z);
      n.px = p.x; n.py = p.y; n.ps = p.s;

      if (n.corePulse >= 0) {
        n.corePulse += 0.015;
        if (n.corePulse > 1) n.corePulse = -1;
      }
    });

    if (t > 3 && t - lastCorePulseTime > 0.8 + Math.random() * 0.6) {
      const cands = nodes.filter(n => n.corePulse < 0 && n.alpha > 0.5);
      if (cands.length) {
        cands[Math.floor(Math.random() * cands.length)].corePulse = 0;
        lastCorePulseTime = t;
      }
    }

    edges.forEach(e => {
      e.alpha = easeOut(Math.min(1, Math.max(0, (t - e.appearAt) / 1.0))) * e.weight;
      if (e.pulseProgress >= 0) {
        e.pulseProgress += 0.013;
        if (e.pulseProgress > 1) {
          e.pulseProgress = -1;
          (e.pulseDir > 0 ? nodes[e.to] : nodes[e.from]).flashEnd = t + 0.35;
        }
      }
    });

    if (t > 4.5 && t - lastPulseTime > 1.4 + Math.random() * 1.2) {
      const cands = edges.filter(e => e.pulseProgress < 0 && e.alpha > 0.2);
      if (cands.length) {
        const e = cands[Math.floor(Math.random() * cands.length)];
        e.pulseProgress = 0;
        e.pulseDir = Math.random() > 0.5 ? 1 : -1;
        lastPulseTime = t;
      }
    }

    if (t - lastRingTime > 3.5) { rings.push(t); lastRingTime = t; }
    while (rings.length && t - rings[0] > 5) rings.shift();

    particles.forEach(p => {
      p.y += p.vy; p.x += p.vx;
      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
      if (p.x < -0.02 || p.x > 1.02) p.x = Math.random();
    });

    const pi = Math.floor(t / 3) % phrases.length;
    if (pi !== currentPhrase && statusEl) {
      currentPhrase = pi;
      statusEl.style.opacity = '0';
      setTimeout(() => {
        if (statusEl) { statusEl.textContent = phrases[pi]; statusEl.style.opacity = '0.5'; }
      }, 300);
    }
  }

  /* ── Draw (3D-enhanced) ── */
  function drawFrame(t) {
    ctx.clearRect(0, 0, W, H);

    // Core projected position (z = 0, subtle mouse response)
    const cpx = cx + mouseNX * 4;
    const cpy = cy + mouseNY * 3;

    // Background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(cpx, cpy, 0, cpx, cpy, maxR * 1.8);
    bg.addColorStop(0, rgba(ACCENT, 0.035 + convergence * 0.03));
    bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Particles with depth
    particles.forEach(p => {
      const pp = project(p.x * W, p.y * H, p.z);
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, p.r * pp.s, 0, Math.PI * 2);
      ctx.fillStyle = rgba(ACCENT, p.a * (0.6 + pp.s * 0.4));
      ctx.fill();
    });

    // Sonar rings
    rings.forEach(born => {
      const age = t - born;
      const r = age * 22;
      const a = Math.max(0, 0.18 - age * 0.036);
      if (a <= 0) return;
      ctx.beginPath();
      ctx.arc(cpx, cpy, r, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(ACCENT, a);
      ctx.lineWidth = 0.7;
      ctx.stroke();
    });

    // Sort nodes back-to-front for correct 3D overlap
    const sorted = [...nodes].sort((a, b) => a.z - b.z);

    // Node-to-core connections (behind nodes)
    sorted.forEach(n => {
      if (n.alpha < 0.05) return;
      const al = (0.2 + convergence * 0.25) * n.alpha;
      const depthDim = 0.6 + n.ps * 0.4;

      const dx = n.px - cpx, dy = n.py - cpy;
      const mx = cpx + dx * 0.5 + dy * 0.08;
      const my = cpy + dy * 0.5 - dx * 0.08;
      ctx.beginPath();
      ctx.moveTo(n.px, n.py);
      ctx.quadraticCurveTo(mx, my, cpx, cpy);
      ctx.strokeStyle = rgba(ACCENT, al * 0.5 * depthDim);
      ctx.lineWidth = (1.8 + convergence * 0.6) * n.ps;
      ctx.stroke();

      // Traveling pulse toward core
      if (n.corePulse >= 0 && n.corePulse <= 1) {
        const u = n.corePulse;
        const px = (1 - u) ** 2 * n.px + 2 * (1 - u) * u * mx + u ** 2 * cpx;
        const py = (1 - u) ** 2 * n.py + 2 * (1 - u) * u * my + u ** 2 * cpy;
        const pulseZ = n.z * (1 - u);
        const pp = FOV / (FOV + pulseZ);
        const pr = 12 * pp;

        const pg = ctx.createRadialGradient(px, py, 0, px, py, pr);
        pg.addColorStop(0, rgba(ACCENT, 0.9));
        pg.addColorStop(0.35, rgba(ACCENT, 0.35));
        pg.addColorStop(1, rgba(ACCENT, 0));
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 2.5 * pp, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
      }
    });

    // Edge connections
    edges.forEach(e => {
      if (e.alpha < 0.02) return;
      const nA = nodes[e.from], nB = nodes[e.to];
      const minA = Math.min(nA.alpha, nB.alpha);
      const al = e.alpha * minA * (1 + convergence * 0.8);
      const edgeDepth = 0.6 + ((nA.ps + nB.ps) / 2) * 0.4;

      const mx = (nA.px + nB.px) / 2 + (cpy - (nA.py + nB.py) / 2) * 0.12;
      const my = (nA.py + nB.py) / 2 - (cpx - (nA.px + nB.px) / 2) * 0.06;
      ctx.beginPath();
      ctx.moveTo(nA.px, nA.py);
      ctx.quadraticCurveTo(mx, my, nB.px, nB.py);
      ctx.strokeStyle = rgba(ACCENT, al * 0.3 * edgeDepth);
      ctx.lineWidth = (1.2 + convergence * 0.5) * ((nA.ps + nB.ps) / 2);
      ctx.stroke();

      // Traveling pulse
      if (e.pulseProgress >= 0 && e.pulseProgress <= 1) {
        const u = e.pulseDir > 0 ? e.pulseProgress : 1 - e.pulseProgress;
        const px = (1 - u) ** 2 * nA.px + 2 * (1 - u) * u * mx + u ** 2 * nB.px;
        const py = (1 - u) ** 2 * nA.py + 2 * (1 - u) * u * my + u ** 2 * nB.py;
        const pz = nA.z + (nB.z - nA.z) * u;
        const pp = FOV / (FOV + pz);
        const pr = 13 * pp;

        const pg = ctx.createRadialGradient(px, py, 0, px, py, pr);
        pg.addColorStop(0, rgba(ACCENT, 0.85));
        pg.addColorStop(0.3, rgba(ACCENT, 0.35));
        pg.addColorStop(1, rgba(ACCENT, 0));
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 2.5 * pp, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fill();
      }
    });

    // Core (3D sphere)
    const coreAppear = easeOut(Math.min(1, t / 1.2));
    const corePulse = 1 + Math.sin(t * 1.8) * 0.06 + convergence * 0.15;
    const coreR = 18 * corePulse;

    // Core shadow
    ctx.beginPath();
    ctx.ellipse(cpx + 1, cpy + coreR * 1.8, coreR * 1.2, coreR * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(DARK, 0.06 * coreAppear);
    ctx.fill();

    // Core outer glow
    const cg = ctx.createRadialGradient(cpx, cpy, 0, cpx, cpy, coreR * 5);
    cg.addColorStop(0, rgba(ACCENT, (0.28 + convergence * 0.2) * coreAppear));
    cg.addColorStop(0.4, rgba(ACCENT, (0.1 + convergence * 0.08) * coreAppear));
    cg.addColorStop(1, rgba(ACCENT, 0));
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cpx, cpy, coreR * 5, 0, Math.PI * 2);
    ctx.fill();

    // Core body — 3D sphere gradient (light from top-left)
    const cb = ctx.createRadialGradient(
      cpx - coreR * 0.35, cpy - coreR * 0.35, coreR * 0.1,
      cpx, cpy, coreR
    );
    cb.addColorStop(0, `rgba(255,252,247,${0.98 * coreAppear})`);
    cb.addColorStop(0.45, rgba(ACCENT, 0.9 * coreAppear));
    cb.addColorStop(1, rgba(DARK, 0.35 * coreAppear));
    ctx.fillStyle = cb;
    ctx.beginPath();
    ctx.arc(cpx, cpy, coreR, 0, Math.PI * 2);
    ctx.fill();

    // Core rim light (bottom-right edge)
    ctx.beginPath();
    ctx.arc(cpx, cpy, coreR, 0, Math.PI * 2);
    const rim = ctx.createRadialGradient(
      cpx + coreR * 0.4, cpy + coreR * 0.4, coreR * 0.6,
      cpx, cpy, coreR
    );
    rim.addColorStop(0, 'transparent');
    rim.addColorStop(0.85, 'transparent');
    rim.addColorStop(1, rgba(ACCENT, 0.4 * coreAppear));
    ctx.fillStyle = rim;
    ctx.fill();

    // Core specular highlight
    ctx.beginPath();
    ctx.ellipse(cpx - coreR * 0.22, cpy - coreR * 0.22, coreR * 0.32, coreR * 0.22, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.55 * coreAppear})`;
    ctx.fill();

    // "AI" label
    ctx.font = `700 ${coreR * 0.85}px "Geist","Geist Placeholder",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255,255,255,${(0.85 + convergence * 0.15) * coreAppear})`;
    ctx.fillText('AI', cpx, cpy + coreR * 0.05);


    // Nodes — 3D spheres, sorted back-to-front
    // Pass 1: shadows
    sorted.forEach(n => {
      if (n.alpha < 0.02) return;
      const flash = n.flashEnd > t ? (n.flashEnd - t) / 0.35 : 0;
      const sz = n.size * n.ps * (1 + flash * 0.4 + convergence * 0.12);

      ctx.beginPath();
      ctx.ellipse(n.px + 1, n.py + sz + 5, sz * 0.75, sz * 0.18, 0, 0, Math.PI * 2);
      ctx.fillStyle = rgba(DARK, 0.07 * n.alpha * n.ps);
      ctx.fill();
    });

    // Pass 2: spheres + labels
    sorted.forEach(n => {
      if (n.alpha < 0.02) return;
      const flash = n.flashEnd > t ? (n.flashEnd - t) / 0.35 : 0;
      const sz = n.size * n.ps * (1 + flash * 0.4 + convergence * 0.12);
      const depthAlpha = 0.55 + n.ps * 0.45;

      // Glow on flash / convergence
      if (flash > 0 || convergence > 0.1) {
        const gr = sz * (2.5 + flash * 2);
        const ng = ctx.createRadialGradient(n.px, n.py, 0, n.px, n.py, gr);
        ng.addColorStop(0, rgba(ACCENT, Math.max(flash * 0.5, convergence * 0.18) * n.alpha * depthAlpha));
        ng.addColorStop(1, rgba(ACCENT, 0));
        ctx.fillStyle = ng;
        ctx.beginPath();
        ctx.arc(n.px, n.py, gr, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3D sphere body — light from top-left
      const nc = flash > 0.3 ? ACCENT : DARK;
      const bodyA = (0.5 + flash * 0.45 + convergence * 0.2) * n.alpha * depthAlpha;
      const sGrad = ctx.createRadialGradient(
        n.px - sz * 0.32, n.py - sz * 0.32, sz * 0.08,
        n.px, n.py, sz
      );
      sGrad.addColorStop(0, `rgba(255,252,248,${Math.min(1, bodyA + 0.35)})`);
      sGrad.addColorStop(0.4, rgba(nc, bodyA));
      sGrad.addColorStop(1, rgba(DARK, bodyA * 0.6));
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.arc(n.px, n.py, sz, 0, Math.PI * 2);
      ctx.fill();

      // Rim light (bottom-right edge)
      const rimG = ctx.createRadialGradient(
        n.px + sz * 0.35, n.py + sz * 0.35, sz * 0.5,
        n.px, n.py, sz
      );
      rimG.addColorStop(0, 'transparent');
      rimG.addColorStop(0.8, 'transparent');
      rimG.addColorStop(1, rgba(ACCENT, 0.3 * n.alpha * depthAlpha));
      ctx.fillStyle = rimG;
      ctx.beginPath();
      ctx.arc(n.px, n.py, sz, 0, Math.PI * 2);
      ctx.fill();

      // Specular highlight
      ctx.beginPath();
      ctx.ellipse(n.px - sz * 0.2, n.py - sz * 0.2, sz * 0.28, sz * 0.18, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${(0.45 + flash * 0.3) * n.alpha * depthAlpha})`;
      ctx.fill();

      // Label — scale with depth
      const fontSize = Math.round(12 * n.ps);
      ctx.font = `500 ${fontSize}px "Geist","Geist Placeholder",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = rgba(MUTED, (0.5 + flash * 0.3 + convergence * 0.15) * n.alpha * depthAlpha);
      ctx.fillText(n.label, n.px, n.py + sz + 7);
    });

  }

  /* ── Loop ── */
  function frame(ts) {
    if (!isRunning) return;
    if (lastTs) elapsed += (ts - lastTs) / 1000;
    lastTs = ts;
    update(elapsed);
    drawFrame(elapsed);
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    lastTs = 0;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    isRunning = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lastTs = 0;
  }

  resize();
  createResizeObserver(resize).observe(wrap);
  createIntersectionObserver(([entry]) => {
    entry.isIntersecting ? start() : stop();
  }, { threshold: 0.1 }).observe(wrap);
})();

// ── Hypothesis Formation Animation ──
(function initHypothesisAnim() {
  const wrap = document.getElementById('hyp-wrap');
  if (!wrap) return;

  const statusBar = document.getElementById('hyp-status-bar');
  const statusText = document.getElementById('hyp-status-text');
  const signals = [
    document.getElementById('hyp-sig-0'),
    document.getElementById('hyp-sig-1'),
    document.getElementById('hyp-sig-2'),
  ];
  const divider = document.getElementById('hyp-divider');
  const body = document.getElementById('hyp-body');
  const textEl = document.getElementById('hyp-text');
  const cursor = document.getElementById('hyp-cursor');
  const footer = document.getElementById('hyp-footer');
  const confFill = document.getElementById('hyp-conf-fill');
  const confVal = document.getElementById('hyp-conf-val');

  const HYPOTHESIS =
    'Stress spikes to 9/10 on days with 3+ meetings (Thu\u2013Fri), ' +
    'while sleep drops to 3/10 and recovery stays critically low. ' +
    'This high-load \u2192 poor-recovery cycle, repeated 3 days in a row, ' +
    'signals accelerating burnout risk.';

  let tids = [];
  let typingInterval = 0;
  let confInterval = 0;
  let isRunning = false;

  function sched(fn, ms) {
    const id = setTimeout(fn, ms);
    tids.push(id);
    return id;
  }

  function reset() {
    tids.forEach(clearTimeout);
    tids = [];
    if (typingInterval) { clearInterval(typingInterval); typingInterval = 0; }
    if (confInterval) { clearInterval(confInterval); confInterval = 0; }

    wrap.style.opacity = '1';
    wrap.style.transition = 'none';
    statusBar.style.opacity = '0';
    statusText.textContent = 'Scanning check-ins\u2026';
    signals.forEach(s => { s.classList.remove('is-visible', 'is-linked'); });
    divider.classList.remove('is-visible');
    body.classList.remove('is-visible');
    textEl.textContent = '';
    cursor.style.display = 'inline-block';
    footer.classList.remove('is-visible');
    confFill.style.transition = 'none';
    confFill.style.width = '0%';
    confVal.textContent = 'Confidence: 0%';
  }

  function typeWords(text, el, done) {
    const words = text.split(' ');
    let i = 0;
    function next() {
      if (i >= words.length) { if (done) done(); return; }
      el.textContent += (i > 0 ? ' ' : '') + words[i];
      const ch = words[i].slice(-1);
      i++;
      const pause = ch === '.' || ch === '?' || ch === '!' ? 180
                   : ch === ',' || ch === '\u2014' || ch === ')' ? 110
                   : 50 + Math.random() * 35;
      sched(next, pause);
    }
    next();
  }

  function runCycle() {
    reset();

    // 0ms — status appears
    sched(() => { statusBar.style.opacity = '1'; }, 50);

    // 500–1700ms — signal cards stagger in
    signals.forEach((s, i) => {
      sched(() => s.classList.add('is-visible'), 500 + i * 600);
    });

    // 2400ms — connect signals, status update
    sched(() => {
      statusText.textContent = 'Connecting signals\u2026';
      signals.forEach(s => s.classList.add('is-linked'));
      divider.classList.add('is-visible');
    }, 2400);

    // 3200ms — body appears, typing starts
    sched(() => {
      statusText.textContent = 'Forming hypothesis\u2026';
      body.classList.add('is-visible');
      typeWords(HYPOTHESIS, textEl, () => {
        cursor.style.display = 'none';
      });
    }, 3200);

    // 7800ms — confidence bar fills
    sched(() => {
      statusText.textContent = 'Evaluating confidence\u2026';
      footer.classList.add('is-visible');
      sched(() => {
        confFill.style.transition = 'width 1.6s cubic-bezier(0.22,1,0.36,1)';
        confFill.style.width = '82%';
        let pct = 0;
        confInterval = setInterval(() => {
          pct += 2;
          if (pct >= 82) { pct = 82; clearInterval(confInterval); confInterval = 0; }
          confVal.textContent = 'Confidence: ' + pct + '%';
        }, 35);
      }, 150);
    }, 7800);

    // 9800ms — confirmed
    sched(() => {
      statusText.textContent = 'Hypothesis confirmed \u2713';
    }, 9800);

    // 12500ms — fade out
    sched(() => {
      wrap.style.transition = 'opacity 0.8s ease';
      wrap.style.opacity = '0';
    }, 12500);

    // 13500ms — restart
    sched(() => {
      if (isRunning) runCycle();
    }, 13500);
  }

  /* ── Reduced motion: gentle fade-in without motion-heavy loops ── */
  if (prefersReducedMotion()) {
    let hasRevealed = false;
    const reducedObserver = createIntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || hasRevealed) return;
        hasRevealed = true;
        reset();
        statusBar.style.opacity = '1';
        signals.forEach((signal, index) => {
          sched(() => {
            signal.classList.add('is-visible');
          }, 120 + index * 90);
        });
        sched(() => {
          statusText.textContent = 'Hypothesis confirmed \u2713';
          signals.forEach(s => s.classList.add('is-linked'));
          divider.classList.add('is-visible');
        }, 420);
        sched(() => {
          body.classList.add('is-visible');
          textEl.textContent = HYPOTHESIS;
          cursor.style.display = 'none';
        }, 560);
        sched(() => {
          footer.classList.add('is-visible');
          confFill.style.transition = 'width 0.8s ease';
          confFill.style.width = '82%';
          confVal.textContent = 'Confidence: 82%';
        }, 720);
        reducedObserver.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    reducedObserver.observe(wrap);
    return;
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    runCycle();
  }

  function stop() {
    isRunning = false;
    tids.forEach(clearTimeout);
    tids = [];
    if (typingInterval) { clearInterval(typingInterval); typingInterval = 0; }
    if (confInterval) { clearInterval(confInterval); confInterval = 0; }
  }

  createIntersectionObserver(([entry]) => {
    entry.isIntersecting ? start() : stop();
  }, { threshold: 0.15 }).observe(wrap);
})();

// ── Conclusion & Recovery Plan Animation ──
(function initConclusionAnim() {
  const wrap = document.getElementById('concl-wrap');
  if (!wrap) return;

  const header = document.getElementById('concl-header');
  const output = document.getElementById('concl-output');
  const status = document.getElementById('concl-status');

  const LINES = [
    { text: 'Analyzing 14 days of check-in data\u2026', type: 'neutral' },
    { text: 'Stress elevated 9/10 \u2014 3 consecutive days', type: 'finding' },
    { text: 'Sleep quality dropped below 4/10', type: 'finding' },
    { text: 'Recovery capacity critically low', type: 'finding' },
    { text: 'Work-distance score trending upward', type: 'finding' },
    { text: null, type: 'risk', risk: 73 },
    { text: null, type: 'spacer' },
    { text: 'Running 30-day projection\u2026', type: 'neutral' },
    { text: null, type: 'predict', from: 73, to: 91, days: 30 },
    { text: 'Emotional exhaustion likely within 2\u20133 weeks', type: 'warn' },
    { text: 'Cognitive performance projected to drop 40%', type: 'warn' },
  ];

  let tids = [];
  let isRunning = false;

  function sched(fn, ms) {
    const id = setTimeout(fn, ms);
    tids.push(id);
    return id;
  }

  function reset() {
    tids.forEach(clearTimeout);
    tids = [];
    wrap.style.opacity = '1';
    wrap.style.transition = 'none';
    header.classList.remove('is-visible');
    output.innerHTML = '';
    status.innerHTML = '';
    status.className = 'concl-status';
  }

  function addLine(cfg, cb) {
    if (cfg.type === 'spacer') {
      const sp = document.createElement('div');
      sp.className = 'concl-spacer';
      output.appendChild(sp);
      return;
    }

    const el = document.createElement('div');
    el.className = 'concl-line';

    if (cfg.type === 'finding') el.classList.add('is-finding');
    if (cfg.type === 'warn') el.classList.add('is-warn');
    if (cfg.type === 'risk') {
      el.classList.add('is-highlight');
      el.innerHTML = 'Burnout Risk: <span class="concl-risk-val">' + cfg.risk + '%</span> <span class="concl-risk-badge">High Risk</span>';
    } else if (cfg.type === 'predict') {
      el.classList.add('is-predict');
      el.innerHTML = 'If nothing changes: <span class="concl-risk-val">' + cfg.from + '%</span> <span class="concl-predict-arrow">\u2192</span> <span class="concl-predict-val" id="concl-predict-counter">' + cfg.from + '%</span> in ' + cfg.days + ' days';
    } else {
      el.textContent = cfg.text;
    }

    output.appendChild(el);

    // trigger reflow then show
    void el.offsetWidth;
    sched(() => {
      el.classList.add('is-visible');
      // animate counter for predict line
      if (cfg.type === 'predict') {
        const counter = document.getElementById('concl-predict-counter');
        if (counter) animateCounter(counter, cfg.from, cfg.to, 1400);
      }
      if (cb) sched(cb, 200);
    }, 30);
  }

  function animateCounter(el, from, to, duration) {
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const val = Math.round(from + (to - from) * eased);
      el.textContent = val + '%';
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function showStatus(html, done) {
    status.innerHTML = html;
    status.classList.add('is-visible');
    if (done) status.classList.add('is-done');
  }

  function runCycle() {
    reset();

    // 0ms — header appears
    sched(() => header.classList.add('is-visible'), 100);

    // Lines stagger in
    let t = 500;
    LINES.forEach((line, i) => {
      if (line.type === 'spacer') { t += 300; sched(() => addLine(line), t); return; }
      const delay = i === 0 ? 600
                  : line.type === 'risk' ? 900
                  : line.type === 'predict' ? 1100
                  : line.type === 'warn' ? 700
                  : 650;
      t += delay;
      sched(() => addLine(line), t);
    });

    // After all lines — "Composing recovery plan…" with spinner
    t += 1200;
    sched(() => {
      showStatus('<span class="concl-status-spinner"></span> Composing recovery plan\u2026');
    }, t);

    // 3s later — switch to "done"
    t += 3000;
    sched(() => {
      status.className = 'concl-status is-visible is-done';
      status.innerHTML = '<span class="concl-status-check"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5.5L4.2 7.5L8 3" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Your Recovery Plan is ready';
    }, t);

    // Fade out & loop
    t += 3500;
    sched(() => {
      wrap.style.transition = 'opacity 0.8s ease';
      wrap.style.opacity = '0';
    }, t);

    t += 1000;
    sched(() => {
      if (isRunning) runCycle();
    }, t);
  }

  /* Reduced motion: staged fade-in without looping */
  if (prefersReducedMotion()) {
    let hasRevealed = false;
    const reducedObserver = createIntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || hasRevealed) return;
        hasRevealed = true;
        reset();
        sched(() => header.classList.add('is-visible'), 80);
        let revealAt = 220;
        LINES.forEach((cfg) => {
          revealAt += cfg.type === 'spacer' ? 120 : 110;
          sched(() => {
            addLine(cfg);
            const lastLine = output.lastElementChild;
            if (lastLine && lastLine.classList && lastLine.classList.contains('concl-line')) {
              lastLine.classList.add('is-visible');
              if (cfg.type === 'predict') {
                const counter = document.getElementById('concl-predict-counter');
                if (counter) counter.textContent = cfg.to + '%';
              }
            }
          }, revealAt);
        });
        sched(() => {
          showStatus('<span class="concl-status-check"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5.5L4.2 7.5L8 3" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Your Recovery Plan is ready', true);
        }, revealAt + 280);
        reducedObserver.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    reducedObserver.observe(wrap);
    return;
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    runCycle();
  }

  function stop() {
    isRunning = false;
    tids.forEach(clearTimeout);
    tids = [];
  }

  createIntersectionObserver(([entry]) => {
    entry.isIntersecting ? start() : stop();
  }, { threshold: 0.15 }).observe(wrap);
})();

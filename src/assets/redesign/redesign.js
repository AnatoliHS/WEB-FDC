/* Family Dental Centre: redesign concept interactions */
(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isWide = () => innerWidth > 1080;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };

  /* ── Load-in ───────────────────────────────────────────── */
  const ready = () => requestAnimationFrame(() => root.classList.add('is-loaded'));
  // primary trigger is the inline script after the hero; this is a fallback
  ready();

  /* ── Smooth scroll ─────────────────────────────────────── */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const scrollToEl = (el, offset = 0) => {
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + offset, behavior: reduce ? 'auto' : 'smooth' });
  };

  /* ── Menu + anchors ────────────────────────────────────── */
  const burger = $('#burger'), menu = $('#menu');
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? body : $(id);
    if (!target) return;
    e.preventDefault();
    setMenu(false);
    const tx = id.startsWith('#tx-');
    scrollToEl(target, id === '#top' ? 0 : tx ? (isWide() ? -60 : -130) : -20);
  }));

  /* ── Clinic data, read once from the Locations section ─── */
  const clinics = {};
  $$('.loc[data-loc]').forEach(loc => {
    const phone = $('.loc__phone', loc);
    const hours = {};
    $$('tr[data-day]', loc).forEach(tr => {
      const [o, c] = (tr.dataset.h || '').split('-').map(Number);
      hours[tr.dataset.day] = o ? [o, c] : null;
      hours[tr.dataset.day + 'txt'] = $('td', tr).textContent.trim();
    });
    clinics[loc.dataset.loc] = { el: loc, phone: phone.textContent.trim(), tel: phone.getAttribute('href'), hours };
  });
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' }));
  const today = now.getDay(), hr = now.getHours() + now.getMinutes() / 60;
  const fmtH = h => `${h % 12 || 12}${h >= 12 ? 'pm' : 'am'}`;
  const statusOf = key => {
    const h = clinics[key].hours, t = h[today];
    if (t && hr >= t[0] && hr < t[1]) return { open: true, text: `Open now · until ${fmtH(t[1])}` };
    if (t && hr < t[0]) return { open: false, text: `Opens today at ${fmtH(t[0])}` };
    if (!t && /appointment/i.test(h[today + 'txt'])) return { open: false, text: 'By appointment today' };
    return { open: false, text: t ? 'Closed for the day' : 'Closed today' };
  };

  // Locations cards
  Object.entries(clinics).forEach(([key, c]) => {
    const s = statusOf(key), el = $('[data-status]', c.el);
    el.textContent = s.text; el.classList.toggle('is-open', s.open);
    $(`tr[data-day="${today}"]`, c.el)?.classList.add('is-today');
  });
  if (innerWidth < 760) $$('.loc__hours').forEach(d => d.removeAttribute('open'));

  // Booking desk
  $$('[data-desk]').forEach(row => {
    const s = statusOf(row.dataset.desk);
    $('.desk__status span', row).textContent = s.text;
    $('.status-dot', row).classList.toggle('is-open', s.open);
  });

  /* ── Hero concierge ────────────────────────────────────── */
  const seg = $('.seg'), pill = $('.seg__pill');
  const segBtns = $$('button', seg);
  const cStatus = $('[data-c-status]'), cDot = $('[data-c-dot]'), cPhone = $('[data-c-phone]');
  const placePill = () => {
    const b = $('[aria-checked="true"]', seg);
    pill.style.left = b.offsetLeft + 'px';
    pill.style.width = b.offsetWidth + 'px';
  };
  const choose = (key, save) => {
    if (!clinics[key]) return;
    segBtns.forEach(b => b.setAttribute('aria-checked', b.dataset.loc === key));
    const s = statusOf(key);
    cStatus.textContent = s.text;
    cDot.classList.toggle('is-open', s.open);
    cPhone.textContent = clinics[key].phone;
    cPhone.href = clinics[key].tel;
    placePill();
    if (save) store.set('fdc-clinic', key);
  };
  segBtns.forEach((b, i) => {
    b.addEventListener('click', () => choose(b.dataset.loc, true));
    b.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const n = segBtns[(i + d + segBtns.length) % segBtns.length];
      n.focus(); choose(n.dataset.loc, true);
    });
  });
  choose(store.get('fdc-clinic') || 'belleville');
  document.fonts?.ready.then(placePill);
  addEventListener('resize', placePill);

  /* ── Film toggle ───────────────────────────────────────── */
  const film = $('#film'), filmToggle = $('#filmToggle');
  if (reduce) { film.removeAttribute('autoplay'); film.pause(); }
  const syncToggle = () => {
    const paused = film.paused;
    filmToggle.setAttribute('aria-pressed', paused);
    $('.film__toggle-text', filmToggle).textContent = paused ? 'Play film' : 'Pause film';
  };
  filmToggle.addEventListener('click', () => { film.paused ? film.play() : film.pause(); });
  film.addEventListener('play', syncToggle); film.addEventListener('pause', syncToggle);
  syncToggle();

  /* ── Pillars ───────────────────────────────────────────── */
  const pillars = $$('.pillar');
  const activate = p => pillars.forEach(x => x.classList.toggle('is-active', x === p));
  pillars.forEach(p => {
    if (finePointer) p.addEventListener('mouseenter', () => activate(p));
    p.addEventListener('focus', () => activate(p));
    p.addEventListener('click', () => activate(p));
  });

  /* ── Welcome statement: split words, keep inline images ── */
  const scrub = $('[data-scrub]');
  const scrubUnits = [];
  if (scrub) {
    [...scrub.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = part;
          frag.appendChild(s); scrubUnits.push(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) { n.classList.add('w'); scrubUnits.push(n); }
    });
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { scrub.classList.add('is-in'); o.disconnect(); } }, { threshold: 0.3 }).observe(scrub);
  }

  /* ── Reveal ────────────────────────────────────────────── */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
  $$('[data-reveal]').forEach(el => io.observe(el));

  /* ── Counters ──────────────────────────────────────────── */
  const cio = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    if (reduce) return;
    const el = e.target, end = +el.dataset.count, plain = el.hasAttribute('data-plain');
    const start = plain ? end - 40 : 0, t0 = performance.now();
    const tick = t => {
      const k = clamp((t - t0) / 2000, 0, 1), v = Math.round(start + (end - start) * (1 - Math.pow(1 - k, 4)));
      el.textContent = plain ? v : v.toLocaleString('en-CA');
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ── Treatments: index, chips & stage synced to entry in view ─ */
  const entries = $$('.entry');
  const stage = $('#treatStage');
  const indexLinks = $$('.treat__index a');
  const chips = $$('.treat__chips a');
  const chipBar = $('.treat__chips');
  const treatBar = $('#treatBar');
  const figs = entries.map(en => {
    const f = $('.entry__img', en).cloneNode(true);
    f.className = '';
    $('img', f).loading = 'eager';
    stage.appendChild(f);
    return f;
  });
  let activeTx = -1, z = 1;
  const setTx = i => {
    if (i === activeTx) return;
    const prev = activeTx; activeTx = i;
    entries.forEach((en, k) => en.classList.toggle('is-active', k === i));
    indexLinks.forEach((a, k) => a.classList.toggle('is-active', k === i));
    chips.forEach((a, k) => a.classList.toggle('is-active', k === i));
    figs.forEach(f => f.classList.remove('was-active'));
    if (prev >= 0) { figs[prev].classList.remove('is-active'); figs[prev].classList.add('was-active'); }
    figs[i].style.zIndex = ++z;
    figs[i].classList.add('is-active');
    const c = chips[i];
    if (c && chipBar.scrollWidth > chipBar.clientWidth) {
      chipBar.scrollTo({ left: c.offsetLeft - chipBar.clientWidth / 2 + c.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
  };
  setTx(0);
  const tio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) setTx(entries.indexOf(e.target));
  }), { rootMargin: '-45% 0px -50% 0px' });
  entries.forEach(en => tio.observe(en));

  /* ── Team: pinned horizontal walk (desktop) ────────────── */
  const pin = $('#teamPin'), track = $('#teamTrack');
  const teamNow = $('#teamNow'), teamBar = $('#teamBar');
  const members = $$('.member:not(.member--end)', track);
  let travel = 0;
  const sizeTeam = () => {
    if (isWide() && !reduce) {
      travel = Math.max(0, track.scrollWidth - innerWidth);
      pin.style.height = `${innerHeight + travel}px`;
    } else {
      travel = 0; pin.style.height = ''; track.style.transform = '';
    }
  };
  const setTeam = p => {
    teamBar.style.transform = `scaleX(${p})`;
    teamNow.textContent = String(Math.min(members.length, 1 + Math.round(p * (members.length - 1)))).padStart(2, '0');
  };
  track.addEventListener('scroll', () => {
    if (travel) return;
    setTeam(clamp(track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth), 0, 1));
  }, { passive: true });

  /* ── Scroll-linked effects ─────────────────────────────── */
  const nav = $('#nav'), heroGlow = $('.hero__glow'), hero = $('.hero');
  const filmSec = $('.film'), treatSec = $('.treat');
  const orbTeal = $('.orb--teal'), orbBrass = $('.orb--brass');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY, vh = innerHeight;

    const scrolled = y > hero.offsetHeight - 90;
    nav.classList.toggle('is-scrolled', scrolled);
    const hide = y > lastY && y > vh && !body.classList.contains('menu-open');
    nav.classList.toggle('is-hidden', hide);
    body.classList.toggle('nav-visible', !hide && y > 10);
    lastY = y;

    if (reduce) return;

    if (y < hero.offsetHeight) heroGlow.style.transform = `translate3d(0, ${y * 0.18}px, 0)`;

    if (scrubUnits.length) {
      const r = scrub.getBoundingClientRect();
      const p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.4), 0, 1);
      const n = Math.round(p * scrubUnits.length);
      scrubUnits.forEach((w, i) => w.classList.toggle('on', i < n));
    }

    const docP = y / Math.max(1, document.documentElement.scrollHeight - vh);
    orbTeal.style.transform = `translate3d(${Math.sin(docP * 6.3) * 18}vw, ${docP * 40 - 10}vh, 0)`;
    orbBrass.style.transform = `translate3d(${Math.cos(docP * 5) * -14}vw, ${docP * 70}vh, 0)`;

    const fr = filmSec.getBoundingClientRect();
    if (fr.bottom > 0 && fr.top < vh) {
      const p = clamp(1 - fr.top / vh, 0, 1);
      film.style.setProperty('--s', (1.15 - p * 0.15).toFixed(4));
    }

    const tr = treatSec.getBoundingClientRect();
    treatBar.style.transform = `scaleX(${clamp((vh * 0.5 - tr.top) / tr.height, 0, 1)})`;

    if (travel) {
      const r = pin.getBoundingClientRect();
      const p = clamp(-r.top / (pin.offsetHeight - vh), 0, 1);
      track.style.transform = `translate3d(${-p * travel}px, 0, 0)`;
      setTeam(p);
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { sizeTeam(); onScroll(); });
  addEventListener('load', () => { sizeTeam(); onScroll(); });
  sizeTeam(); onScroll();

  /* ── Testimonials ──────────────────────────────────────── */
  const quotes = $$('.quote');
  quotes.forEach(q => {
    const bq = $('blockquote', q);
    bq.innerHTML = bq.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
    $$('.w', bq).forEach((w, i) => w.style.transitionDelay = `${i * 18}ms`);
  });
  const qIdx = $('#qIdx'), qBar = $('#qBar');
  const DURATION = 8000;
  let qi = 0, qStart = performance.now(), paused = false, pausedAt = 0;
  const show = i => {
    qi = (i + quotes.length) % quotes.length;
    quotes.forEach((q, k) => { q.classList.toggle('is-active', k === qi); q.setAttribute('aria-hidden', k !== qi); });
    qIdx.textContent = String(qi + 1).padStart(2, '0');
    qStart = performance.now();
  };
  $$('.quotes__btn').forEach(b => b.addEventListener('click', () => show(qi + +b.dataset.dir)));
  const qSec = $('.quotes');
  qSec.addEventListener('mouseenter', () => { paused = true; pausedAt = performance.now(); });
  qSec.addEventListener('mouseleave', () => { paused = false; qStart += performance.now() - pausedAt; });
  const qLoop = t => {
    if (!paused && !reduce) {
      const k = (t - qStart) / DURATION;
      qBar.style.transform = `scaleX(${clamp(k, 0, 1)})`;
      if (k >= 1) show(qi + 1);
    }
    requestAnimationFrame(qLoop);
  };
  show(0);
  requestAnimationFrame(qLoop);
})();

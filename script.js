(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const cfg = window.SITE || {};

  // контакти з config.js
  $$('[data-cfg]').forEach(el => { if (cfg[el.dataset.cfg]) el.textContent = cfg[el.dataset.cfg]; });
  $$('[data-cfg-href]').forEach(el => {
    const k = el.dataset.cfgHref;
    el.href = k === 'mailto' ? 'mailto:' + (cfg.email || '') : (cfg[k] || '#');
    if (k === 'telegram' || k === 'instagram') { el.target = '_blank'; el.rel = 'noopener'; }
  });

  // фото: якщо файл є, показуємо його; якщо ні, лишається слот
  $$('.photo[data-photo]').forEach(box => {
    const names = box.dataset.photo.split(',');
    const tryNext = i => {
      if (i >= names.length) return;
      const img = new Image();
      img.alt = '';
      img.onload = () => {
        box.prepend(img); box.classList.add('has-img');
        box.closest('.hero-visual')?.classList.add('has-photo');
        if (/^maria/.test(names[i])) box.closest('.hero-visual')?.classList.add('has-maria');
      };
      img.onerror = () => tryNext(i + 1);
      img.src = 'assets/photos/' + names[i];
    };
    tryNext(0);
  });

  // логотип з брендбуку: якщо покласти assets/logo-mark.svg, він замінить намальований знак
  const logoProbe = new Image();
  logoProbe.onload = () => $$('.logo svg, .hero-logo svg').forEach(s => {
    const im = new Image(); im.src = 'assets/logo-mark.svg'; im.alt = ''; im.className = 'mark-img';
    im.width = s.getBoundingClientRect().width || 36; im.height = im.width;
    s.replaceWith(im);
  });
  logoProbe.src = 'assets/logo-mark.svg';

  // тінь хедера
  const header = $('#header');
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // мобільне меню
  const burger = $('.burger'), mnav = $('#mnav');
  burger.addEventListener('click', () => {
    const open = mnav.classList.toggle('on');
    burger.setAttribute('aria-expanded', open);
    burger.firstElementChild.className = 'ph ' + (open ? 'ph-x' : 'ph-list');
  });
  mnav.addEventListener('click', e => { if (e.target.tagName === 'A') { mnav.classList.remove('on'); burger.setAttribute('aria-expanded', 'false'); burger.firstElementChild.className = 'ph ph-list'; } });

  // поява при скролі
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' }) : null;
  $$('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

  // біжучі цифри
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('[data-count]').forEach((el, idx) => {
    const end = +el.dataset.count;
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    el.textContent = '0';
    const stat = el.closest('.stat');
    const run = () => {
      const delay = idx * 250, dur = 2600;
      const t0 = performance.now() + delay;
      const tick = now => {
        const p = Math.min(1, Math.max(0, (now - t0) / dur));
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 2)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const cio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) run();
      else el.textContent = '0';
    }), { threshold: .5 });
    cio.observe(stat);
  });

  // фонові фото з брендбуку: з'являються лише якщо файл лежить в assets/photos
  $$('[data-bgphoto]').forEach(box => {
    const img = new Image(); img.alt = '';
    img.onload = () => box.append(img);
    img.src = 'assets/photos/' + box.dataset.bgphoto;
  });

  // рифлені папки: наведення, фокус або дотик висувають папку вперед
  // на вузькому екрані папки складені закритими, дотик відкриває вікно «Детальніше» цієї послуги
  const folders = $$('.folder');
  const narrow = matchMedia('(max-width:1180px)');
  const openFolder = f => folders.forEach(x => x.classList.toggle('on', x === f));
  folders.forEach(f => {
    const name = document.createElement('span');
    name.className = 'f-name'; name.setAttribute('aria-hidden', 'true');
    name.textContent = f.getAttribute('aria-label');
    const more = document.createElement('span');
    more.className = 'f-more'; more.setAttribute('aria-hidden', 'true');
    more.innerHTML = '<i class="ph ph-plus"></i>';
    f.querySelector('.f-card').append(name, more);
    f.addEventListener('mouseenter', () => { if (!narrow.matches) openFolder(f); });
    f.addEventListener('focusin', () => { if (!narrow.matches) openFolder(f); });
    f.addEventListener('click', () => { if (!narrow.matches) openFolder(f); });
    f.addEventListener('keydown', e => { if (narrow.matches && (e.key === 'Enter' || e.key === ' ') && e.target === f) { e.preventDefault(); f.click(); } });
  });
  // дані вікна вішаємо на саму папку лише на телефоні, тож клік по ній відкриває вікно
  const syncFolders = () => {
    folders.forEach(f => {
      const id = f.querySelector('[data-drawer]')?.dataset.drawer;
      if (narrow.matches && id) { f.dataset.drawer = id; f.setAttribute('role', 'button'); }
      else { delete f.dataset.drawer; f.removeAttribute('role'); }
    });
    if (narrow.matches) openFolder(null);
    else if (!folders.some(x => x.classList.contains('on'))) openFolder(folders[0]);
  };
  syncFolders();
  narrow.addEventListener('change', syncFolders);
  // гортання на телефоні: помаранчева лише одна папка, найближча до середини екрана
  const setHot = f => folders.forEach(x => x.classList.toggle('hot', x === f));
  let hotRaf = 0;
  const pickHot = () => {
    hotRaf = 0;
    if (!narrow.matches) return setHot(null);
    const mid = innerHeight / 2;
    let best = null, dist = Infinity;
    folders.forEach(f => {
      const r = f.getBoundingClientRect();
      const d = mid < r.top ? r.top - mid : mid > r.bottom ? mid - r.bottom : 0;
      if (d < dist) { dist = d; best = f; }
    });
    setHot(dist < 60 ? best : null);
  };
  addEventListener('scroll', () => { if (!hotRaf) hotRaf = requestAnimationFrame(pickHot); }, { passive: true });
  addEventListener('resize', pickHot);
  folders.forEach(f => f.addEventListener('pointerdown', () => { if (narrow.matches) setHot(f); }));
  pickHot();
  // поява на телефоні: кожна папка лягає, коли сама доходить до екрана
  const seenIO = new IntersectionObserver(es => {
    es.filter(e => e.isIntersecting).forEach((e, i) => {
      e.target.style.setProperty('--d', i * 160 + 'ms');
      e.target.classList.add('seen');
      seenIO.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  folders.forEach(f => seenIO.observe(f));

  // питання: фільтр за темою
  const faqChips = $$('[data-faq]');
  faqChips.forEach(b => b.addEventListener('click', () => {
    faqChips.forEach(x => x.setAttribute('aria-pressed', x === b));
    $$('#faq details').forEach(d => { d.hidden = b.dataset.faq !== 'all' && d.dataset.cat !== b.dataset.faq; });
  }));

  // команда: гортання карток кнопками
  const tmTrack = $('.tm-track');
  if (tmTrack) {
    const prev = $('[data-tm="prev"]'), next = $('[data-tm="next"]');
    const step = () => tmTrack.querySelector('.tm').offsetWidth + 20;
    const sync = () => {
      prev.disabled = tmTrack.scrollLeft < 8;
      next.disabled = tmTrack.scrollLeft + tmTrack.clientWidth > tmTrack.scrollWidth - 8;
    };
    prev.addEventListener('click', () => tmTrack.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => tmTrack.scrollBy({ left: step(), behavior: 'smooth' }));
    tmTrack.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync); sync();
  }

  // команда: перегортання картки
  $$('.tm-turn').forEach(btn => btn.addEventListener('click', () => {
    const card = btn.closest('.tm');
    const on = card.classList.toggle('flipped');
    const [front, back] = card.querySelectorAll('.tm-face');
    front.inert = on; back.inert = !on;
    (on ? back : front).querySelector('.tm-turn').focus({ preventScroll: true });
  }));

  // кейси: перемикання історій
  const caseTabs = $$('[data-case].tab'), casePanels = $$('.ca-panel'), caseCount = $('.ca-count');
  let caseNow = 0;
  const showCase = i => {
    caseNow = i;
    caseTabs.forEach((x, k) => x.setAttribute('aria-pressed', k === i));
    casePanels.forEach((p, k) => { p.hidden = k !== i; });
    if (caseCount) caseCount.textContent = (i + 1) + ' / ' + casePanels.length;
  };
  caseTabs.forEach((b, k) => b.addEventListener('click', () => showCase(k)));
  $('.ca-next')?.addEventListener('click', () => showCase((caseNow + 1) % casePanels.length));

  // кейси на телефоні: короткі картки з тих самих панелей і вікно з повною історією
  const casesSec = $('#cases');
  if (casesSec && casePanels.length) {
    const track = document.createElement('div'); track.className = 'ma-track';
    const nav = document.createElement('div'); nav.className = 'ma-nav';
    nav.innerHTML = '<button class="ma-prev" type="button" aria-label="Попередній кейс"><i class="ph ph-arrow-left" aria-hidden="true"></i></button><span class="ma-count" aria-live="polite"></span><button class="ma-next" type="button" aria-label="Наступний кейс"><i class="ph ph-arrow-right" aria-hidden="true"></i></button>';
    casePanels.forEach((p, i) => {
      const ind = $('.ca-ind', p).textContent, prob = $('.ca-was p:not(.ca-ind)', p).textContent, key = $('.ca-key', p)?.textContent || '';
      const card = document.createElement('article'); card.className = 'ma-card';
      card.innerHTML = '<p class="ma-ind"></p><p class="ma-prob"></p><div class="ma-res"><span>Результат</span><b></b></div><button class="ma-more" type="button">Як це вдалося <i class="ph ph-plus" aria-hidden="true"></i></button>';
      $('.ma-ind', card).textContent = ind; $('.ma-prob', card).textContent = prob; $('.ma-res b', card).textContent = key;
      $('.ma-more', card).addEventListener('click', e => openSheet(i, e.currentTarget));
      track.append(card);
    });
    // стрілки й «1 / 4» під стрічкою; гортати пальцем теж можна
    let maNow = 0;
    const maCount = $('.ma-count', nav);
    const maMark = i => { maNow = i; maCount.textContent = (i + 1) + ' / ' + casePanels.length; };
    const maGo = i => { track.scrollTo({ left: track.children[i].offsetLeft - track.firstChild.offsetLeft, behavior: 'smooth' }); maMark(i); };
    $('.ma-prev', nav).addEventListener('click', () => maGo((maNow - 1 + casePanels.length) % casePanels.length));
    $('.ma-next', nav).addEventListener('click', () => maGo((maNow + 1) % casePanels.length));
    maMark(0);
    $('.ca-stage', casesSec).after(track, nav);
    casesSec.classList.add('m-ready');
    track.addEventListener('scroll', () => {
      const i = Math.round(track.scrollLeft / (track.firstChild.offsetWidth + 12));
      maMark(Math.min(i, casePanels.length - 1));
    }, { passive: true });

    let sheetBg, sheet, sheetFrom;
    const closeSheet = () => {
      if (!sheet) return;
      sheet.remove(); sheetBg.remove(); sheet = null; document.body.style.overflow = '';
      sheetFrom?.focus();
    };
    const openSheet = (i, from) => {
      closeSheet(); sheetFrom = from;
      sheetBg = document.createElement('div'); sheetBg.className = 'ca-sheet-bg';
      sheet = document.createElement('div'); sheet.className = 'ca-sheet';
      sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', $('.ca-ind', casePanels[i]).textContent);
      sheet.innerHTML = '<button class="ca-sheet-x" type="button" aria-label="Закрити"><i class="ph ph-x" aria-hidden="true"></i></button><h3></h3><div class="ca-sheet-body"></div><div class="ca-foot"><span class="ca-count" aria-live="polite"></span><button class="btn btn-primary ca-sheet-next" type="button">Наступний кейс <i class="ph ph-arrow-right" aria-hidden="true"></i></button></div>';
      document.body.append(sheetBg, sheet); document.body.style.overflow = 'hidden';
      sheetBg.addEventListener('click', closeSheet);
      $('.ca-sheet-x', sheet).addEventListener('click', closeSheet);
      $('.ca-sheet-next', sheet).addEventListener('click', () => fillSheet((sheetNow + 1) % casePanels.length));
      fillSheet(i);
      $('.ca-sheet-x', sheet).focus();
    };
    // вміст вікна: один кейс; при перемиканні стрічка під вікном теж переходить на нього
    let sheetNow = 0;
    const fillSheet = i => {
      sheetNow = i;
      const ind = $('.ca-ind', casePanels[i]).textContent;
      sheet.setAttribute('aria-label', ind);
      $('h3', sheet).textContent = ind;
      $('.ca-sheet-body', sheet).replaceChildren($('.ca-split', casePanels[i]).cloneNode(true));
      $('.ca-count', sheet).textContent = (i + 1) + ' / ' + casePanels.length;
      sheet.scrollTop = 0;
      track.scrollLeft = track.children[i].offsetLeft - track.firstChild.offsetLeft;
      sheetFrom = $('.ma-more', track.children[i]);
    };
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  }

  // вкладки цін
  $$('[data-tab]').forEach(b => b.addEventListener('click', () => {
    $$('[data-tab]').forEach(x => { x.setAttribute('aria-selected', x === b); $('#' + x.dataset.tab).hidden = x !== b; });
  }));

  // панелі та вікно
  const overlay = $('.overlay'), modal = $('#modal');
  const topicMap = { 'Супровід ФОП': 'Послуги для ФОП', 'Супровід ТОВ': 'Послуги для ТОВ' };
  let lastTrigger = null;
  const setHash = h => { try { history.replaceState(null, '', h || location.pathname + location.search); } catch (e) {} };
  $$('.drawer').forEach(d => { d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('inert', ''); });
  modal.setAttribute('inert', '');

  const hideAll = () => {
    $$('.drawer.on').forEach(d => { d.classList.remove('on'); d.setAttribute('inert', ''); });
    modal.classList.remove('on'); modal.setAttribute('inert', '');
  };
  const show = el => { el.removeAttribute('inert'); el.classList.add('on'); overlay.classList.add('on'); document.body.style.overflow = 'hidden'; };
  const closeAll = () => {
    const wasOpen = $('.drawer.on, .modal.on');
    hideAll(); overlay.classList.remove('on'); document.body.style.overflow = '';
    if (location.hash && $(location.hash)?.classList.contains('drawer')) setHash('');
    if (wasOpen && lastTrigger) lastTrigger.focus();
  };
  const openDrawer = (id, trigger) => {
    const d = document.getElementById(id); if (!d) return;
    if (trigger) lastTrigger = trigger;
    hideAll(); show(d); setHash('#' + id); $('.close', d).focus();
  };
  const mTitle = $('#modal-title'), mSub = $('.m-sub', modal);
  const mDefault = [mTitle?.textContent, mSub?.textContent];
  const openModal = (topic, trigger, exit) => {
    if (trigger && !trigger.closest('.drawer')) lastTrigger = trigger;
    hideAll();
    modal.classList.toggle('exit', !!exit);
    if (mTitle && mSub) {
      mTitle.textContent = exit ? 'Залишилось питання?' : mDefault[0];
      mSub.textContent = exit ? "Напишіть ім'я і телефон або нік у Telegram. Марія зв'яжеться з вами в робочий час." : mDefault[1];
    }
    if (topic) { const v = topicMap[topic] || topic; const s = $('#m-topic'); [...s.options].forEach(o => { if (o.text === v) s.value = v; }); }
    show(modal); $('input', modal).focus();
  };

  document.addEventListener('click', e => {
    const d = e.target.closest('[data-drawer]'); if (d) { e.preventDefault(); openDrawer(d.dataset.drawer, d); return; }
    const m = e.target.closest('[data-modal]'); if (m) { e.preventDefault(); openModal(m.dataset.modal, m); return; }
    if (e.target.closest('[data-close]')) closeAll();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeAll(); return; }
    if (e.key !== 'Tab') return;
    const box = $('.drawer.on, .modal.on'); if (!box) return;
    const f = $$('button,a[href],input,select', box).filter(x => !x.disabled && x.offsetParent);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  const h = location.hash.slice(1);
  if (h && document.getElementById(h)?.classList.contains('drawer')) openDrawer(h);

  // кнопка «вгору» з'являється, коли прогорнули більше за екран
  const toTop = $('#to-top');
  if (toTop) {
    const syncTop = () => toTop.classList.toggle('on', scrollY > innerHeight);
    addEventListener('scroll', syncTop, { passive: true }); syncTop();
    toTop.addEventListener('click', e => { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  // швидкі кнопки ховаються біля фінальної форми
  const fab = $('#fab'), fabZones = $$('#contacts, footer.site-foot');
  if (fab && fabZones.length && 'IntersectionObserver' in window) {
    const seen = new Set();
    const io = new IntersectionObserver(es => {
      es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target));
      fab.classList.toggle('hide', seen.size > 0);
      toTop?.classList.toggle('low', seen.size > 0);
    }, { threshold: .15 });
    fabZones.forEach(z => io.observe(z));
  }

  // вікно при виході: лише комп'ютер, один раз, не раніше 25 с, не після заявки
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: k => { try { localStorage.setItem(k, '1'); } catch (e) {} } };
  const desktop = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)').matches;
  const startedAt = Date.now();
  if (desktop && !store.get('hf-exit') && !store.get('hf-lead')) {
    const onLeave = e => {
      if (e.relatedTarget || e.clientY > 0) return;
      if (Date.now() - startedAt < 25000 || $('.drawer.on, .modal.on')) return;
      document.removeEventListener('mouseout', onLeave);
      store.set('hf-exit');
      openModal('Потрібна порада', null, true);
    };
    document.addEventListener('mouseout', onLeave);
  }

  // форми
  // поле «телефон або нік»: цифра чи + на початку → маска +38 (0XX) XXX-XX-XX, латиниця чи @ → нік у Telegram
  const maskContact = v => {
    v = v.replace(/[^0-9+@A-Za-z_]/g, '');
    if (!v) return '';
    if (/^[0-9+]/.test(v)) {
      let d = v.replace(/\D/g, '');
      if (!d) return '+';
      if (d === '3') return '+3';
      if (d === '8') return '+38';
      if (d.startsWith('0')) d = '38' + d; else if (d.startsWith('80')) d = '3' + d; else if (!d.startsWith('38')) d = '380' + d;
      d = d.slice(2, 12);
      let s = '+38';
      if (d) s += ' (' + d.slice(0, 3);
      if (d.length > 3) s += ') ' + d.slice(3, 6);
      if (d.length > 6) s += '-' + d.slice(6, 8);
      if (d.length > 8) s += '-' + d.slice(8, 10);
      return s;
    }
    return '@' + v.replace(/[^A-Za-z0-9_]/g, '').slice(0, 32);
  };
  const contactOk = v => /^\+38 \(0\d{2}\) \d{3}-\d{2}-\d{2}$/.test(v) || /^@[A-Za-z][A-Za-z0-9_]{4,31}$/.test(v);
  $$('input[name="contact"]').forEach(i => {
    i.placeholder = '+38 (0__) ___-__-__ або @нік';
    i.addEventListener('input', e => { if (!e.inputType || !e.inputType.startsWith('delete')) i.value = maskContact(i.value); });
    i.addEventListener('blur', () => { i.value = maskContact(i.value); if (i.value === '+38' || i.value === '+' || i.value === '@') i.value = ''; });
  });
  const check = i => {
    const err = document.getElementById(i.getAttribute('aria-describedby'));
    let bad = !i.value.trim();
    if (i.name === 'contact') {
      err.dataset.empty ??= err.textContent;
      if (!bad) bad = !contactOk(i.value);
      err.textContent = i.value.trim() ? 'Перевірте номер або нік: +38 (0XX) XXX-XX-XX чи @нік' : err.dataset.empty;
    }
    i.setAttribute('aria-invalid', bad);
    err.style.display = bad ? 'block' : 'none';
    return !bad;
  };
  $$('[data-form]').forEach(f => {
    const req = $$('[required]', f);
    req.forEach(i => i.addEventListener('blur', () => { if (i.value || i.getAttribute('aria-invalid')) check(i); }));
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const bad = req.filter(i => !check(i));
      if (bad.length) { bad[0].focus(); return; }
      const btn = $('[type=submit]', f), label = btn.textContent;
      btn.setAttribute('aria-busy', 'true'); btn.disabled = true; btn.textContent = 'Надсилаємо…';
      const payload = Object.fromEntries(new FormData(f));
      try {
        if (cfg.lead && cfg.lead.endpoint) {
          const r = await fetch(cfg.lead.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!r.ok) throw new Error('lead ' + r.status);
        } else {
          console.info('[demo] заявка (endpoint не налаштовано):', payload);
          await new Promise(r => setTimeout(r, 600));
        }
        const ok = $('.ok', f); ok.style.display = 'block';
        try { localStorage.setItem('hf-lead', '1'); } catch (e) {}
        f.reset(); req.forEach(i => i.removeAttribute('aria-invalid'));
      } catch (err) {
        const ok = $('.ok', f); ok.textContent = 'Не вдалося надіслати. Спробуйте ще раз або напишіть нам у Telegram.'; ok.style.display = 'block';
      } finally {
        btn.removeAttribute('aria-busy'); btn.disabled = false; btn.textContent = label;
      }
    });
  });
})();

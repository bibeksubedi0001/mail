(function () {
  'use strict';
  var RR = window.RR || {}, Store = RR.Store, root = document.documentElement, main = document.querySelector('main');
  function all(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function one(sel, el) { return (el || document).querySelector(sel); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function pressed(b) { return b.getAttribute('aria-pressed') === 'true'; }
  function press(b, on) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); }

  // ---------------------------------------------------------------- clocks, the countdown to the call window, a stopwatch
  var clocks = all('[data-clock]').map(function (el) {
    try {
      return {t: one('b', el), d: one('small', el), sec: !!el.closest('.phero'),
        ft: new Intl.DateTimeFormat('en-GB', {timeZone: el.dataset.clock, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'}),
        fd: new Intl.DateTimeFormat('en-GB', {timeZone: el.dataset.clock, weekday: 'short', day: 'numeric', month: 'short'})};
    } catch (err) { return null; }
  }).filter(Boolean);
  var hero = one('.phero'), start = hero ? Date.parse(hero.dataset.start) : 0, end = hero ? Date.parse(hero.dataset.end) : 0;
  var countLabel = hero && one('[data-count-label]', hero), countBox = hero && one('[data-count]', hero);
  var digits = hero ? all('[data-count] b', hero) : [];
  function tickClock() {
    var now = Date.now(), d = new Date(now);
    clocks.forEach(function (c) {
      var t = c.ft.format(d);
      c.t.textContent = c.sec ? t : t.slice(0, 5);
      if (c.d) c.d.textContent = c.fd.format(d);
    });
    if (!hero) return;
    var left = start - now;
    if (left > 0) {
      var s = Math.floor(left / 1000), parts = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
      digits.forEach(function (b, i) { b.textContent = i ? pad(parts[i]) : parts[i]; });
      hero.dataset.state = left < 36e5 ? 'soon' : 'before';
    } else {
      var st = now < end ? 'open' : 'past';
      if (hero.dataset.state !== st) {
        hero.dataset.state = st;
        countLabel.textContent = st === 'open' ? hero.dataset.open : hero.dataset.past;
        countBox.hidden = true;
      }
    }
  }
  if (clocks.length || hero) { tickClock(); setInterval(tickClock, 1000); }
  all('[data-stopwatch]').forEach(function (box) {
    var face = one('b', box), btn = one('[data-sw]', box), t0 = 0, timer = 0;
    btn.addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = 0; btn.textContent = 'Start again'; return; }
      t0 = Date.now(); btn.textContent = 'Stop';
      timer = setInterval(function () { var s = Math.floor((Date.now() - t0) / 1000); face.textContent = Math.floor(s / 60) + ':' + pad(s % 60); }, 500);
    });
  });

  // ---------------------------------------------------------------- progress: ticks counted by group, each id once
  function groupCount(g) {
    var seen = {}, n = 0, on = 0;
    all('input[data-group="' + g + '"]').forEach(function (cb) {
      if (seen[cb.dataset.check]) return;
      seen[cb.dataset.check] = 1; n += 1;
      if (cb.checked) on += 1;
    });
    return [on, n];
  }
  function paintMeters() {
    all('[data-meter]').forEach(function (el) {
      var c = groupCount(el.dataset.meter), bar = one('i b', el), txt = one('em', el);
      if (bar) bar.style.width = (c[1] ? 100 * c[0] / c[1] : 0) + '%';
      if (txt) txt.textContent = c[0] + ' of ' + c[1];
      el.classList.toggle('is-full', c[1] > 0 && c[0] === c[1]);
    });
    all('.prep-sec').forEach(function (sec) {
      var cb = one('input[data-group="r"]', sec), on = !!(cb && cb.checked), link = one('.prepnav a[data-sec="' + sec.id + '"]');
      sec.classList.toggle('is-read', on);
      if (link) link.classList.toggle('is-read', on);
    });
  }
  document.addEventListener('rr:checks', paintMeters);
  paintMeters();

  // ---------------------------------------------------------------- section bar: where the reader is, how far down the page
  var nav = one('.prepnav');
  if (nav) {
    var links = all('a[data-sec]', nav), secs = links.map(function (a) { return document.getElementById(a.dataset.sec); });
    var bar = one('.pn-bar i', nav), cur = null, queued = false;
    var spy = function () {
      queued = false;
      if (root.classList.contains('call-mode')) return;
      var idx = 0, h = root.scrollHeight - window.innerHeight;
      secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= 150) idx = i; });
      if (links[idx] !== cur) {
        if (cur) cur.removeAttribute('aria-current');
        cur = links[idx]; cur.setAttribute('aria-current', 'true');
        var box = cur.parentNode;
        box.scrollLeft = cur.offsetLeft - box.offsetLeft - box.clientWidth / 2 + cur.offsetWidth / 2;
      }
      bar.style.width = (h > 0 ? Math.min(100, 100 * window.scrollY / h) : 0) + '%';
    };
    window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(spy); } }, {passive: true});
    window.addEventListener('resize', spy);
    spy();
  }

  // ---------------------------------------------------------------- their time against the reader's time
  all('[data-tzc]').forEach(function (box) {
    var input = one('input', box), a = one('[data-them]', box), b = one('[data-you]', box), note = one('[data-note]', box);
    var off = +box.dataset.offset, open = +box.dataset.open;
    function hm(m) { m = ((m % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
    function paint() {
      var v = +input.value, mine = v + off;
      a.textContent = hm(v); b.textContent = hm(mine) + (mine >= 1440 ? ' next day' : '');
      note.textContent = v < open ? box.dataset.before : mine >= 1320 ? box.dataset.late : box.dataset.inside;
    }
    input.addEventListener('input', paint);
    paint();
  });

  // ---------------------------------------------------------------- "now" on the timelines
  all('svg [data-now]').forEach(function (g) {
    var t0 = +g.dataset.t0, t1 = +g.dataset.t1, now = Date.now(), ns = 'http://www.w3.org/2000/svg';
    if (now < t0 || now > t1) return;
    var x = +g.dataset.x0 + (g.dataset.x1 - g.dataset.x0) * (now - t0) / (t1 - t0);
    var ln = document.createElementNS(ns, 'line'), tx = document.createElementNS(ns, 'text');
    ln.setAttribute('class', 'nowline'); ln.setAttribute('x1', x); ln.setAttribute('x2', x);
    ln.setAttribute('y1', g.dataset.y0); ln.setAttribute('y2', g.dataset.y1);
    tx.setAttribute('class', 'nowtxt'); tx.setAttribute('x', x); tx.setAttribute('y', g.dataset.y0 - 5); tx.setAttribute('text-anchor', 'middle');
    tx.textContent = 'now';
    g.appendChild(ln); g.appendChild(tx);
  });

  // ---------------------------------------------------------------- hover notes on chart marks
  var tip = document.createElement('div');
  tip.className = 'ptip'; tip.hidden = true;
  document.body.appendChild(tip);
  function showTip(el, x, y) {
    tip.textContent = el.dataset.tip; tip.hidden = false;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + 'px';
    tip.style.top = (y - h - 14 < 8 ? y + 20 : y - h - 14) + 'px';
  }
  function tipOf(ev) { return ev.target.closest ? ev.target.closest('[data-tip]') : null; }
  document.addEventListener('pointermove', function (ev) { var el = tipOf(ev); if (el) showTip(el, ev.clientX, ev.clientY); else tip.hidden = true; });
  document.addEventListener('focusin', function (ev) {
    var el = tipOf(ev);
    if (el) { var r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.top); }
  });
  document.addEventListener('focusout', function () { tip.hidden = true; });
  window.addEventListener('scroll', function () { tip.hidden = true; }, {passive: true});

  // ---------------------------------------------------------------- chart legends that switch a series on and off; the run picker
  all('.pleg[data-for]').forEach(function (leg) {
    var fig = document.getElementById(leg.dataset.for);
    all('button[data-ser]', leg).forEach(function (b) {
      function paint() { all('svg [data-ser="' + b.dataset.ser + '"]', fig).forEach(function (g) { g.style.display = pressed(b) ? '' : 'none'; }); }
      b.addEventListener('click', function () { press(b, !pressed(b)); paint(); });
      paint();
    });
  });
  all('[data-runs]').forEach(function (box) {
    var btns = all('button[data-run]', box), pts = all('[data-pt]', box), cards = all('[data-run-card]', box);
    function pick(id) {
      btns.forEach(function (b) { press(b, b.dataset.run === id); });
      pts.forEach(function (p) { p.classList.toggle('is-sel', p.dataset.pt === id); });
      cards.forEach(function (c) { c.hidden = c.dataset.runCard !== id; });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { pick(b.dataset.run); }); });
    pts.forEach(function (p) {
      p.addEventListener('click', function () { pick(p.dataset.pt); });
      p.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(p.dataset.pt); } });
    });
  });

  // ---------------------------------------------------------------- questions: hide the answers, pick one at random, drill
  var qas = all('.qa[data-qa]'), pbar = one('[data-practice]'), drill = one('.drill');
  function isReady(q) { var cb = one('input[data-check]', q); return !!(cb && cb.checked); }
  if (qas.length && pbar) {
    var hide = one('[data-hide]', pbar), todo = one('[data-todo]', pbar);
    var closeAll = function () {
      qas.forEach(function (q) { q.classList.remove('is-open'); one('.qa-show', q).textContent = 'Show the points'; });
    };
    var filter = function () { qas.forEach(function (q) { q.classList.toggle('f-out', todo.checked && isReady(q)); }); };
    var setHide = function (on) {
      press(hide, on); hide.textContent = on ? 'Show all the answers' : 'Hide the answers';
      main.classList.toggle('practice', on); closeAll();
    };
    qas.forEach(function (q) {
      var b = one('.qa-show', q);
      b.addEventListener('click', function () {
        q.classList.toggle('is-open');
        b.textContent = q.classList.contains('is-open') ? 'Hide the points' : 'Show the points';
      });
    });
    hide.addEventListener('click', function () { setHide(!pressed(hide)); });
    todo.addEventListener('change', filter);
    document.addEventListener('rr:checks', function () { if (todo.checked) filter(); });
    one('[data-random]', pbar).addEventListener('click', function () {
      var pool = qas.filter(function (q) { return !isReady(q); });
      if (!pool.length) pool = qas;
      var q = pool[Math.floor(Math.random() * pool.length)];
      if (!pressed(hide)) setHide(true);
      q.classList.remove('f-out');
      q.scrollIntoView({block: 'center'});
      q.classList.remove('flash'); void q.offsetWidth; q.classList.add('flash');
    });

    var order = [], pos = 0, shownAt = 0, clock = 0;
    var drQ = one('.dr-q', drill), drA = one('.dr-a', drill), drPos = one('.dr-pos', drill), drTime = one('.dr-time', drill);
    var drShow = one('[data-dr="show"]', drill), drReady = one('[data-dr="ready"]', drill);
    var show = function () {
      var q = order[pos];
      drQ.textContent = one('h4', q).textContent;
      drA.innerHTML = one('.qa-a', q).innerHTML; drA.hidden = true;
      drShow.textContent = 'Show the points';
      drPos.textContent = 'Question ' + (pos + 1) + ' of ' + order.length;
      press(drReady, isReady(q));
      shownAt = Date.now();
    };
    var closeDrill = function () { drill.hidden = true; root.classList.remove('modal-open'); clearInterval(clock); one('[data-drill]', pbar).focus(); };
    var step = function (n) { pos = (pos + n + order.length) % order.length; show(); };
    var reveal = function () { drA.hidden = !drA.hidden; drShow.textContent = drA.hidden ? 'Show the points' : 'Hide the points'; };
    var markReady = function () { one('input[data-check]', order[pos]).click(); press(drReady, isReady(order[pos])); };
    one('[data-drill]', pbar).addEventListener('click', function () {
      order = qas.filter(function (q) { return !isReady(q); });
      if (!order.length) order = qas.slice();
      for (var i = order.length - 1; i > 0; i -= 1) { var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
      pos = 0; show();
      drill.hidden = false; root.classList.add('modal-open'); drill.focus();
      clearInterval(clock);
      clock = setInterval(function () {
        var s = Math.floor((Date.now() - shownAt) / 1000);
        drTime.textContent = Math.floor(s / 60) + ':' + pad(s % 60);
        drTime.className = 'dr-time' + (s >= 150 ? ' over' : s >= 90 ? ' slow' : '');
      }, 500);
    });
    all('[data-dr]', drill).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.dr;
        if (k === 'prev') step(-1); else if (k === 'next') step(1); else if (k === 'show') reveal(); else markReady();
      });
    });
    one('.dr-close', drill).addEventListener('click', closeDrill);
    drill.addEventListener('click', function (ev) { if (ev.target === drill) closeDrill(); });
    document.addEventListener('keydown', function (ev) {
      if (drill.hidden || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var k = ev.key;
      if (k === 'Escape') closeDrill();
      else if (k === 'ArrowRight') step(1);
      else if (k === 'ArrowLeft') step(-1);
      else if (k === ' ' && ev.target.tagName !== 'BUTTON') { ev.preventDefault(); reveal(); }
      else if (k === 'r' || k === 'R') markReady();
    });
  }

  // ---------------------------------------------------------------- numbers: cover them, uncover one at a time
  all('[data-nums]').forEach(function (box) {
    var b = one('[data-hide-nums]', box), cards = all('.numcard', box);
    b.addEventListener('click', function () {
      var on = !pressed(b);
      press(b, on); b.textContent = on ? 'Show all the numbers' : 'Test me: hide the numbers';
      box.classList.toggle('testing', on);
      cards.forEach(function (c) { c.classList.remove('is-open'); });
    });
    cards.forEach(function (c) { one('.a', c).addEventListener('click', function () { if (box.classList.contains('testing')) c.classList.toggle('is-open'); }); });
  });

  // ---------------------------------------------------------------- a clock to speak against
  all('[data-timer]').forEach(function (box) {
    var face = one('b', box), ring = one('.fg', box), go = one('[data-go]', box), reset = one('[data-reset]', box);
    var segs = all('[data-s]', box), say = one('.pt-say', box), C = 2 * Math.PI * 52;
    var total = +segs[0].dataset.s, left = total, timer = 0, endAt = 0, rang = false;
    ring.style.strokeDasharray = C;
    function fmt(s) { var a = Math.abs(s < 0 ? Math.floor(s) : Math.ceil(s)); return (s < 0 ? '+' : '') + Math.floor(a / 60) + ':' + pad(a % 60); }
    function paint() {
      face.textContent = fmt(left);
      ring.style.strokeDashoffset = C * (1 - Math.max(0, left) / total);
      box.dataset.state = left <= 0 ? 'over' : left <= 20 ? 'last' : timer ? 'run' : 'idle';
    }
    function halt(label) { clearInterval(timer); timer = 0; go.textContent = label; paint(); }
    function beep() {
      try {
        var ac = new (window.AudioContext || window.webkitAudioContext)(), o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = 660; g.gain.value = 0.07; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.4);
      } catch (err) { /* no sound available */ }
    }
    go.addEventListener('click', function () {
      if (timer) { halt('Resume'); return; }
      if (left <= 0) left = total;
      endAt = Date.now() + left * 1000; rang = false;
      timer = setInterval(function () {
        left = (endAt - Date.now()) / 1000;
        if (left <= 0 && !rang) { rang = true; beep(); }
        if (left < -600) halt('Start'); else paint();
      }, 200);
      go.textContent = 'Pause'; paint();
    });
    reset.addEventListener('click', function () { left = total; halt('Start'); });
    segs.forEach(function (b) {
      b.addEventListener('click', function () {
        segs.forEach(function (x) { press(x, x === b); });
        total = +b.dataset.s; left = total; say.textContent = b.dataset.say || '';
        halt('Start');
      });
    });
    paint();
  });

  // ---------------------------------------------------------------- notes typed during the call: kept with the other notes of the report
  var fields = all('textarea[data-note]');
  if (fields.length && Store) {
    var stateEl = all('[data-note-state]');
    var paintNotes = function () {
      fields.forEach(function (ta) {
        var it = Store.get('note:' + ta.dataset.note), v = it && it.text || '';
        if (document.activeElement !== ta && ta.value !== v) ta.value = v;
      });
      stateEl.forEach(function (el) {
        el.textContent = Store.state() === 'disk' ? 'Saved on this PC as you type.' :
          'Kept in this browser. Open the report with \u201cOpen report.cmd\u201d to save them on the PC as well.';
      });
    };
    fields.forEach(function (ta) {
      var timer = 0, save = function () { Store.set('note:' + ta.dataset.note, {text: ta.value}); };
      ta.addEventListener('input', function () {
        clearTimeout(timer); timer = setTimeout(save, 500);
        fields.forEach(function (o) { if (o !== ta && o.dataset.note === ta.dataset.note) o.value = ta.value; });
      });
      ta.addEventListener('blur', function () {
        clearTimeout(timer);
        var it = Store.get('note:' + ta.dataset.note);
        if ((it && it.text || '') !== ta.value) save();
      });
    });
    Store.on(paintNotes);
    paintNotes();
    all('[data-copynotes]').forEach(function (btn) {
      var label = btn.textContent;
      btn.addEventListener('click', function () {
        var out = [btn.dataset.title], seen = {};
        fields.forEach(function (ta) {
          if (seen[ta.dataset.note] || !ta.value.trim()) return;
          seen[ta.dataset.note] = 1;
          out.push('', ta.dataset.label, ta.value.trim());
        });
        if (out.length === 1) out.push('', '(nothing written yet)');
        RR.copyText(out.join('\n'), btn, label);
      });
    });
  }

  // ---------------------------------------------------------------- the call screen on its own
  var callBtns = all('[data-callmode]');
  function setCall(on) {
    root.classList.toggle('call-mode', on);
    callBtns.forEach(function (b) { press(b, on); b.textContent = on ? b.dataset.off : b.dataset.on; });
    if (on) window.scrollTo(0, 0);
    else { var c = one('.cockpit'); if (c) c.scrollIntoView(); }
  }
  callBtns.forEach(function (b) { b.addEventListener('click', function () { setCall(!root.classList.contains('call-mode')); }); });
  if (location.hash === '#call' && callBtns.length) setCall(true);

  // ---------------------------------------------------------------- figures enlarged
  var lb = one('.plightbox'), opens = all('.pimg-open');
  if (lb && opens.length) {
    var img = one('img', lb), cap = one('.lb-cap', lb), num = one('.lb-n', lb), holder = one('.lb-img', lb), at = 0;
    var showImg = function (i) {
      at = (i + opens.length) % opens.length;
      holder.classList.remove('zoom');
      img.src = opens[at].dataset.full; img.alt = one('img', opens[at]).alt;
      cap.textContent = opens[at].dataset.cap;
      num.textContent = 'Your figures: ' + (at + 1) + ' of ' + opens.length;
    };
    var closeLb = function () { lb.hidden = true; root.classList.remove('modal-open'); opens[at].focus(); };
    opens.forEach(function (b, i) {
      b.addEventListener('click', function () { showImg(i); lb.hidden = false; root.classList.add('modal-open'); one('.lb-close', lb).focus(); });
    });
    all('[data-lb]', lb).forEach(function (b) { b.addEventListener('click', function () { showImg(at + (+b.dataset.lb)); }); });
    one('.lb-close', lb).addEventListener('click', closeLb);
    img.addEventListener('click', function () { holder.classList.toggle('zoom'); });
    holder.addEventListener('click', function (ev) { if (ev.target === holder) closeLb(); });
    document.addEventListener('keydown', function (ev) {
      if (lb.hidden) return;
      if (ev.key === 'Escape') closeLb(); else if (ev.key === 'ArrowRight') showImg(at + 1); else if (ev.key === 'ArrowLeft') showImg(at - 1);
    });
  }
})();

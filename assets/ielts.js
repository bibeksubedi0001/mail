// the IELTS pages (ielts.py): what is shown, a random pick, the ticks still open, a timer
(function () {
  'use strict';
  var root = document.documentElement, bar = document.querySelector('[data-ielts-bar]');
  if (!bar) return;
  function all(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function one(sel, el) { return (el || document).querySelector(sel); }
  var items = all('main [data-iq]'), modes = all('button[data-ielts-mode]', bar), mode = 'all';

  // ---------------------------------------------------------------- everything, the card and its notes, or the question alone
  function label(it) {
    var b = one('[data-ielts-show]', it);
    if (b) b.textContent = (it.classList.contains('is-open') ? 'Hide the ' : 'Show the ') + b.dataset.word;
  }
  function setMode(m) {
    mode = m;
    root.classList.toggle('ielts-q', m === 'q');
    root.classList.toggle('ielts-notes', m === 'notes');
    modes.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.ieltsMode === m ? 'true' : 'false'); });
    items.forEach(function (it) { it.classList.remove('is-open'); label(it); });
    try { sessionStorage.setItem('rr:ielts-mode', m); } catch (err) { /* storage unavailable */ }
  }
  modes.forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.ieltsMode); }); });
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-ielts-show]');
    if (!b) return;
    var it = b.closest('[data-iq]');
    it.classList.toggle('is-open');
    label(it);
  });
  try {
    var kept = sessionStorage.getItem('rr:ielts-mode');
    if (kept && modes.some(function (b) { return b.dataset.ieltsMode === kept; })) setMode(kept);
  } catch (err) { /* storage unavailable */ }

  // ---------------------------------------------------------------- ticks: the count, and "only those not ready"
  var todo = one('[data-ielts-todo]', bar), count = one('[data-ielts-count]', bar);
  function ticked(it) { var cb = one('input[data-check]', it); return !!(cb && cb.checked); }
  function paint() {
    var done = items.filter(ticked).length;
    if (count) count.textContent = done + ' of ' + items.length + ' ' + count.dataset.ieltsCount;
    items.forEach(function (it) { it.classList.toggle('i-out', !!(todo && todo.checked) && ticked(it)); });
  }
  document.addEventListener('rr:checks', paint);
  document.addEventListener('change', function (ev) { if (ev.target === todo || (ev.target.matches && ev.target.matches('input[data-check]'))) paint(); });
  paint();

  // ---------------------------------------------------------------- a random question among those on screen
  var rnd = one('[data-ielts-random]', bar), last = null;
  if (rnd) rnd.addEventListener('click', function () {
    var pool = items.filter(function (it) { return it.offsetParent !== null && it !== last; });
    if (!pool.length) return;
    last = pool[Math.floor(Math.random() * pool.length)];
    last.scrollIntoView({block: 'start', behavior: 'smooth'});
    last.classList.remove('flash');
    void last.offsetWidth;
    last.classList.add('flash');
  });

  // ---------------------------------------------------------------- the timer: one stage, or a minute to prepare and then two to speak
  var box = one('[data-ielts-timer]', bar);
  if (box) {
    var clock = one('[data-clock]', box), stop = one('[data-stop]', box), end = 0, then = 0, stage = '', tick = null, ctx = null;
    function beep() {
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880; g.gain.value = 0.08;
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.35);
      } catch (err) { /* no sound: the clock still changes colour */ }
    }
    function show() {
      var left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      clock.textContent = (stage ? stage + ' ' : '') + Math.floor(left / 60) + ':' + (left % 60 < 10 ? '0' : '') + (left % 60);
      if (left > 0) return;
      beep();
      if (then) { start(then, 0, 'Speak'); return; }
      clearInterval(tick); tick = null;
      clock.textContent = 'Time';
      clock.className = 'iclock is-up';
    }
    function start(secs, next, name) {
      clearInterval(tick);
      end = Date.now() + secs * 1000; then = next; stage = name;
      clock.className = 'iclock' + (name === 'Speak' ? ' is-b' : '');
      stop.hidden = false;
      show();
      tick = setInterval(show, 250);
    }
    all('button[data-secs]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        var next = +b.dataset.then;
        start(+b.dataset.secs, next, next ? 'Prepare' : (+b.dataset.secs === 120 ? 'Speak' : ''));
      });
    });
    stop.addEventListener('click', function () {
      clearInterval(tick); tick = null;
      clock.textContent = ''; clock.className = 'iclock'; stop.hidden = true;
    });
  }
})();

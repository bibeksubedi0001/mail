(function () {
  'use strict';
  var ASSETS = ((document.currentScript || {}).src || '').replace(/report\.js.*$/, '');  // where this script and its companions live
  // first click on a column sorts in its natural direction; ORDER_TEXT holds the [ascending, descending] wording
  var NATURAL = {outcome: 'asc', rating: 'desc', replied: 'desc', sent: 'desc', qs: 'asc', cites: 'desc', h: 'desc',
    name: 'asc', uni: 'asc', track: 'asc'};
  var ORDER_TEXT = {outcome: ['Warm first', 'Bounced first'], rating: ['Lowest first', 'Highest first'],
    replied: ['Oldest first', 'Newest first'], sent: ['Oldest first', 'Newest first'], qs: ['Best rank first', 'Lowest rank first'],
    cites: ['Fewest first', 'Most first'], h: ['Lowest first', 'Highest first'], name: ['A to Z', 'Z to A'],
    uni: ['A to Z', 'Z to A'], track: ['A to Z', 'Z to A']};
  var NUMERIC = {rating: 1, qs: 1, cites: 1, h: 1};

  document.querySelectorAll('.toolbar[data-table]').forEach(function (tb) {
    var id = tb.dataset.table, table = document.getElementById(id), body = table.tBodies[0];
    var q = tb.querySelector('input[type=search]'), owed = tb.querySelector('input[type=checkbox]');
    var count = tb.querySelector('.count'), sel = tb.querySelector('select'), dir = tb.querySelector('.dir');
    var segs = Array.from(tb.querySelectorAll('.seg button')), heads = Array.from(table.querySelectorAll('thead button.sort'));
    var rows = Array.from(body.querySelectorAll('tr.r')), empty = body.querySelector('tr.empty'), groups = {};
    body.querySelectorAll('tr.grp').forEach(function (g) { groups[g.dataset.v] = g; });
    var st = {key: 'outcome', dir: 'asc', v: 'all', owed: false, q: ''};
    try {
      var saved = JSON.parse(sessionStorage.getItem('rr:' + id));
      if (saved && NATURAL[saved.key]) st = Object.assign(st, saved);
    } catch (err) { /* storage unavailable */ }

    function cmp(a, b) {
      var k = st.key, s = st.dir === 'asc' ? 1 : -1, x, y;
      if (k === 'outcome') { x = +a.dataset.o; y = +b.dataset.o; }
      else if (NUMERIC[k]) {
        x = +a.dataset[k]; y = +b.dataset[k];
        if (x < 0 || y < 0) {  // missing values stay at the bottom in both directions
          if (x < 0 && y < 0) return a.dataset.i - b.dataset.i;
          return x < 0 ? 1 : -1;
        }
      } else { x = a.dataset[k]; y = b.dataset[k]; }
      var c = typeof x === 'string' ? x.localeCompare(y) : x - y;
      return c ? s * c : a.dataset.i - b.dataset.i;
    }

    function render() {
      var grouped = st.key === 'outcome', list = rows.slice().sort(cmp), frag = document.createDocumentFragment(), cur = null;
      list.forEach(function (r) {
        if (grouped && r.dataset.v !== cur) { cur = r.dataset.v; frag.appendChild(groups[cur]); }
        frag.appendChild(r);
      });
      if (!grouped) Object.keys(groups).forEach(function (v) { frag.appendChild(groups[v]); });
      frag.appendChild(empty);
      body.appendChild(frag);
      table.classList.toggle('grouped', grouped);
      var terms = st.q.toLowerCase().split(/\s+/).filter(Boolean), n = 0, seen = {};
      list.forEach(function (r) {
        var ok = (st.v === 'all' || r.dataset.v === st.v) && (!st.owed || r.dataset.owed === '1') &&
          terms.every(function (t) { return r.dataset.s.indexOf(t) > -1; });
        r.hidden = !ok;
        if (ok) { n += 1; seen[r.dataset.v] = 1; r.cells[0].textContent = n; }
      });
      Object.keys(groups).forEach(function (v) { groups[v].hidden = !grouped || !seen[v]; });
      empty.hidden = n > 0;
      count.textContent = n === rows.length ? rows.length + ' replies' : n + ' of ' + rows.length + ' replies';
      sel.value = st.key;
      dir.textContent = ORDER_TEXT[st.key][st.dir === 'asc' ? 0 : 1];
      dir.dataset.dir = st.dir;
      heads.forEach(function (b) {
        b.parentNode.setAttribute('aria-sort', b.dataset.key !== st.key ? 'none' : st.dir === 'asc' ? 'ascending' : 'descending');
      });
      segs.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === st.v ? 'true' : 'false'); });
      owed.checked = st.owed;
      if (q.value !== st.q) q.value = st.q;
      try { sessionStorage.setItem('rr:' + id, JSON.stringify(st)); } catch (err) { /* storage unavailable */ }
    }

    q.addEventListener('input', function () { st.q = q.value; render(); });
    owed.addEventListener('change', function () { st.owed = owed.checked; render(); });
    segs.forEach(function (b) { b.addEventListener('click', function () { st.v = b.dataset.v; render(); }); });
    sel.addEventListener('change', function () { st.key = sel.value; st.dir = NATURAL[st.key]; render(); });
    dir.addEventListener('click', function () { st.dir = st.dir === 'asc' ? 'desc' : 'asc'; render(); });
    heads.forEach(function (b) {
      b.addEventListener('click', function () {
        if (st.key === b.dataset.key) st.dir = st.dir === 'asc' ? 'desc' : 'asc';
        else { st.key = b.dataset.key; st.dir = NATURAL[st.key]; }
        render();
      });
    });
    render();

    // arriving from a reply page (#r-KEY): make sure that row is visible, then bring it into view
    var target = location.hash && document.getElementById(location.hash.slice(1));
    if (target && target.classList.contains('r')) {
      if (target.hidden) { st.v = 'all'; st.owed = false; st.q = ''; render(); }
      var go = function () { target.scrollIntoView({block: 'start', behavior: 'instant'}); };
      go();
      // web fonts and charts above the table shift the layout after the first scroll
      window.addEventListener('load', function () { (document.fonts ? document.fonts.ready : Promise.resolve()).then(go); });
    }
  });

  // ---------------------------------------------------------------- shared helpers
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function fire(name) { document.dispatchEvent(new CustomEvent(name)); }
  function shown(el) { return !el.hidden && !el.classList.contains('f-out'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function session(key, value) {  // small view state (filters, sort order) kept for this browser tab
    try {
      if (arguments.length > 1) sessionStorage.setItem('rr:' + key, JSON.stringify(value));
      else return JSON.parse(sessionStorage.getItem('rr:' + key)) || {};
    } catch (err) { /* storage unavailable */ }
    return {};
  }
  function copyText(txt, btn, label) {
    function done() {
      btn.textContent = 'Copied'; btn.classList.add('done');
      setTimeout(function () { btn.textContent = label; btn.classList.remove('done'); }, 1800);
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (err) { /* nothing else to try */ }
      ta.remove(); done();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(done, fallback);
    else fallback();
  }
  all('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () { copyText(document.getElementById(btn.dataset.src).dataset.raw, btn, 'Copy text'); });
  });

  // ---------------------------------------------------------------- countdowns: <span class="left" data-date="2026-12-02">
  var NOW = new Date(), TODAY = Date.UTC(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function daysTo(iso) {
    var p = iso.replace('~', '').split('-');
    return Math.round((Date.UTC(+p[0], p[1] - 1, +p[2]) - TODAY) / 864e5);
  }
  function leftText(d, approx) {  // "~" dates are approximate
    var n = Math.abs(d), about = approx ? 'about ' : '';
    if (!approx && n <= 1) return ['yesterday', 'today', 'tomorrow'][d + 1];
    if (!n) return 'about now';
    var span = n < 100 ? n + (n === 1 ? ' day' : ' days') : Math.round(n / 30.44) + ' months';
    return d > 0 ? 'in ' + about + span : about + span + ' ago';
  }
  function dueClass(d) { return d < 0 ? 'past' : d <= 14 ? 'hot' : d <= 45 ? 'warm' : 'cool'; }
  all('.left[data-date]').forEach(function (el) {
    var iso = el.dataset.date, d = daysTo(iso), host = el.closest('[data-due-host]');
    el.textContent = leftText(d, iso.charAt(0) === '~');
    el.classList.add(dueClass(d));
    if (host && host.dataset.days === undefined) {  // rows carry their date so lists can filter and sort on it
      host.dataset.days = d;
      host.dataset.due = d < 0 ? 'past' : d <= 30 ? 'soon' : 'later';
    }
  });
  function dueIs(row, k) {  // k: all | up (any date not passed) | soon (30 days) | none (no date) | past
    var x = row.dataset.due || 'none';
    return k === 'all' || k === x || (k === 'up' && (x === 'soon' || x === 'later'));
  }
  all('[data-count-dates]').forEach(function (el) {
    var n = el.dataset.countDates.split(',').filter(function (iso) { var d = daysTo(iso); return d >= 0 && d <= 30; }).length;
    el.textContent = n ? ': ' + n + (n === 1 ? ' falls' : ' fall') + ' in the next 30 days' : '';
  });

  // ---------------------------------------------------------------- notes: what is typed, ticked or starred in the pages
  // Kept in this browser (localStorage) and, while report_server.py runs, in data/author_notes.json on this PC.
  // Each item carries "updated"; when two copies differ the newer one wins.
  var Store = (function () {
    var cfg = window.RR_CFG || {}, baked = window.RR_BASE || {}, KEY = 'rr-notes-v1';
    var items = {}, dirty = {}, subs = [], state = 'wait', timer = 0;
    var local = /^https?:$/.test(location.protocol) && String(location.port) === String(cfg.port) && /^(127\.0\.0\.1|localhost)$/.test(location.hostname);

    function take(src) {  // merge another copy in; the "applied" history of a draft is never dropped
      var changed = false;
      Object.keys(src || {}).forEach(function (k) {
        var a = items[k], b = src[k];
        if (!b || typeof b !== 'object') return;
        if (!a || (b.updated || '') > (a.updated || '')) {
          if (a && a.applied && !b.applied) b.applied = a.applied;
          items[k] = b; changed = true;
        } else if (b.applied && (!a.applied || b.applied.length > a.applied.length)) { a.applied = b.applied; changed = true; }
      });
      return changed;
    }
    function keep() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (err) { /* storage unavailable or full */ } }
    function tell() { subs.forEach(function (fn) { fn(); }); }
    function call(method, body, last) {
      return ask('/api/notes', method, body, last);
    }
    function ask(path, method, body, last) {  // a call to report_server.py: the notes, or the Send buttons
      if (!cfg.token || !window.fetch) return Promise.reject(new Error('no notes server configured'));
      var headers = {'X-RR-Token': cfg.token};
      if (body) headers['Content-Type'] = 'application/json';
      return fetch((local ? '' : cfg.url) + path, {method: method, cache: 'no-store', keepalive: !!last, headers: headers, body: body ? JSON.stringify(body) : undefined})
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    }
    function push(last) {
      var out = {}, size = 0;
      if (!Object.keys(dirty).length) return Promise.resolve();
      Object.keys(dirty).some(function (k) {  // about 100,000 characters a request at most; the server takes 400 kB
        var n = JSON.stringify(dirty[k]).length;
        if (size && size + n > 1e5) return true;
        out[k] = dirty[k]; size += n; delete dirty[k];
        return false;
      });
      return call('POST', {items: out}, last).then(function (res) {
        take(res.items); state = 'disk'; keep(); tell();
        return push(last);  // whatever did not fit in this request
      }, function () {
        Object.keys(out).forEach(function (k) { if (!dirty[k]) dirty[k] = out[k]; });  // keep them for the next try
        state = 'local'; tell();
      });
    }
    function sync() {  // take what the file has, then send what only this browser has
      return call('GET').then(function (res) {
        var theirs = res.items || {};
        take(theirs);
        Object.keys(items).forEach(function (k) {
          var mine = items[k], fromBuild = baked[k] && baked[k].updated === mine.updated;
          if (!fromBuild && (!theirs[k] || (mine.updated || '') > (theirs[k].updated || ''))) dirty[k] = mine;
        });
        state = 'disk'; keep(); tell();
        return push();
      }, function () { state = 'local'; tell(); });
    }

    take(JSON.parse(JSON.stringify(baked)));
    try { take(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (err) { /* storage unavailable */ }
    window.addEventListener('storage', function (ev) {  // another tab of the report changed something
      if (ev.key !== KEY || !ev.newValue) return;
      try { if (take(JSON.parse(ev.newValue))) tell(); } catch (err) { /* ignore a broken copy */ }
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && (state === 'local' || Object.keys(dirty).length)) sync();
    });
    window.addEventListener('pagehide', function () { clearTimeout(timer); push(true); });

    return {
      get: function (id) { return items[id]; },
      set: function (id, patch) {
        var it = Object.assign({}, items[id], patch, {updated: new Date().toISOString()});
        items[id] = it; dirty[id] = it; keep(); tell();
        clearTimeout(timer); timer = setTimeout(push, 500);
      },
      on: function (fn) { subs.push(fn); },
      all: function () { return items; },
      state: function () { return state; },
      pending: function (id) { return !!dirty[id]; },
      flush: function () { clearTimeout(timer); return push(); },  // what is typed, saved before an email is sent
      ask: ask,
      served: function () { return !!cfg.token; },  // report_server.py on this PC; the online copy has none
      start: sync
    };
  })();

  // tick boxes and stars
  var checks = all('input[data-check]'), stars = all('button[data-star]');
  function paintChecks() {
    checks.forEach(function (cb) {
      var it = Store.get('check:' + cb.dataset.check), row = cb.closest('[data-row]');
      cb.checked = !!(it && it.on);
      if (row) row.classList.toggle('is-done', cb.checked);
    });
    all('[data-checkcount]').forEach(function (el) {
      var boxes = all('input[data-check]:not([data-nocount])', el.closest('section'));
      el.textContent = boxes.filter(function (b) { return b.checked; }).length + ' of ' + boxes.length + ' ' + el.dataset.checkcount;
    });
    fire('rr:checks');
  }
  function paintStars() {
    stars.forEach(function (b) {
      var it = Store.get('star:' + b.dataset.star), on = !!(it && it.on), row = b.closest('[data-row]');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.title = on ? 'Starred: click to remove' : 'Star';
      if (row) row.classList.toggle('is-starred', on);
    });
    fire('rr:stars');
  }
  checks.forEach(function (cb) {
    cb.addEventListener('change', function () { Store.set('check:' + cb.dataset.check, {on: cb.checked}); });
  });
  stars.forEach(function (b) {
    b.addEventListener('click', function () { Store.set('star:' + b.dataset.star, {on: b.getAttribute('aria-pressed') !== 'true'}); });
  });
  if (checks.length) { Store.on(paintChecks); paintChecks(); }
  if (stars.length) { Store.on(paintStars); paintStars(); }
  window.RR = {Store: Store, copyText: copyText};  // for the call-preparation pages (assets/prep.js)

  // ---------------------------------------------------------------- key dates: kind filter, hide passed and done, today marker
  all('.toolbar[data-dates]').forEach(function (tb) {
    var list = document.getElementById(tb.dataset.dates), rows = all('li[data-row]', list);
    var segs = all('.seg button', tb), hide = tb.querySelector('input[data-hide]'), count = tb.querySelector('.count');
    var st = Object.assign({k: 'all', hide: false}, session('dates'));
    var first = rows.filter(function (r) { return r.dataset.days !== undefined && +r.dataset.days >= 0; })[0];
    if (first) {
      var line = document.createElement('li');
      line.className = 'today-line'; line.setAttribute('aria-hidden', 'true');
      line.textContent = 'Today \u00b7 ' + WEEKDAYS[NOW.getDay()] + ' ' + NOW.getDate() + ' ' + MONTHS[NOW.getMonth()];
      list.insertBefore(line, first);
    }
    function render() {
      var n = 0;
      rows.forEach(function (r) {
        r.hidden = !((st.k === 'all' || r.dataset.kind === st.k) && !(st.hide && (r.dataset.due === 'past' || r.classList.contains('is-done'))));
        if (shown(r)) n += 1;
      });
      segs.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.k === st.k ? 'true' : 'false'); });
      hide.checked = st.hide;
      count.textContent = n === rows.length ? rows.length + ' entries' : n + ' of ' + rows.length + ' entries';
      session('dates', st);
      fire('rr:view');
    }
    segs.forEach(function (b) { b.addEventListener('click', function () { st.k = b.dataset.k; render(); }); });
    hide.addEventListener('change', function () { st.hide = hide.checked; render(); });
    document.addEventListener('rr:filter', render);
    document.addEventListener('rr:checks', function () { if (st.hide) render(); });
    render();
  });

  // ---------------------------------------------------------------- conferences and papers: views, list filters, deadline calendar
  all('[data-conf]').forEach(function (root) {
    var views = all('[data-view]', root), tabs = all('[data-viewtab]');
    function setKf(name, text) { var el = root.querySelector('[data-kf="' + name + '"]'); if (el) el.textContent = text; }
    function show(name) {
      if (!views.some(function (v) { return v.dataset.view === name; })) name = views[0].dataset.view;
      views.forEach(function (v) { v.hidden = v.dataset.view !== name; });
      tabs.forEach(function (t) {
        if (t.dataset.viewtab === name) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
      });
      fire('rr:view');
    }
    function fromHash() { var m = /view=([a-z]+)/.exec(location.hash); show(m ? m[1] : ''); }
    window.addEventListener('hashchange', function () {
      fromHash();
      var top = root.querySelector('[data-view]:not([hidden])').getBoundingClientRect().top;
      if (top < 100) window.scrollBy(0, top - 112);  // bring the new view's heading back under the two bars
    });
    fromHash();

    var tb = root.querySelector('.toolbar[data-opps]');
    if (tb) (function () {
      var list = document.getElementById(tb.dataset.opps), rows = all('li.opp', list), empty = list.querySelector('.empty');
      var count = tb.querySelector('.count'), expand = tb.querySelector('[data-expand]');
      // the Papers page uses this list too, with its own words and its own saved filters
      var noun = tb.dataset.noun || 'opportunities', done = tb.dataset.done || 'applied', key = tb.dataset.state || 'opps';
      var st = Object.assign({p: 'all', due: 'all', fund: 'all', fmt: 'all', sort: 'due', star: false, todo: false}, session(key));
      function rank(r) {  // upcoming by date, then no date, then passed (latest first)
        var d = r.dataset.days;
        return d === undefined ? [1, 0] : +d >= 0 ? [0, +d] : [2, -d];
      }
      function cmp(a, b) {
        var c = st.sort === 'name' ? a.dataset.name.localeCompare(b.dataset.name) : st.sort === 'p' ? a.dataset.po - b.dataset.po : 0, x, y;
        if (!c) { x = rank(a); y = rank(b); c = x[0] - y[0] || x[1] - y[1]; }
        return c || a.dataset.i - b.dataset.i;
      }
      function open(r, on) {
        r.querySelector('.opp-head').setAttribute('aria-expanded', on ? 'true' : 'false');
        r.querySelector('.opp-more').hidden = !on;
      }
      function render() {
        var n = 0, sorted = rows.slice().sort(cmp), now = all('li.opp', list);
        if (sorted.some(function (r, i) { return r !== now[i]; })) {  // reorder only when the order changes: moving a row drops keyboard focus
          sorted.forEach(function (r) { list.appendChild(r); });
          list.appendChild(empty);
        }
        rows.forEach(function (r) {
          r.hidden = !((st.p === 'all' || r.dataset.p === st.p) && dueIs(r, st.due) && (st.fund === 'all' || r.dataset.fund === st.fund) &&
            (st.fmt === 'all' || r.dataset.fmt.split(' ').indexOf(st.fmt) > -1) && (!st.star || r.classList.contains('is-starred')) &&
            !(st.todo && r.classList.contains('is-done')));
          if (shown(r)) n += 1;
        });
        empty.hidden = n > 0;
        count.textContent = n === rows.length ? rows.length + ' ' + noun : n + ' of ' + rows.length + ' ' + noun;
        all('[data-f]', tb).forEach(function (el) {
          var f = el.dataset.f;
          if (el.classList.contains('seg')) all('button', el).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === st[f] ? 'true' : 'false'); });
          else if (el.type === 'checkbox') el.checked = !!st[f];
          else el.value = st[f];
        });
        session(key, st);
        fire('rr:view');
      }
      all('.seg[data-f="due"] [data-n]', tb).forEach(function (el) {
        if (el.dataset.n !== 'all') el.textContent = rows.filter(function (r) { return dueIs(r, el.dataset.n); }).length;
      });
      tb.addEventListener('click', function (ev) {
        var b = ev.target.closest('.seg button');
        if (b) { st[b.parentNode.dataset.f] = b.dataset.v; render(); }
      });
      tb.addEventListener('change', function (ev) {
        var el = ev.target;
        if (!el.dataset.f) return;
        st[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value;
        render();
      });
      list.addEventListener('click', function (ev) {
        var h = ev.target.closest('.opp-head');
        if (h) open(h.closest('.opp'), h.getAttribute('aria-expanded') !== 'true');
      });
      expand.addEventListener('click', function () {
        var on = expand.dataset.on !== '1';
        rows.forEach(function (r) { if (!on || shown(r)) open(r, on); });
        expand.dataset.on = on ? '1' : '';
        expand.textContent = on ? 'Close all details' : 'Open all details';
      });
      function figures() {
        var ticked = rows.filter(function (r) { return r.classList.contains('is-done'); }).length;
        setKf('star', rows.filter(function (r) { return r.classList.contains('is-starred'); }).length);
        setKf('applied', ticked ? ticked + ' ticked as ' + done : 'none ticked as ' + done + ' yet');
      }
      if (!root.querySelector('.toolbar[data-cal]')) {  // without a deadline calendar the deadline figures come from this list
        var soon = rows.filter(function (r) { return r.dataset.due === 'soon'; });
        var week = soon.filter(function (r) { return +r.dataset.days <= 7; }).length;
        setKf('soon', soon.length);
        setKf('week', week ? week + ' within 7 days' : 'none within 7 days');
      }
      document.addEventListener('rr:filter', render);
      document.addEventListener('rr:stars', function () { figures(); if (st.star) render(); });
      document.addEventListener('rr:checks', function () { figures(); if (st.todo) render(); });
      figures();
      render();
    })();

    var ctb = root.querySelector('.toolbar[data-cal]');
    if (ctb) (function () {
      var list = document.getElementById(ctb.dataset.cal), rows = all('li[data-row]', list), months = all('li.cal-month', list);
      var empty = list.querySelector('.empty'), segs = all('.seg button', ctb), count = ctb.querySelector('.count');
      var paid = ctb.querySelector('[data-paid]'), hide = ctb.querySelector('[data-hide]'), box = root.querySelector('[data-next]');
      var st = Object.assign({due: 'up', paid: true, hide: false}, session('cal'));
      var soon = rows.filter(function (r) { return r.dataset.due === 'soon'; });
      var week = soon.filter(function (r) { return +r.dataset.days <= 7; });
      function render() {
        var n = 0;
        rows.forEach(function (r) {
          r.hidden = !(dueIs(r, st.due) && (st.paid || r.dataset.paid !== '1') && !(st.hide && r.classList.contains('is-done')));
          if (shown(r)) n += 1;
        });
        months.forEach(function (m) {  // a month heading shows only while one of its entries does
          var el = m.nextElementSibling, any = false;
          while (el && el.hasAttribute('data-row')) { if (shown(el)) any = true; el = el.nextElementSibling; }
          m.hidden = !any;
        });
        empty.hidden = n > 0;
        count.textContent = n + ' of ' + rows.length + ' deadlines';
        segs.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === st.due ? 'true' : 'false'); });
        paid.checked = st.paid; hide.checked = st.hide;
        session('cal', st);
        fire('rr:view');
      }
      function next() {  // the box above the views: what is due within a week and not ticked done
        var ul = box.querySelector('ul'), left = week.filter(function (r) { return !r.classList.contains('is-done'); });
        ul.textContent = '';
        left.forEach(function (r) {
          var li = document.createElement('li'), b = document.createElement('b'), span = document.createElement('span');
          b.textContent = r.querySelector('time').textContent + ' \u00b7 ' + r.querySelector('.left').textContent;
          span.textContent = r.querySelector('h4').textContent + ': ' + r.querySelector('.what p b').textContent;
          li.appendChild(b); li.appendChild(span); ul.appendChild(li);
        });
        box.hidden = !left.length;
      }
      all('[data-n]', ctb).forEach(function (el) { el.textContent = rows.filter(function (r) { return dueIs(r, el.dataset.n); }).length; });
      setKf('soon', soon.length);
      setKf('week', week.length ? week.length + ' within 7 days' : 'none within 7 days');
      segs.forEach(function (b) { b.addEventListener('click', function () { st.due = b.dataset.v; render(); }); });
      paid.addEventListener('change', function () { st.paid = paid.checked; render(); });
      hide.addEventListener('change', function () { st.hide = hide.checked; render(); });
      document.addEventListener('rr:filter', render);
      document.addEventListener('rr:checks', function () { next(); if (st.hide) render(); });
      next();
      render();
    })();
  });

  // ---------------------------------------------------------------- calendar: one month at a time, and a panel for the chosen day
  all('[data-calendar]').forEach(function (root) {
    var LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var months = all('.cg-m', root), names = months.map(function (m) { return m.dataset.month; }), cells = all('.cg-d', root);
    var grid = root.querySelector('.cg-months'), title = root.querySelector('.cg-title'), dek = root.querySelector('.cg-dek');
    var bsName = root.querySelector('[data-bsname]'), bsFlag = root.querySelector('.cg-bs [data-bsq]');
    var prev = root.querySelector('[data-go="-1"]'), next = root.querySelector('[data-go="1"]'), legend = all('[data-legend] button', root);
    var empty = root.querySelector('.cg-day[data-empty]'), notes = root.querySelector('[data-notes]'), waiting = root.querySelector('[data-today-only]');
    var panels = {}, labels = {}, st = {month: '', day: '', off: session('calendar').off || {}};
    all('.cg-day[data-for]', root).forEach(function (p) { panels[p.dataset.for] = p; });
    try { labels = JSON.parse(document.getElementById('cal-labels').textContent); } catch (err) { /* ids are shown instead of names */ }

    function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function dateOf(iso) { var p = iso.split('-'); return new Date(+p[0], p[1] - 1, +p[2]); }
    function inRange(iso) { return names.indexOf(iso.slice(0, 7)) > -1; }
    var today = isoOf(NOW);

    function limit(cell) {  // a cell shows four lines at most: three and "+N more" when there are more
      var pills = all('.cg-pill', cell), on = pills.filter(function (p) { return !st.off[p.dataset.cat]; });
      var more = cell.querySelector('.cg-more'), max = on.length > 4 ? 3 : 4;
      pills.forEach(function (p) { p.hidden = true; });
      on.forEach(function (p, i) { p.hidden = i >= max; });
      more.hidden = on.length <= max;
      more.textContent = '+' + (on.length - max) + ' more';
    }
    function tabStop() {  // one day of the visible month takes the Tab key: the chosen day, else today, else the 1st
      var here = cells.filter(function (c) { return !c.classList.contains('out') && c.dataset.day.slice(0, 7) === st.month; });
      var pick = here.filter(function (c) { return c.dataset.day === st.day; })[0] ||
        here.filter(function (c) { return c.dataset.day === today; })[0] || here[0];
      cells.forEach(function (c) { c.tabIndex = c === pick ? 0 : -1; });
      return pick;
    }
    function showMonth(m) {
      var d = dateOf(m + '-01'), i = names.indexOf(m);
      st.month = m;
      months.forEach(function (s) { s.hidden = s.dataset.month !== m; });
      title.textContent = LONG_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
      bsName.textContent = months[i].dataset.bs || '';  // the Nepali months it runs through
      bsName.parentNode.hidden = !months[i].dataset.bs;
      bsFlag.hidden = !months[i].hasAttribute('data-bsq');
      dek.textContent = months[i].querySelector('.cg-sum').textContent;  // the month in numbers, beside its name
      prev.disabled = i === 0; next.disabled = i === names.length - 1;
      tabStop();
    }
    function filters() {
      var p = panels[st.day], groups = p ? all('.cg-g[data-cat]', p) : [];
      legend.forEach(function (b) { b.setAttribute('aria-pressed', st.off[b.dataset.cat] ? 'false' : 'true'); });
      all('.cg-d.has', root).forEach(limit);
      all('.cg-g[data-cat]', root).forEach(function (g) { g.hidden = !!st.off[g.dataset.cat]; });
      if (p) p.querySelector('.cg-none').hidden = groups.some(function (g) { return !g.hidden; });
      session('calendar', {off: st.off});
    }
    function paintNotes() {  // what was ticked, starred or typed in this report on the chosen day
      var list = notes.querySelector('ul'), items = Store.all(), n = 0;
      list.textContent = '';
      Object.keys(items).forEach(function (id) {
        var it = items[id], kind = id.slice(0, id.indexOf(':')), what = '';
        var lab = labels[kind === 'draft' ? id : id.slice(kind.length + 1)] || [id, ''];
        if (!it.updated || isoOf(new Date(it.updated)) !== st.day) return;
        if (kind === 'draft') {
          what = [tidy(it.final) ? 'your own version' : '', tidy(it.prompt) ? 'an instruction' : '', it.ok ? 'marked final' : ''].filter(Boolean).join(', ');
          if (what) what = 'Author final: ' + what;
        } else if (it.on) what = kind === 'star' ? 'Starred' : lab[1] || 'Done';
        if (!what) return;
        var li = document.createElement('li'), b = document.createElement('b'), small = document.createElement('small');
        b.className = 't'; b.textContent = lab[0]; small.textContent = what;
        li.appendChild(b); li.appendChild(small); list.appendChild(li);
        n += 1;
      });
      notes.hidden = !n;
      notes.querySelector('.h3n').textContent = n;
    }
    function paintPills() {  // an entry ticked done in the panel (or on another page) is struck through in its cell
      all('.cg-pill[data-pill]', root).forEach(function (p) {
        var it = Store.get('check:' + p.dataset.pill);
        p.classList.toggle('is-done', !!(it && it.on));
      });
    }
    function select(day, focus) {
      if (!inRange(day)) return;
      st.day = day;
      if (day.slice(0, 7) !== st.month) showMonth(day.slice(0, 7));
      cells.forEach(function (c) {
        var on = c.dataset.day === day && !c.classList.contains('out');
        c.classList.toggle('is-sel', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var pick = tabStop(), host = panels[day] || empty;
      if (focus && pick) pick.focus();
      Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== day; });
      empty.hidden = !!panels[day];
      if (!panels[day]) {
        var d = dateOf(day), n = daysTo(day), left = empty.querySelector('[data-rel]');
        var bs = empty.querySelector('[data-bs]'), alt = bs.querySelector('small');
        empty.querySelector('[data-wd]').textContent = LONG_DAYS[d.getDay()];
        empty.querySelector('[data-dt]').textContent = d.getDate() + ' ' + LONG_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
        left.textContent = leftText(n, false);
        left.className = 'left ' + dueClass(n);
        bs.querySelector('span').textContent = pick && pick.dataset.bs || '';  // the Nepali date, carried by the day's cell
        bs.hidden = !(pick && pick.dataset.bs);
        alt.textContent = pick && pick.dataset.bsalt || '';
        alt.hidden = !alt.textContent;
      }
      if (waiting) {  // today's panel opens with what is still waiting
        waiting.hidden = day !== today;
        host.insertBefore(waiting, host.querySelector('.cg-glance').nextSibling);
      }
      host.appendChild(notes);
      filters();
      paintNotes();
      root.querySelector('.cg-side').scrollTop = 0;
      try { history.replaceState(null, '', '#d=' + day); } catch (err) { /* not allowed on some file pages */ }
    }

    grid.addEventListener('click', function (ev) {
      var c = ev.target.closest('.cg-d');
      if (c) select(c.dataset.day, true);
    });
    grid.addEventListener('keydown', function (ev) {  // arrows move by a day or a week, Page Up and Page Down by a month
      var step = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7}[ev.key], page = {PageUp: -1, PageDown: 1}[ev.key];
      var from = ev.target.closest('.cg-d'), d;
      if (!from || (!step && !page)) return;
      d = dateOf(from.dataset.day);
      if (step) d.setDate(d.getDate() + step);
      else d = new Date(d.getFullYear(), d.getMonth() + page, Math.min(d.getDate(), new Date(d.getFullYear(), d.getMonth() + page + 1, 0).getDate()));
      ev.preventDefault();
      select(isoOf(d), true);
    });
    all('[data-go]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = names.indexOf(st.month) + (+b.dataset.go);
        if (b.dataset.go === 'today') select(inRange(today) ? today : (today < names[0] ? names[0] : names[names.length - 1]) + '-01', false);
        else if (i >= 0 && i < names.length) showMonth(names[i]);
      });
    });
    legend.forEach(function (b) {
      b.addEventListener('click', function () { st.off[b.dataset.cat] = !st.off[b.dataset.cat]; filters(); });
    });
    cells.forEach(function (c) {
      if (c.classList.contains('out')) return;
      if (c.dataset.day === today) { c.classList.add('is-today'); c.setAttribute('aria-current', 'date'); }
      else if (c.dataset.day < today) c.classList.add('is-past');
    });
    document.addEventListener('rr:checks', paintPills);
    Store.on(paintNotes);
    paintPills();
    root.classList.add('is-live');
    function asked() {  // the day named in the address (#d=2026-12-02), when the calendar has it
      var d = (/d=(\d{4}-\d\d-\d\d)/.exec(location.hash) || [])[1];
      return d && cells.some(function (c) { return c.dataset.day === d; }) ? d : '';
    }
    window.addEventListener('hashchange', function () { if (asked() && asked() !== st.day) select(asked(), false); });
    var start = asked() || today;
    select(inRange(start) ? start : (start < names[0] ? names[0] : names[names.length - 1]) + '-01', false);
  });

  // ---------------------------------------------------------------- "Filter this page": hides the rows that do not contain every word
  all('input[data-pagefilter]').forEach(function (input) {
    var count = input.parentNode.querySelector('.count'), rows = all('main [data-row]'), terms = [];
    function tally() {  // rows that match and are on screen (other filters and hidden views respected)
      if (!terms.length) { count.textContent = ''; return; }
      var n = rows.filter(function (r) { return !r.classList.contains('f-out') && !r.closest('[hidden]'); }).length;
      count.textContent = n + (n === 1 ? ' match' : ' matches');
    }
    input.addEventListener('input', function () {
      terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
      rows.forEach(function (r) {
        var text = r._text || (r._text = r.textContent.toLowerCase());
        r.classList.toggle('f-out', !terms.every(function (t) { return text.indexOf(t) > -1; }));
      });
      all('.plan-group, .plan-sec').forEach(function (g) {  // a block whose rows are all filtered out goes too
        g.classList.toggle('f-out', !!terms.length && !!g.querySelector('[data-row]') && !g.querySelector('[data-row]:not(.f-out)'));
      });
      fire('rr:filter');
      tally();
    });
    document.addEventListener('rr:view', tally);
  });

  // ---------------------------------------------------------------- Author final: his own version of an unsent draft
  function tidy(s) { return (s || '').replace(/\r\n?/g, '\n').replace(/^[ \t\n]+|[ \t\n]+$/g, ''); }
  function words(s) { return (s.match(/\S+/g) || []).length; }
  function clock(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()] + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fit(ta) { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; }
  function diffWords(a, b) {  // word-level longest common subsequence -> [[0 same | -1 removed | 1 added, text], ...]
    var x = a.match(/\S+\s*/g) || [], y = b.match(/\S+\s*/g) || [], n = x.length, m = y.length, w = m + 1, i, j;
    if (n * m > 4e6) return null;
    var xs = x.map(function (s) { return s.trim(); }), ys = y.map(function (s) { return s.trim(); });
    var t = new Uint16Array((n + 1) * w), out = [];
    for (i = n - 1; i >= 0; i--) {
      for (j = m - 1; j >= 0; j--) t[i * w + j] = xs[i] === ys[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
    }
    function add(op, s) { var last = out[out.length - 1]; if (last && last[0] === op) last[1] += s; else out.push([op, s]); }
    i = 0; j = 0;
    while (i < n && j < m) {
      if (xs[i] === ys[j]) { add(0, y[j]); i++; j++; }
      else if (t[(i + 1) * w + j] >= t[i * w + j + 1]) add(-1, x[i++]);
      else add(1, y[j++]);
    }
    while (i < n) add(-1, x[i++]);
    while (j < m) add(1, y[j++]);
    return out;
  }

  var marks = all('[data-final-mark]');
  var panels = all('.final[data-final]').map(function (box) {
    var id = 'draft:' + box.dataset.final, base = box.dataset.base, draft = tidy(document.getElementById(box.dataset.src).dataset.raw);
    var ta = box.querySelector('.final-text'), pr = box.querySelector('.final-prompt'), ok = box.querySelector('.final-ok input');
    var stateEl = box.querySelector('.final-state'), countEl = box.querySelector('.final-count'), statusEl = box.querySelector('.final-status');
    var diffEl = box.querySelector('.final-diff'), warnEl = box.querySelector('.final-warn'), applied = box.querySelector('.final-applied');
    var bDiff = box.querySelector('[data-act=diff]'), bCopy = box.querySelector('[data-act=copy]'), bReset = box.querySelector('[data-act=reset]');
    var mark = marks.filter(function (el) { return el.dataset.finalMark === box.dataset.final; })[0];
    var me = {edited: false, prompt: false, ok: false}, draftWords = words(draft), diffFor = null, armed = 0, touched = false;
    ta.style.overflow = 'hidden';

    function edited() { var t = tidy(ta.value); return t !== '' && t !== draft; }
    function save() {  // "base" records which version of the draft this was typed against
      touched = true;
      Store.set(id, {final: edited() ? ta.value : '', prompt: pr.value, ok: ok.checked, base: base});
    }
    function disarm() { clearTimeout(armed); armed = 0; bReset.textContent = 'Start again from the draft'; }
    function showDiff() {
      var d = diffWords(draft, tidy(ta.value));
      diffEl.textContent = d ? '' : 'These texts are too long to compare here.';
      (d || []).forEach(function (part) {
        var node = part[0] ? document.createElement(part[0] > 0 ? 'ins' : 'del') : document.createTextNode(part[1]);
        if (part[0]) node.textContent = part[1];
        diffEl.appendChild(node);
      });
      diffFor = ta.value; diffEl.hidden = false; bDiff.textContent = 'Hide changes';
    }
    function paint() {
      var it = Store.get(id) || {}, state = Store.state(), parts = [], short = [], n = words(ta.value);
      me.edited = edited(); me.prompt = tidy(pr.value) !== ''; me.ok = ok.checked;
      if (me.edited) { parts.push('Edited by you'); short.push('edited'); }
      if (me.prompt) { parts.push('Instruction waiting'); short.push('instruction'); }
      if (me.ok) { parts.push('Marked final'); short.push('final'); }
      stateEl.textContent = parts.join(' \u00b7 ') || 'Same as the draft';
      box.classList.toggle('is-edited', me.edited); box.classList.toggle('has-prompt', me.prompt); box.classList.toggle('is-ok', me.ok);
      if (mark) { mark.textContent = short.join(' \u00b7 '); mark.classList.toggle('on', short.length > 0); }
      countEl.textContent = n + (n === 1 ? ' word' : ' words') + (me.edited ? ' (the draft has ' + draftWords + ')' : '');
      bDiff.disabled = bReset.disabled = !me.edited;
      if (!me.edited) { diffEl.hidden = true; bDiff.textContent = 'Show changes'; disarm(); }
      else if (!diffEl.hidden && diffFor !== ta.value) showDiff();
      var kept = !!it.updated && (touched || me.edited || me.prompt || me.ok);  // nothing to report on an untouched, empty box
      statusEl.textContent = !kept ? '' : Store.pending(id) && state !== 'local' ? 'Saving\u2026' :
        (state === 'disk' ? 'Saved to a file on this PC' : state === 'local' ? 'Saved in this browser only' : 'Saved') +
        ' \u00b7 ' + clock(new Date(it.updated));
      statusEl.classList.toggle('local', kept && state === 'local');
      var done = it.applied || [], ol = applied.querySelector('ol');
      applied.hidden = !done.length;
      if (ol.children.length !== done.length) {
        ol.textContent = '';
        done.forEach(function (x) {
          var li = document.createElement('li'), q = document.createElement('q');
          q.textContent = x.prompt;
          li.appendChild(document.createTextNode(clock(new Date(String(x.at).replace(' ', 'T'))) + ': '));
          li.appendChild(q);
          if (x.note) li.appendChild(document.createTextNode(' \u2192 ' + x.note));
          ol.appendChild(li);
        });
      }
    }
    function load() {  // the stored note -> the fields; a field that is being typed in is left alone
      var it = Store.get(id) || {}, f = tidy(it.final), own = f !== '' && f !== draft, want = own ? it.final : draft;
      var moved = !!it.base && it.base !== base && f !== draft;  // the draft was revised after this note was saved
      if (document.activeElement !== ta && tidy(ta.value) !== tidy(want)) { ta.value = want; fit(ta); }
      if (document.activeElement !== pr && pr.value !== (it.prompt || '')) pr.value = it.prompt || '';
      ok.checked = !!it.ok && !moved;
      warnEl.textContent = !moved ? '' : own ? 'This draft was revised after you wrote your version. Your version is kept here: ' +
        'Show changes compares it with the new draft, and Start again from the draft takes the new one.' :
        it.ok ? 'This draft was revised after you marked it final. Read it again, then tick the box if it is still right.' : '';
      warnEl.hidden = !warnEl.textContent;
      paint();
    }

    ta.addEventListener('input', function () { fit(ta); save(); });
    ta.addEventListener('blur', load);
    pr.addEventListener('input', save);
    ok.addEventListener('change', save);
    bDiff.addEventListener('click', function () {
      if (diffEl.hidden) showDiff(); else { diffEl.hidden = true; bDiff.textContent = 'Show changes'; }
    });
    bCopy.addEventListener('click', function () { copyText(ta.value, bCopy, 'Copy'); });
    bReset.addEventListener('click', function () {
      if (!armed) { bReset.textContent = 'Click again to discard your version'; armed = setTimeout(disarm, 4000); return; }
      disarm(); ta.value = draft; ok.checked = false; fit(ta); save();
    });
    Store.on(load);
    load(); fit(ta);
    return me;
  });
  if (panels.length) {
    var total = document.querySelector('[data-final-total]');
    var totals = function () {
      var n = [0, 0, 0], parts = [];
      panels.forEach(function (m) { n[0] += m.edited; n[1] += m.prompt; n[2] += m.ok; });
      if (n[0]) parts.push(n[0] + ' edited by you');
      if (n[1]) parts.push(n[1] + ' with an instruction waiting');
      if (n[2]) parts.push(n[2] + ' marked final');
      if (total) total.textContent = parts.join(' \u00b7 ');
    };
    var refit = function () { all('.final-text').forEach(fit); };
    Store.on(totals); totals();
    window.addEventListener('resize', refit);
    window.addEventListener('load', function () { (document.fonts ? document.fonts.ready : Promise.resolve()).then(refit); });
  }

  // ---------------------------------------------------------------- Send: an unsent email sent from this PC (send_queue.py)
  // Only through report_server.py: a click shows the email exactly as it would go, and only "Send now" in that box sends
  // it, through Gmail with the app password kept on this PC. The online copy has no server and shows no Send button.
  (function () {
    var bars = all('.final-send[data-send-key]');
    if (!bars.length || !Store.served()) return;
    all('[data-send-help]').forEach(function (x) { x.hidden = false; });
    var box = document.createElement('dialog'), bar = null, shown = null;
    box.className = 'sendbox';
    box.setAttribute('aria-labelledby', 'sendbox-title');
    box.innerHTML = '<div class="sendbox-head"><h2 id="sendbox-title"></h2><dl></dl></div><div class="sendbox-text" tabindex="0"></div>' +
      '<p class="sendbox-msg" role="status" hidden></p><div class="sendbox-foot"><button type="button" class="btn" data-act="close">Cancel</button>' +
      '<button type="button" class="btn send" data-act="go">Send now</button></div>';
    document.body.appendChild(box);
    var title = box.querySelector('h2'), facts = box.querySelector('dl'), text = box.querySelector('.sendbox-text');
    var msg = box.querySelector('.sendbox-msg'), close = box.querySelector('[data-act=close]'), go = box.querySelector('[data-act=go]');

    function say(words, kind) { msg.textContent = words; msg.className = 'sendbox-msg' + (kind ? ' ' + kind : ''); msg.hidden = !words; }
    function fact(name, value) {
      var dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = name; dd.textContent = value;
      facts.appendChild(dt); facts.appendChild(dd);
    }
    function note(b, words, kind) {  // the line beside the button
      var n = b.querySelector('.send-note');
      n.textContent = words;
      n.className = 'send-note' + (kind ? ' ' + kind : '');
    }
    function open(b, p) {
      var can = !p.blocked && p.ready;
      bar = b; shown = p; facts.textContent = '';
      title.textContent = p.blocked ? 'This email cannot go yet' : p.ready ? 'Send this email?' : 'Sending is not set up on this PC yet';
      fact('To', (p.name ? p.name + ' \u00b7 ' : '') + p.to);
      fact('Subject', p.subject);
      fact('Attached', p.attachments.length ? p.attachments.join(', ') : 'nothing');
      fact('Goes', p.mode === 'reply' ? 'from your Gmail, as a reply in their conversation' : 'from your Gmail, as a new email');
      text.textContent = p.text;
      say(p.blocked || (p.ready ? 'This is exactly what goes (' + p.words + ' words). Gmail keeps a copy in Sent.' + (p.note ? ' ' + p.note : '') : p.not_set_up), can ? '' : 'warn');
      go.hidden = !can; go.disabled = false; go.textContent = 'Send now';
      close.disabled = false; close.textContent = can ? 'Cancel' : 'Close';
      if (box.showModal) box.showModal(); else box.setAttribute('open', '');
      text.scrollTop = 0;
      close.focus();
    }
    function shut() { if (box.close) box.close(); else box.removeAttribute('open'); }

    close.addEventListener('click', shut);
    box.addEventListener('cancel', function (ev) { if (go.disabled && !go.hidden) ev.preventDefault(); });  // not while it is sending
    go.addEventListener('click', function () {
      var b = bar, p = shown, done = function () { go.hidden = true; close.disabled = false; close.textContent = 'Close'; };
      go.disabled = true; close.disabled = true; go.textContent = 'Sending\u2026';
      say('Sending through Gmail\u2026');
      Store.ask('/api/send', 'POST', {batch: b.dataset.sendBatch, key: b.dataset.sendKey, sig: p.sig}).then(function (r) {
        done();
        if (!r.ok) return say(r.refused || 'It was not sent.', 'warn');
        say('Sent at ' + r.sent_at + ' to ' + r.to + '. Gmail keeps a copy in Sent. This page shows it as sent once the report is ' +
            'rebuilt, in about a minute.' + (r.note ? ' ' + r.note : ''), 'ok');
        note(b, 'Sent at ' + r.sent_at + ' to ' + r.to + '.', 'sent');
        all('textarea, input, button', b.closest('.final')).forEach(function (x) { x.disabled = true; });
      }, function (err) {
        done();
        say('The report server on this PC did not answer (' + err.message + '), so the email may or may not have gone: look in ' +
            'Gmail\u2019s Sent folder before you press Send again.', 'warn');
      });
    });

    bars.forEach(function (b) {
      var btn = b.querySelector('[data-act=send]'), idle = b.querySelector('.send-note').textContent;
      b.hidden = false;
      btn.addEventListener('click', function () {
        btn.disabled = true; note(b, 'Opening\u2026');
        Store.flush().then(function () {  // what was just typed reaches the PC first
          return Store.ask('/api/send?batch=' + encodeURIComponent(b.dataset.sendBatch) + '&key=' + encodeURIComponent(b.dataset.sendKey), 'GET');
        }).then(function (p) {
          btn.disabled = false; note(b, idle);
          if (p.ok === false) return note(b, p.refused || 'It cannot be sent from here.', 'warn');
          open(b, p);
        }, function () {
          btn.disabled = false;
          note(b, 'The report server on this PC does not answer: open the report with \u201cOpen report.cmd\u201d in the replies_report folder.', 'warn');
        });
      });
    });
  })();

  // ---------------------------------------------------------------- where the notes are being saved; export
  (function () {
    var label = document.querySelector('[data-notes-state]'), exp = document.querySelector('[data-export]'), banner = null;
    function paint() {
      var state = Store.state(), n = Object.keys(Store.all()).length;
      if (label) label.textContent = state === 'disk' ? 'Your notes save to a file on this PC' : state === 'local' && n ? 'Your notes are kept in this browser only' : '';
      if (exp) exp.hidden = !n;
      if (panels.length && state === 'local' && !banner) {
        banner = document.createElement('p');
        banner.className = 'notes-banner';
        banner.textContent = 'What you type here is being kept in this browser only. To save it to a file on this PC, where the ' +
          'assistant can read it, open the report with \u201cOpen report.cmd\u201d in the replies_report folder.';
        var main = document.querySelector('main');
        main.insertBefore(banner, main.firstChild);
      }
      if (banner) banner.hidden = state !== 'local';
    }
    if (exp) exp.addEventListener('click', function () {
      var d = new Date(), a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify({exported: d.toISOString(), items: Store.all()}, null, 1)], {type: 'application/json'}));
      a.download = 'author_notes_export_' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes()) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    Store.on(paint);
    paint();
    Store.start();
  })();

  // ---------------------------------------------------------------- the report was rebuilt while this page was open; mailbox watcher
  (function () {
    var built = document.documentElement.dataset.built || '', live = document.querySelector('[data-live]');
    var status = document.querySelector('.nav-side .status'), bar = null;
    function again(name, done) {  // run assets/<name>.js once more; a script tag also works for pages opened from disk
      var s = document.createElement('script');
      s.src = ASSETS + name + '.js?t=' + Date.now();
      s.onload = s.onerror = function () { s.remove(); done(); };
      document.head.appendChild(s);
    }
    function reload() {
      try { sessionStorage.setItem('rr:scroll', JSON.stringify([location.pathname, window.scrollY])); } catch (err) { /* storage unavailable */ }
      location.reload();
    }
    function paintLive() {  // what mail_watch.py last reported (assets/live.js)
      var L = window.RR_LIVE || {}, at = L.checked ? new Date(L.checked.replace(' ', 'T')) : null, text = '';
      var fresh = at && (Date.now() - at.getTime()) / 1000 < Math.max(600, 4 * (L.every || 0));
      if (L.error) text = 'Automatic mail check: ' + L.error + '.';
      else if (fresh) text = 'Mailbox checked automatically at ' + pad(at.getHours()) + ':' + pad(at.getMinutes()) + (L.waiting ? ', ' + L.waiting + ' not yet assessed' : '') + '.';
      else if (at) text = 'Automatic mail check is not running (last check ' + clock(at) + ').';
      if (live) live.textContent = text + (L.note ? ' ' + L.note + '.' : '');
      if (status && fresh && !L.error) status.textContent = 'Status ' + at.getDate() + ' ' + MONTHS[at.getMonth()] + ', ' + pad(at.getHours()) + ':' + pad(at.getMinutes());
    }
    function offer() {  // a newer build exists: refresh a tab nobody is looking at, ask in one that is open or being typed in
      if (!window.RR_BUILT || !built || window.RR_BUILT <= built || bar) return;
      var typing = /^(TEXTAREA|INPUT|SELECT)$/.test((document.activeElement || {}).tagName || '');
      if (document.hidden && !typing) return reload();
      var text = document.createElement('span'), btn = document.createElement('button');
      bar = document.createElement('div');
      bar.className = 'livebar'; bar.setAttribute('role', 'status');
      text.textContent = 'The report was updated at ' + window.RR_BUILT.slice(11, 16) + '.';
      btn.type = 'button'; btn.textContent = 'Show the new version';
      btn.addEventListener('click', reload);
      bar.appendChild(text); bar.appendChild(btn);
      document.body.appendChild(bar);
    }
    function poll() { again('build', function () { offer(); again('live', paintLive); }); }
    try {  // back where the reader was before an automatic refresh
      var kept = JSON.parse(sessionStorage.getItem('rr:scroll') || 'null');
      sessionStorage.removeItem('rr:scroll');
      if (kept && kept[0] === location.pathname) window.scrollTo({top: kept[1], behavior: 'instant'});
    } catch (err) { /* storage unavailable */ }
    paintLive();
    setInterval(poll, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
  })();
})();

// ---------------------------------------------------------------- the navigation (site_nav.py)
(function () {
  'use strict';
  var root = document.documentElement, side = document.getElementById('nav-side'), KEY = 'rr:nav';
  if (!side) return;
  var pin = side.querySelector('[data-nav-pin]'), opener = document.querySelector('[data-nav-open]'), links = side.querySelector('.nav-links');

  // wide screen: the button at the top of the bar closes it to a rail of icons, and keeps it open again
  function kept() { try { return localStorage.getItem(KEY) === 'rail'; } catch (err) { return false; } }
  function paint() {
    var rail = root.classList.contains('nav-rail'), text = rail ? 'Keep the navigation open' : 'Close the navigation to its icons';
    pin.setAttribute('aria-pressed', rail ? 'false' : 'true');
    pin.setAttribute('aria-label', text);
    pin.title = text;
  }
  pin.addEventListener('click', function () {
    var rail = root.classList.toggle('nav-rail');
    root.classList.toggle('nav-quiet', rail);  // closed with the pointer on it: it stays closed until the pointer has left
    try { localStorage.setItem(KEY, rail ? 'rail' : 'open'); } catch (err) { /* storage unavailable: open again on the next page */ }
    paint();
  });
  side.addEventListener('pointerleave', function () { root.classList.remove('nav-quiet'); });

  // small screen: the menu
  function menu(open) {
    if (open === root.classList.contains('nav-open')) return;
    root.classList.toggle('nav-open', open);
    opener.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) (links.querySelector('[aria-current="page"]') || side.querySelector('a')).focus();
    else if (side.contains(document.activeElement)) opener.focus();
  }
  opener.addEventListener('click', function () { menu(true); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-nav-close]'), function (el) {
    el.addEventListener('click', function () { menu(false); });
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') menu(false); });
  // "/" or Ctrl+K: the search (site_search.py), from any page; not while typing in a box
  document.addEventListener('keydown', function (ev) {
    var t = ev.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    var slash = ev.key === '/' && !typing && !ev.ctrlKey && !ev.metaKey && !ev.altKey;
    var ctrlK = (ev.ctrlKey || ev.metaKey) && !ev.altKey && !ev.shiftKey && (ev.key === 'k' || ev.key === 'K');
    if (!slash && !ctrlK) return;
    var box = document.querySelector('input[data-site-search]'), go = side.querySelector('a.nav-a[href$="search.html"]');
    if (box) { ev.preventDefault(); box.focus(); box.select(); }
    else if (go) { ev.preventDefault(); location.href = go.href; }
  });
  // come from a result of the search: the first place on the page with the words looked for, selected and in view.
  // The finding starts below the navigation, at the page head
  var arrive = null;
  try { arrive = JSON.parse(sessionStorage.getItem('rr:find') || 'null'); sessionStorage.removeItem('rr:find'); } catch (err) { /* no storage */ }
  if (arrive && arrive.w && Date.now() - arrive.at < 60000 && typeof window.find === 'function' && !document.querySelector('input[data-site-search]')) {
    setTimeout(function () {
      var start = document.querySelector('body > header, main'), sel = window.getSelection();
      try {
        if (start && sel) { var r = document.createRange(); r.setStart(start, 0); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); }
        window.find(arrive.w, false, false, true, false, false, false);
      } catch (err) { /* not on the page as written: the page stays at its top */ }
    }, 250);
  }
  document.addEventListener('focusin', function (ev) { if (!side.contains(ev.target)) menu(false); });  // the Tab key has left the menu
  window.addEventListener('resize', function () { if (window.matchMedia('(min-width:1357px)').matches) menu(false); });
  window.addEventListener('pageshow', function (ev) {  // back on a page the browser kept: the bar as it was left since
    if (!ev.persisted) return;
    menu(false);
    root.classList.toggle('nav-rail', kept());
    paint();
  });
  paint();

  // the page that is open, in view where the bar is too short to show every page
  var cur = links.querySelector('[aria-current="page"]');
  if (cur && cur.offsetTop + cur.offsetHeight > links.clientHeight) links.scrollTop = cur.offsetTop - (links.clientHeight - cur.offsetHeight) / 2;

  // the tab bar under a page head, where it is too wide for the screen: the open tab in view, and the edges marked (CSS)
  Array.prototype.forEach.call(document.querySelectorAll('.subnav .wrap'), function (bar) {
    function edges() {
      bar.classList.toggle('more-l', bar.scrollLeft > 2);
      bar.classList.toggle('more-r', bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 2);
    }
    var tab = bar.querySelector('[aria-current]');
    if (tab && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2;
    edges();
    bar.addEventListener('scroll', edges, {passive: true});
    window.addEventListener('resize', edges);
  });
})();

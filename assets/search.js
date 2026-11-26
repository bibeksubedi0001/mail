// ---------------------------------------------------------------- search (site_search.py)
// The words of every page are in this page (#ss-data): the searching is done here, and nothing leaves the page.
(function () {
  'use strict';
  var box = document.querySelector('input[data-site-search]'), list = document.querySelector('[data-ss-list]'),
      store = document.getElementById('ss-data');
  if (!box || !list || !store) return;
  var form = document.querySelector('[data-ss-form]'), count = document.querySelector('[data-ss-count]'),
      secs = document.querySelector('[data-ss-secs]'), more = document.querySelector('[data-ss-more]');
  var DOCS = JSON.parse(store.textContent).map(function (d) { return {u: d[0], t: d[1], s: d[2], x: d[3]}; });
  var STEP = 25, shown = STEP, only = '', timer = 0, WORD = /[a-z0-9]/;

  function fold(s) {  // lower case, without accents or curly quotes, letter for letter: as long as s, so places match
    var l = s.toLowerCase();
    if (l.length !== s.length) l = s.replace(/[\s\S]/g, function (c) { var d = c.toLowerCase(); return d.length === 1 ? d : c; });
    return l.replace(/[\u00c0-\u024f\u1e00-\u1eff]/g, function (c) {
      var d = c.normalize ? c.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : c;
      return d.length === 1 ? d : c;
    }).replace(/[\u2018\u2019\u02bc]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2010-\u2015]/g, '-');
  }
  function terms(q) {  // the words looked for, each {w: folded, r: as typed}; words in quotes stay together
    var out = [], seen = [], m, re = /"([^"]*)"|(\S+)/g;
    q = q.replace(/[\u201c\u201d]/g, '"');
    while ((m = re.exec(q))) {
      var r = m[1] !== undefined ? m[1].replace(/\s+/g, ' ').trim()
        : m[2].replace(/^[^\w\u00c0-\u024f\u0900-\u097f$\u00a3\u20ac]+|[^\w\u00c0-\u024f\u0900-\u097f%]+$/g, ''), w = fold(r);
      if (w && seen.indexOf(w) < 0) { seen.push(w); out.push({w: w, r: r}); }
    }
    return out;
  }
  function places(hay, w, cap) {  // where w starts a word of hay; anywhere, for a w that does not start with a letter or digit
    var out = [], lead = WORD.test(w.charAt(0));
    for (var i = hay.indexOf(w); i >= 0 && out.length < cap; i = hay.indexOf(w, i + 1))
      if (!lead || i === 0 || !WORD.test(hay.charAt(i - 1))) out.push(i);
    return out;
  }
  function hits(hay, w, cap) {  // how often w is in hay; as a whole word it counts twice
    var tail = WORD.test(w.charAt(w.length - 1));
    return places(hay, w, cap).reduce(function (n, i) {
      var j = i + w.length;
      return n + (!tail || j >= hay.length || !WORD.test(hay.charAt(j)) ? 2 : 1);
    }, 0);
  }
  function has(hay, w) { return places(hay, w, 1).length > 0; }
  function find(ws, whole) {  // the pages with every word, best first: in the title, then in the part, then how much of the page
    var found = [];
    DOCS.forEach(function (d) {
      if (d.fx === undefined) { d.ft = fold(d.t); d.fs = fold(d.s); d.fx = fold(d.x); d.k = Math.sqrt(1 + d.x.length / 2000); }
      var score = 0;
      for (var i = 0; i < ws.length; i++) {
        var w = ws[i], t = has(d.ft, w), s = has(d.fs, w), n = hits(d.fx, w, 50);
        if (!t && !s && !n) return;
        // a page that is about the word beats a long page that lists it among many (the calendar, the applications)
        score += (t ? 50 : 0) + (s ? 8 : 0) + (n ? 10 + 4 * Math.log(1 + n) / Math.LN2 + Math.min(25, 8 * n / d.k) : 0);
      }
      if (ws.length > 1) score += has(d.ft, whole) ? 80 : has(d.fx, whole) ? 20 : 0;
      if (d.ft === whole) score += 120;
      found.push({d: d, score: score});
    });
    return found.sort(function (a, b) { return b.score - a.score || (a.d.t < b.d.t ? -1 : a.d.t > b.d.t ? 1 : 0); });
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function marked(text, folded, ws) {  // text with each word found in a <mark>; folded is fold(text)
    var spans = [], out = '', at = 0;
    ws.forEach(function (w) { places(folded, w, 500).forEach(function (i) { spans.push([i, i + w.length]); }); });
    spans.sort(function (a, b) { return a[0] - b[0]; }).forEach(function (sp) {
      if (sp[1] <= at) return;
      var a = Math.max(sp[0], at);
      out += esc(text.slice(at, a)) + '<mark>' + esc(text.slice(a, sp[1])) + '</mark>';
      at = sp[1];
    });
    return out + esc(text.slice(at));
  }
  function first(hay, w) { var p = places(hay, w, 1); return p.length ? p[0] : -1; }
  function snips(d, ws, whole) {  // up to two passages of the page around the words found
    var x = d.x, fx = d.fx, at = [], R = 80, wins = [];
    var p = ws.length > 1 ? first(fx, whole) : -1;
    if (p >= 0) at.push(p);
    ws.forEach(function (w) { var i = first(fx, w); if (i >= 0) at.push(i); });
    if (!at.length) return [esc(x.slice(0, 2 * R)) + (x.length > 2 * R ? '\u2026' : '')];
    at.sort(function (a, b) { return a - b; }).forEach(function (i) {
      var a = Math.max(0, i - R), b = Math.min(x.length, i + R + 60), last = wins[wins.length - 1];
      if (last && a <= last[1]) last[1] = Math.min(Math.max(last[1], b), last[0] + 420);
      else wins.push([a, b]);
    });
    return wins.slice(0, 2).map(function (w) {
      var a = w[0], b = w[1], s, t;
      if (a > 0 && (s = x.indexOf(' ', a)) > 0 && s < a + 25) a = s + 1;
      if (b < x.length && (t = x.lastIndexOf(' ', b)) > b - 25) b = t;
      return (a > 0 ? '\u2026' : '') + marked(x.slice(a, b), fx.slice(a, b), ws) + (b < x.length ? '\u2026' : '');
    });
  }
  function quoted(ts) { return ts.map(function (t) { return '\u201c' + t.r + '\u201d'; }).join(', '); }
  function render(keep) {
    var q = box.value.trim(), ts = terms(q), ws = ts.map(function (t) { return t.w; }),
        whole = fold(q.replace(/["\u201c\u201d]/g, ' ')).replace(/\s+/g, ' ').trim();
    var h = q ? '#q=' + encodeURIComponent(q) + (only ? '&s=' + encodeURIComponent(only) : '') : '';
    if (location.hash !== h) history.replaceState(null, '', location.pathname + h);
    if (!keep) shown = STEP;
    if (!ws.length || (ws.length === 1 && ws[0].length < 2)) {
      list.innerHTML = '';
      count.textContent = q ? 'Type at least two letters.' : '';
      secs.hidden = more.hidden = true;
      return;
    }
    var found = find(ws, whole), by = {}, order = [];
    found.forEach(function (f) { if (!by[f.d.s]) { by[f.d.s] = 0; order.push(f.d.s); } by[f.d.s]++; });
    if (only && !by[only]) only = '';
    var rows = only ? found.filter(function (f) { return f.d.s === only; }) : found;
    secs.innerHTML = ['<button type="button" data-s="" aria-pressed="' + !only + '">All<span class="k">' + found.length + '</span></button>']
      .concat(order.map(function (s) {
        return '<button type="button" data-s="' + esc(s) + '" aria-pressed="' + (s === only) + '">' + esc(s) + '<span class="k">' + by[s] + '</span></button>';
      })).join('');
    secs.hidden = order.length < 2;
    count.textContent = !found.length ? 'Nothing found for ' + quoted(ts) + '. Try fewer words, or the start of a word.'
      : rows.length + (rows.length === 1 ? ' page has ' : ' pages have ') + (ts.length === 1 ? quoted(ts) : 'all of ' + quoted(ts))
        + (only ? ', in ' + only : '') + '.';
    list.innerHTML = rows.slice(0, shown).map(function (f) {
      // the words as the page shows them where they first come, for the page to find when it opens (site_nav.py)
      var d = f.d, p = ws.length > 1 ? first(d.fx, whole) : -1, w = p >= 0 ? whole : ws[0], i = p >= 0 ? p : first(d.fx, ws[0]);
      return '<li class="ss-item"><a class="ss-t" href="' + esc(d.u) + '" data-find="' + esc(i >= 0 ? d.x.slice(i, i + w.length) : '') + '">'
        + marked(d.t, d.ft, ws) + '</a>' + (d.s ? '<span class="ss-s">' + esc(d.s) + '</span>' : '')
        + snips(d, ws, whole).map(function (s) { return '<p class="ss-x">' + s + '</p>'; }).join('') + '</li>';
    }).join('');
    more.hidden = rows.length <= shown;
    if (!more.hidden) more.textContent = 'Show ' + Math.min(STEP, rows.length - shown) + ' more';
  }

  list.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('a.ss-t') : null;
    if (!a || !a.getAttribute('data-find')) return;
    try { sessionStorage.setItem('rr:find', JSON.stringify({w: a.getAttribute('data-find'), at: Date.now()})); } catch (err) { /* no storage */ }
  });

  box.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { only = ''; render(); }, 150);
  });
  if (form) form.addEventListener('submit', function (ev) { ev.preventDefault(); clearTimeout(timer); render(); });
  secs.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('button[data-s]') : null;
    if (!b) return;
    only = b.getAttribute('data-s');
    render();
  });
  more.addEventListener('click', function () { shown += STEP; render(true); });
  // the words looked for, from the address: #q=... (this page), or ?q=... (the form without its script)
  var q = /[#&]q=([^&]*)/.exec(location.hash) || /[?&]q=([^&]*)/.exec(location.search), s = /[#&]s=([^&]*)/.exec(location.hash);
  if (q) { try { box.value = decodeURIComponent(q[1].replace(/\+/g, ' ')); } catch (err) { box.value = q[1]; } }
  if (s) { try { only = decodeURIComponent(s[1]); } catch (err) { only = ''; } }
  if (box.value) render(true);
  box.focus();
})();

(function () {
  'use strict';
  var root = document.querySelector('[data-tracker]');
  if (!root || !window.RR) return;
  var Store = RR.Store, data = JSON.parse(document.getElementById('trk-data').textContent);
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function one(sel) { return root.querySelector(sel); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dateOf(s) { var p = s.split('-'); return new Date(+p[0], p[1] - 1, +p[2]); }
  function shift(s, n) { var d = dateOf(s); d.setDate(d.getDate() + n); return iso(d); }
  function short(s) { var d = dateOf(s); return DAYS[d.getDay()].slice(0, 3) + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); }
  function make(tag, cls, text) { var x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }
  function note(id) { var it = Store.get('note:' + id); return it && it.text || ''; }
  function lines(s) { return s.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  function ticked(id) { var it = Store.get(id); return !!(it && it.on); }
  function things() { var own = lines(note('tracker.things')); return own.length ? own : data.things; }
  function done(d) { return lines(note('day.' + d)); }
  function hours(d) { var v = parseFloat(note('hours.' + d)); return v > 0 ? Math.min(v, 24) : 0; }
  function num(h) { return String(Math.round(h * 100) / 100); }
  function count(n, a, b) { return n + ' ' + (n === 1 ? a : b); }
  var today = iso(new Date()), day = (/d=(\d{4}-\d\d-\d\d)/.exec(location.hash) || [])[1] || today;

  function field(el, id, read) {  // a box whose text is kept under a note id that follows the chosen day
    var timer = 0;
    read = read || function () { return note(id()); };
    function save() { clearTimeout(timer); timer = 0; if (read() !== el.value) Store.set('note:' + id(), {text: el.value}); }
    el.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(save, 500); });
    el.addEventListener('blur', save);
    return {save: save, paint: function () { if (document.activeElement !== el && !timer && el.value !== read()) el.value = read(); }};
  }
  var fields = [field(one('[data-log]'), function () { return 'log.' + day; }),
                field(one('[data-hours]'), function () { return 'hours.' + day; }),
                field(one('[data-thinglist]'), function () { return 'tracker.things'; }, function () { return things().join('\n'); })];

  function entry(x, when) {  // one line of the calendar: [kind, text, link, tick id]
    var li = make('li', 'c-' + x[0]), box = make('span'), a = make('a', '', x[1]);
    a.href = x[2];
    if (when) box.appendChild(make('span', 'd', when));
    box.appendChild(a);
    li.appendChild(make('i')); li.appendChild(box); li.appendChild(make('small', '', data.kinds[x[0]] || ''));
    if (x[3] && ticked('check:' + x[3])) li.classList.add('is-done');
    if (x[0] === 'app' && ticked('star:' + x[3])) li.classList.add('is-starred');
    return li;
  }
  function plain(text, href, kind) {
    var li = make('li'), a = make('a', '', text);
    a.href = href;
    li.appendChild(make('i')); li.appendChild(a); li.appendChild(make('small', '', kind));
    return li;
  }
  function paintHead() {
    var d = dateOf(day), n = Math.round((d - dateOf(today)) / 864e5), rel = one('[data-rel]');
    one('[data-title]').textContent = DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    rel.textContent = Math.abs(n) <= 1 ? ['yesterday', 'today', 'tomorrow'][n + 1] : n > 0 ? 'in ' + n + ' days' : -n + ' days ago';
    rel.className = 'left ' + (n < 0 ? 'past' : n === 0 ? 'hot' : 'cool');
    one('[data-cal]').href = 'calendar.html#d=' + day;
    one('[data-go="today"]').disabled = day === today;
    document.title = 'Daily tracker, ' + short(day);
  }
  function paintDay() {
    var ul = one('[data-day]'), got = data.days[day] || [], m = data.mail[day], n = got.length;
    ul.textContent = '';
    got.forEach(function (x) { ul.appendChild(entry(x)); });
    if (m) {
      ul.appendChild(plain([m[0] ? count(m[0], 'email sent', 'emails sent') : '', m[1] ? count(m[1], 'reply received', 'replies received') : '',
        m[2] ? count(m[2], 'reply sent', 'replies sent') : ''].filter(Boolean).join(' \u00b7 '), 'calendar.html#d=' + day, 'Mail'));
      n += 1;
    }
    if (day === today && data.owed) { ul.appendChild(plain(count(data.owed, 'reply is owed', 'replies are owed'), 'owed.html', 'Waiting on you')); n += 1; }
    one('[data-n="day"]').textContent = n || '';
    one('[data-none]').hidden = n > 0;
  }
  function paintWeek() {
    var ul = one('[data-week]'), n = 0, others = 0, i, d;
    var starred = data.apps.some(function (a) { return ticked('star:' + a[0]); });
    ul.textContent = '';
    for (i = 1; i <= 7; i += 1) {
      d = shift(day, i);
      (data.days[d] || []).forEach(function (x) {
        if (x[0] === 'app' && starred && !ticked('star:' + x[3])) { others += 1; return; }
        ul.appendChild(entry(x, short(d))); n += 1;
      });
    }
    if (others) ul.appendChild(plain(count(others, 'deadline of a programme you have not starred', 'deadlines of programmes you have not starred'),
      'applications.html#view=deadlines', 'Application'));
    one('[data-n="week"]').textContent = n || '';
    one('[data-noweek]').hidden = n + others > 0;
  }
  function paintThings() {
    var ul = one('[data-things]'), list = things(), was = done(day);
    var extra = was.filter(function (t) { return list.indexOf(t) < 0; });  // ticked on this day under an earlier wording
    var held = ul.contains(document.activeElement) ? document.activeElement.getAttribute('aria-label') : null;
    ul.textContent = '';
    list.concat(extra).forEach(function (t) {
      var li = make('li'), cb = make('input'), on = was.indexOf(t) > -1;
      cb.type = 'checkbox'; cb.checked = on; cb.setAttribute('aria-label', t);
      cb.addEventListener('change', function () {
        var now = done(day).filter(function (x) { return x !== t; });
        if (cb.checked) now.push(t);
        Store.set('note:day.' + day, {text: list.concat(extra).filter(function (x) { return now.indexOf(x) > -1; }).join('\n')});
      });
      li.setAttribute('data-row', ''); li.classList.toggle('is-done', on);
      li.appendChild(cb); li.appendChild(make('div', '', t)); ul.appendChild(li);
      if (t === held) cb.focus();
    });
    one('[data-n="things"]').textContent = was.filter(function (t) { return list.indexOf(t) > -1; }).length + ' of ' + list.length + ' done';
  }
  function weekTotal(start) { var s = 0, i; for (i = 0; i < 7; i += 1) s += hours(shift(start, i)); return s; }
  function paintHours() {
    var start = shift(day, -dateOf(day).getDay());  // weeks start on Sunday, as on the calendar
    one('[data-weeks]').textContent = 'Week from ' + short(start) + ': ' + num(weekTotal(start)) + ' h \u00b7 the week before: ' +
      num(weekTotal(shift(start, -7))) + ' h';
  }
  function paintApps() {
    var ul = one('[data-applist]'), n = {listed: 0, started: 0, submitted: 0};
    ul.textContent = '';
    data.apps.forEach(function (a) {
      var sub = ticked('check:' + a[0]), begun = sub || a[3].some(function (s) { return ticked('check:' + s); });
      if (ticked('star:' + a[0])) n.listed += 1;
      if (begun) n.started += 1;
      if (sub) n.submitted += 1;
      if (begun) ul.appendChild(plain(a[1], 'applications.html#a-' + a[2], sub ? 'Submitted' : count(a[3].filter(function (s) {
        return ticked('check:' + s); }).length, 'step', 'steps') + ' of ' + a[3].length));
    });
    Object.keys(n).forEach(function (k) { one('[data-a="' + k + '"]').textContent = n[k]; });
  }
  function paintGrid() {
    var table = one('[data-grid]'), head = make('tr'), body = table.querySelector('tbody'), list = things(), cols = [], i;
    var end = day > today || day < shift(today, -13) ? day : today, top = 0, row;
    for (i = 13; i >= 0; i -= 1) cols.push(shift(end, -i));
    cols.forEach(function (d) { done(d).forEach(function (t) { if (list.indexOf(t) < 0) list = list.concat([t]); }); top = Math.max(top, hours(d)); });
    head.appendChild(make('th'));
    cols.forEach(function (d) {
      var th = make('th', (d === day ? 'sel ' : '') + (d === today ? 'now' : '')), b = make('button');
      b.type = 'button'; b.setAttribute('data-go', d); b.setAttribute('aria-label', short(d));
      b.appendChild(make('span', '', DAYS[dateOf(d).getDay()].charAt(0))); b.appendChild(document.createTextNode(dateOf(d).getDate()));
      th.appendChild(b); head.appendChild(th);
    });
    table.querySelector('thead').textContent = ''; table.querySelector('thead').appendChild(head);
    body.textContent = '';
    list.forEach(function (t) {
      row = make('tr'); row.appendChild(make('th', '', t)); row.firstChild.scope = 'row';
      cols.forEach(function (d) { var td = make('td', done(d).indexOf(t) > -1 ? 'on' : ''); td.appendChild(make('i')); row.appendChild(td); });
      body.appendChild(row);
    });
    row = make('tr', top ? 'hrs' : ''); row.appendChild(make('th', '', 'Hours')); row.firstChild.scope = 'row';
    cols.forEach(function (d) {
      var td = make('td'), h = hours(d), bar = make('span');
      if (h) { bar.style.height = Math.max(2, Math.round(44 * h / top)) + 'px'; td.appendChild(bar); td.appendChild(document.createTextNode(num(h))); }
      row.appendChild(td);
    });
    body.appendChild(row);
    var from = things().every(function (t) { return done(day).indexOf(t) > -1; }) ? day : shift(day, -1), run = 0;
    while (run < 400 && things().every(function (t) { return done(shift(from, -run)).indexOf(t) > -1; })) run += 1;
    one('[data-streak]').textContent = run ? 'Everything ticked ' + count(run, 'day', 'days') + ' in a row.' : '';
  }
  function paintLogs() {
    var ol = one('[data-logs]'), items = Store.all(), found = [];
    Object.keys(items).forEach(function (k) {
      var m = /^note:log\.(\d{4}-\d\d-\d\d)$/.exec(k), t = m && (items[k].text || '').trim();
      if (t) found.push([m[1], t]);
    });
    found.sort(function (a, b) { return a[0] < b[0] ? 1 : -1; });
    ol.textContent = '';
    found.slice(0, 60).forEach(function (f) {
      var li = make('li'), b = make('button', '', short(f[0]) + ' ' + f[0].slice(0, 4));
      b.type = 'button'; b.setAttribute('data-go', f[0]);
      li.appendChild(b); li.appendChild(document.createTextNode(f[1].length > 160 ? f[1].slice(0, 157) + '\u2026' : f[1])); ol.appendChild(li);
    });
    one('[data-n="logs"]').textContent = found.length || '';
    one('[data-logsec]').hidden = !found.length;
  }
  function paint() {
    paintHead(); paintDay(); paintWeek(); paintThings(); paintHours(); paintApps(); paintGrid(); paintLogs();
    fields.forEach(function (f) { f.paint(); });
    one('[data-saved]').textContent = Store.state() === 'disk' ? 'Saved on this PC as you type.' :
      'Kept in this browser. Open the report with \u201cOpen report.cmd\u201d to save it on the PC as well.';
  }
  function go(to) {
    fields.forEach(function (f) { f.save(); });  // what was typed belongs to the day it was typed on
    day = to === 'today' ? today : /^\d{4}/.test(to) ? to : shift(day, +to);
    try { history.replaceState(null, '', '#d=' + day); } catch (err) { /* not allowed on some file pages */ }
    paint();
  }
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-go]');
    if (b) go(b.getAttribute('data-go'));
  });
  window.addEventListener('hashchange', function () {
    var d = (/d=(\d{4}-\d\d-\d\d)/.exec(location.hash) || [])[1];
    if (d && d !== day) go(d);
  });
  Store.on(paint);
  paint();
})();

// the IELTS Writing Tips Workbook pages (ielts_workbook.py): the essays' kind filter, open and close, read counts
(function () {
  'use strict';
  function all(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function one(sel, el) { return (el || document).querySelector(sel); }

  // the table at the top of the tips page: "N of 7 read" from the ticks of the tips themselves
  all('[data-wb-readcount]').forEach(function (el) {
    var boxes = all('.wb-tiphead input[data-check]');
    function paint() { el.textContent = boxes.filter(function (b) { return b.checked; }).length + ' of ' + boxes.length + ' read'; }
    document.addEventListener('rr:checks', paint);
    paint();
  });

  var bar = one('[data-wb-bar]');
  if (!bar) return;
  var essays = all('.wb-essay'), sections = all('.wb-qsec'), kinds = all('button[data-wb-kind]', bar);
  var todo = one('[data-wb-todo]', bar), count = one('[data-wb-count]', bar), filter = one('input[data-pagefilter]');

  function details(el) { return one('details', el); }
  function shown(el) { return !el.closest('[hidden]') && !el.classList.contains('f-out') && !el.classList.contains('wb-out'); }

  // ---------------------------------------------------------------- the kind of question
  function setKind(k) {
    kinds.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.wbKind === k ? 'true' : 'false'); });
    sections.forEach(function (s) { s.hidden = k !== 'all' && s.dataset.kind !== k; });
    try { sessionStorage.setItem('rr:wb-kind', k); } catch (err) { /* storage unavailable */ }
    document.dispatchEvent(new CustomEvent('rr:view'));
  }
  kinds.forEach(function (b) { b.addEventListener('click', function () { setKind(b.dataset.wbKind); }); });
  try {
    var kept = sessionStorage.getItem('rr:wb-kind');
    if (kept && kinds.some(function (b) { return b.dataset.wbKind === kept; })) setKind(kept);
  } catch (err) { /* storage unavailable */ }

  // ---------------------------------------------------------------- open all, close all
  one('[data-wb-open]', bar).addEventListener('click', function () {
    essays.forEach(function (x) { if (shown(x)) details(x).open = true; });
  });
  one('[data-wb-close]', bar).addEventListener('click', function () {
    essays.forEach(function (x) { details(x).open = false; });
  });

  // ---------------------------------------------------------------- read: the count, and only those not read
  function paint() {
    var done = essays.filter(function (x) { return x.classList.contains('is-done'); }).length;
    count.textContent = done + ' of ' + essays.length + ' read';
    essays.forEach(function (x) { x.classList.toggle('wb-out', !!todo.checked && x.classList.contains('is-done')); });
  }
  document.addEventListener('rr:checks', paint);
  todo.addEventListener('change', paint);
  paint();

  // ---------------------------------------------------------------- a search opens the essays it finds
  document.addEventListener('rr:filter', function () {
    if (filter && filter.value.trim()) essays.forEach(function (x) { if (shown(x)) details(x).open = true; });
  });

  // ---------------------------------------------------------------- an address that names an essay opens it (#e61)
  function fromHash() {
    var id = decodeURIComponent(location.hash.slice(1)), el = id && document.getElementById(id);
    if (!el || !el.classList.contains('wb-essay')) return;
    var sec = el.closest('.wb-qsec');
    if (sec && sec.hidden) setKind('all');
    details(el).open = true;
    el.scrollIntoView({block: 'start'});
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();

  // ---------------------------------------------------------------- print every essay in full
  window.addEventListener('beforeprint', function () { essays.forEach(function (x) { details(x).open = true; }); });
})();

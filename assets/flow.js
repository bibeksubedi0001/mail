// the project flowcharts (project_flow.py): a clicked box opens its words beside it; the list at the end holds the same words
(function () {
  'use strict';
  var pop = document.getElementById('fl-pop');
  if (!pop) return;
  var body = pop.querySelector('.fl-pop-body'), more = pop.querySelector('.fl-pop-more'), main = document.querySelector('main'), on = null;
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function close() {
    if (on) on.classList.remove('is-on');
    on = null;
    pop.hidden = true;
  }
  function place(node) {
    var r = node.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight, vw = document.documentElement.clientWidth;
    var left = r.right + 14, top = r.top + window.scrollY - 8;
    if (left + w > vw - 12) left = r.left - w - 14;
    if (left < 12) { left = Math.max(12, Math.min(r.left, vw - w - 12)); top = r.bottom + window.scrollY + 12; }
    var floor = document.documentElement.scrollHeight - h - 12;
    pop.style.left = (left + window.scrollX) + 'px';
    pop.style.top = Math.max(window.scrollY + 8, Math.min(top, floor)) + 'px';
  }
  function open(node) {
    var src = document.getElementById('d-' + node.dataset.node);
    if (!src) return;
    if (on === node) { close(); return; }
    close();
    var copy = src.cloneNode(true);
    copy.removeAttribute('id');
    copy.classList.remove('flash');
    body.replaceChildren(copy);
    more.href = '#d-' + node.dataset.node;
    on = node;
    node.classList.add('is-on');
    pop.hidden = false;
    place(node);
  }
  function flash(el) {
    el.classList.add('flash');
    setTimeout(function () { el.classList.remove('flash'); }, 1800);
  }
  all('svg.flow .fn').forEach(function (node) {
    node.addEventListener('click', function (ev) { ev.stopPropagation(); open(node); });
    node.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(node); }
    });
  });
  pop.addEventListener('click', function (ev) { ev.stopPropagation(); });
  pop.querySelector('.fl-pop-x').addEventListener('click', function () { var was = on; close(); if (was) was.focus(); });
  more.addEventListener('click', function () {
    var target = document.getElementById(more.getAttribute('href').slice(1));
    close();
    if (target) flash(target);
  });
  document.addEventListener('click', close);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && on) { var was = on; close(); was.focus(); } });
  window.addEventListener('resize', function () { if (on) place(on); });
  all('[data-goto]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var node = document.getElementById('n-' + a.dataset.goto);
      if (!node) return;
      ev.preventDefault();
      ev.stopPropagation();
      close();
      node.scrollIntoView({block: 'center', inline: 'center'});
      node.focus({preventScroll: true});
      flash(node);
    });
  });
  var only = document.querySelector('[data-fl-open]');
  if (only) only.addEventListener('click', function () {
    var want = only.getAttribute('aria-pressed') !== 'true';
    only.setAttribute('aria-pressed', want ? 'true' : 'false');
    main.classList.toggle('fl-only-open', want);
    close();
  });
})();

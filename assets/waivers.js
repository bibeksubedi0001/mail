// the Fee waivers view of the Applications page (fee_waivers.py): an address that ends in &at=<id> goes to that university
(function () {
  'use strict';
  function go() {
    var m = /[#&]at=([\w-]+)/.exec(location.hash), el = m && document.getElementById(m[1]);
    if (el && !el.closest('[hidden]')) el.scrollIntoView({behavior: 'instant', block: 'start'});
  }
  function soon() { go(); setTimeout(go, 350); }  // and again once the view has been laid out and any other scrolling has ended
  window.addEventListener('hashchange', soon);
  if (document.readyState === 'complete') soon(); else window.addEventListener('load', soon);
})();

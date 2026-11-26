// The published copy of the report (publish_site.py): opens its encrypted figures and documents with the key kept at the
// sign-in, goes to the place named in the address, and offers a sign-out. It holds no data of its own.
(function () {
  'use strict';
  var NAME = 'rr-site-key', cache = {}, keyP = null;
  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function bytes(s) { s = atob(s); var a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function kept() { try { return sessionStorage.getItem(NAME) || localStorage.getItem(NAME); } catch (err) { return null; } }
  function key() {
    if (!keyP) keyP = crypto.subtle.importKey('raw', bytes(kept() || ''), 'AES-GCM', false, ['decrypt']);
    return keyP;
  }
  function file(url, mime) {  // the address of an encrypted file -> a blob: address of what is in it
    if (!cache[url]) {
      cache[url] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      }).then(function (buf) {
        return key().then(function (k) { return crypto.subtle.decrypt({name: 'AES-GCM', iv: new Uint8Array(buf, 0, 12)}, k, new Uint8Array(buf, 12)); });
      }).then(function (plain) { return URL.createObjectURL(new Blob([plain], {type: mime || 'application/octet-stream'})); });
      cache[url].catch(function () { delete cache[url]; });  // a failed download can be tried again
    }
    return cache[url];
  }

  // figures: in the page, and enlarged
  all('img[data-enc]').forEach(function (img) {
    file(img.dataset.enc, img.dataset.mime).then(function (u) { img.src = u; }, function () { img.alt = img.alt + ' (the figure could not be loaded)'; });
  });
  all('[data-enc-full]').forEach(function (el) {
    file(el.dataset.encFull, el.dataset.mimeFull).then(function (u) { el.dataset.full = u; }, function () { /* the small figure stays */ });
  });

  // documents: a PDF or a figure opens in a new tab, anything else is saved under its own name
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('a[data-enc-doc]') : null;
    if (!a) return;
    ev.preventDefault();
    var mime = a.dataset.mime || '', tab = /^application\/pdf$|^image\//.test(mime) ? window.open('', '_blank') : null;
    a.classList.add('is-loading');
    file(a.getAttribute('href'), mime).then(function (u) {
      a.classList.remove('is-loading');
      if (tab) { tab.location.replace(u); return; }
      var d = document.createElement('a');
      d.href = u; d.download = a.dataset.name || 'file';
      document.body.appendChild(d); d.click(); d.remove();
    }, function () {
      a.classList.remove('is-loading');
      if (tab) tab.close();
      window.alert('That file could not be opened. Reload the page and try again.');
    });
  });

  // the place named in the address: the page was written after the browser looked for it
  function toPlace() {
    var t = null;
    if (location.hash.length < 2) return;
    try { t = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (err) { /* not a place on the page */ }
    if (t) t.scrollIntoView({behavior: 'instant', block: 'start'});
  }
  if (document.readyState === 'complete') toPlace(); else window.addEventListener('load', toPlace);

  // sign out: forget the key on this device
  var foot = document.querySelector('footer .wrap');
  if (foot) {
    var span = document.createElement('span'), btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'linkbtn'; btn.textContent = 'Sign out on this device';
    btn.addEventListener('click', function () {
      try { sessionStorage.removeItem(NAME); localStorage.removeItem(NAME); } catch (err) { /* nothing kept */ }
      location.reload();
    });
    span.appendChild(btn); foot.appendChild(span);
  }

  // the app (manifest.webmanifest and sw.js): the service worker keeps the pages for use without a connection. "Install
  // app" in the bar (data-app-install, made by build_replies_html.py; on the PC it opens this website) and in the footer
  // installs the copy: with the browser's own question where the browser has offered one (beforeinstallprompt; Chrome and
  // Edge hold it back until the page has been used for a while), else with the steps for that browser.
  var here = document.currentScript && document.currentScript.src;
  if (here && 'serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
    navigator.serviceWorker.register(new URL('../sw.js', here).href).catch(function () { /* the pages work without it */ });
  }
  var ua = navigator.userAgent, offer = null, panel = null, toggles = [], steps;
  var installed = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    steps = 'On an iPhone or iPad: tap the Share button (the square with an arrow), then Add to Home Screen.';
  } else if (/Android/.test(ua)) {
    steps = /Firefox\//.test(ua) ? 'In Firefox: open the menu (\u22ee), then Install.'
      : 'Open the browser menu (\u22ee), then Install app or Add to Home screen.';
  } else if (/Firefox\//.test(ua)) {
    steps = 'Firefox on a computer cannot install a website as an app. Open this page in Chrome or Edge, sign in, and click ' +
      'Install app there.';
  } else if (/Edg\//.test(ua)) {
    steps = 'In Edge: click the app icon at the right end of the address bar, or open the menu (\u2026), then Apps, then ' +
      'Install this site as an app.';
  } else if (/Chrome\//.test(ua) && !/OPR\//.test(ua)) {
    steps = 'In Chrome: click the install icon at the right end of the address bar (a screen with a down arrow), or open ' +
      'the menu (\u22ee), then Cast, save and share, then Install page as app.';
  } else if (/Macintosh/.test(ua) && /Safari\//.test(ua)) {
    steps = 'In Safari on a Mac (Safari 17 or later): open the File menu, then Add to Dock.';
  } else {
    steps = 'Open the browser menu and look for Install app or Add to Home screen.';
  }
  var style = document.createElement('style');
  style.textContent = '.app-steps{position:fixed;left:50%;bottom:22px;z-index:60;transform:translateX(-50%);' +
    'width:min(440px,calc(100vw - 32px));padding:14px 16px 12px;background:var(--ink);color:var(--paper);' +
    'font:14.5px/1.5 var(--sans);box-shadow:0 6px 22px rgba(27,33,39,.25)}' +
    '.app-steps p{margin:0 0 8px}.app-steps .linkbtn{color:var(--paper)}';
  document.head.appendChild(style);
  Array.prototype.forEach.call(document.querySelectorAll('[data-app-install]'), function (a) {
    a.removeAttribute('target');
    a.title = 'Install these pages as an app on this device';
    a.addEventListener('click', function (ev) { ev.preventDefault(); install(); });
    toggles.push(a);
  });
  if (foot) {
    var holder = document.createElement('span'), link = document.createElement('button');
    link.type = 'button'; link.className = 'linkbtn'; link.textContent = 'Install app';
    link.addEventListener('click', install);
    holder.appendChild(link); foot.appendChild(holder);
    toggles.push(holder);
  }
  function show(on) { toggles.forEach(function (el) { el.hidden = !on; }); }
  function explain() {
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'app-steps'; panel.setAttribute('role', 'status');
      panel.innerHTML = '<p></p><button type="button" class="linkbtn">Close</button>';
      panel.querySelector('button').addEventListener('click', function () { panel.hidden = true; });
      document.body.appendChild(panel);
    }
    panel.querySelector('p').textContent = steps;
    panel.hidden = false;
  }
  function install() {
    if (offer) {  // the browser's own question: one per offer; the browser offers again later if it is declined
      var ev = offer;
      offer = null;
      ev.prompt();
    } else explain();
  }
  window.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); offer = ev; });
  window.addEventListener('appinstalled', function () { offer = null; show(false); });
  show(!installed);
})();

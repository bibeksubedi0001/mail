// The service worker of the published copy (publish_site.py). Every request goes to the network first, so a new copy
// shows as soon as it is published; what comes back is kept, and served only when there is no connection, so that the
// pages open as they were last seen. The pages are kept as they come, encrypted; the documents under files/ are not kept.
// The first page and the style sheets and scripts are kept from the start, since they load before this worker runs.
'use strict';
var KEEP = 'rr-copy-v1';
var FIRST = ["./", "assets/build.js", "assets/flow.css", "assets/flow.js", "assets/ielts-wb.css", "assets/ielts-wb.js", "assets/ielts.css", "assets/ielts.js", "assets/live.js", "assets/prep.css", "assets/prep.js", "assets/report.css", "assets/report.js", "assets/search.css", "assets/search.js", "assets/site.js", "assets/study.css", "assets/tracker.css", "assets/tracker.js", "assets/waivers.css", "assets/waivers.js"];
var OFFLINE = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<link rel="icon" href="data:,"><title>Offline</title><body style="margin:20vh auto 0;max-width:340px;padding:0 24px;' +
  'font:17px/1.5 Georgia,serif;background:#fbfaf6;color:#1b2127"><p>There is no connection, and this page has not been opened on ' +
  'this device before.</p><p><a href="{{START}}" style="color:#1d6b45">Go to the first page</a></p></body></html>';
function keep(c, req, res) {  // one copy of each file: a style sheet's earlier versions (?v=...) go
  return c.delete(req, {ignoreSearch: true}).then(function () { return c.put(req, res); });
}
self.addEventListener('install', function (ev) {
  ev.waitUntil(caches.open(KEEP).then(function (c) {
    return Promise.all(FIRST.map(function (u) {
      var req = new Request(u, {cache: 'reload'});
      return fetch(req).then(function (res) { if (res.ok) return keep(c, req, res); }).catch(function () { /* kept when next opened */ });
    }));
  }).then(function () { return self.skipWaiting(); }, function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (ev) {
  ev.waitUntil(caches.keys().then(function (names) {
    return Promise.all(names.filter(function (n) { return n !== KEEP; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (ev) {
  var req = ev.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.indexOf('/files/') === 0) return;
  ev.respondWith(fetch(req).then(function (res) {
    if (res.ok && res.status === 200 && res.type === 'basic') {
      var copy = res.clone();
      caches.open(KEEP).then(function (c) { return keep(c, req, copy); }).catch(function () { /* full: not kept */ });
    }
    return res;
  }, function () {
    return kept(req).then(function (hit) {
      if (hit) return hit;
      if (req.mode !== 'navigate') return Response.error();
      // a page never opened here: a note, with the way back to the first page (which is kept); not the first page at
      // this address, where its links would point to the wrong place
      return new Response(OFFLINE.replace('{{START}}', self.registration.scope), {headers: {'Content-Type': 'text/html; charset=utf-8'}});
    });
  }));
});
function kept(req) {  // the copy kept of a request; a folder and its index.html are the same page
  return caches.match(req, {ignoreSearch: true}).then(function (hit) {
    if (hit || req.mode !== 'navigate') return hit;
    var path = new URL(req.url).pathname;
    var other = /\/$/.test(path) ? path + 'index.html' : /\/index\.html$/.test(path) ? path.slice(0, -'index.html'.length) : '';
    return other ? caches.match(new URL(other, req.url).href, {ignoreSearch: true}) : hit;
  });
}

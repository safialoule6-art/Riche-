/* Sunami — tracking centralisé (Google Analytics 4 + TikTok Pixel).
   ────────────────────────────────────────────────────────────────
   Un SEUL endroit à éditer pour le marketing. Remplace les deux IDs
   ci-dessous par tes vrais identifiants quand tu lances les pubs.

   Tant que les IDs contiennent encore un "X" (placeholders), AUCUN
   pixel n'est chargé et window.sunamiTrack(...) devient un no-op
   silencieux : zéro requête inutile et zéro erreur en développement. */
(function () {
  var GA_ID = 'G-XXXXXXXXXX';               // ← ton ID Google Analytics 4
  var TIKTOK_ID = 'DXXXXXXXXXXXXXXXXXXXXX'; // ← ton ID TikTok Pixel

  var isPlaceholder = function (id) { return !id || id.indexOf('X') !== -1; };
  var gaOn = !isPlaceholder(GA_ID);
  var ttOn = !isPlaceholder(TIKTOK_ID);

  /* ── Google Analytics 4 ── */
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  if (gaOn) {
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(g);
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }

  /* ── TikTok Pixel ── */
  if (ttOn) {
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"], ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } }; for (var i = 0; i < ttq.methods.length; i++)ttq.setAndDefer(ttq, ttq.methods[i]); ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++)ttq.setAndDefer(e, ttq.methods[n]); return e }, ttq._i = {}, ttq._i[t] = [], ttq.instance(t), ttq.load = function (e, n) { var i = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i[t]._u = i, ttq._t = t; if (!n || !n.f) { var o = d.createElement("script"); o.type = "text/javascript", o.async = !0, o.src = i + "?sdkid=" + e + "&lib=" + t; var a = d.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a) } };
      ttq.load(TIKTOK_ID);
      ttq.page();
    }(window, document, 'ttq');
  }

  /* ── API unique de tracking ──
     Appelle window.sunamiTrack('nom_evenement', { … }) partout dans l'app.
     Route automatiquement vers GA4 et TikTok si activés. */
  /* ── Identite anonyme (visiteur persistant) + session (par onglet) ── */
  var _vid;
  try {
    _vid = localStorage.getItem('sunami_vid');
    if (!_vid) { _vid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('sunami_vid', _vid); }
  } catch (e) { _vid = 'anon'; }
  var _sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  var _uid = null;
  // L'app appelle ceci une fois l'utilisateur connu (pour relier visiteur -> compte).
  window.sunamiSetUser = function (id) { _uid = id || null; };

  /* ── Puits "first-party" : envoie l'evenement a /api/track (Supabase) ── */
  function firstPartySink(event, params) {
    try {
      var payload = JSON.stringify({
        event: event, props: params || {},
        visitor_id: _vid, session_id: _sid, user_id: _uid,
        path: location.pathname, referrer: document.referrer || ''
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(function () {});
      }
    } catch (e) {}
  }

  window.sunamiTrack = function (event, params) {
    if (!event) return;
    params = params || {};
    firstPartySink(event, params); // toujours actif (analytics maison, sans IDs externes)
    try { if (gaOn) window.gtag('event', event, params); } catch (e) {}
    try { if (ttOn && window.ttq) window.ttq.track(event, params); } catch (e) {}
    if (!gaOn && !ttOn && window.console && console.debug) {
      console.debug('[sunami-track]', event, params);
    }
  };

  // Vue de page automatique (funnel d'acquisition).
  try { window.sunamiTrack('page_view', { title: document.title }); } catch (e) {}
})();

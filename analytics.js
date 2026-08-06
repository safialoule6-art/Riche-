/* Sunami — couche analytics unifiee (GA4 + TikTok Pixel + Meta Pixel).
   -----------------------------------------------------------------------
   POUR ACTIVER LE TRACKING : renseigne tes IDs ci-dessous.
   Laisse une valeur vide ("") pour desactiver un canal — dans ce cas
   aucun script n'est charge et aucune requete n'est envoyee.

   Ou trouver les IDs :
   - GA4    : Google Analytics -> Admin -> Flux de donnees -> "ID de mesure" (G-XXXXXXXXXX)
   - TikTok : TikTok Ads -> Outils -> Evenements -> Pixel web -> ID du pixel
   - Meta   : Gestionnaire d'evenements Meta -> Sources de donnees -> ID du pixel
   ----------------------------------------------------------------------- */
(function () {
  var CFG = {
    ga4:    "", // ex: "G-XXXXXXXXXX"
    tiktok: "", // ex: "DXXXXXXXXXXXXXXXXXXXXX"
    meta:   "", // ex: "1234567890123456"
  };

  // Correspondance vers les evenements "standards" (meilleure optimisation pub)
  var STD = {
    sign_up:       { tiktok: "CompleteRegistration", meta: "CompleteRegistration" },
    login:         { tiktok: "Login",                meta: null },
    story_started: { tiktok: "ViewContent",          meta: "ViewContent" },
    lead:          { tiktok: "SubmitForm",           meta: "Lead" },
  };

  if (CFG.ga4) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + CFG.ga4;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", CFG.ga4);
  }

  if (CFG.tiktok) {
    !(function (w, d, t) {
      w.TiktokAnalyticsObject = t; var ttq = (w[t] = w[t] || []);
      ttq.methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
      ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
      ttq._i = {}; ttq._i[t] = []; ttq.instance(t);
      ttq.load = function (e, n) { var i = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i[t]._u = i; ttq._t = t; if (!n || !n.f) { var o = d.createElement("script"); o.type = "text/javascript"; o.async = !0; o.src = i + "?sdkid=" + e + "&lib=" + t; var a = d.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a); } };
      ttq.load(CFG.tiktok); ttq.page();
    })(window, document, "ttq");
  }

  if (CFG.meta) {
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", CFG.meta);
    window.fbq("track", "PageView");
  }

  window.track = function (name, params) {
    params = params || {};
    var map = STD[name] || {};
    try { if (window.gtag && CFG.ga4) gtag("event", name, params); } catch (e) {}
    try { if (window.ttq && CFG.tiktok) { window.ttq.track(map.tiktok || name, params); } } catch (e) {}
    try {
      if (window.fbq && CFG.meta) {
        if (map.meta) window.fbq("track", map.meta, params);
        else window.fbq("trackCustom", name, params);
      }
    } catch (e) {}
  };
})();

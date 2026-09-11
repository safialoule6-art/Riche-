/* Sunami — progression narrative légère.
   Pas de pièces, pas de classement : la progression sert l'histoire.
*/
(function () {
  'use strict';

  var STYLE_ID = 'sunami-narrative-style';
  var PANEL_ID = 'sunamiNarrativePanel';
  var lastSignature = '';

  function safeJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
  }

  function getState() {
    var stats = safeJson('sunami-stats', {});
    var xp = parseInt(localStorage.getItem('sunami-xp') || '0', 10);
    if (!isFinite(xp) || xp < 0) xp = 0;
    return {
      xp: xp,
      chapters: Math.max(0, parseInt(stats.chapters || 0, 10) || 0),
      words: Array.isArray(stats.words) ? stats.words.length : 0
    };
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '#'+PANEL_ID+'{display:none;margin:10px 0 14px;padding:12px 14px;border:1px solid var(--border,rgba(255,255,255,.1));border-radius:16px;background:linear-gradient(135deg,rgba(20,184,166,.10),rgba(255,255,255,.025));backdrop-filter:blur(10px)}',
      '#'+PANEL_ID+'.visible{display:block}',
      '#'+PANEL_ID+' .sn-top{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;font-weight:800;color:var(--muted,#8c8c8c)}',
      '#'+PANEL_ID+' .sn-title{color:var(--text,#fff);font-size:14px}',
      '#'+PANEL_ID+' .sn-track{height:5px;border-radius:99px;background:rgba(255,255,255,.09);overflow:hidden;margin:9px 0 7px}',
      '#'+PANEL_ID+' .sn-fill{height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,var(--wave,#14b8a6),var(--wave-2,#2dd4bf));transition:width .45s ease}',
      '#'+PANEL_ID+' .sn-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:var(--muted,#8c8c8c)}',
      '#'+PANEL_ID+' .sn-next{color:var(--text,#fff);font-weight:700}',
      '@media (prefers-reduced-motion:reduce){#'+PANEL_ID+' .sn-fill{transition:none}}'
    ].join('');
    document.head.appendChild(s);
  }

  function ensurePanel() {
    var chat = document.getElementById('chatScreen');
    var actions = chat && chat.querySelector('.scene-actions');
    if (!chat || !actions) return null;
    var panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('section');
      panel.id = PANEL_ID;
      panel.setAttribute('aria-label', 'Progression narrative');
      actions.insertAdjacentElement('afterend', panel);
    }
    return panel;
  }

  function render() {
    var panel = ensurePanel();
    if (!panel) return;
    var chat = document.getElementById('chatScreen');
    var visible = !!(chat && getComputedStyle(chat).display !== 'none');
    if (!visible) {
      if (panel.classList.contains('visible')) panel.classList.remove('visible');
      lastSignature = 'hidden';
      return;
    }

    var state = getState();
    var chapters = state.chapters;
    var act = Math.min(4, Math.floor(chapters / 3) + 1);
    var inAct = chapters % 3;
    var percent = Math.round((inAct / 3) * 100);
    var signature = [chapters, state.words, act, inAct].join('|');
    if (signature === lastSignature && panel.classList.contains('visible')) return;
    lastSignature = signature;

    var labels = [
      'Le premier pas',
      'Les liens se créent',
      'Le tournant',
      'La suite dépend de toi'
    ];
    var next = inAct === 2 ? 'Encore 1 scène pour faire avancer l’acte.' : (inAct === 0 ? 'Une scène pour lancer cet acte.' : 'Continue l’histoire pour débloquer la prochaine étape.');

    panel.innerHTML = '<div class="sn-top"><span class="sn-title">Acte '+act+' · '+labels[act - 1]+'</span><span>'+chapters+' scène'+(chapters === 1 ? '' : 's')+'</span></div>' +
      '<div class="sn-track" role="progressbar" aria-valuemin="0" aria-valuemax="3" aria-valuenow="'+inAct+'"><div class="sn-fill" style="width:'+percent+'%"></div></div>' +
      '<div class="sn-bottom"><span class="sn-next">'+next+'</span><span>'+state.words+' mot'+(state.words === 1 ? '' : 's')+' appris</span></div>';
    panel.classList.add('visible');
  }

  function boot() {
    injectStyle();
    render();

    var root = document.getElementById('appScreen') || document.body;
    if (root && !window.__sunamiNarrativeObserver) {
      var observer = new MutationObserver(function () { render(); });
      // childList suffit ici ; le timer gère les changements de visibilité/texte
      // et évite une boucle d'observation provoquée par notre propre innerHTML.
      observer.observe(root, { childList: true, subtree: true });
      window.__sunamiNarrativeObserver = observer;
    }
    if (!window.__sunamiNarrativeTimer) {
      window.__sunamiNarrativeTimer = setInterval(render, 1500);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

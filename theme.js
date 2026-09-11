/* Sunami — thème clair/sombre (partagé landing + app) */
(function(){
  var saved = localStorage.getItem('sunami-theme');
  var theme = (saved === 'dark' || saved === 'light') ? saved : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.addEventListener('DOMContentLoaded', function(){
    var t = document.getElementById('themeToggle');
    if(t) t.textContent = theme === 'dark' ? '☀️' : '🌙';
  });
})();

/* ===== Données locales : migrations défensives ===== */
(function(){
  try {
    var raw = localStorage.getItem('sunami-stats');
    if(raw){
      var stats = JSON.parse(raw);
      if(stats && Array.isArray(stats.words)){
        var changed = false;
        var d = new Date();
        var today = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        stats.words.forEach(function(w){
          if(w && !w.nextReview){ w.nextReview = w.lastSeen || today; changed = true; }
        });
        if(changed) localStorage.setItem('sunami-stats', JSON.stringify(stats));
      }
    }
  } catch(e) {}

  /* Un réglage local corrompu ne doit pas faire planter openSettings(). */
  try {
    var settingsRaw = localStorage.getItem('sunami-settings');
    if(settingsRaw){
      var settings = JSON.parse(settingsRaw);
      if(!settings || typeof settings !== 'object') throw new Error('invalid settings');
      var rate = Number(settings.rate);
      if(!Number.isFinite(rate)) rate = 1;
      settings.rate = Math.min(2, Math.max(0.5, rate));
      settings.autoplay = settings.autoplay !== false;
      settings.font = ['s','m','l'].indexOf(settings.font) !== -1 ? settings.font : 'm';
      localStorage.setItem('sunami-settings', JSON.stringify(settings));
    }
  } catch(e) {
    try { localStorage.removeItem('sunami-settings'); } catch(_) {}
  }
})();

window.toggleTheme = function(){
  var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  var next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('sunami-theme', next);
  var t = document.getElementById('themeToggle');
  if(t) t.textContent = next === 'dark' ? '☀️' : '🌙';
};

/* ===== Sunami UX fixes
   1) free CTA must never silently reuse the browser's active Google account
   2) returning-user greeting uses progress.first_name, then Google metadata
   3) story reader becomes immersive / visual-novel-like while keeping the mic
*/
(function(){
  var SUPABASE_URL = 'https://cdtabuyomtkfasvugtck.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_ms6RPYdPVcO3c9A6X1ruQQ_uiYl1Dxo';
  var supabase = null;
  function client(){ return supabase || window.__sunamiFixSupabase || null; }
  async function getClient(){
    if(client()) return client();
    try {
      var mod = await import('https://esm.sh/@supabase/supabase-js@2');
      supabase = mod.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch(e) {}
    return client();
  }

  function googleFirstName(user){
    var md = user && user.user_metadata || {};
    var full = String(md.full_name || md.name || '').trim();
    if(full) return full.split(/\s+/)[0];
    return '';
  }
  async function refreshWelcomeName(){
    var el = document.getElementById('wbEmail');
    if(!el) return;
    var c = await getClient();
    if(!c) return;
    try {
      var r = await c.auth.getSession();
      var session = r && r.data && r.data.session;
      var user = session && session.user;
      if(!user || user.is_anonymous) return;
      var name = '';
      try {
        var p = await c.from('progress').select('first_name').eq('user_id', user.id).maybeSingle();
        name = String(p && p.data && p.data.first_name || '').trim();
      } catch(e) {}
      name = name || googleFirstName(user) || String(user.email || '').trim();
      if(name) el.textContent = name;
    } catch(e) {}
  }

  function setupFreeCta(){
    var btn = document.getElementById('googleBtn');
    if(!btn || btn.dataset.sunamiFreeFix === '1') return;
    btn.dataset.sunamiFreeFix = '1';
    btn.addEventListener('click', async function(ev){
      ev.preventDefault(); ev.stopImmediatePropagation();
      var err = document.getElementById('authError');
      if(err){ err.textContent = ''; err.style.display = 'none'; }
      try { sessionStorage.setItem('sunami_login_intent','1'); } catch(e) {}
      var c = await getClient();
      if(!c){ if(err){ err.textContent='Connexion indisponible. Réessaie.'; err.style.display='block'; } return; }
      var anon = null;
      try { anon = await c.auth.signInAnonymously(); } catch(e) {}
      if(anon && !anon.error) return;
      try {
        var oauth = await c.auth.signInWithOAuth({
          provider:'google',
          options:{ redirectTo:window.location.origin, queryParams:{ prompt:'select_account' } }
        });
        if(oauth && oauth.error) throw oauth.error;
      } catch(e) {
        try { sessionStorage.removeItem('sunami_login_intent'); } catch(_) {}
        if(err){ err.textContent = e && e.message ? e.message : 'Impossible de démarrer la connexion.'; err.style.display='block'; }
      }
    }, true);
  }

  function injectReaderStyles(){
    if(document.getElementById('sunami-immersive-reader-style')) return;
    var style = document.createElement('style');
    style.id = 'sunami-immersive-reader-style';
    style.textContent = `
      #chatScreen.sunami-immersive{max-width:none;width:100%;padding:0;position:relative;min-height:calc(100vh - 63px);overflow:hidden;}
      #chatScreen.sunami-immersive .scene-actions,#chatScreen.sunami-immersive .review-nudge{position:relative;z-index:5;margin:10px 18px 0;}
      #chatScreen.sunami-immersive .scene-banner{position:fixed;inset:63px 0 0;z-index:0;height:auto;min-height:calc(100vh - 63px);margin:0;border-radius:0;overflow:hidden;}
      #chatScreen.sunami-immersive .scene-banner-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
      #chatScreen.sunami-immersive .scene-banner-grad{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,12,14,.08) 0%,rgba(7,12,14,.16) 30%,rgba(7,12,14,.82) 76%,rgba(7,12,14,.96) 100%);}
      #chatScreen.sunami-immersive .scene-banner-content,#chatScreen.sunami-immersive .scene-tag,#chatScreen.sunami-immersive .amb-btn,#chatScreen.sunami-immersive .scene-prev-badge{display:none!important;}
      #chatScreen.sunami-immersive #chatLog{position:relative;z-index:2;display:flex;flex-direction:column;gap:0;max-width:760px;width:100%;margin:0 auto;padding:30vh 24px 150px;min-height:calc(100vh - 63px);overflow-y:auto;scroll-behavior:smooth;scroll-snap-type:y proximity;}
      #chatScreen.sunami-immersive #chatLog .msg{max-width:100%;width:100%;align-self:stretch;background:transparent;border:0;box-shadow:none;border-radius:0;color:#fff;text-shadow:0 2px 14px rgba(0,0,0,.55);font-size:clamp(18px,2.5vw,26px);line-height:1.65;font-weight:600;padding:22px 0;scroll-snap-align:start;}
      #chatScreen.sunami-immersive #chatLog .msg.character{font-family:'Instrument Serif','Georgia',serif;font-size:clamp(22px,3vw,34px);font-weight:400;}
      #chatScreen.sunami-immersive #chatLog .msg.character b{color:#fff;font-family:'Inter Tight',sans-serif;font-size:.48em;font-style:normal;letter-spacing:.1em;text-transform:uppercase;display:block;margin-bottom:8px;text-shadow:0 2px 10px rgba(0,0,0,.7);}
      #chatScreen.sunami-immersive #chatLog .msg.user{width:auto;align-self:flex-end;max-width:min(86%,520px);margin:8px 0;padding:11px 15px;border-radius:16px;background:rgba(20,184,166,.88);font-family:'Inter Tight',sans-serif;font-size:15px;line-height:1.45;text-shadow:none;}
      #chatScreen.sunami-immersive #chatLog .msg.feedback,#chatScreen.sunami-immersive #chatLog .msg.grammar-feedback{width:auto;align-self:center;background:rgba(0,0,0,.38);border:1px solid rgba(255,255,255,.18);border-radius:999px;text-shadow:none;font-family:'Inter Tight',sans-serif;font-size:12px;padding:7px 13px;margin:8px 0;}
      #chatScreen.sunami-immersive .input-row{position:fixed;z-index:8;left:50%;bottom:14px;transform:translateX(-50%);width:min(760px,calc(100% - 28px));padding:10px;border:1px solid rgba(255,255,255,.16);border-radius:20px;background:rgba(8,15,17,.72);backdrop-filter:blur(14px);box-shadow:0 10px 40px rgba(0,0,0,.28);}
      #chatScreen.sunami-immersive .input-row input{background:transparent;color:#fff;border:0;box-shadow:none;}
      #chatScreen.sunami-immersive .input-row input::placeholder{color:rgba(255,255,255,.6);}
      #chatScreen.sunami-immersive #sendBtn{display:none!important;}
      #chatScreen.sunami-immersive .mic-btn{width:44px;height:44px;background:rgba(20,184,166,.16);}
      #chatScreen.sunami-immersive .speak-btn{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.25);}
      @media(max-width:600px){#chatScreen.sunami-immersive #chatLog{padding:24vh 18px 145px;}#chatScreen.sunami-immersive .scene-actions{overflow-x:auto;white-space:nowrap;margin-left:10px;margin-right:10px;}#chatScreen.sunami-immersive .scene-actions .chip-btn{flex-shrink:0;}#chatScreen.sunami-immersive #chatLog .msg.character{font-size:clamp(21px,7vw,28px);}}
    `;
    document.head.appendChild(style);
  }

  function setupReader(){
    var screen = document.getElementById('chatScreen');
    var log = document.getElementById('chatLog');
    if(!screen || !log) return;
    injectReaderStyles();
    screen.classList.add('sunami-immersive');
    if(log.dataset.sunamiReaderFix !== '1'){
      log.dataset.sunamiReaderFix = '1';
      log.addEventListener('click', function(e){
        if(e.target.closest('button,a,input')) return;
        var msg = e.target.closest('.msg.character');
        if(!msg) return;
        var next = msg.nextElementSibling;
        while(next && !next.classList.contains('msg')) next = next.nextElementSibling;
        if(next) next.scrollIntoView({behavior:'smooth',block:'start'});
      });
    }
  }

  function boot(){
    setupFreeCta();
    var welcomeNameLoaded = !!document.getElementById('welcomeBack');
    if(welcomeNameLoaded) refreshWelcomeName();
    if(document.getElementById('appScreen')) setupReader();
    var obs = new MutationObserver(function(){
      setupFreeCta();
      if(!welcomeNameLoaded && document.getElementById('welcomeBack')){
        welcomeNameLoaded = true;
        refreshWelcomeName();
      }
      if(document.getElementById('chatScreen')) setupReader();
    });
    obs.observe(document.documentElement,{subtree:true,childList:true});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
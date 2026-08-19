/* Sunami — logique de la landing (marketing) : démo, capture email, login, reveal.
   Volontairement léger : la logique lourde (chat, TTS, gamification) vit dans app.js. */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://cdtabuyomtkfasvugtck.supabase.co';
const supabaseKey = 'sb_publishable_ms6RPYdPVcO3c9A6X1ruQQ_uiYl1Dxo';
const supabase = createClient(supabaseUrl, supabaseKey);

/* Détection d'un lien de réinitialisation de mot de passe (?type=recovery dans le hash) :
   dans ce cas on affiche le formulaire "nouveau mot de passe" au lieu de rediriger direct. */
function isRecoveryLink(){ return window.location.hash.includes('type=recovery'); }
let inRecovery = isRecoveryLink();

/* Capture du code de parrainage dans l'URL (?ref=CODE) */
(function(){
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if(ref){
    localStorage.setItem('sunami_ref', ref);
    // Enregistre le clic (1 fois / jour / code pour éviter de gonfler les stats)
    const key = 'sunami_ref_click_' + ref;
    const today = new Date().toISOString().slice(0,10);
    if(localStorage.getItem(key) !== today){
      localStorage.setItem(key, today);
      fetch('/api/referral', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'click', referralCode: ref })
      }).catch(()=>{});
    }
  }
})();

/* ===== Retour d'un utilisateur déjà connecté =====
   Best practice UX : on NE force PAS la redirection instantanée d'un visiteur qui
   revient sur la landing (frustrant, il perd le contrôle et ne peut plus voir le
   marketing / se déconnecter). On l'accueille avec un "content de te revoir" + un
   bouton "Reprendre". On ne redirige automatiquement QUE lorsqu'il vient de se
   connecter volontairement (email/Google), signalé par un drapeau d'intention. */
const LOGIN_INTENT_KEY = 'sunami_login_intent';
function markLoginIntent(){ try{ sessionStorage.setItem(LOGIN_INTENT_KEY, '1'); }catch(e){} }
function consumeLoginIntent(){ try{ const v = sessionStorage.getItem(LOGIN_INTENT_KEY); sessionStorage.removeItem(LOGIN_INTENT_KEY); return !!v; }catch(e){ return false; } }
function enterApp(){ window.location.replace('/app'); }

function showWelcomeBack(session){
  const run = ()=>{
    const wb = document.getElementById('welcomeBack');
    const cta = document.getElementById('signedOutCta');
    if(!wb){ enterApp(); return; } // filet de sécurité si l'UI d'accueil est absente
    const emailEl = document.getElementById('wbEmail');
    if(emailEl && session && session.user && session.user.email) emailEl.textContent = session.user.email;
    if(cta) cta.style.display = 'none';
    wb.style.display = 'flex';
    const navLogin = document.getElementById('navLoginLink');
    if(navLogin){ navLogin.textContent = (document.documentElement.lang === 'en') ? 'Open the app' : "Ouvrir l'app"; }
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
}

window.enterApp = enterApp;
window.logoutFromLanding = async function(){
  try{ await supabase.auth.signOut(); }catch(e){}
  consumeLoginIntent();
  const wb = document.getElementById('welcomeBack'); if(wb) wb.style.display = 'none';
  const cta = document.getElementById('signedOutCta'); if(cta) cta.style.display = '';
  const navLogin = document.getElementById('navLoginLink'); if(navLogin) navLogin.textContent = (document.documentElement.lang === 'en') ? 'Sign in' : 'Se connecter';
};

(async function(){
  if(inRecovery) return;
  const { data } = await supabase.auth.getSession();
  if(!data.session) return;
  if(consumeLoginIntent()){ enterApp(); return; } // connexion volontaire -> on entre direct
  showWelcomeBack(data.session);                  // simple visite -> accueil "bon retour"
})();
supabase.auth.onAuthStateChange((event, session)=>{
  if(event === 'PASSWORD_RECOVERY'){
    inRecovery = true;
    const emailBox = document.getElementById('emailAuthBox'); if(emailBox) emailBox.style.display = 'none';
    const toggleBtn = document.getElementById('emailToggleBtn'); if(toggleBtn) toggleBtn.style.display = 'none';
    const recBox = document.getElementById('recoveryBox'); if(recBox) recBox.style.display = 'flex';
    return;
  }
  if(event === 'SIGNED_IN' && session && !inRecovery){
    if(consumeLoginIntent()) enterApp();   // login volontaire (email même page / retour OAuth Google)
    else showWelcomeBack(session);          // session restaurée -> pas de redirection forcée
  }
});

window.confirmNewPassword = async function(){
  const pwd = document.getElementById('recoveryPassword')?.value || '';
  const msgEl = document.getElementById('recoveryMsg');
  if(msgEl) msgEl.textContent = '';
  if(!pwd || pwd.length < 6){ if(msgEl) msgEl.textContent = 'Le mot de passe doit faire au moins 6 caractères.'; return; }
  const { error } = await supabase.auth.updateUser({ password: pwd });
  if(error){ if(msgEl) msgEl.textContent = error.message; return; }
  inRecovery = false;
  window.location.replace('/app');
};

window.loginWithGoogle = async function(){
  const errEl = document.getElementById('authError'); if(errEl) errEl.textContent = '';
  try{ if(window.sunamiTrack) window.sunamiTrack('login_start', { method: 'google' }); }catch(e){}
  // On revient sur '/', puis la landing détecte la session et redirige vers '/app'
  markLoginIntent();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if(error && errEl){ errEl.textContent = error.message; }
};

/* ===== Login / inscription par email + mot de passe ===== */
window.toggleEmailAuth = function(){
  const box = document.getElementById('emailAuthBox');
  const btn = document.getElementById('emailToggleBtn');
  if(!box) return;
  const show = box.style.display === 'none';
  box.style.display = show ? 'flex' : 'none';
  if(btn) btn.textContent = show ? 'Masquer' : 'Continuer avec un email';
  if(show) document.getElementById('authEmail')?.focus();
};

function readEmailAuthForm(){
  const email = (document.getElementById('authEmail')?.value || '').trim();
  const password = document.getElementById('authPassword')?.value || '';
  return { email, password };
}

function setEmailAuthMsg(text, isError){
  const msgEl = document.getElementById('emailAuthMsg');
  if(!msgEl) return;
  msgEl.textContent = text || '';
  msgEl.style.color = isError ? '' : 'var(--ok)';
}

function setEmailAuthBusy(busy){
  ['emailSigninBtn','emailSignupBtn'].forEach(id=>{
    const b = document.getElementById(id);
    if(b) b.disabled = busy;
  });
}

window.loginWithEmail = async function(){
  const { email, password } = readEmailAuthForm();
  if(!email || !email.includes('@')){ setEmailAuthMsg('Entre un email valide.', true); return; }
  if(!password){ setEmailAuthMsg('Entre ton mot de passe.', true); return; }
  setEmailAuthMsg(''); setEmailAuthBusy(true);
  try{ if(window.sunamiTrack) window.sunamiTrack('login_start', { method: 'email' }); }catch(e){}
  markLoginIntent();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  setEmailAuthBusy(false);
  if(error){ setEmailAuthMsg(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message, true); }
  // Si succès, onAuthStateChange gère déjà la redirection vers /app.
};

window.signupWithEmail = async function(){
  const { email, password } = readEmailAuthForm();
  if(!email || !email.includes('@')){ setEmailAuthMsg('Entre un email valide.', true); return; }
  if(!password || password.length < 6){ setEmailAuthMsg('Le mot de passe doit faire au moins 6 caractères.', true); return; }
  setEmailAuthMsg(''); setEmailAuthBusy(true);
  try{ if(window.sunamiTrack) window.sunamiTrack('login_start', { method: 'email_signup' }); }catch(e){}
  markLoginIntent();
  const { data, error } = await supabase.auth.signUp({ email, password });
  setEmailAuthBusy(false);
  if(error){
    setEmailAuthMsg(error.message === 'User already registered' ? 'Ce compte existe déjà — connecte-toi plutôt.' : error.message, true);
    return;
  }
  // Si la confirmation email est activée sur Supabase, il n'y a pas encore de session.
  if(data.session){
    // onAuthStateChange gère la redirection.
  } else {
    setEmailAuthMsg('✓ Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse.', false);
  }
};

window.resetPassword = async function(){
  const { email } = readEmailAuthForm();
  if(!email || !email.includes('@')){ setEmailAuthMsg('Entre ton email ci-dessus, puis clique à nouveau sur "Mot de passe oublié ?".', true); return; }
  setEmailAuthMsg(''); setEmailAuthBusy(true);
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  setEmailAuthBusy(false);
  if(error){ setEmailAuthMsg(error.message, true); }
  else{ setEmailAuthMsg('✓ Email de réinitialisation envoyé si ce compte existe.', false); }
};


window.submitLead = async function(){
  const emailEl = document.getElementById('leadEmail');
  const msgEl = document.getElementById('leadMsg');
  const email = emailEl.value.trim();
  msgEl.textContent = '';
  msgEl.style.color = '';
  if(!email || !email.includes('@')){ msgEl.textContent = 'Entre un email valide.'; return; }
  const { error } = await supabase.from('leads').insert({ email, source: 'landing' });
  if(error){
    msgEl.textContent = 'Erreur : ' + error.message;
  } else {
    msgEl.style.color = 'var(--ok)';
    msgEl.textContent = '✓ Noté, à bientôt !';
    emailEl.value = '';
    try{ if(window.sunamiTrack) window.sunamiTrack('lead', { source: 'landing' }); }catch(e){}
  }
};

/* ===== Démo jouable sans compte ===== */
const demoScenes = [
  {
    text: `You land in Marseille. A woman waves at the gate holding a sign with your name. <b>"Bonjour ! You must be tired — how do you say hello, if you were speaking English to me right now?"</b>`,
    choices: [
      {label:'"Hello, nice to meet you."', correct:true, next:1},
      {label:'"Hallo, gutentag."', correct:false},
    ]
  },
  {
    text: `She laughs. <b>"Good! Now — which is correct: 'I have your bag' or 'I has your bag'?"</b>`,
    choices: [
      {label:'"I has your bag."', correct:false},
      {label:'"I have your bag."', correct:true, next:2},
    ]
  },
  {
    text: `<b>"Perfect. The car is this way — episode 2 continues tomorrow, same story, same characters."</b><br><br>— fin de la démo — <span style="color:var(--wave-dim); font-weight:800;">connecte-toi pour vivre la suite avec une IA qui génère chaque réplique</span>`,
    choices: []
  }
];
function renderDemoScene(i){
  const demoText = document.getElementById('demoText');
  const demoChoices = document.getElementById('demoChoices');
  if(!demoText || !demoChoices) return; // Démo remplacée par version animée
  const s = demoScenes[i];
  demoText.innerHTML = s.text;
  const c = demoChoices;
  c.innerHTML = '';
  s.choices.forEach(choice=>{
    const b = document.createElement('button');
    b.className = 'demo-choice';
    b.textContent = choice.label;
    b.onclick = ()=>{
      if(choice.correct){
        try{ if(window.sunamiTrack) window.sunamiTrack('demo_progress', { step: (choice.next || 0) }); }catch(e){}
        renderDemoScene(choice.next);
      }
      else { b.classList.add('wrong-flash'); setTimeout(()=>b.classList.remove('wrong-flash'), 500); }
    };
    c.appendChild(b);
  });
}
renderDemoScene(0);

/* ===== PWA Install — robuste : prompt natif + repli instructions ===== */
let deferredPrompt = window.__sunamiBIP || null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  window.__sunamiBIP = e;
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null; window.__sunamiBIP = null;
  try{ if(window.sunamiTrack) window.sunamiTrack('pwa_installed', {}); }catch(e){}
});
function isStandalone(){
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}
window.installPwa = async function(){
  // Deja installee (lancee en standalone) -> on ouvre l'app au lieu de reinstaller.
  if(isStandalone()){ window.location.href = '/app'; return; }
  const dp = deferredPrompt || window.__sunamiBIP;
  if(dp){
    try{
      dp.prompt();
      const { outcome } = await dp.userChoice;
      try{ if(window.sunamiTrack) window.sunamiTrack('pwa_prompt', { outcome }); }catch(e){}
      deferredPrompt = null; window.__sunamiBIP = null;
      if(outcome === 'accepted') return;
      // refus -> on n'insiste pas
      return;
    }catch(err){ /* le prompt a echoue -> instructions manuelles */ }
  }
  showInstallHelp();
};
function showInstallHelp(){
  if(document.getElementById('pwaHelp')) return;
  const ua = navigator.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  let steps;
  if(isIOS){
    steps = "Dans <b>Safari</b> :<br>1. Appuie sur <b>Partager</b> (l'icone \u2191 en bas).<br>2. Choisis <b>&laquo;\u00a0Sur l'ecran d'accueil\u00a0&raquo;</b>.<br>3. Appuie sur <b>Ajouter</b>.";
  } else if(isAndroid){
    steps = "Dans <b>Chrome</b> :<br>1. Ouvre le menu <b>\u22ee</b> (en haut a droite).<br>2. Choisis <b>&laquo;\u00a0Installer l'application\u00a0&raquo;</b> (ou &laquo;\u00a0Ajouter a l'ecran d'accueil\u00a0&raquo;).<br>3. Confirme avec <b>Installer</b>.<br><br><i>Astuce : si tu es dans un autre navigateur (Mi Browser, etc.), ouvre le site dans Chrome.</i>";
  } else {
    steps = "Dans le menu de ton navigateur, choisis <b>&laquo;\u00a0Installer l'application\u00a0&raquo;</b> ou <b>&laquo;\u00a0Ajouter a l'ecran d'accueil\u00a0&raquo;</b>.";
  }
  const ov = document.createElement('div');
  ov.id = 'pwaHelp';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:20px;';
  ov.innerHTML =
    '<div style="max-width:340px;width:100%;background:var(--card,#fff);color:var(--foam,#12302d);border-radius:18px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.35);">' +
      '<div style="font-size:34px;text-align:center;margin-bottom:6px;">\ud83d\udcf1</div>' +
      '<h3 style="margin:0 0 10px;font-size:18px;text-align:center;">Installer Sunami</h3>' +
      '<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">' + steps + '</p>' +
      '<button type="button" id="pwaHelpClose" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--wave,#14b8a6);color:#fff;font-weight:800;font-size:15px;cursor:pointer;">OK, compris</button>' +
    '</div>';
  ov.addEventListener('click', (e) => { if(e.target === ov || (e.target && e.target.id === 'pwaHelpClose')) ov.remove(); });
  document.body.appendChild(ov);
  try{ if(window.sunamiTrack) window.sunamiTrack('pwa_help_shown', { platform: isIOS ? 'ios' : (isAndroid ? 'android' : 'other') }); }catch(e){}
}

/* Animated demo — simulation complète de l'app */
(function(){
  const chat = document.getElementById('adChat');
  if(!chat) return;
  const caps = document.querySelectorAll('.ad-cap');
  const input = document.getElementById('adInput');
  const xpEl = document.getElementById('adXp');
  const streakEl = document.getElementById('adStreak');
  let xp = 0, streak = 1;

  const script = [
    { msg:'ai', text:'<b>Bonjour !</b> You must be tired from the flight. How do you say <b>hello</b> in English?', cap:0, delay:2000 },
    { msg:'typing', delay:1200 },
    { msg:'user', text:'Hello, nice to meet you!', cap:1, delay:1500 },
    { msg:'ai', text:'✅ <b>Parfait !</b> Bienvenue à Marseille. <b>Suivez-moi</b> (follow me), la voiture est par ici…', cap:3, xp:15, delay:2200 },
    { msg:'ai', text:'📝 Ton anglais est bon ! Petit conseil : on dit plutôt <b>\"I am tired\"</b> que \"I tired\".', cap:2, delay:2500 },
    { msg:'user', text:'Thank you! Where are we going?', cap:1, delay:1400 },
    { msg:'ai', text:'🌟 <b>Excellent !</b> On va au Vieux-Port. Regarde, la mer est magnifique au coucher du soleil. <b>Do you like the sea?</b>', cap:4, xp:12, streak:2, delay:2500 },
    { msg:'user', text:'Yes, I love the sea!', cap:1, delay:1300 },
    { msg:'ai', text:'🔥 <b>Streak 7 jours !</b> Tu progresses vite. Demain, on explore le marché. <b>À demain !</b>', cap:5, xp:10, streak:7, delay:2500 },
    { msg:'reset', delay:3000 },
  ];

  let step = 0;

  function showTyping(){
    const div = document.createElement('div');
    div.className = 'ad-msg ai';
    div.innerHTML = '<div class="ad-bubble"><span class="ad-dot">●</span><span class="ad-dot">●</span><span class="ad-dot">●</span></div>';
    div.id = 'ad-typing';
    chat.appendChild(div);
  }

  function addBubble(s){
    // Remove typing indicator
    const typing = document.getElementById('ad-typing');
    if(typing) typing.remove();

    const div = document.createElement('div');
    div.className = 'ad-msg ' + s.msg;
    div.innerHTML = '<div class="ad-bubble">' + s.text + '</div>';
    chat.appendChild(div);
    div.style.opacity = '0';
    div.style.transform = 'translateY(6px)';
    div.style.transition = 'all .3s ease';
    requestAnimationFrame(() => { div.style.opacity = '1'; div.style.transform = 'translateY(0)'; });
    chat.scrollTop = chat.scrollHeight;

    // Update XP
    if(s.xp){ xp += s.xp; if(xpEl) xpEl.textContent = xp; }
    if(s.streak && streakEl){ streakEl.textContent = s.streak; }

    // Highlight caption
    if(s.cap !== undefined){
      caps.forEach(c => c.classList.remove('active'));
      if(caps[s.cap]) caps[s.cap].classList.add('active');
    }

    // Update input placeholder
    if(s.msg === 'user' && input) input.textContent = 'Écris ta réponse...';
  }

  function run(){
    if(step >= script.length){ step = 0; chat.innerHTML = ''; xp = 0; streak = 1; if(xpEl) xpEl.textContent = '0'; if(streakEl) streakEl.textContent = '1'; caps.forEach(c => c.classList.remove('active')); }
    const s = script[step];
    if(s.msg === 'reset'){ step = 0; chat.innerHTML = ''; xp = 0; streak = 1; if(xpEl) xpEl.textContent = '0'; if(streakEl) streakEl.textContent = '1'; caps.forEach(c => c.classList.remove('active')); setTimeout(run, s.delay); return; }
    if(s.msg === 'typing'){ showTyping(); }
    else { addBubble(s); }
    step++;
    setTimeout(run, s.delay || 1800);
  }

  setTimeout(run, 600);
})();

/* ===== Reveal au scroll ===== */
document.addEventListener('DOMContentLoaded', ()=>{
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const els = document.querySelectorAll('.reveal:not(.in)');
  if(reduce || !('IntersectionObserver' in window)){ els.forEach(el=>el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold:0.12, rootMargin:'0px 0px -8% 0px' });
  els.forEach(el=>io.observe(el));

  // Service Worker pour mode hors-ligne
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});


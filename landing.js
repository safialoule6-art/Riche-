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
  if(ref){ localStorage.setItem('sunami_ref', ref); }
})();

/* Déjà connecté ? -> on file directement vers l'app (sauf lien de récupération en cours) */
(async function(){
  if(inRecovery) return;
  const { data } = await supabase.auth.getSession();
  if(data.session) window.location.replace('/app');
})();
supabase.auth.onAuthStateChange((event, session)=>{
  if(event === 'PASSWORD_RECOVERY'){
    inRecovery = true;
    const emailBox = document.getElementById('emailAuthBox'); if(emailBox) emailBox.style.display = 'none';
    const toggleBtn = document.getElementById('emailToggleBtn'); if(toggleBtn) toggleBtn.style.display = 'none';
    const recBox = document.getElementById('recoveryBox'); if(recBox) recBox.style.display = 'flex';
    return;
  }
  if(session && !inRecovery) window.location.replace('/app');
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

/* PWA Install — déclenche le dialogue natif */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});
window.installPwa = async function(){
  if(deferredPrompt){
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
  } else {
    alert('📱 Ouvre le menu du navigateur → "Ajouter à l\'écran d\'accueil"');
  }
};

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

  // Carousel témoignages
  initTestimonialCarousel();
});

function initTestimonialCarousel(){
  const carousel = document.getElementById('testimonialCarousel');
  const dots = document.getElementById('testimonialDots');
  if(!carousel || !dots) return;
  const slides = carousel.querySelectorAll('.t-slide');
  if(slides.length === 0) return;
  let current = 0;

  // Créer les dots
  slides.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 't-dot' + (i === 0 ? ' active' : '');
    dot.onclick = () => goTo(i);
    dots.appendChild(dot);
  });

  function goTo(i){
    slides[current].classList.remove('active');
    dots.children[current].classList.remove('active');
    current = i;
    slides[current].classList.add('active');
    dots.children[current].classList.add('active');
  }

  slides[0].classList.add('active');
  setInterval(() => goTo((current + 1) % slides.length), 6000);
}

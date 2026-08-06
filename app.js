/* Sunami — application (écran connecté). Version gratuite, IA Groq en streaming.
   Accessible uniquement authentifié : sinon redirection vers la landing '/'. */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://cdtabuyomtkfasvugtck.supabase.co';
const supabaseKey = 'sb_publishable_ms6RPYdPVcO3c9A6X1ruQQ_uiYl1Dxo';
const supabase = createClient(supabaseUrl, supabaseKey);
window.supabase = supabase;

/* ===== PARAMÈTRES + SYNTHÈSE VOCALE ===== */
const LOCALES = { anglais:'en-US', espagnol:'es-ES', allemand:'de-DE', italien:'it-IT', arabe:'ar-SA', portugais:'pt-PT' };
let settings = { autoplay:true, rate:1, font:'m' };
try{ settings = { ...settings, ...JSON.parse(localStorage.getItem('sunami-settings') || '{}') }; }catch(e){}

function saveSettings(){ localStorage.setItem('sunami-settings', JSON.stringify(settings)); }
function applySettings(){
  const map = { s:'13px', m:'15px', l:'17px' };
  document.documentElement.style.setProperty('--chat-font', map[settings.font] || '15px');
  const ap = document.getElementById('setAutoplay'); if(ap) ap.checked = settings.autoplay;
  const rt = document.getElementById('setRate'); if(rt) rt.value = settings.rate;
  const rv = document.getElementById('setRateVal'); if(rv) rv.textContent = settings.rate.toFixed(1) + '×';
  document.querySelectorAll('.seg-font').forEach(b => b.classList.toggle('active', b.dataset.font === settings.font));
}

if('speechSynthesis' in window){ try{ window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = ()=>window.speechSynthesis.getVoices(); }catch(e){} }

function speak(text, btn){
  if(!('speechSynthesis' in window) || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LOCALES[pickedLang] || 'en-US';
  u.rate = settings.rate;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(x => x.lang && x.lang.toLowerCase().startsWith(u.lang.slice(0,2).toLowerCase()));
  if(v) u.voice = v;
  if(btn){ u.onstart = ()=>btn.classList.add('speaking'); u.onend = u.onerror = ()=>btn.classList.remove('speaking'); }
  const sc = document.querySelector('.scene-card');
  const prevStart = u.onstart, prevEnd = u.onend;
  u.onstart = (e)=>{ if(sc) sc.classList.add('speaking'); if(prevStart) prevStart(e); };
  u.onend = u.onerror = (e)=>{ if(sc) sc.classList.remove('speaking'); if(prevEnd) prevEnd(e); };
  window.speechSynthesis.speak(u);
}

window.openSettings = function(){
  applySettings();
  const em = document.getElementById('setEmail');
  const lbl = document.getElementById('userLabel');
  const authBtn = document.getElementById('setAuthBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  if(em){
    if(isGuest){ em.textContent = '👤 Mode invité — ta progression est enregistrée sur cet appareil uniquement.'; }
    else { em.textContent = lbl && lbl.textContent ? ('Connecté : ' + lbl.textContent) : ''; }
  }
  if(authBtn) authBtn.style.display = isGuest ? 'block' : 'none';
  if(logoutBtn) logoutBtn.style.display = isGuest ? 'none' : 'block';
  const m = document.getElementById('settingsModal');
  m.classList.add('open'); m.setAttribute('aria-hidden','false');
};
window.closeSettings = function(){
  const m = document.getElementById('settingsModal');
  m.classList.remove('open'); m.setAttribute('aria-hidden','true');
};
window.setAutoplay = function(el){ settings.autoplay = el.checked; saveSettings(); };
window.setRate = function(el){ settings.rate = parseFloat(el.value); document.getElementById('setRateVal').textContent = settings.rate.toFixed(1) + '×'; saveSettings(); };
window.setFont = function(f){ settings.font = f; saveSettings(); applySettings(); };
window.resetProgress = async function(){
  if(!confirm('Réinitialiser toute ta progression (streak, XP, langue) ? Cette action est irréversible.')) return;
  progress = { season:1, episode:1, streak:0, last_active:null, language:null, level:null };
  xp = 0; localStorage.setItem('sunami-xp', '0');
  try{ await saveProgress(); }catch(e){}
  location.reload();
};
window.shareProgress = async function(){
  const txt = `🌊 Streak de ${progress.streak || 0} jour(s) et ${xp} XP sur Sunami — j'apprends une langue en vivant une histoire !`;
  const url = 'https://sunami-rho.vercel.app';
  try{
    if(navigator.share){ await navigator.share({ title:'Sunami', text:txt, url }); }
    else {
      await navigator.clipboard.writeText(txt + ' ' + url);
      const b = document.getElementById('shareBtn'); if(b){ const o = b.textContent; b.textContent = '✓ Copié dans le presse-papiers !'; setTimeout(()=>b.textContent = o, 1800); }
    }
  }catch(e){}
};

document.addEventListener('keydown', e => { if(e.key === 'Escape'){ window.closeSettings(); window.closeCelebration && window.closeCelebration(); window.closeAuth && window.closeAuth(); } });
document.addEventListener('DOMContentLoaded', applySettings);

/* ===== XP & NIVEAUX (gratuit) ===== */
const XP_PER_LEVEL = 100;
let xp = parseInt(localStorage.getItem('sunami-xp') || '0', 10) || 0;
function levelOf(v){ return Math.floor(v / XP_PER_LEVEL) + 1; }
function updateXpChip(){
  const c = document.getElementById('xpCount'); if(c) c.textContent = xp;
  const chip = document.getElementById('xpChip'); if(chip) chip.style.display = 'inline-flex';
  const ln = document.getElementById('lvlNum'); if(ln) ln.textContent = levelOf(xp);
  const bar = document.getElementById('xpBarFill');
  if(bar) bar.style.width = ((xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100) + '%';
}
function floatXp(n){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chip = document.getElementById('xpChip');
  if(reduce || !chip) return;
  const r = chip.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'xp-float'; el.textContent = '+' + n + ' XP';
  el.style.left = (r.left + r.width / 2 - 22) + 'px';
  el.style.top = (r.bottom + 2) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}
function addXp(n){
  const before = levelOf(xp);
  xp += n; localStorage.setItem('sunami-xp', String(xp)); updateXpChip();
  const chip = document.getElementById('xpChip');
  if(chip){ chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
  floatXp(n);
  window.track && track('xp_gained', { amount: n, total: xp });
  const after = levelOf(xp);
  if(after > before){
    window.track && track('level_up', { level: after });
    setTimeout(() => celebrate({
      emoji: '⭐', title: 'Niveau ' + after + ' atteint !',
      sub: 'Tu maîtrises de plus en plus la langue. Continue sur ta lancée !'
    }), 500);
  }
}

/* ===== CÉLÉBRATION & CONFETTIS ===== */
function fireConfetti(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const box = document.getElementById('confetti');
  if(!box) return;
  box.innerHTML = '';
  if(reduce) return;
  const colors = ['#14b8a6', '#2dd4bf', '#f5a524', '#ff5a5f', '#ffd071', '#5eead4'];
  for(let i = 0; i < 42; i++){
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
    p.style.animationDelay = (Math.random() * 0.3) + 's';
    p.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
    box.appendChild(p);
  }
  setTimeout(() => { box.innerHTML = ''; }, 3400);
}
function celebrate({ emoji = '🎉', title = 'Bravo !', sub = '' }){
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set('celEmoji', emoji); set('celTitle', title); set('celSub', sub);
  set('celXp', xp); set('celStreak', progress.streak || 0); set('celLvl', levelOf(xp));
  const m = document.getElementById('celModal');
  if(m){ m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); }
  fireConfetti();
}
window.closeCelebration = function(){
  const m = document.getElementById('celModal');
  if(m){ m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }
  const box = document.getElementById('confetti'); if(box) box.innerHTML = '';
};

window.logout = async function(){
  window.closeSettings && window.closeSettings();
  appEntered = false;
  if('speechSynthesis' in window) window.speechSynthesis.cancel();
  await supabase.auth.signOut();
  window.location.replace('/');
};

const LANGUAGES = [
  {code:'anglais', label:'Anglais', flag:'🇬🇧'},
  {code:'espagnol', label:'Espagnol', flag:'🇪🇸'},
  {code:'allemand', label:'Allemand', flag:'🇩🇪'},
  {code:'italien', label:'Italien', flag:'🇮🇹'},
  {code:'arabe', label:'Arabe', flag:'🇸🇦'},
  {code:'portugais', label:'Portugais', flag:'🇵🇹'},
];
const LEVELS = [
  {code:'A1-A2 (débutant)', label:'Débutant', sub:'A1 · A2'},
  {code:'B1-B2 (intermédiaire)', label:'Intermédiaire', sub:'B1 · B2'},
  {code:'C1-C2 (avancé)', label:'Avancé', sub:'C1 · C2'},
];
const THEMES = [
  {code:'voyage', label:'Voyage', emoji:'✈️'},
  {code:'quotidien', label:'Quotidien', emoji:'☕'},
  {code:'travail', label:'Travail', emoji:'💼'},
  {code:'mystere', label:'Mystère', emoji:'🕵️'},
  {code:'romance', label:'Romance', emoji:'💛'},
  {code:'aventure', label:'Aventure', emoji:'🗺️'},
];
let pickedLang = null, pickedLevel = null;
let pickedTheme = localStorage.getItem('sunami-theme-ctx') || null;
let chapter = 0;

function renderPickers(){
  const langGrid = document.getElementById('langGrid');
  langGrid.innerHTML = '';
  LANGUAGES.forEach(l=>{
    const c = document.createElement('div');
    c.className = 'pick-card';
    if(l.code === pickedLang) c.classList.add('active');
    c.innerHTML = `<span class="flag">${l.flag}</span>${l.label}`;
    c.onclick = ()=>{
      document.querySelectorAll('#langGrid .pick-card').forEach(x=>x.classList.remove('active'));
      c.classList.add('active');
      pickedLang = l.code;
      checkReady();
    };
    langGrid.appendChild(c);
  });
  const levelGrid = document.getElementById('levelGrid');
  levelGrid.innerHTML = '';
  LEVELS.forEach(lv=>{
    const c = document.createElement('div');
    c.className = 'pick-card';
    if(lv.code === pickedLevel) c.classList.add('active');
    c.innerHTML = `${lv.label}<small>${lv.sub}</small>`;
    c.onclick = ()=>{
      document.querySelectorAll('#levelGrid .pick-card').forEach(x=>x.classList.remove('active'));
      c.classList.add('active');
      pickedLevel = lv.code;
      checkReady();
    };
    levelGrid.appendChild(c);
  });
  const themeGrid = document.getElementById('themeGrid');
  if(themeGrid){
    themeGrid.innerHTML = '';
    THEMES.forEach(t=>{
      const c = document.createElement('div');
      c.className = 'pick-card';
      if(t.code === pickedTheme) c.classList.add('active');
      c.innerHTML = `<span class="emoji">${t.emoji}</span>${t.label}`;
      c.onclick = ()=>{
        const already = t.code === pickedTheme;
        document.querySelectorAll('#themeGrid .pick-card').forEach(x=>x.classList.remove('active'));
        if(already){ pickedTheme = null; localStorage.removeItem('sunami-theme-ctx'); }
        else { c.classList.add('active'); pickedTheme = t.code; localStorage.setItem('sunami-theme-ctx', t.code); }
        checkReady();
      };
      themeGrid.appendChild(c);
    });
  }
}
function checkReady(){
  document.getElementById('startBtn').disabled = !(pickedLang && pickedLevel);
}
window.confirmPick = function(){
  document.getElementById('pickScreen').style.display = 'none';
  document.getElementById('chatScreen').style.display = 'flex';
  progress.language = pickedLang;
  progress.level = pickedLevel;
  saveProgress();
  window.track && track('story_started', { language: pickedLang, level: pickedLevel, theme: pickedTheme || 'aucun', guest: isGuest });
  updateSceneMeta();
  startScene();
};

function updateSceneMeta(){
  const langLabel = (LANGUAGES.find(l=>l.code===pickedLang)?.label) || pickedLang || '';
  const levelLabel = (LEVELS.find(l=>l.code===pickedLevel)?.label) || pickedLevel || '';
  const tag = document.getElementById('sceneTag');
  if(tag){
    const chap = chapter > 0 ? ` · CHAPITRE ${chapter}` : '';
    tag.textContent = `${langLabel.toUpperCase()} · NIVEAU ${levelLabel.toUpperCase()}${chap}`;
  }
}

let userId = null;
let isGuest = false;
let progress = { season: 1, episode: 1, streak: 0, last_active: null, language: null, level: null };

async function loadProgress(uid){
  const { data } = await supabase.from('progress').select('*').eq('user_id', uid).maybeSingle();
  if (data) progress = { ...progress, ...data };
  return data;
}

async function touchStreak(){
  const today = new Date().toISOString().slice(0,10);
  let increased = false;
  if (progress.last_active !== today){
    const y = new Date(); y.setDate(y.getDate()-1);
    const yesterday = y.toISOString().slice(0,10);
    progress.streak = (progress.last_active === yesterday) ? (progress.streak || 0) + 1 : 1;
    progress.last_active = today;
    increased = true;
  }
  const chip = document.getElementById('streakChip');
  chip.style.display = 'inline-flex';
  chip.classList.add('lit');
  document.getElementById('streakCount').textContent = progress.streak;
  await saveProgress();
  const milestones = [3, 7, 14, 30, 50, 100, 200, 365];
  if(increased && milestones.includes(progress.streak)){
    window.track && track('streak_milestone', { streak: progress.streak });
    setTimeout(() => celebrate({
      emoji: '🔥', title: progress.streak + ' jours de série !',
      sub: 'Quelle régularité ! Reviens demain pour ne pas briser ta flamme.'
    }), 900);
  }
}

async function saveProgress(){
  // Invité : pas de compte → on garde les choix localement, rien côté serveur.
  if(isGuest || !userId){
    if(progress.language) localStorage.setItem('sunami-guest-lang', progress.language);
    if(progress.level) localStorage.setItem('sunami-guest-level', progress.level);
    return;
  }
  await supabase.from('progress').upsert({
    user_id: userId,
    season: progress.season,
    episode: progress.episode,
    streak: progress.streak,
    last_active: progress.last_active,
    language: progress.language,
    level: progress.level
  });
}

window.backToPicker = function(){
  if('speechSynthesis' in window) window.speechSynthesis.cancel();
  document.getElementById('chatScreen').style.display = 'none';
  document.getElementById('pickScreen').style.display = 'flex';
  document.getElementById('chatLog').innerHTML = '';
  chatHistory = [];
  pickedLang = null; pickedLevel = null;
  renderPickers();
};

let appEntered = false;
function showAppShell(){ document.getElementById('appScreen').style.display = 'flex'; }

async function enterApp(email, uid){
  if(appEntered) return;
  appEntered = true;
  isGuest = false;
  showAppShell();
  document.getElementById('userLabel').textContent = email;
  const saveCta = document.getElementById('saveCta'); if(saveCta) saveCta.style.display = 'none';
  userId = uid;
  await loadProgress(uid);
  await touchStreak();
  updateXpChip();

  if (progress.language && progress.level){
    pickedLang = progress.language;
    pickedLevel = progress.level;
    document.getElementById('pickScreen').style.display = 'none';
    document.getElementById('chatScreen').style.display = 'flex';
    updateSceneMeta();
    startScene();
  } else {
    renderPickers();
  }
}

/* Mode invité : jouable immédiatement, sans compte (play-first). */
function enterGuest(){
  if(appEntered) return;
  appEntered = true;
  isGuest = true;
  userId = null;
  showAppShell();
  const saveCta = document.getElementById('saveCta'); if(saveCta) saveCta.style.display = 'inline-flex';
  // Restaure les derniers choix locaux, s'il y en a
  pickedLang = localStorage.getItem('sunami-guest-lang') || null;
  pickedLevel = localStorage.getItem('sunami-guest-level') || null;
  progress.language = pickedLang; progress.level = pickedLevel;
  updateXpChip();
  renderPickers();
}

/* Passage invité → compte, sans perdre l'XP (déjà local) ni les choix. */
async function promoteToUser(session){
  const wasGuest = isGuest;
  isGuest = false;
  userId = session.user.id;
  document.getElementById('userLabel').textContent = session.user.email;
  const saveCta = document.getElementById('saveCta'); if(saveCta) saveCta.style.display = 'none';
  window.closeAuth && window.closeAuth();
  removeSaveBanner();
  await loadProgress(userId);
  // Le compte est neuf ? On y transfère les choix faits en invité.
  if(!progress.language && pickedLang){ progress.language = pickedLang; progress.level = pickedLevel; }
  await touchStreak();
  updateXpChip();
  await saveProgress();
  if(wasGuest){
    celebrate({ emoji:'💾', title:'Progression sauvegardée !',
      sub:'Ton XP et ta série sont maintenant liés à ton compte, disponibles sur tous tes appareils.' });
  }
}

/* Play-first : l'app est accessible sans compte. */
window.addEventListener('DOMContentLoaded', async ()=>{
  const { data } = await supabase.auth.getSession();
  if(data.session){ enterApp(data.session.user.email, data.session.user.id); }
  else { enterGuest(); }
  maybeOpenAuthFromQuery();
});
supabase.auth.onAuthStateChange((event, session)=>{
  if(event === 'SIGNED_IN' && session){
    if(appEntered && isGuest){ promoteToUser(session); }
    else { enterApp(session.user.email, session.user.id); }
  } else if(event === 'SIGNED_OUT'){
    window.location.replace('/');
  }
});

/* ===== AUTH (play-first : compte optionnel, email + Google) ===== */
let authMode = 'signup'; // 'signup' | 'login'

function isInAppBrowser(){
  const ua = navigator.userAgent || navigator.vendor || '';
  return /FBAN|FBAV|Instagram|Line|Twitter|TikTok|musical_ly|Snapchat|Pinterest|WhatsApp|OKApp|MicroMessenger/i.test(ua);
}
function showAuthError(msg){ const el = document.getElementById('authError'); if(el) el.textContent = msg || ''; }
function showAuthMsg(msg){ const el = document.getElementById('authMsg'); if(el) el.textContent = msg || ''; }
function renderAuthMode(){
  const submit = document.getElementById('authSubmit');
  const toggle = document.getElementById('authToggle');
  const pass = document.getElementById('authPass');
  if(authMode === 'signup'){
    if(submit) submit.textContent = 'Créer mon compte gratuit';
    if(toggle) toggle.textContent = 'J\u2019ai déjà un compte → Se connecter';
    if(pass) pass.setAttribute('autocomplete', 'new-password');
  } else {
    if(submit) submit.textContent = 'Se connecter';
    if(toggle) toggle.textContent = 'Pas encore de compte → En créer un';
    if(pass) pass.setAttribute('autocomplete', 'current-password');
  }
}
window.toggleAuthMode = function(){
  authMode = authMode === 'signup' ? 'login' : 'signup';
  showAuthError(''); showAuthMsg('');
  renderAuthMode();
};
window.openAuth = function(mode){
  window.track && track('auth_opened', { mode: mode || 'save' });
  authMode = 'signup';
  showAuthError(''); showAuthMsg('');
  renderAuthMode();
  const title = document.getElementById('authTitle');
  const intro = document.getElementById('authIntro');
  if(mode === 'save'){
    if(title) title.textContent = '💾 Sauvegarde ta progression';
    if(intro) intro.textContent = 'Crée un compte gratuit pour garder ton XP, ta série et ton histoire sur tous tes appareils.';
  } else {
    if(title) title.textContent = 'Se connecter';
    if(intro) intro.textContent = 'Retrouve ta progression sur tous tes appareils.';
  }
  const hint = document.getElementById('authWebviewHint');
  if(hint) hint.style.display = isInAppBrowser() ? 'block' : 'none';
  const m = document.getElementById('authModal');
  if(m){ m.classList.add('open'); m.setAttribute('aria-hidden','false'); }
  const em = document.getElementById('authEmail'); if(em) setTimeout(()=>em.focus(), 60);
};
window.closeAuth = function(){
  const m = document.getElementById('authModal');
  if(m){ m.classList.remove('open'); m.setAttribute('aria-hidden','true'); }
};
window.submitAuth = async function(){
  const email = (document.getElementById('authEmail').value || '').trim();
  const pass = document.getElementById('authPass').value || '';
  showAuthError(''); showAuthMsg('');
  if(!email || !email.includes('@')){ showAuthError('Entre un email valide.'); return; }
  if(pass.length < 6){ showAuthError('Le mot de passe doit faire au moins 6 caractères.'); return; }
  const submit = document.getElementById('authSubmit');
  const orig = submit.textContent; submit.disabled = true; submit.textContent = '…';
  try{
    if(authMode === 'signup'){
      const { data, error } = await supabase.auth.signUp({ email, password: pass });
      if(error){ showAuthError(error.message); }
      else if(data.session){ window.track && track('sign_up', { method: 'email' }); /* onAuthStateChange gère la suite */ }
      else { showAuthMsg('✓ Compte créé ! Vérifie ta boîte mail pour confirmer, puis connecte-toi. Ta progression reste ici en attendant.'); authMode = 'login'; renderAuthMode(); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if(error){ showAuthError(error.message); }
      else { window.track && track('login', { method: 'email' }); }
    }
  }catch(err){ showAuthError('Erreur : ' + err.message); }
  finally{ submit.disabled = false; submit.textContent = orig; }
};
window.loginWithGoogle = async function(){
  showAuthError('');
  window.track && track('login', { method: 'google' });
  try{
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/app' }
    });
    if(error) showAuthError(error.message);
  }catch(err){ showAuthError('Erreur : ' + err.message); }
};
function maybeOpenAuthFromQuery(){
  try{
    const params = new URLSearchParams(window.location.search);
    if(isGuest && (params.get('auth') === '1' || params.get('login') === '1')){ window.openAuth('login'); }
  }catch(e){}
}

/* Bandeau doux de sauvegarde (invité), après avoir goûté à la valeur */
function removeSaveBanner(){ const b = document.getElementById('saveBanner'); if(b) b.remove(); }
function maybeShowSaveBanner(){
  if(!isGuest) return;
  if(sessionStorage.getItem('sunami-save-dismissed')) return;
  if(document.getElementById('saveBanner')) return;
  const log = document.getElementById('chatLog');
  if(!log) return;
  const b = document.createElement('div');
  b.id = 'saveBanner'; b.className = 'save-banner';
  b.innerHTML = `<div class="sb-txt">💾 Tu progresses bien !<small>Crée un compte gratuit pour garder ton XP, ta série et ton histoire.</small></div>`;
  const save = document.createElement('button'); save.className = 'btn'; save.textContent = 'Sauvegarder';
  save.onclick = ()=>{ window.track && track('save_clicked'); window.openAuth('save'); };
  const close = document.createElement('button'); close.className = 'sb-close'; close.setAttribute('aria-label','Fermer'); close.textContent = '✕';
  close.onclick = ()=>{ sessionStorage.setItem('sunami-save-dismissed','1'); removeSaveBanner(); };
  b.appendChild(save); b.appendChild(close);
  log.appendChild(b);
  window.track && track('save_banner_shown');
  scrollChat();
}

/* ===== CHAT / HISTOIRE IA (streaming) ===== */
let chatHistory = [];

function scrollChat(){ const log = document.getElementById('chatLog'); log.scrollTop = log.scrollHeight; }

function addMsg(type, text){
  const log = document.getElementById('chatLog');
  const div = document.createElement('div');
  div.className = 'msg ' + type;
  div.textContent = text;
  log.appendChild(div);
  scrollChat();
  return div;
}

function escapeHtml(s){ return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function formatStory(s){ return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); }
function cleanForSpeech(s){ return s.replace(/\*\*/g,'').replace(/\([^)]*\)/g,'').replace(/\s+/g,' ').trim(); }

function addSpeaker(bubble, text){
  if(!('speechSynthesis' in window)) return;
  const spk = document.createElement('button');
  spk.className = 'speak-btn'; spk.type = 'button';
  spk.setAttribute('aria-label','Écouter'); spk.title = 'Écouter';
  spk.textContent = '🔊';
  spk.onclick = () => speak(text, spk);
  bubble.appendChild(spk);
}

async function callAI(userReply){
  const sendBtn = document.getElementById('sendBtn');
  const input = document.getElementById('userInput');
  sendBtn.disabled = true; input.disabled = true;
  const sceneCard = document.querySelector('.scene-card');
  if(sceneCard){ sceneCard.classList.add('thinking'); sceneCard.classList.remove('speaking'); }

  // Indicateur "le conteur écrit…"
  const loadingEl = document.createElement('div');
  loadingEl.className = 'loading rich';
  loadingEl.setAttribute('aria-label', 'Le conteur écrit');
  loadingEl.innerHTML = '<span class="tdot"></span><span class="tdot"></span><span class="tdot"></span>';
  document.getElementById('chatLog').appendChild(loadingEl);
  scrollChat();

  try{
    const res = await fetch('/api/generate', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ history: chatHistory, userReply, language: pickedLang, level: pickedLevel, theme: pickedTheme })
    });

    if(res.status === 429){
      loadingEl.remove();
      if(sceneCard) sceneCard.classList.remove('thinking');
      addMsg('feedback wrong', '⏳ Trop de demandes d\u2019un coup — patiente ~30 secondes puis réessaie.');
      sendBtn.disabled = false; input.disabled = false;
      return;
    }
    if(!res.ok || !res.body){
      let e = {}; try{ e = await res.json(); }catch(_){}
      loadingEl.remove();
      if(sceneCard) sceneCard.classList.remove('thinking');
      addMsg('feedback wrong', 'Erreur : ' + (e.error || ('HTTP ' + res.status)));
      sendBtn.disabled = false; input.disabled = false;
      return;
    }

    loadingEl.remove();
    if(userReply){ chatHistory.push({ role:'user', content:userReply }); addXp(8 + Math.floor(Math.random()*7)); }

    // Bulle du conteur qui s'écrit en direct (markdown live + curseur)
    const bubble = document.createElement('div');
    bubble.className = 'msg character streaming';
    const span = document.createElement('span');
    const cursor = document.createElement('span');
    cursor.className = 'stream-cursor';
    bubble.appendChild(span);
    bubble.appendChild(cursor);
    document.getElementById('chatLog').appendChild(bubble);
    if(sceneCard){ sceneCard.classList.remove('thinking'); sceneCard.classList.add('speaking'); }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let full = '';
    while(true){
      const { done, value } = await reader.read();
      if(done) break;
      full += dec.decode(value, { stream:true });
      span.innerHTML = formatStory(full);
      scrollChat();
    }

    if(!full.trim()){
      bubble.remove();
      if(sceneCard) sceneCard.classList.remove('speaking');
      addMsg('feedback wrong', 'Le conteur n\u2019a rien répondu — réessaie.');
      sendBtn.disabled = false; input.disabled = false;
      return;
    }

    bubble.classList.remove('streaming');
    bubble.innerHTML = formatStory(full);
    const speech = cleanForSpeech(full);
    addSpeaker(bubble, speech);
    chatHistory.push({ role:'assistant', content: full });
    chapter += 1; updateSceneMeta();
    if(settings.autoplay) speak(speech);
    else if(sceneCard) sceneCard.classList.remove('speaking');
    if(isGuest && chapter >= 2) maybeShowSaveBanner();

    sendBtn.disabled = false; input.disabled = false; input.focus();
    scrollChat();
  }catch(err){
    try{ loadingEl.remove(); }catch(_){}
    if(sceneCard) sceneCard.classList.remove('thinking','speaking');
    addMsg('feedback wrong', 'Erreur réseau : ' + err.message);
    sendBtn.disabled = false; input.disabled = false;
  }
}

function startScene(){
  chapter = 0;
  chatHistory = [];
  document.getElementById('chatLog').innerHTML = '';
  const input = document.getElementById('userInput');
  if(input) input.disabled = false;
  updateSceneMeta();
  callAI(null);
}

function sendReply(){
  const input = document.getElementById('userInput');
  const val = input.value.trim();
  if(!val) return;
  addMsg('user', val);
  window.track && track('reply_sent', { chapter: chapter });
  input.value = '';
  callAI(val);
}
window.sendReply = sendReply;

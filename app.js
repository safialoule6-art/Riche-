/* Sunami — logique de l'application (écran connecté).
   Accessible uniquement authentifié : sinon redirection vers la landing '/'. */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://cdtabuyomtkfasvugtck.supabase.co';
const supabaseKey = 'sb_publishable_ms6RPYdPVcO3c9A6X1ruQQ_uiYl1Dxo';
const supabase = createClient(supabaseUrl, supabaseKey);
window.supabase = supabase;

/* ===== SETTINGS + TEXT-TO-SPEECH ===== */
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

// warm up voices (some browsers load them async)
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
  window.speechSynthesis.speak(u);
}

window.openSettings = function(){
  applySettings();
  const em = document.getElementById('setEmail');
  const lbl = document.getElementById('userLabel');
  if(em && lbl) em.textContent = lbl.textContent ? ('Connecté : ' + lbl.textContent) : '';
  const up = document.getElementById('superUpsell');
  const act = document.getElementById('superActive');
  if(isPremium()){ if(up) up.style.display='none'; if(act) act.style.display='block'; }
  else { if(up) up.style.display='block'; if(act) act.style.display='none'; }
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
  if(!confirm('Réinitialiser toute ta progression (streak, saison, épisode, langue, XP) ? Cette action est irréversible.')) return;
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

/* ===== XP / GAMIFICATION ===== */
let xp = parseInt(localStorage.getItem('sunami-xp') || '0', 10) || 0;
let episodeXp = 0;
function updateXpChip(){
  const c = document.getElementById('xpCount'); if(c) c.textContent = xp;
  const chip = document.getElementById('xpChip'); if(chip) chip.style.display = 'inline-flex';
}
function addXp(n){
  xp += n; localStorage.setItem('sunami-xp', String(xp)); updateXpChip();
  const chip = document.getElementById('xpChip');
  if(chip){ chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
}
function launchConfetti(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const wrap = document.getElementById('confetti'); if(!wrap) return;
  wrap.innerHTML = '';
  const colors = ['#14b8a6','#2dd4bf','#ff5a5f','#f5a524','#4c9aff'];
  for(let i=0;i<52;i++){
    const p = document.createElement('i');
    p.className = 'confetti-piece';
    p.style.left = Math.random()*100 + '%';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random()*0.35) + 's';
    p.style.animationDuration = (1.9 + Math.random()*1.3) + 's';
    wrap.appendChild(p);
  }
  setTimeout(()=>{ wrap.innerHTML = ''; }, 3400);
}
function celebrate(epXp){
  const xpEl = document.getElementById('celXp'); if(xpEl) xpEl.textContent = '+' + epXp;
  const stEl = document.getElementById('celStreak'); if(stEl) stEl.textContent = progress.streak || 1;
  const totEl = document.getElementById('celTotal'); if(totEl) totEl.textContent = xp;
  const m = document.getElementById('celebrateModal');
  if(m){ m.classList.add('open'); m.setAttribute('aria-hidden','false'); }
  launchConfetti();
}
window.closeCelebrate = function(){
  const m = document.getElementById('celebrateModal');
  if(m){ m.classList.remove('open'); m.setAttribute('aria-hidden','true'); }
  if('speechSynthesis' in window) window.speechSynthesis.cancel();
};

/* ===== PREMIUM (Sunami Super) + CŒURS (freemium façon Duolingo) ===== */
const FREE_HEARTS = 5;
const FREE_EPISODES_PER_DAY = 1;
function todayStr(){ return new Date().toISOString().slice(0,10); }
function isPremium(){ return localStorage.getItem('sunami-premium') === '1'; }
function heartsState(){
  let s; try{ s = JSON.parse(localStorage.getItem('sunami-hearts')||'{}'); }catch(e){ s = {}; }
  if(s.date !== todayStr()){ s = { date: todayStr(), hearts: FREE_HEARTS }; localStorage.setItem('sunami-hearts', JSON.stringify(s)); }
  return s;
}
function getHearts(){ return isPremium() ? Infinity : heartsState().hearts; }
function loseHeart(){
  if(isPremium()) return;
  const s = heartsState(); s.hearts = Math.max(0, s.hearts - 1);
  localStorage.setItem('sunami-hearts', JSON.stringify(s)); updateHeartsChip();
}
function episodesTodayState(){
  let s; try{ s = JSON.parse(localStorage.getItem('sunami-eptoday')||'{}'); }catch(e){ s = {}; }
  if(s.date !== todayStr()){ s = { date: todayStr(), count: 0 }; }
  return s;
}
function episodesTodayCount(){ return episodesTodayState().count || 0; }
function bumpEpisodesToday(){ const s = episodesTodayState(); s.count = (s.count||0)+1; localStorage.setItem('sunami-eptoday', JSON.stringify(s)); }

function updateHeartsChip(){
  const prem = isPremium();
  const hc = document.getElementById('heartChip');
  const sb = document.getElementById('superBadge');
  if(prem){
    if(hc) hc.style.display = 'none';
    if(sb) sb.style.display = 'inline-flex';
  } else {
    if(sb) sb.style.display = 'none';
    if(hc){ hc.style.display = 'inline-flex'; const c = document.getElementById('heartCount'); if(c) c.textContent = getHearts(); }
  }
}

window.openPaywall = function(reason){
  const t = document.getElementById('paywallTitle');
  const sub = document.getElementById('paywallSub');
  if(t && sub){
    if(reason === 'hearts'){ t.textContent = 'Plus de cœurs pour aujourd\u2019hui'; sub.textContent = 'Reviens demain\u2026 ou passe à Super pour des cœurs illimités.'; }
    else if(reason === 'episodes'){ t.textContent = 'Épisode du jour terminé'; sub.textContent = 'Reviens demain pour la suite\u2026 ou enchaîne tout de suite avec Super.'; }
    else { t.textContent = 'Passe à Sunami Super'; sub.textContent = 'Débloque toute l\u2019expérience.'; }
  }
  const m = document.getElementById('paywallModal');
  if(m){ m.classList.add('open'); m.setAttribute('aria-hidden','false'); }
};
window.closePaywall = function(){
  const m = document.getElementById('paywallModal');
  if(m){ m.classList.remove('open'); m.setAttribute('aria-hidden','true'); }
};
window.upgradeToSuper = async function(btn){
  const original = btn ? btn.textContent : '';
  try{
    if(btn){ btn.disabled = true; btn.textContent = 'Redirection sécurisée\u2026'; }
    const res = await fetch('/api/create-payment', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        productName:'Sunami Super — 1 mois', price:500, currency:'EUR',
        userId: userId || null,
        email: (document.getElementById('userLabel')?.textContent) || null
      })
    });
    const data = await res.json();
    if(res.ok && data.purchaseUrl){ window.location.href = data.purchaseUrl; return; }
    alert(data.error || 'Paiement indisponible pour le moment.');
  }catch(e){ alert('Erreur réseau, réessaie.'); }
  if(btn){ btn.disabled = false; btn.textContent = original; }
};

document.addEventListener('keydown', e => { if(e.key === 'Escape'){ window.closeSettings(); window.closeCelebrate(); window.closePaywall(); } });
document.addEventListener('DOMContentLoaded', applySettings);

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
let pickedLang = null, pickedLevel = null;

function renderPickers(){
  const langGrid = document.getElementById('langGrid');
  langGrid.innerHTML = '';
  LANGUAGES.forEach(l=>{
    const c = document.createElement('div');
    c.className = 'pick-card';
    c.innerHTML = `<div style="font-size:26px;line-height:1;margin-bottom:6px;">${l.flag}</div>${l.label}`;
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
    c.innerHTML = `${lv.label}<small>${lv.sub}</small>`;
    c.onclick = ()=>{
      document.querySelectorAll('#levelGrid .pick-card').forEach(x=>x.classList.remove('active'));
      c.classList.add('active');
      pickedLevel = lv.code;
      checkReady();
    };
    levelGrid.appendChild(c);
  });
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
  updateSceneMeta();
  startScene();
}

function updateSceneMeta(){
  const langLabel = (LANGUAGES.find(l=>l.code===pickedLang)?.label) || pickedLang || '';
  const levelLabel = (LEVELS.find(l=>l.code===pickedLevel)?.label) || pickedLevel || '';
  const tag = document.getElementById('sceneTag');
  if(tag) tag.textContent = `${langLabel.toUpperCase()} · NIVEAU ${levelLabel.toUpperCase()} · SAISON ${progress.season} · ÉPISODE ${progress.episode}`;
  const total = 5;
  const ep = Math.min(Math.max(progress.episode, 1), total);
  const pct = Math.round((ep / total) * 100);
  const fill = document.getElementById('epFill'); if(fill) fill.style.width = pct + '%';
  const lbl = document.getElementById('epProgressLabel'); if(lbl) lbl.textContent = `Saison ${progress.season} · Épisode ${progress.episode}`;
  const pctEl = document.getElementById('epProgressPct'); if(pctEl) pctEl.textContent = pct + '%';
  const dots = document.getElementById('epDots');
  if(dots){
    dots.innerHTML = '';
    for(let i=1; i<=total; i++){
      const d = document.createElement('span');
      d.className = 'ep-dot' + (i <= progress.episode ? ' done' : '') + (i === progress.episode ? ' cur' : '');
      dots.appendChild(d);
    }
  }
}

let userId = null;
let progress = { season: 1, episode: 1, streak: 0, last_active: null, language: null, level: null };

async function loadProgress(uid){
  const { data, error } = await supabase.from('progress').select('*').eq('user_id', uid).maybeSingle();
  if (data) progress = { ...progress, ...data };
  return data;
}

async function touchStreak(){
  const today = new Date().toISOString().slice(0,10);
  if (progress.last_active === today){
    // already counted today
  } else {
    const y = new Date(); y.setDate(y.getDate()-1);
    const yesterday = y.toISOString().slice(0,10);
    progress.streak = (progress.last_active === yesterday) ? (progress.streak || 0) + 1 : 1;
    progress.last_active = today;
  }
  document.getElementById('streakChip').style.display = 'inline-flex';
  document.getElementById('streakCount').textContent = progress.streak;
  await saveProgress();
}

async function saveProgress(){
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
  document.getElementById('chatScreen').style.display = 'none';
  document.getElementById('pickScreen').style.display = 'flex';
  document.getElementById('chatLog').innerHTML = '';
  chatHistory = [];
  pickedLang = null; pickedLevel = null;
  renderPickers();
}

let appEntered = false;
async function enterApp(email, uid){
  if(appEntered) return;
  appEntered = true;
  document.getElementById('appScreen').style.display = 'flex';
  document.getElementById('userLabel').textContent = email;
  userId = uid;
  await loadProgress(uid);
  // Source de vérité de l'abonnement : la base (renseignée par le webhook InflowPay)
  try{
    const active = progress.premium === true && (!progress.premium_until || new Date(progress.premium_until) > new Date());
    if(active) localStorage.setItem('sunami-premium','1'); else localStorage.removeItem('sunami-premium');
  }catch(e){}
  await touchStreak();
  updateXpChip();
  updateHeartsChip();

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

/* Garde d'accès : app réservée aux connectés, sinon retour à la landing */
window.addEventListener('DOMContentLoaded', async ()=>{
  const { data } = await supabase.auth.getSession();
  if(data.session){ enterApp(data.session.user.email, data.session.user.id); }
  else { window.location.replace('/'); }
});
supabase.auth.onAuthStateChange((event, session)=>{
  if(session){ enterApp(session.user.email, session.user.id); }
  else if(event === 'SIGNED_OUT'){ window.location.replace('/'); }
});

/* ---------- CHAT / AI SCENE ---------- */
let chatHistory = [];

function addMsg(type, html){
  const log = document.getElementById('chatLog');
  const div = document.createElement('div');
  div.className = 'msg ' + type;
  div.innerHTML = html;
  if(type.indexOf('character') !== -1 && ('speechSynthesis' in window)){
    const txt = div.textContent.trim();
    const spk = document.createElement('button');
    spk.className = 'speak-btn'; spk.type = 'button';
    spk.setAttribute('aria-label', 'Écouter la réplique'); spk.title = 'Écouter';
    spk.textContent = '🔊';
    spk.onclick = () => speak(txt, spk);
    div.appendChild(spk);
    if(settings.autoplay) speak(txt, spk);
  }
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}

async function callAI(userReply){
  const sendBtn = document.getElementById('sendBtn');
  sendBtn.disabled = true;
  const loadingEl = addMsg('loading', '···');

  try{
    const res = await fetch('/api/generate', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ history: chatHistory, userReply, language: pickedLang, level: pickedLevel, season: progress.season, episode: progress.episode })
    });
    const data = await res.json();
    loadingEl.remove();

    if(data.error){
      addMsg('feedback wrong', 'Erreur: ' + data.error);
      sendBtn.disabled = false;
      return;
    }

    if(data.character_name){
      const el = document.getElementById('sceneCharName'); if(el) el.textContent = data.character_name;
    }
    if(data.scene_title){
      const el = document.querySelector('#chatScreen .scene-meta span'); if(el) el.textContent = data.scene_title;
    }

    if(userReply){
      chatHistory.push({ role:'user', content:userReply });
      if(data.correct){ addXp(10); episodeXp += 10; }
      else { loseHeart(); }
      addMsg('feedback ' + (data.correct ? 'right' : 'wrong'), (data.correct ? '✓ ' : '✕ ') + data.feedback);
    }
    chatHistory.push({ role:'assistant', content: JSON.stringify(data) });
    addMsg('character', '<b>' + data.character_line + '</b>');

    if(data.scene_done){
      progress.episode += 1;
      if (progress.episode > 5){ progress.episode = 1; progress.season += 1; }
      saveProgress();
      updateSceneMeta();
      bumpEpisodesToday();
      episodeXp += 50; addXp(50);
      celebrate(episodeXp);
      document.getElementById('userInput').disabled = true;
      sendBtn.disabled = true;
    } else if(!isPremium() && getHearts() <= 0){
      addMsg('feedback wrong', '💔 Plus de cœurs — reviens demain ou passe à Super.');
      document.getElementById('userInput').disabled = true;
      sendBtn.disabled = true;
      window.openPaywall('hearts');
    } else {
      sendBtn.disabled = false;
    }
  }catch(err){
    loadingEl.remove();
    addMsg('feedback wrong', 'Erreur réseau: ' + err.message);
    sendBtn.disabled = false;
  }
}

function startScene(){
  episodeXp = 0;
  if(!isPremium() && episodesTodayCount() >= FREE_EPISODES_PER_DAY){ window.openPaywall('episodes'); return; }
  if(!isPremium() && getHearts() <= 0){ window.openPaywall('hearts'); return; }
  const input = document.getElementById('userInput');
  if(input) input.disabled = false;
  callAI(null);
}

function sendReply(){
  const input = document.getElementById('userInput');
  const val = input.value.trim();
  if(!val) return;
  addMsg('user', val);
  input.value = '';
  callAI(val);
}
window.sendReply = sendReply;

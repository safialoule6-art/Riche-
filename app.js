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
  updateStatsPanel();
  const em = document.getElementById('setEmail');
  const lbl = document.getElementById('userLabel');
  if(em && lbl) em.textContent = lbl.textContent ? ('Connecté : ' + lbl.textContent) : '';
  // Premium badge
  const badge = document.getElementById('planBadge');
  const unsub = document.getElementById('unsubBtn');
  if(badge){
    if(isPremium()){
      badge.style.display = 'block';
      badge.innerHTML = '<span style="background:var(--wave);color:#fff;padding:4px 12px;border-radius:99px;font-weight:800;font-size:13px;">💎 ' + progress.plan.toUpperCase() + '</span><br><small style="color:var(--muted);">Merci de soutenir Sunami !</small>';
    } else {
      badge.style.display = 'block';
      badge.innerHTML = '<span style="color:var(--muted);font-size:13px;">🌊 Offre Gratuit</span> · <a href="/pricing" style="color:var(--wave);font-weight:700;font-size:13px;">Passer Premium →</a>';
    }
  }
  if(unsub) unsub.style.display = isPremium() ? 'block' : 'none';
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
  stats = { words: [], chapters: 0, dayKey: null, chaptersToday: 0, goalHitDay: null };
  localStorage.removeItem('sunami-stats');
  try{ await saveProgress(); }catch(e){}
  location.reload();
};
window.shareProgress = async function(){
  track('share', { streak: progress.streak || 0, xp: xp });
  const txt = `🌊 Streak de ${progress.streak || 0} jour(s), ${xp} XP et ${stats.words.length} mots appris sur Sunami — j'apprends une langue en vivant une histoire !`;
  const url = 'https://sunami-rho.vercel.app';
  try{
    if(navigator.share){ await navigator.share({ title:'Sunami', text:txt, url }); }
    else {
      await navigator.clipboard.writeText(txt + ' ' + url);
      const b = document.getElementById('shareBtn'); if(b){ const o = b.textContent; b.textContent = '✓ Copié dans le presse-papiers !'; setTimeout(()=>b.textContent = o, 1800); }
    }
  }catch(e){}
};

/* ===== VOCABULARY LIBRARY ===== */
window.openVocabLibrary = function(){
  const modal = document.getElementById('vocabModal');
  const list = document.getElementById('vocabList');
  const total = document.getElementById('vocabTotal');
  const review = document.getElementById('vocabReview');
  if(!modal || !list) return;

  const words = [...stats.words].sort((a,b) => (b.lastSeen || '').localeCompare(a.lastSeen || ''));
  total.textContent = words.length + ' mot' + (words.length !== 1 ? 's' : '');
  const due = words.filter(w => w.nextReview <= todayKey()).length;
  review.textContent = due + ' à réviser aujourd\'hui';

  if(words.length === 0){
    list.innerHTML = '<div class="vocab-empty">Aucun mot appris. Lis ton premier chapitre !</div>';
  } else {
    list.innerHTML = words.map(w => {
      const isDue = w.nextReview <= todayKey();
      const lastSeen = w.lastSeen ? ' · vu le ' + w.lastSeen.split('-').reverse().join('/') : '';
      const reviewInfo = ' · prochaine révision ' + w.nextReview.split('-').reverse().join('/');
      return `<div class="vocab-word${isDue ? ' due' : ''}">
        <span class="vocab-word-text">${w.word}</span>
        <span class="vocab-word-meta">${isDue ? '🔁 À réviser' + lastSeen : '✅' + reviewInfo}</span>
      </div>`;
    }).join('');
  }

  modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
};

window.closeVocabLibrary = function(){
  const m = document.getElementById('vocabModal');
  if(m){ m.classList.remove('open'); m.setAttribute('aria-hidden','true'); }
};

/* ===== DAILY NOTIFICATION ===== */
function requestNotificationPermission(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'default'){
    Notification.requestPermission();
  }
}

function scheduleDailyReminder(){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  // Schedule a reminder for ~18h if not already scheduled
  const now = new Date();
  const reminder = new Date();
  reminder.setHours(18, 0, 0, 0);
  if(now > reminder) reminder.setDate(reminder.getDate() + 1);
  const delay = reminder.getTime() - now.getTime();
  setTimeout(() => {
    new Notification('Sunami 🌊', {
      body: 'Ton épisode du jour t\'attend ! Reviens continuer ton histoire.',
      icon: '/icon-192.png',
      tag: 'sunami-daily'
    });
    // Schedule next day
    scheduleDailyReminder();
  }, delay);
}

// Ask for notification permission on first app open
setTimeout(() => {
  requestNotificationPermission();
  scheduleDailyReminder();
}, 5000);

document.addEventListener('keydown', e => { if(e.key === 'Escape'){ window.closeSettings(); window.closeCelebration && window.closeCelebration(); window.closeVocabLibrary && window.closeVocabLibrary(); } });
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
  const after = levelOf(xp);
  if(after > before){
    track('level_up', { level: after });
    setTimeout(() => celebrate({
      emoji: '⭐', title: 'Niveau ' + after + ' atteint !',
      sub: 'Tu maîtrises de plus en plus la langue. Continue sur ta lancée !'
    }), 500);
  }
}

/* ===== TRACKING (GA4 + TikTok via /analytics.js) ===== */
function track(event, params){ try{ if(window.sunamiTrack) window.sunamiTrack(event, params || {}); }catch(e){} }

/* ===== PROGRESSION : mots appris, chapitres, objectif du jour ===== */
const DAILY_GOAL = 3;
// stats.words = [{ word, firstSeen, lastSeen, reviewCount, nextReview }, ...]
let stats = { words: [], chapters: 0, dayKey: null, chaptersToday: 0, goalHitDay: null };
try{
  const saved = JSON.parse(localStorage.getItem('sunami-stats') || '{}');
  stats = { words: [], chapters: 0, dayKey: null, chaptersToday: 0, goalHitDay: null, ...saved };
  // Migrate old format (array of strings) to new format (array of objects)
  if(stats.words.length > 0 && typeof stats.words[0] === 'string'){
    stats.words = stats.words.map(w => ({ word: w, firstSeen: todayKey(), lastSeen: todayKey(), reviewCount: 0, nextReview: todayKey() }));
  }
}catch(e){}
if(!Array.isArray(stats.words)) stats.words = [];

function todayKey(){ return new Date().toISOString().slice(0,10); }
function saveStats(){ localStorage.setItem('sunami-stats', JSON.stringify(stats)); }
function rollDay(){
  const t = todayKey();
  if(stats.dayKey !== t){ stats.dayKey = t; stats.chaptersToday = 0; saveStats(); }
}
function extractVocab(text){
  const out = []; const re = /\*\*(.+?)\*\*/g; let m;
  while((m = re.exec(text))){
    const w = m[1].replace(/\([^)]*\)/g, '').replace(/[*]/g, '').trim().toLowerCase();
    if(w && w.length <= 40) out.push(w);
  }
  return out;
}
function updateProgressChips(){
  const wc = document.getElementById('wordsCount');
  const chip = document.getElementById('wordsChip');
  if(wc) wc.textContent = stats.words.length;
  if(chip) chip.style.display = stats.words.length > 0 ? 'inline-flex' : 'none';
}

// Spaced repetition: returns words due for review today
function getWordsForReview(maxWords = 5){
  const today = todayKey();
  const due = stats.words
    .filter(w => w.nextReview <= today)
    .sort((a,b) => a.reviewCount - b.reviewCount) // prioritize less-reviewed words
    .slice(0, maxWords);
  return due.map(w => w.word);
}

// Spaced repetition: update review schedule after a word is used
function markWordReviewed(word){
  const today = todayKey();
  const entry = stats.words.find(w => w.word === word);
  if(!entry){
    stats.words.push({ word, firstSeen: today, lastSeen: today, reviewCount: 1, nextReview: shiftDay(today, 1) });
  } else {
    entry.lastSeen = today;
    entry.reviewCount = (entry.reviewCount || 0) + 1;
    // Spaced intervals: 1, 3, 7, 14, 30 days
    const intervals = [1, 3, 7, 14, 30];
    const idx = Math.min(entry.reviewCount - 1, intervals.length - 1);
    entry.nextReview = shiftDay(today, intervals[idx]);
  }
  saveStats();
}

function shiftDay(dateStr, days){
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}
function updateStatsPanel(){
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  rollDay();
  set('statWords', stats.words.length);
  set('statChapters', stats.chapters);
  set('statStreak', progress.streak || 0);
  set('statLevel', levelOf(xp));
  const done = Math.min(stats.chaptersToday, DAILY_GOAL);
  set('dailyGoalPct', done + ' / ' + DAILY_GOAL);
  const fill = document.getElementById('dailyGoalFill');
  if(fill) fill.style.width = (done / DAILY_GOAL * 100) + '%';
  const note = document.getElementById('dailyGoalNote');
  if(note) note.textContent = stats.chaptersToday >= DAILY_GOAL
    ? '✅ Objectif du jour atteint — bravo, reviens demain !'
    : 'Lis ' + (DAILY_GOAL - stats.chaptersToday) + ' chapitre(s) de plus pour valider ton objectif.';
}
function registerChapter(fullText){
  rollDay();
  stats.chapters += 1;
  stats.chaptersToday += 1;
  const before = stats.words.length;
  const newWords = extractVocab(fullText);
  newWords.forEach(w => {
    if(!stats.words.find(x => x.word === w)){
      stats.words.push({ word: w, firstSeen: todayKey(), lastSeen: todayKey(), reviewCount: 0, nextReview: todayKey() });
    } else {
      // Word already known — update its review schedule
      markWordReviewed(w);
    }
  });
  const gained = stats.words.length - before;
  saveStats();
  updateProgressChips();
  track('chapter_complete', { chapter: stats.chapters, new_words: gained });
  if(gained > 0){
    const chip = document.getElementById('wordsChip');
    if(chip){ chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
  }
  if(stats.chaptersToday === DAILY_GOAL && stats.goalHitDay !== stats.dayKey){
    stats.goalHitDay = stats.dayKey; saveStats();
    track('daily_goal', { day: stats.dayKey });
    setTimeout(() => celebrate({
      emoji: '🎯', title: 'Objectif du jour atteint !',
      sub: 'Tu as lu tes ' + DAILY_GOAL + ' chapitres du jour. Reviens demain pour garder le rythme.'
    }), 600);
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
  set('celXp', xp); set('celWords', stats.words.length); set('celStreak', progress.streak || 0); set('celLvl', levelOf(xp));
  const m = document.getElementById('celModal');
  if(m){ m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); }
  fireConfetti();
}
window.closeCelebration = function(){
  const m = document.getElementById('celModal');
  if(m){ m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }
  const box = document.getElementById('confetti'); if(box) box.innerHTML = '';
};

/* ===== PREMIUM ===== */
function isPremium(){ return progress.plan === 'premium' || progress.plan === 'pro'; }
function isPro(){ return progress.plan === 'pro'; }
function dailyEpisodesLeft(){
  if(isPremium()) return Infinity;
  const today = todayKey();
  const key = 'sunami-episodes-' + today;
  const used = parseInt(localStorage.getItem(key) || '0', 10);
  return Math.max(0, 2 - used);
}
function useDailyEpisode(){
  if(isPremium()) return true;
  const today = todayKey();
  const key = 'sunami-episodes-' + today;
  const used = parseInt(localStorage.getItem(key) || '0', 10);
  if(used >= 2) return false;
  localStorage.setItem(key, String(used + 1));
  return true;
}

window.unsubscribe = async function(){
  if(!confirm('Résilier ton abonnement ? Ta progression est sauvegardée. Tu repasses en gratuit.')) return;
  try{
    progress.plan = 'free';
    await saveProgress();
    alert('Abonnement résilié. Tu es maintenant en offre Gratuit.');
    window.closeSettings();
    location.reload();
  }catch(e){ alert('Erreur. Contacte ahmedyas09020@gmail.com'); }
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
let progress = { season: 1, episode: 1, streak: 0, last_active: null, language: null, level: null, plan: 'free' }; // plan: free | premium | pro

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
    track('streak_milestone', { streak: progress.streak });
    setTimeout(() => celebrate({
      emoji: '🔥', title: progress.streak + ' jours de série !',
      sub: 'Quelle régularité ! Reviens demain pour ne pas briser ta flamme.'
    }), 900);
  }
}

async function saveProgress(){
  await supabase.from('progress').upsert({
    user_id: userId,
    season: progress.season,
    episode: progress.episode,
    streak: progress.streak,
    last_active: progress.last_active,
    language: progress.language,
    level: progress.level,
    plan: progress.plan || 'free'
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
async function enterApp(email, uid){
  if(appEntered) return;
  appEntered = true;
  document.getElementById('appScreen').style.display = 'flex';
  document.getElementById('userLabel').textContent = email;
  userId = uid;
  await loadProgress(uid);
  await touchStreak();
  updateXpChip();
  updateProgressChips();
  track('app_open');

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

/* Garde d'accès : app réservée aux connectés */
window.addEventListener('DOMContentLoaded', async ()=>{
  const { data } = await supabase.auth.getSession();
  if(data.session){ enterApp(data.session.user.email, data.session.user.id); }
  else { window.location.replace('/'); }

  // Service Worker pour mode hors-ligne
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});
supabase.auth.onAuthStateChange((event, session)=>{
  if(session){ enterApp(session.user.email, session.user.id); }
  else if(event === 'SIGNED_OUT'){ window.location.replace('/'); }
});

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

/* Feedback encourageant du conteur (récompense variable, ton de tuteur) */
const PRAISE = [
  "Belle réponse ! ✨", "Bravo, continue comme ça ! 👏", "Super, l'histoire avance 🌊",
  "Joli, on progresse ! 🌟", "Impeccable 💪", "Excellent réflexe ! 🚀", "Bien vu ! 🙌"
];
function addFeedback(){
  const log = document.getElementById('chatLog');
  const div = document.createElement('div');
  div.className = 'msg feedback right';
  div.textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
  log.appendChild(div);
  scrollChat();
}

function escapeHtml(s){ return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function setMascotColor(color){
  const av = document.getElementById('sceneAvatar');
  if(!av) return;
  av.classList.remove('mascot-yellow','mascot-red');
  if(color === 'yellow') av.classList.add('mascot-yellow');
  if(color === 'red') av.classList.add('mascot-red');
}
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
  setMascotColor('green');

  // Indicateur "le conteur écrit…"
  const loadingEl = document.createElement('div');
  loadingEl.className = 'loading rich';
  loadingEl.setAttribute('aria-label', 'Le conteur écrit');
  loadingEl.innerHTML = '<span class="tdot"></span><span class="tdot"></span><span class="tdot"></span>';
  document.getElementById('chatLog').appendChild(loadingEl);
  scrollChat();

  // Timeout simple sur la requête complète
  const clientCtrl = new AbortController();
  const clientTimeoutId = setTimeout(() => clientCtrl.abort(), 25000);

  try{
    const res = await fetch('/api/generate', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ history: chatHistory, userReply, language: pickedLang, level: pickedLevel, theme: pickedTheme, vocabulary: getWordsForReview(5) }),
      signal: clientCtrl.signal,
    });
    clearTimeout(clientTimeoutId);

    if(res.status === 429){
      loadingEl.remove();
      if(sceneCard) sceneCard.classList.remove('thinking');
      setMascotColor('red');
      addMsg('feedback wrong', '⏳ Trop de demandes d\u2019un coup — patiente ~30 secondes puis réessaie.');
      sendBtn.disabled = false; input.disabled = false;
      return;
    }

    const data = await res.json().catch(() => ({}));

    if(!res.ok || data.error){
      loadingEl.remove();
      if(sceneCard) sceneCard.classList.remove('thinking');
      setMascotColor('red');
      addMsg('feedback wrong', 'Erreur : ' + (data.error || ('HTTP ' + res.status)));
      sendBtn.disabled = false; input.disabled = false;
      return;
    }

    const fullText = data.text || '';
    const grammar = data.grammar || null;
    loadingEl.remove();

    if(!fullText.trim()){
      if(sceneCard) sceneCard.classList.remove('thinking');
      setMascotColor('red');
      addMsg('feedback wrong', 'Le conteur n\u2019a rien répondu — réessaie.');
      sendBtn.disabled = false; input.disabled = false;
      return;
    }

    if(userReply){
      chatHistory.push({ role:'user', content:userReply });
      addXp(8 + Math.floor(Math.random()*7));
      addFeedback();
      track('reply_sent', { language: pickedLang, level: pickedLevel });
    }

    // Bulle du conteur avec animation machine à écrire simulée
    const bubble = document.createElement('div');
    bubble.className = 'msg character streaming';
    const span = document.createElement('span');
    const cursor = document.createElement('span');
    cursor.className = 'stream-cursor';
    bubble.appendChild(span);
    bubble.appendChild(cursor);
    document.getElementById('chatLog').appendChild(bubble);
    if(sceneCard){ sceneCard.classList.remove('thinking'); sceneCard.classList.add('speaking'); }

    // Animation machine à écrire : affiche le texte progressivement
    await typewriter(span, fullText);

    bubble.classList.remove('streaming');
    bubble.innerHTML = formatStory(fullText);
    const speech = cleanForSpeech(fullText);
    addSpeaker(bubble, speech);
    chatHistory.push({ role:'assistant', content: fullText });
    chapter += 1; updateSceneMeta();
    registerChapter(fullText);
    if(settings.autoplay) speak(speech);
    else if(sceneCard) sceneCard.classList.remove('speaking');

    // Afficher la correction grammaticale si présente
    if(grammar && userReply){
      const correctionEl = document.createElement('div');
      correctionEl.className = 'msg grammar-feedback';
      correctionEl.innerHTML = '<span class="grammar-icon">📝</span> ' + escapeHtml(grammar);
      document.getElementById('chatLog').appendChild(correctionEl);
      scrollChat();
      // Mascotte : jaune si erreurs, vert si parfait
      const isPerfect = /parfait|correcte?|bien|impeccable|bravo|aucune erreur/i.test(grammar);
      setMascotColor(isPerfect ? 'green' : 'yellow');
    } else if(userReply){
      setMascotColor('green');
    }

    sendBtn.disabled = false; input.disabled = false; input.focus();
    scrollChat();
  }catch(err){
    clearTimeout(clientTimeoutId);
    try{ loadingEl.remove(); }catch(_){}
    if(sceneCard) sceneCard.classList.remove('thinking','speaking');
    setMascotColor('red');
    console.error('[CLIENT] Erreur callAI — name=' + (err.name || '?') + ' message=' + (err.message || '?'));
    if(err.name === 'AbortError'){
      addMsg('feedback wrong', '⏱️ Le conteur met trop de temps à répondre, réessaie.');
    } else {
      addMsg('feedback wrong', 'Erreur réseau : ' + err.message);
    }
    sendBtn.disabled = false; input.disabled = false;
  }
}

// Simule l'effet d'écriture en direct (machine à écrire).
// Affiche le texte par blocs de ~3 caractères toutes les ~25ms.
function typewriter(span, fullText){
  return new Promise((resolve) => {
    const charsPerTick = 3;
    const tickMs = 25;
    let pos = 0;
    const total = fullText.length;
    const timer = setInterval(() => {
      pos += charsPerTick;
      if(pos >= total){
        span.innerHTML = formatStory(fullText);
        clearInterval(timer);
        scrollChat();
        resolve();
        return;
      }
      span.innerHTML = formatStory(fullText.slice(0, pos));
      scrollChat();
    }, tickMs);
  });
}

function startScene(){
  if(!useDailyEpisode()){
    addMsg('feedback wrong', '🎬 Tu as utilisé tes 2 épisodes gratuits du jour. Reviens demain ou passe Premium pour l\'illimité !');
    return;
  }
  chapter = 0;
  chatHistory = [];
  track('story_start', { language: pickedLang, level: pickedLevel, theme: pickedTheme || 'aucun' });
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
  if(!useDailyEpisode()){
    addMsg('feedback wrong', '🎬 Tu as utilisé tes 2 épisodes gratuits du jour. Reviens demain ou <a href="/pricing" style="color:var(--wave);">passe Premium</a> pour l\'illimité !');
    return;
  }
  addMsg('user', val);
  input.value = '';
  callAI(val);
}
window.sendReply = sendReply;

/* ===== VOICE INPUT (Web Speech Recognition, gratuit) ===== */
const SPEECH_LANG = {
  anglais:'en-US', espagnol:'es-ES', allemand:'de-DE', italien:'it-IT',
  arabe:'ar-SA', portugais:'pt-PT'
};
let recognition = null;
let isListening = false;

function initSpeechRecognition(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition) return null;
  const r = new SpeechRecognition();
  r.continuous = false;
  r.interimResults = true;
  r.lang = SPEECH_LANG[pickedLang] || 'en-US';
  return r;
}

window.toggleVoiceInput = function(){
  if(isListening){ stopListening(); return; }
  startListening();
};

function startListening(){
  recognition = initSpeechRecognition();
  if(!recognition){
    alert('La reconnaissance vocale n\'est pas supportée sur ce navigateur. Utilise Chrome ou Edge.');
    return;
  }
  const micBtn = document.getElementById('micBtn');
  const input = document.getElementById('userInput');
  isListening = true;
  micBtn.classList.add('listening');
  micBtn.textContent = '🔴';
  input.placeholder = '🎙️ Parle maintenant...';

  recognition.onresult = (event) => {
    let transcript = '';
    for(let i = event.resultIndex; i < event.results.length; i++){
      transcript += event.results[i][0].transcript;
    }
    input.value = transcript;
    if(event.results[0].isFinal){
      stopListening();
      // Auto-send after a short delay
      setTimeout(() => {
        if(input.value.trim()){
          sendReply();
        }
      }, 400);
    }
  };

  recognition.onerror = (event) => {
    console.error('[VOICE] Erreur — ' + event.error);
    stopListening();
  };

  recognition.onend = () => {
    if(isListening) stopListening();
  };

  try { recognition.start(); } catch(e) { stopListening(); }
}

function stopListening(){
  isListening = false;
  if(recognition){ try { recognition.stop(); } catch(e) {} }
  const micBtn = document.getElementById('micBtn');
  const input = document.getElementById('userInput');
  if(micBtn){ micBtn.classList.remove('listening'); micBtn.textContent = '🎤'; }
  if(input) input.placeholder = 'Réponds dans la langue cible...';
}

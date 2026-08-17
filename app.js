/* Sunami — application (écran connecté). Version gratuite, IA Groq en streaming.
   Accessible uniquement authentifié : sinon redirection vers la landing '/'. */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://cdtabuyomtkfasvugtck.supabase.co';
const supabaseKey = 'sb_publishable_ms6RPYdPVcO3c9A6X1ruQQ_uiYl1Dxo';
const supabase = createClient(supabaseUrl, supabaseKey);
window.supabase = supabase;

/* ===== PARAMÈTRES + SYNTHÈSE VOCALE ===== */
const LOCALES = { anglais:'en-US', espagnol:'es-ES', allemand:'de-DE', italien:'it-IT', arabe:'ar-SA', portugais:'pt-PT', francais:'fr-FR' };
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

if('speechSynthesis' in window){ try{ window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = ()=>{ try{ window.speechSynthesis.getVoices(); }catch(e){} for(const k in _voiceCache) delete _voiceCache[k]; }; }catch(e){} }

// Choisit la MEILLEURE voix dispo pour une langue : privilégie les voix
// naturelles/neurales (Google, Apple "Natural/Enhanced/Premium/Siri", Microsoft "Natural").
const _voiceCache = {};
function pickBestVoice(bcp47){
  const prefix = (bcp47 || 'en-US').slice(0,2).toLowerCase();
  if(_voiceCache[prefix]) return _voiceCache[prefix];
  let voices = [];
  try{ voices = window.speechSynthesis.getVoices() || []; }catch(e){ return null; }
  const sameLang = voices.filter(v => v.lang && v.lang.slice(0,2).toLowerCase() === prefix);
  if(!sameLang.length) return null;
  const PREMIUM = /natural|neural|google|enhanced|premium|siri|wavenet/i;
  const exact = sameLang.filter(v => v.lang.toLowerCase() === bcp47.toLowerCase());
  const best = exact.find(v => PREMIUM.test(v.name))
            || sameLang.find(v => PREMIUM.test(v.name))
            || exact[0]
            || sameLang[0];
  if(best) _voiceCache[prefix] = best;
  return best;
}

function speak(text, btn){
  if(!('speechSynthesis' in window) || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LOCALES[pickedLang] || 'en-US';
  u.rate = settings.rate;
  const v = pickBestVoice(u.lang);
  if(v){ u.voice = v; u.lang = v.lang || u.lang; }
  if(btn){ u.onstart = ()=>btn.classList.add('speaking'); u.onend = u.onerror = ()=>btn.classList.remove('speaking'); }
  const sc = document.getElementById('sceneBanner');
  const prevStart = u.onstart, prevEnd = u.onend;
  u.onstart = (e)=>{ if(sc) sc.classList.add('speaking'); if(prevStart) prevStart(e); };
  u.onend = u.onerror = (e)=>{ if(sc) sc.classList.remove('speaking'); if(prevEnd) prevEnd(e); };
  window.speechSynthesis.speak(u);
}

window.openSettings = function(){
  applySettings();
  updateStatsPanel();
  renderAchievements();
  renderCharacters();
  renderStoryMap();
  loadReferralStats().then(()=>renderReferral());
  const em = document.getElementById('setEmail');
  const lbl = document.getElementById('userLabel');
  if(em && lbl) em.textContent = lbl.textContent ? ('Connecté : ' + lbl.textContent) : '';
  // Premium badge
  const badge = document.getElementById('planBadge');
  const billing = document.getElementById('billingSection');
  if(badge){
    if(isDevAccount()){
      badge.style.display = 'block';
      badge.innerHTML = '<span style="background:linear-gradient(135deg,#2dd4bf,#14b8a6);color:#fff;padding:4px 12px;border-radius:99px;font-weight:800;font-size:13px;">💎 DEV</span><br><small style="color:var(--muted);">Accès complet — compte développeur</small>';
    } else if(isPremium()){
      badge.style.display = 'block';
      badge.innerHTML = '<span style="background:var(--wave);color:#fff;padding:4px 12px;border-radius:99px;font-weight:800;font-size:13px;">💎 ' + progress.plan.toUpperCase() + '</span><br><small style="color:var(--muted);">Merci de soutenir Sunami !</small>';
    } else {
      badge.style.display = 'block';
      badge.innerHTML = '<span style="color:var(--muted);font-size:13px;">🌊 Offre Wave</span> · <a href="/pricing" style="color:var(--wave);font-weight:700;font-size:13px;">Passer à Sigma →</a>';
    }
  }
  if(billing) billing.style.display = isPremium() ? 'block' : 'none';
  const m = document.getElementById('settingsModal');
  m.classList.add('open'); m.setAttribute('aria-hidden','false');
};
window.closeSettings = function(){
  const m = document.getElementById('settingsModal');
  m.classList.remove('open'); m.setAttribute('aria-hidden','true');
};

window.toggleSidebar = function(){
  const s = document.getElementById('sidebar');
  const b = document.getElementById('sidebarBackdrop');
  if(!s || !b) return;
  const open = !s.classList.contains('open');
  s.classList.toggle('open', open);
  b.classList.toggle('open', open);
  if(open) document.body.style.overflow = 'hidden';
  else document.body.style.overflow = '';
};

window.scrollToChat = function(){
  const log = document.getElementById('chatLog');
  if(log) log.scrollTop = log.scrollHeight;
};
window.setAutoplay = function(el){ settings.autoplay = el.checked; saveSettings(); };
window.setRate = function(el){ settings.rate = parseFloat(el.value); document.getElementById('setRateVal').textContent = settings.rate.toFixed(1) + '×'; saveSettings(); };
window.setFont = function(f){ settings.font = f; saveSettings(); applySettings(); };
window.resetProgress = async function(){
  if(!confirm('Réinitialiser toute ta progression (streak, XP, langue, histoire) ? Cette action est irréversible.')) return;
  progress = { season:1, episode:1, streak:0, last_active:null, language:null, level:null };
  xp = 0; localStorage.setItem('sunami-xp', '0');
  stats = { words: [], chapters: 0, dayKey: null, chaptersToday: 0, goalHitDay: null };
  localStorage.removeItem('sunami-stats');
  characters = []; storyLocations = []; unlockedAchievements = []; sagaEpisodes = [];
  localStorage.removeItem('sunami-characters'); localStorage.removeItem('sunami-locations'); localStorage.removeItem('sunami-achievements'); localStorage.removeItem('sunami-saga-episodes');
  sagaRecap = ''; sagaSetting = ''; chatHistory = [];
  try{ await saveProgress(); }catch(e){}
  // Efface aussi la persistance cloud (sinon elle reviendrait au rechargement)
  try{ if(userId){ await supabase.from('user_state').delete().eq('user_id', userId); await supabase.from('saga').delete().eq('user_id', userId); } }catch(e){}
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
        <span class="vocab-word-text">${w.word}${w.fr ? ' <small style="color:var(--muted);font-weight:600;">— ' + w.fr + '</small>' : ''}</span>
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

/* ===== MODE RÉVISION (flashcards + répétition espacée) ===== */
function markWordForgotten(word){
  const today = todayKey();
  const entry = stats.words.find(w => w.word === word);
  if(entry){ entry.lastSeen = today; entry.reviewCount = 1; entry.nextReview = shiftDay(today, 1); saveStats(); }
}
function dueWordsCount(){ const t = todayKey(); return stats.words.filter(w => (w.nextReview||t) <= t).length; }
// Affiche/masque le rappel "N mots à réviser" sur l'écran d'histoire
function updateReviewNudge(){
  const el = document.getElementById('reviewNudge'); if(!el) return;
  const n = dueWordsCount();
  if(n > 0){ el.textContent = '🔁 ' + n + ' mot' + (n>1?'s':'') + ' à réviser'; el.style.display = 'inline-flex'; }
  else { el.style.display = 'none'; }
}
function getDueWordObjects(max = 20){
  const t = todayKey();
  return stats.words
    .filter(w => (w.nextReview||t) <= t)
    .sort((a,b) => (a.reviewCount||0) - (b.reviewCount||0))
    .slice(0, max);
}

let _rev = { queue: [], idx: 0, known: 0, practice: false };
window.openVocabReview = function(practice){
  const words = practice ? [...stats.words].sort((a,b)=>(b.lastSeen||'').localeCompare(a.lastSeen||'')).slice(0,12) : getDueWordObjects(20);
  _rev = { queue: words, idx: 0, known: 0, practice: !!practice };
  const modal = document.getElementById('reviewModal');
  if(!modal) return;
  modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
  if(!words.length){ showReviewDone(true); return; }
  document.getElementById('reviewBody').style.display = 'block';
  document.getElementById('reviewDone').style.display = 'none';
  renderReviewCard();
};
function renderReviewCard(){
  const w = _rev.queue[_rev.idx];
  if(!w){ showReviewDone(false); return; }
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent = v; };
  set('reviewProgress', (_rev.idx + 1) + ' / ' + _rev.queue.length);
  set('fcWord', w.word);
  const ans = document.getElementById('fcAnswer');
  ans.textContent = w.fr ? w.fr : '(traduction à deviner — note-toi honnêtement)';
  ans.style.display = 'none';
  document.getElementById('fcHint').style.display = 'block';
  document.getElementById('revealBtn').style.display = 'block';
  document.getElementById('reviewActions').style.display = 'none';
}
window.flipReviewCard = function(){
  const ans = document.getElementById('fcAnswer');
  if(!ans || ans.style.display === 'block') return;
  ans.style.display = 'block';
  document.getElementById('fcHint').style.display = 'none';
  document.getElementById('revealBtn').style.display = 'none';
  document.getElementById('reviewActions').style.display = 'flex';
};
window.rateReviewCard = function(known){
  const w = _rev.queue[_rev.idx];
  if(w){
    if(known){ markWordReviewed(w.word); _rev.known++; if(!_rev.practice){ addXp(3); } }
    else { markWordForgotten(w.word); }
  }
  _rev.idx++;
  if(_rev.idx >= _rev.queue.length){ showReviewDone(false); }
  else { renderReviewCard(); }
};
function showReviewDone(nothingDue){
  document.getElementById('reviewBody').style.display = 'none';
  const done = document.getElementById('reviewDone');
  done.style.display = 'block';
  const remaining = dueWordsCount();
  if(nothingDue){
    done.innerHTML = '<div class="review-done-emoji">🎉</div><h3>Tout est à jour !</h3>' +
      '<p>Aucun mot à réviser aujourd\'hui. Reviens demain pour ancrer ton vocabulaire.</p>' +
      (stats.words.length ? '<button class="btn ghost" onclick="openVocabReview(true)">S\'entraîner quand même</button>' : '') +
      '<button class="btn" onclick="closeVocabReview()">Continuer l\'histoire</button>';
  } else {
    done.innerHTML = '<div class="review-done-emoji">✅</div><h3>Révision terminée</h3>' +
      '<p>' + _rev.known + ' / ' + _rev.queue.length + ' mots su' + (_rev.known>1?'s':'') + '.' +
      (remaining>0 ? ' Encore ' + remaining + ' à revoir.' : ' Plus rien pour aujourd\'hui 🎉') + '</p>' +
      (remaining>0 ? '<button class="btn" onclick="openVocabReview(false)">Continuer la révision</button>' : '') +
      '<button class="btn ghost" onclick="closeVocabReview()">Fermer</button>';
  }
}
window.closeVocabReview = function(){
  const m = document.getElementById('reviewModal');
  if(m){ m.classList.remove('open'); m.setAttribute('aria-hidden','true'); }
  updateProgressChips();
};
// Raccourcis clavier pendant la révision (desktop) : Espace = révéler, 1 = à revoir, 2 = je savais
document.addEventListener('keydown', (e)=>{
  const m = document.getElementById('reviewModal');
  if(!m || !m.classList.contains('open')) return;
  const actions = document.getElementById('reviewActions');
  const revealed = actions && actions.style.display === 'flex';
  if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); if(!revealed) flipReviewCard(); }
  else if(revealed && e.key === '1'){ rateReviewCard(false); }
  else if(revealed && e.key === '2'){ rateReviewCard(true); }
});

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
  if(typeof syncCloud === 'function') syncCloud();
  const chip = document.getElementById('xpChip');
  if(chip){ chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
  floatXp(n);
  const after = levelOf(xp);
  if(after > before){
    track('level_up', { level: after });
    if(window.SFX) SFX.play('levelup');
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

function todayKey(){ const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function saveStats(){ localStorage.setItem('sunami-stats', JSON.stringify(stats)); if(typeof syncCloud === 'function') syncCloud(); }
function rollDay(){
  const t = todayKey();
  if(stats.dayKey !== t){ stats.dayKey = t; stats.chaptersToday = 0; saveStats(); }
}
// Renvoie le lundi (clé) de la semaine d'une date
function mondayKey(dateStr){
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const day = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0,10);
}
// Réinitialise les compteurs hebdomadaires au changement de semaine (baseline lundi)
function rollWeek(){
  const wk = mondayKey();
  if(stats.weekKey !== wk){
    stats.weekKey = wk;
    stats.chaptersWeek = 0;
    stats.xpWeekStart = xp;
    stats.wordsWeekStart = stats.words.length;
    saveStats();
  }
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
  updateReviewNudge();
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
  rollWeek();
  stats.chapters += 1;
  stats.chaptersToday += 1;
  stats.chaptersWeek = (stats.chaptersWeek || 0) + 1;
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
  // "Previously on" — sauvegarde les 2 premières phrases pour le prochain épisode
  const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if(sentences.length >= 2){
    localStorage.setItem('sunami_prev', sentences.slice(0,2).join('. ') + '.');
  }
  // Détection personnages et lieux
  detectCharacter(fullText);
  detectLocation(fullText);
  // Track langues et thèmes
  if(!stats.languagesUsed) stats.languagesUsed = [];
  if(pickedLang && !stats.languagesUsed.includes(pickedLang)){ stats.languagesUsed.push(pickedLang); }
  if(!stats.themesUsed) stats.themesUsed = [];
  if(pickedTheme && !stats.themesUsed.includes(pickedTheme)){ stats.themesUsed.push(pickedTheme); }
  saveStats();
  updateProgressChips();
  checkAchievements();
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
function celebrate({ emoji = '🎉', title = 'Bravo !', sub = '', cover = '', coverTools = false }){
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set('celEmoji', emoji); set('celTitle', title); set('celSub', sub);
  set('celXp', xp); set('celWords', stats.words.length); set('celStreak', progress.streak || 0); set('celLvl', levelOf(xp));
  const cov = document.getElementById('celCover');
  if(cov){
    if(cover){ cov.src = cover; cov.style.display = 'block'; }
    else { cov.style.display = 'none'; cov.removeAttribute('src'); }
  }
  const tools = document.getElementById('celCoverTools');
  if(tools){
    tools.style.display = (cover && coverTools) ? 'block' : 'none';
    if(cover && coverTools) renderCoverStyleChips();
  }
  const m = document.getElementById('celModal');
  if(m){ m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); }
  fireConfetti();
}
window.closeCelebration = function(){
  const m = document.getElementById('celModal');
  if(m){ m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }
  const box = document.getElementById('confetti'); if(box) box.innerHTML = '';
};

/* ===== BILAN HEBDOMADAIRE — preuve de progrès (mots appris + niveau qui monte) =====
   Métriques honnêtes : mots/chapitres/XP de la semaine (baseline lundi),
   mots révisés via la répétition espacée, et niveau CECR estimé à partir du
   vocabulaire actif. */
const CEFR_STEPS = [['A1',0],['A2',30],['B1',90],['B2',200],['C1',400],['C2',700]];
function vocabScore(){
  const mastered = stats.words.filter(w => (w.reviewCount||0) >= 3).length;
  const seen = stats.words.length - mastered;
  return Math.round(mastered * 1 + seen * 0.35);
}
function estimateCEFR(score){
  let idx = 0;
  for(let i=0;i<CEFR_STEPS.length;i++){ if(score >= CEFR_STEPS[i][1]) idx = i; }
  const base = CEFR_STEPS[idx][1];
  const next = CEFR_STEPS[idx+1] || null;
  const pct = next ? Math.min(100, Math.round((score - base) / (next[1] - base) * 100)) : 100;
  return { label: CEFR_STEPS[idx][0], idx, next: next ? next[0] : null, pct };
}
function computeWeeklyReport(){
  rollWeek();
  const weekAgo = shiftDay(todayKey(), -7);
  const reviewed = stats.words.filter(w => w.lastSeen && w.lastSeen > weekAgo && (w.reviewCount||0) > 0).length;
  const newWords = Math.max(0, stats.words.length - (stats.wordsWeekStart || 0));
  const xpWeek = Math.max(0, xp - (stats.xpWeekStart || 0));
  return {
    newWords,
    reviewed,
    chapters: stats.chaptersWeek || 0,
    xpWeek,
    totalWords: stats.words.length,
    mastered: stats.words.filter(w => (w.reviewCount||0) >= 3).length,
    streak: progress.streak || 0,
    level: levelOf(xp),
    cefr: estimateCEFR(vocabScore()),
  };
}
window.openWeeklyReport = function(){
  const r = computeWeeklyReport();
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set('repNewWords', r.newWords);
  set('repReviewed', r.reviewed);
  set('repChapters', r.chapters);
  set('repXp', r.xpWeek);
  set('repCefr', r.cefr.label);
  const fill = document.getElementById('repCefrFill');
  if(fill) fill.style.width = r.cefr.pct + '%';
  // Niveau qui monte : compare au dernier niveau vu
  const prevSeen = stats.cefrSeen || 'A1';
  const prevIdx = CEFR_STEPS.findIndex(s => s[0] === prevSeen);
  const roseUp = r.cefr.idx > (prevIdx < 0 ? 0 : prevIdx);
  const note = document.getElementById('repCefrNote');
  if(note){
    if(roseUp) note.textContent = `▲ Tu es passé de ${prevSeen} à ${r.cefr.label} — bravo !`;
    else if(r.cefr.next) note.textContent = `Plus que ${100 - r.cefr.pct}% de vocabulaire actif pour viser ${r.cefr.next}.`;
    else note.textContent = 'Niveau maximal estimé atteint. Continue à entretenir ton vocabulaire !';
  }
  const foot = document.getElementById('repFoot');
  if(foot){
    foot.textContent = r.newWords + r.chapters > 0
      ? 'Ta régularité paie. Un nouvel épisode t\'attend pour continuer sur ta lancée.'
      : 'Lance un épisode cette semaine pour faire grimper ton niveau estimé.';
  }
  const total = document.getElementById('repTotal');
  if(total) total.textContent = `Total : ${r.totalWords} mots · ${r.mastered} maîtrisés · série ${r.streak} 🔥 · niveau ${r.level}`;
  // Mémorise le niveau vu (pour la flèche "tu es passé de X à Y")
  stats.cefrSeen = r.cefr.label; saveStats();
  const m = document.getElementById('reportModal');
  if(m){ m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); }
};
window.closeWeeklyReport = function(){
  const m = document.getElementById('reportModal');
  if(m){ m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }
};
// Auto-affichage une fois par semaine si l'utilisateur a de l'activité
function maybeShowWeeklyReport(){
  try{
    if(stats.chapters < 1 || stats.words.length < 3) return;
    const shownKey = localStorage.getItem('sunami-weekly-shown');
    if(shownKey === mondayKey()) return;
    // Ne pas gêner l'onboarding ou une autre modale ouverte
    if(document.querySelector('.modal.open')) return;
    if(document.getElementById('onboarding') && document.getElementById('onboarding').classList.contains('open')) return;
    localStorage.setItem('sunami-weekly-shown', mondayKey());
    openWeeklyReport();
  }catch(e){}
}

/* ===== SUCCÈS (ACHIEVEMENTS) ===== */
const ACHIEVEMENTS = [
  { id:'first_word', emoji:'📖', name:'Premier mot', desc:'Apprends ton premier mot de vocabulaire', tier:'free' },
  { id:'first_chapter', emoji:'📕', name:'Premier épisode', desc:'Termine ton premier chapitre', tier:'free' },
  { id:'streak_3', emoji:'🔥', name:'3 jours', desc:'Garde ta série 3 jours', tier:'free' },
  { id:'streak_7', emoji:'🔥', name:'7 jours', desc:'Garde ta série 7 jours', tier:'premium' },
  { id:'streak_30', emoji:'💎', name:'30 jours', desc:'Garde ta série 30 jours', tier:'pro' },
  { id:'words_50', emoji:'📚', name:'50 mots', desc:'Apprends 50 mots', tier:'free' },
  { id:'words_100', emoji:'📚', name:'100 mots', desc:'Apprends 100 mots', tier:'premium' },
  { id:'words_500', emoji:'🏆', name:'500 mots', desc:'Apprends 500 mots', tier:'pro' },
  { id:'xp_100', emoji:'⭐', name:'100 XP', desc:'Gagne 100 XP', tier:'free' },
  { id:'xp_1000', emoji:'🌟', name:'1000 XP', desc:'Gagne 1000 XP', tier:'premium' },
  { id:'polyglot', emoji:'🌍', name:'Polyglotte', desc:'Essaie 3 langues différentes', tier:'premium' },
  { id:'writer', emoji:'✍️', name:'Écrivain', desc:'10 réponses parfaites', tier:'premium' },
  { id:'nightowl', emoji:'🦉', name:'Noctambule', desc:'Utilise le mode sombre', tier:'free' },
  { id:'explorer', emoji:'🗺️', name:'Explorateur', desc:'Explore 5 thèmes différents', tier:'pro' },
  { id:'chapter_10', emoji:'📖', name:'10 épisodes', desc:'Termine 10 chapitres', tier:'premium' },
];
let unlockedAchievements = [];
try{ unlockedAchievements = JSON.parse(localStorage.getItem('sunami-achievements') || '[]'); }catch(e){}

function unlockAchievement(id){
  if(unlockedAchievements.includes(id)) return;
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if(!ach) return;
  unlockedAchievements.push(id);
  localStorage.setItem('sunami-achievements', JSON.stringify(unlockedAchievements));
  if(typeof syncCloud === 'function') syncCloud();
  // Petite célébration légère
  const m = document.getElementById('celModal');
  if(!m || m.classList.contains('open')) return; // pas de popup si déjà une célébration
  celebrate({ emoji:ach.emoji, title:'Succès débloqué !', sub:ach.name + ' — ' + ach.desc });
}

function checkAchievements(){
  if(stats.words.length >= 1) unlockAchievement('first_word');
  if(stats.words.length >= 50) unlockAchievement('words_50');
  if(stats.words.length >= 100) unlockAchievement('words_100');
  if(stats.words.length >= 500) unlockAchievement('words_500');
  if(stats.chapters >= 1) unlockAchievement('first_chapter');
  if(stats.chapters >= 10) unlockAchievement('chapter_10');
  if(xp >= 100) unlockAchievement('xp_100');
  if(xp >= 1000) unlockAchievement('xp_1000');
  if((progress.streak || 0) >= 3) unlockAchievement('streak_3');
  if((progress.streak || 0) >= 7) unlockAchievement('streak_7');
  if((progress.streak || 0) >= 30) unlockAchievement('streak_30');
  if(document.documentElement.getAttribute('data-theme') === 'dark') unlockAchievement('nightowl');
  // perfectCount + languagesCount tracked via stats extensions
  if((stats.perfectCount || 0) >= 10) unlockAchievement('writer');
  if((stats.languagesUsed || []).length >= 3) unlockAchievement('polyglot');
  if((stats.themesUsed || []).length >= 5) unlockAchievement('explorer');
}

function renderAchievements(){
  const container = document.getElementById('achievementsList');
  if(!container) return;
  container.innerHTML = ACHIEVEMENTS.map(a => {
    const unlocked = unlockedAchievements.includes(a.id);
    const locked = !unlocked && (a.tier === 'premium' && !isPremium()) || (a.tier === 'pro' && !isPro());
    return '<div class="ach-badge' + (unlocked ? ' ach-unlocked' : '') + (locked ? ' ach-locked' : '') + '">' +
      '<span class="ach-emoji">' + a.emoji + '</span>' +
      '<div><b>' + a.name + '</b><small>' + (unlocked ? '✓ ' + a.desc : (locked ? '🔒 ' + a.tier.toUpperCase() : a.desc)) + '</small></div>' +
    '</div>';
  }).join('');
}

/* ===== FICHES PERSONNAGES ===== */
let characters = [];
try{ characters = JSON.parse(localStorage.getItem('sunami-characters') || '[]'); }catch(e){}
function detectCharacter(text){
  const namePatterns = [
    /\b(Madame|Monsieur|M\.|Mme)\s+([A-Z][a-zàâäéèêëîïôöùûüç]+)/g,
    /\b(Dr|Professeur|Capitaine|Chef|Sergent)\s+([A-Z][a-zàâäéèêëîïôöùûüç]+)/g,
    /\b([A-Z][a-zàâäéèêëîïôöùûüç]+)\b/g
  ];
  const found = [];
  namePatterns.forEach(pat => {
    let m;
    while((m = pat.exec(text))){
      const name = m[2] || m[1];
      if(name && name.length > 2 && !['Vous','Tu','Bonjour','Comment','Pourquoi','Quand','Où'].includes(name)){
        found.push(name);
      }
    }
  });
  found.forEach(name => {
    if(!characters.find(c => c.name === name)){
      characters.push({ name, role:'Personnage rencontré', chapter: stats.chapters, firstSeen: todayKey() });
    }
  });
  if(characters.length > 10) characters = characters.slice(-10);
  localStorage.setItem('sunami-characters', JSON.stringify(characters));
}

function renderCharacters(){
  const container = document.getElementById('charactersList');
  if(!container) return;
  if(characters.length === 0){
    container.innerHTML = '<div class="ach-empty">Aucun personnage rencontré. Continue l\'histoire !</div>';
    return;
  }
  container.innerHTML = characters.map(c => {
    const portrait = charPortraitUrl(c.name, c.role);
    const fb = c.name.charAt(0).toUpperCase();
    return '<div class="char-card">' +
      '<div class="char-avatar"><img src="' + portrait + '" loading="lazy" alt="" onerror="this.remove();this.parentNode.textContent=\'' + fb + '\';"></div>' +
      '<div><b>' + c.name + '</b><small>' + c.role + ' · Chapitre ' + c.chapter + '</small></div>' +
    '</div>';
  }).join('');
}

/* ===== CARTE DE L'HISTOIRE (Pro) ===== */
let storyLocations = [];
try{ storyLocations = JSON.parse(localStorage.getItem('sunami-locations') || '[]'); }catch(e){}
function detectLocation(text){
  const locPatterns = [
    /\b(à|au|en|dans|sur|vers)\s+(le|la|l'|les)?\s*([A-Z][a-zàâäéèêëîïôöùûüç]+)/g,
  ];
  locPatterns.forEach(pat => {
    let m;
    while((m = pat.exec(text))){
      const loc = m[3];
      if(loc && loc.length > 3 && !['Vous','Bonjour','Comment','Pourquoi','Quand','Où','Cette','Cette'].includes(loc)){
        if(!storyLocations.find(l => l.name === loc)){
          storyLocations.push({ name:loc, chapter:stats.chapters, emoji:'📍' });
        }
      }
    }
  });
  if(storyLocations.length > 10) storyLocations = storyLocations.slice(-10);
  localStorage.setItem('sunami-locations', JSON.stringify(storyLocations));
}

/* ===== Journal des épisodes joués (pour la carte interactive) ===== */
let sagaEpisodes = [];
try{ sagaEpisodes = JSON.parse(localStorage.getItem('sunami-saga-episodes') || '[]'); }catch(e){}
function saveEpisodesLog(){ try{ localStorage.setItem('sunami-saga-episodes', JSON.stringify(sagaEpisodes.slice(-50))); }catch(e){} }
function logCompletedEpisode(ep, title){
  const entry = { ep, title: (title || '').trim(), setting: sagaSetting || '', recap: sagaRecap || '' };
  const i = sagaEpisodes.findIndex(e => e.ep === ep);
  if(i >= 0) sagaEpisodes[i] = entry; else sagaEpisodes.push(entry);
  saveEpisodesLog();
}

/* Carte de l'histoire : parcours d'épisodes cliquable, base sur les vraies donnees */
function renderStoryMap(){
  const container = document.getElementById('storyMapContainer');
  if(!container) return;
  if(!isPro()){ container.innerHTML = '<div class="ach-empty">🔒 Carte interactive — disponible en offre Pro</div>'; return; }
  const cur = progress.episode || 1;
  const byEp = {}; sagaEpisodes.forEach(e => { byEp[e.ep] = e; });
  const nodes = [];
  for(let ep = 1; ep < cur; ep++){
    const info = byEp[ep] || {};
    nodes.push({ ep, state:'done', title: info.title || ('Épisode ' + ep), setting: info.setting || '', recap: info.recap || '' });
  }
  nodes.push({ ep: cur, state:'current',
    title: sagaTitle ? (sagaTitle + ' — Ép. ' + cur) : ('Épisode ' + cur),
    setting: sagaSetting || '', recap: sagaRecap || '', chapters: Math.min(chapter || 0, 5) });
  nodes.push({ ep: cur + 1, state:'locked', title:'Épisode ' + (cur + 1), setting:'', recap:'' });

  container.innerHTML = '<div class="emap">' + nodes.map(n => {
    const icon = n.state === 'done' ? '✓' : (n.state === 'current' ? '🌊' : '🔒');
    const metaTxt = n.state === 'locked' ? 'À venir'
      : (n.setting ? '📍 ' + escapeHtml(n.setting) : (n.state === 'current' ? 'En cours' : 'Terminé'));
    const clickable = n.state !== 'locked';
    let detail = '';
    if(clickable){
      const chaps = n.state === 'current' ? '<div class="emap-chaps">Chapitre ' + (n.chapters || 0) + '/5</div>' : '';
      const body = n.recap ? '<p>' + escapeHtml(n.recap) + '</p>' : '<p class="emap-empty">Pas encore de résumé pour cet épisode.</p>';
      detail = '<div class="emap-detail" id="emap-d-' + n.ep + '">' + chaps + body + '</div>';
    }
    return '<div class="emap-node ' + n.state + '">' +
      '<div class="emap-row"' + (clickable ? ' role="button" tabindex="0" onclick="toggleEpisodeDetail(' + n.ep + ')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();toggleEpisodeDetail(' + n.ep + ');}"' : '') + '>' +
        '<div class="emap-dot">' + icon + '</div>' +
        '<div class="emap-info"><b>' + escapeHtml(n.title) + '</b><small>' + metaTxt + '</small></div>' +
        (clickable ? '<span class="emap-caret">▾</span>' : '') +
      '</div>' + detail +
    '</div>';
  }).join('') + '</div>';
}
window.toggleEpisodeDetail = function(ep){
  const d = document.getElementById('emap-d-' + ep);
  if(!d) return;
  const open = d.classList.toggle('open');
  const node = d.closest('.emap-node');
  if(node) node.classList.toggle('expanded', open);
};

/* ===== PREMIUM ===== */
function isPremium(){ return progress.plan === 'premium' || progress.plan === 'pro' || isDevAccount(); }
function isPro(){ return progress.plan === 'pro' || isDevAccount(); }
function isDevAccount(){ return userEmail === 'ahmedyas09020@gmail.com'; }
function dailyEpisodesLeft(){
  if(isPremium()) return Infinity;
  const today = todayKey();
  const key = 'sunami-episodes-' + (userId||'anon') + '-' + today;
  const used = parseInt(localStorage.getItem(key) || '0', 10);
  return Math.max(0, 2 - used);
}
function useDailyEpisode(){
  if(isPremium()) return true;
  const today = todayKey();
  const key = 'sunami-episodes-' + (userId||'anon') + '-' + today;
  const used = parseInt(localStorage.getItem(key) || '0', 10);
  return used < 2;
}
function consumeDailyEpisode(){
  if(isPremium()) return;
  const today = todayKey();
  const key = 'sunami-episodes-' + (userId||'anon') + '-' + today;
  const used = parseInt(localStorage.getItem(key) || '0', 10);
  localStorage.setItem(key, String(used + 1));
}

window.cancelSubscription = async function(){
  if(!confirm('Annuler ton abonnement ? Tu restes Premium jusqu\'à la fin du mois. Ta progression est sauvegardée.')) return;
  try{
    progress.plan = 'free';
    progress.planExpires = new Date(Date.now() + 30*24*3600*1000).toISOString();
    await saveProgress();
    alert('Abonnement annulé. Tu restes Sigma jusqu\'à la fin du mois, puis tu repasseras en Wave.');
    window.closeSettings();
    location.reload();
  }catch(e){ alert('Erreur. Contacte ahmedyas09020@gmail.com'); }
};

window.requestRefund = async function(){
  if(!confirm('Demander un remboursement intégral ? Traité sous 3-5 jours.')) return;
  try{
    const res = await fetch('/api/refund', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: userEmail || 'inconnu', reason: 'Remboursement demandé depuis les paramètres' })
    });
    const data = await res.json();
    if(data.success){
      alert('✅ ' + data.message);
    } else {
      alert('📧 Demande envoyée à ahmedyas09020@gmail.com. Remboursement sous 3-5 jours.');
    }
  }catch(e){
    alert('📧 Demande envoyée à ahmedyas09020@gmail.com. Remboursement sous 3-5 jours.');
  }
  window.closeSettings();
};

window.logout = async function(){
  window.closeSettings && window.closeSettings();
  appEntered = false;
  if('speechSynthesis' in window) window.speechSynthesis.cancel();
  await supabase.auth.signOut();
  window.location.replace('/');
};

/* ===== ADMIN PANEL (dev only) ===== */
window.openAdminPanel = function(){
  if(!isDevAccount()) return;
  const m = document.getElementById('adminModal');
  m.classList.add('open'); m.setAttribute('aria-hidden','false');
  loadAdminData();
};
window.closeAdminPanel = function(){
  const m = document.getElementById('adminModal');
  m.classList.remove('open'); m.setAttribute('aria-hidden','true');
};

async function loadAdminData(){
  const refundsEl = document.getElementById('adminRefunds');
  const statsEl = document.getElementById('adminStats');
  if(!refundsEl) return;

  try{
    const { data: refunds } = await supabase
      .from('refund_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if(refunds && refunds.length > 0){
      refundsEl.innerHTML = refunds.map(r =>
        '<div style="padding:8px;border-bottom:1px solid var(--card-border);font-size:12px;">' +
        '<b>' + r.email + '</b><br>' +
        '<span style="color:var(--muted);">' + new Date(r.created_at).toLocaleDateString('fr') + ' · ' + (r.status || 'pending') + '</span>' +
        '</div>'
      ).join('');
    } else {
      refundsEl.innerHTML = '<div class="ach-empty">Aucune demande</div>';
    }

    // Stats
    const { count } = await supabase
      .from('refund_requests')
      .select('id', { count: 'exact', head: true });
    statsEl.innerHTML = '<div style="display:flex;gap:8px;">' +
      '<div class="ref-stat"><b>' + count + '</b><span>demandes</span></div>' +
      '<div class="ref-stat"><b>' + (stats.words.length || 0) + '</b><span>mots appris</span></div>' +
      '<div class="ref-stat"><b>' + (stats.chapters || 0) + '</b><span>chapitres</span></div>' +
    '</div>';
  }catch(e){
    refundsEl.innerHTML = '<div class="ach-empty">Erreur de chargement</div>';
  }
}

// Show notification bell for dev account
function showDevNotif(){
  const btn = document.getElementById('notifBtn');
  if(!btn || !isDevAccount()) return;
  btn.style.display = 'inline-flex';
  // Check pending refunds
  supabase.from('refund_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    .then(({ count }) => {
      const badge = document.getElementById('notifBadge');
      if(badge && count > 0){ badge.style.display = 'block'; badge.textContent = count; }
    }).catch(()=>{});
}

/* ===== PARRAINAGE ===== */
let referralCode = localStorage.getItem('sunami_ref_code') || '';
let referralStats = { total: 0, pending: 0, converted: 0 };

async function loadReferralCode(){
  const { data } = await supabase.auth.getSession();
  if(!data.session) return;
  const userId = data.session.user.id;
  try{
    const res = await fetch('/api/referral', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'generate', userId })
    });
    const d = await res.json();
    if(d.code){
      referralCode = d.code;
      localStorage.setItem('sunami_ref_code', d.code);
    }
  }catch(e){}
}

async function loadReferralStats(){
  const { data } = await supabase.auth.getSession();
  if(!data.session) return;
  try{
    const res = await fetch('/api/referral', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'stats', userId: data.session.user.id })
    });
    referralStats = await res.json();
  }catch(e){}
}

async function claimReferral(){
  const ref = localStorage.getItem('sunami_ref');
  if(!ref) return;
  const { data } = await supabase.auth.getSession();
  if(!data.session) return;
  try{
    await fetch('/api/referral', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'claim', userId: data.session.user.id, referralCode: ref })
    });
    localStorage.removeItem('sunami_ref');
  }catch(e){}
}

window.copyReferralLink = function(){
  const link = 'https://sunami-rho.vercel.app?ref=' + referralCode;
  navigator.clipboard.writeText(link).then(() => {
    const b = document.getElementById('copyRefBtn');
    if(b){ b.textContent = '✓ Copié !'; setTimeout(()=>b.textContent = '📋 Copier mon lien', 2000); }
  });
};

function renderReferral(){
  const el = document.getElementById('referralInfo');
  if(!el) return;
  if(!referralCode){
    el.innerHTML = '<div class="ach-empty">Connecte-toi pour générer ton lien de parrainage.</div>';
    return;
  }
  const link = 'https://sunami-rho.vercel.app?ref=' + referralCode;
  el.innerHTML = 
    '<div class="ref-stats">' +
      '<div class="ref-stat"><b>' + (referralStats.total || 0) + '</b><span>filleuls</span></div>' +
      '<div class="ref-stat"><b>' + (referralStats.converted || 0) + '</b><span>convertis</span></div>' +
      '<div class="ref-stat"><b>+50</b><span>XP/filleul</span></div>' +
    '</div>' +
    '<div class="ref-link-box">' +
      '<code>' + link + '</code>' +
      '<button class="btn small" id="copyRefBtn" onclick="copyReferralLink()">📋 Copier mon lien</button>' +
    '</div>' +
    '<p class="ref-note">Partage ton lien. Quand quelqu\'un s\'inscrit avec, tu gagnes +50 XP. S\'il passe Premium, tu reçois 1 mois offert.</p>';
}

const LANGUAGES = [
  {code:'anglais', label:'Anglais', flag:'🇬🇧'},
  {code:'espagnol', label:'Espagnol', flag:'🇪🇸'},
  {code:'allemand', label:'Allemand', flag:'🇩🇪'},
  {code:'italien', label:'Italien', flag:'🇮🇹'},
  {code:'arabe', label:'Arabe', flag:'🇸🇦'},
  {code:'portugais', label:'Portugais', flag:'🇵🇹'},
  {code:'francais', label:'Français', flag:'🇫🇷'},
];
const LEVELS = [
  {code:'A1-A2 (débutant)', label:'Débutant', sub:'A1 · A2'},
  {code:'B1-B2 (intermédiaire)', label:'Intermédiaire', sub:'B1 · B2'},
  {code:'C1-C2 (avancé)', label:'Avancé', sub:'C1 · C2'},
];
const THEMES = [
  {code:'cyberpunk', label:'Cyberpunk · Tokyo', emoji:'🌃'},
  {code:'polar', label:'Enquête · Londres', emoji:'🕵️'},
  {code:'fantasy', label:'Fantasy · forêt magique', emoji:'🧙'},
  {code:'espace', label:'Espace · science-fiction', emoji:'🚀'},
  {code:'voyage', label:'Voyage · road trip', emoji:'✈️'},
  {code:'romance', label:'Romance', emoji:'💛'},
  {code:'mystere', label:'Manoir · mystère', emoji:'🕯️'},
  {code:'quotidien', label:'Quotidien · café', emoji:'☕'},
];
let pickedLang = null, pickedLevel = null;
let pickedTheme = localStorage.getItem('sunami-theme-ctx') || null;
let pickedUniverse = localStorage.getItem('sunami-universe-ctx') || '';
let chapter = 0;
let episodeConsumed = false;

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
        else {
          c.classList.add('active'); pickedTheme = t.code; localStorage.setItem('sunami-theme-ctx', t.code);
          pickedUniverse = ''; localStorage.removeItem('sunami-universe-ctx');
          const ci = document.getElementById('customUniverse'); if(ci) ci.value = '';
        }
        checkReady();
      };
      themeGrid.appendChild(c);
    });
  }
  const custom = document.getElementById('customUniverse');
  if(custom){
    custom.value = pickedUniverse || '';
    custom.oninput = ()=>{
      pickedUniverse = custom.value.trim();
      if(pickedUniverse){
        localStorage.setItem('sunami-universe-ctx', pickedUniverse);
        pickedTheme = null; localStorage.removeItem('sunami-theme-ctx');
        document.querySelectorAll('#themeGrid .pick-card').forEach(x=>x.classList.remove('active'));
      } else {
        localStorage.removeItem('sunami-universe-ctx');
      }
      checkReady();
    };
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
  resumeOrStart();
};

function updateSceneMeta(){
  const langLabel = (LANGUAGES.find(l=>l.code===pickedLang)?.label) || pickedLang || '';
  const levelLabel = (LEVELS.find(l=>l.code===pickedLevel)?.label) || pickedLevel || '';
  const tag = document.getElementById('sceneTag');
  if(tag){
    const chap = chapter > 0 ? ` · CHAPITRE ${chapter}` : '';
    tag.textContent = `${langLabel.toUpperCase()} · NIVEAU ${levelLabel.toUpperCase()}${chap}`;
  }
  const nameEl = document.getElementById('sceneCharName');
  if(nameEl) nameEl.textContent = sagaTitle ? sagaTitle : 'Ton conteur';
  const setEl = document.getElementById('sceneSetting');
  if(setEl) setEl.textContent = sagaSetting ? sagaSetting.replace(/\*\*/g, '') : "l'histoire s'écrit en direct…";
  updateSceneBanner();
}

let userId = null;
let userEmail = null;
let progress = { season: 1, episode: 1, streak: 0, last_active: null, language: null, level: null, plan: 'free' }; // plan: free | premium | pro

async function loadProgress(uid){
  const { data } = await supabase.from('progress').select('*').eq('user_id', uid).maybeSingle();
  if (data) progress = { ...progress, ...data };
  return data;
}

async function touchStreak(){
  const today = new Date().toISOString().slice(0,10);
  let increased = false;
  let restDay = false;
  if (progress.last_active !== today){
    const y = new Date(); y.setDate(y.getDate()-1);
    const yesterday = y.toISOString().slice(0,10);
    const y2 = new Date(); y2.setDate(y2.getDate()-2);
    const dayBefore = y2.toISOString().slice(0,10);
    if(progress.last_active === yesterday){
      progress.streak = (progress.streak || 0) + 1;
    } else if(progress.last_active === dayBefore && (progress.streak || 0) > 0){
      // Gamification bienveillante : un seul jour manqué NE casse PAS la série (jour de repos).
      progress.streak = (progress.streak || 0) + 1;
      restDay = true;
    } else {
      progress.streak = 1;
    }
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
      sub: 'Quelle régularité ! Et si tu sautes un jour, pas de stress : tu as droit à un jour de repos. 🌿'
    }), 900);
  } else if(restDay){
    setTimeout(() => celebrate({
      emoji: '🌿', title: 'Jour de repos pris en compte',
      sub: 'Tu as sauté un jour ? Pas de panique : ta série continue. Ce qui compte, c\'est de revenir — pas la perfection.'
    }), 600);
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

/* ===================================================================
   PERSISTANCE CLOUD — saga (histoire + récap) & état joueur durable.
   Corrige : histoire "au hasard" (récap glissant persistant) + tout
   ce qui s'effaçait à la déconnexion (XP, vocab, perso, succès).
   Tout est GUARDÉ : si les tables ne sont pas encore créées, on
   retombe silencieusement sur localStorage (aucune régression).
   =================================================================== */
let sagaRecap = '';
let sagaTitle = '';
let sagaCover = '';
let sagaCoverStyle = 'cinematic';
let coverSalt = 0;
let sagaSetting = '';
let sagaProtagonist = '';
let sagaCliffhanger = localStorage.getItem('sunami-cliffhanger') || '';
// Extrait un teaser de suspense (1-2 dernières phrases, nettoyé) pour la relance du lendemain
function cliffhangerFrom(text){
  const clean = String(text||'').replace(/\*\*/g,'').replace(/\([^)]*\)/g,'').replace(/\s+/g,' ').trim();
  const parts = clean.split(/(?<=[.!?…])\s+/).filter(s => s.trim().length > 4);
  return parts.slice(-2).join(' ').trim().slice(0, 160);
}
let _syncTimer = null;

async function pullCloud(){
  if(!userId) return;
  try{
    const { data, error } = await supabase.from('user_state').select('*').eq('user_id', userId).maybeSingle();
    if(error || !data) return; // table absente / RLS / vide : on garde le cache local
    if(typeof data.xp === 'number' && data.xp >= xp){ xp = data.xp; localStorage.setItem('sunami-xp', String(xp)); }
    if(Array.isArray(data.words) && data.words.length >= (stats.words||[]).length){ stats.words = data.words; }
    if(Array.isArray(data.characters) && data.characters.length){ characters = data.characters; localStorage.setItem('sunami-characters', JSON.stringify(characters)); }
    if(Array.isArray(data.locations) && data.locations.length){ storyLocations = data.locations; localStorage.setItem('sunami-locations', JSON.stringify(storyLocations)); }
    if(Array.isArray(data.achievements) && data.achievements.length >= unlockedAchievements.length){ unlockedAchievements = data.achievements; localStorage.setItem('sunami-achievements', JSON.stringify(unlockedAchievements)); }
    if(data.stats && typeof data.stats === 'object'){ stats = { ...stats, ...data.stats, words: stats.words }; }
    localStorage.setItem('sunami-stats', JSON.stringify(stats));
    updateXpChip(); updateProgressChips();
  }catch(e){}
}

function syncCloud(){
  if(!userId) return;
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(async ()=>{
    try{
      await supabase.from('user_state').upsert({
        user_id: userId, xp,
        words: stats.words || [],
        characters: characters || [],
        locations: storyLocations || [],
        achievements: unlockedAchievements || [],
        stats: { chapters: stats.chapters||0, perfectCount: stats.perfectCount||0, languagesUsed: stats.languagesUsed||[], themesUsed: stats.themesUsed||[], dayKey: stats.dayKey, chaptersToday: stats.chaptersToday||0, goalHitDay: stats.goalHitDay },
        updated_at: new Date().toISOString(),
      });
    }catch(e){}
  }, 800);
}
window.syncCloud = syncCloud;

async function loadSaga(lang){
  if(!userId || !lang) return null;
  try{
    const { data, error } = await supabase.from('saga').select('*').eq('user_id', userId).eq('language', lang).maybeSingle();
    if(error) return null;
    return data || null;
  }catch(e){ return null; }
}

function saveSaga(){
  if(!userId || !pickedLang) return;
  clearTimeout(saveSaga._t);
  saveSaga._t = setTimeout(async ()=>{
    const base = {
      user_id: userId,
      language: pickedLang,
      level: pickedLevel,
      protagonist: sagaProtagonist || null,
      setting: sagaSetting || null,
      recap: sagaRecap || '',
      characters: characters || [],
      episode: progress.episode || 1,
      chapter: chapter || 0,
      history: (chatHistory || []).slice(-24),
      updated_at: new Date().toISOString(),
    };
    const full = { ...base, title: sagaTitle || null, cover: sagaCover || null, cover_style: sagaCoverStyle || null, cliffhanger: sagaCliffhanger || null };
    try{
      const { error } = await supabase.from('saga').upsert(full);
      if(error){ await supabase.from('saga').upsert(base); } // colonnes title/cover pas encore migrées
    }catch(e){ try{ await supabase.from('saga').upsert(base); }catch(_){} }
  }, 600);
}

/* Fusion des données structurées renvoyées par le moteur IA */
function mergeStructuredVocab(vocab){
  if(!Array.isArray(vocab)) return;
  const today = todayKey();
  vocab.forEach(v=>{
    if(!v || !v.word) return;
    const w = String(v.word).replace(/\*/g,'').trim().toLowerCase();
    if(!w || w.length > 40) return;
    const existing = stats.words.find(x=>x.word === w);
    if(!existing){ stats.words.push({ word:w, fr: v.fr||'', firstSeen:today, lastSeen:today, reviewCount:0, nextReview:today }); }
    else if(v.fr && !existing.fr){ existing.fr = v.fr; }
  });
  saveStats(); updateProgressChips();
}
function mergeStructuredCharacters(chars){
  if(!Array.isArray(chars)) return;
  chars.forEach(c=>{
    if(!c || !c.name) return;
    const name = String(c.name).trim();
    if(name.length < 2) return;
    const found = characters.find(x=>x.name === name);
    if(!found){ characters.push({ name, role: c.role || 'Personnage', chapter: stats.chapters, firstSeen: todayKey() }); }
    else if(c.role){ found.role = c.role; }
  });
  if(characters.length > 14) characters = characters.slice(-14);
  localStorage.setItem('sunami-characters', JSON.stringify(characters));
}

/* Suggestions de réponse cliquables (réduit la page blanche) */
function renderChoices(choices){
  document.querySelectorAll('.quick-chips').forEach(e=>e.remove());
  if(!Array.isArray(choices) || !choices.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'choice-list quick-chips';
  const label = document.createElement('div');
  label.className = 'choice-label';
  label.textContent = '💬 Choisis ta réponse — ou écris la tienne';
  wrap.appendChild(label);
  choices.forEach(txt=>{
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'choice-btn';
    b.innerHTML = '<span class="choice-arrow">➤</span><span>' + escapeHtml(txt) + '</span>';
    b.onclick = ()=>{ const input = document.getElementById('userInput'); if(input) input.value = txt; document.querySelectorAll('.quick-chips').forEach(e=>e.remove()); sendReply(); };
    wrap.appendChild(b);
  });
  document.getElementById('chatLog').appendChild(wrap);
  scrollChat();
}

/* Mini-question de comprehension (tap) : verifie que l'histoire a ete comprise.
   Non bloquant : feedback instantane + petit bonus d'XP si correct. */
function renderComprehension(quiz){
  document.querySelectorAll('.comp-card').forEach(e=>e.remove());
  if(!quiz || typeof quiz.q !== 'string' || !quiz.q.trim() || !Array.isArray(quiz.options) || quiz.options.length < 2) return;
  const answer = Number.isInteger(quiz.answer) && quiz.answer >= 0 && quiz.answer < quiz.options.length ? quiz.answer : 0;
  const card = document.createElement('div');
  card.className = 'comp-card';
  const q = document.createElement('div');
  q.className = 'comp-q'; q.innerHTML = '🧩 ' + escapeHtml(quiz.q);
  card.appendChild(q);
  const opts = document.createElement('div'); opts.className = 'comp-opts';
  let answered = false;
  quiz.options.forEach((txt, i)=>{
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'comp-opt'; b.textContent = txt;
    b.onclick = ()=>{
      if(answered) return; answered = true;
      const correct = i === answer;
      opts.querySelectorAll('.comp-opt').forEach((el, j)=>{
        el.disabled = true;
        if(j === answer) el.classList.add('right');
        else if(j === i) el.classList.add('wrong');
      });
      const fb = document.createElement('div');
      fb.className = 'comp-fb ' + (correct ? 'ok' : 'ko');
      fb.textContent = correct ? '✓ Bien vu !' : '✗ Presque — relis le passage.';
      card.appendChild(fb);
      if(correct){ try{ addXp(5); popXp(5); }catch(e){} if(window.SFX) SFX.play('correct'); }
      scrollChat();
    };
    opts.appendChild(b);
  });
  card.appendChild(opts);
  document.getElementById('chatLog').appendChild(card);
  scrollChat();
}

/* Fin d'épisode : on passe à l'épisode suivant, on célèbre, on sauvegarde */
function onEpisodeComplete(title){
  const finishedEp = progress.episode || 1;
  logCompletedEpisode(finishedEp, title);
  sagaCover = buildCover(finishedEp, sagaCoverStyle, coverSalt, false);
  appendEpisodeCover(title, finishedEp);
  progress.episode = finishedEp + 1;
  chapter = 0;
  saveProgress(); saveSaga();
  track('episode_complete', { episode: finishedEp, language: pickedLang });
  if(window.SFX) SFX.play('complete');
  playEpisodeTransition({ label: 'Fin de l\'épisode ' + finishedEp, title: title || 'À suivre…', cover: sagaCover }).then(() => {
    const teaser = sagaCliffhanger ? ('« ' + sagaCliffhanger + ' »') : '';
    celebrate({
      emoji: '🎬',
      title: title ? ('Épisode terminé — ' + title) : 'Épisode terminé !',
      sub: (teaser ? teaser + ' … ' : '') + 'À suivre. Reviens quand tu veux pour la suite — ton histoire t\'attend. 🌊',
      cover: sagaCover,
      coverTools: true
    });
    maybeOfferNotifications();
  });
}

/* Reprise exacte d'une saga sauvegardée */
function resumeScene(s){
  chatHistory = Array.isArray(s.history) ? s.history.slice() : [];
  sagaRecap = s.recap || '';
  sagaSetting = s.setting || '';
  sagaProtagonist = s.protagonist || '';
  sagaTitle = s.title || '';
  sagaCover = s.cover || '';
  sagaCoverStyle = s.cover_style || 'cinematic';
  coverSalt = 0;
  if(Array.isArray(s.characters) && s.characters.length) characters = s.characters;
  chapter = s.chapter || 0;
  progress.episode = s.episode || progress.episode || 1;
  episodeConsumed = true; // reprendre ne reconsomme pas un épisode
  const log = document.getElementById('chatLog');
  if(log) log.innerHTML = '';
  updateSceneMeta();
  const pb = document.getElementById('scenePrevBadge');
  if(pb) pb.style.display = sagaRecap ? 'inline-flex' : 'none';
  if(sagaRecap){
    const banner = document.createElement('div');
    banner.className = 'prev-banner';
    banner.innerHTML = '<div class="prev-label">📺 Previously on Sunami…</div>' + formatRecap(sagaRecap);
    if(log) log.appendChild(banner);
  }
  const lastAI = [...chatHistory].reverse().find(m => m.role === 'assistant');
  if(lastAI){ renderStoryMessage(lastAI.content, characters); }
  const input = document.getElementById('userInput');
  if(input){ input.disabled = false; input.focus(); }
  scrollChat();
}

/* Reprend la saga de la langue courante si elle existe, sinon en démarre une */
async function resumeOrStart(){
  const s = pickedLang ? await loadSaga(pickedLang) : null;
  if(s && Array.isArray(s.history) && s.history.length){ resumeScene(s); }
  else { startScene(); }
}

window.backToPicker = function(){
  if('speechSynthesis' in window) window.speechSynthesis.cancel();
  document.getElementById('chatScreen').style.display = 'none';
  const sg = document.getElementById('sagasScreen'); if(sg) sg.style.display = 'none';
  document.getElementById('pickScreen').style.display = 'flex';
  document.getElementById('chatLog').innerHTML = '';
  chatHistory = [];
  sagaRecap = ''; sagaSetting = ''; sagaTitle = ''; sagaCover = ''; coverSalt = 0;
  pickedLang = null; pickedLevel = null;
  renderPickers();
};

/* ===================================================================
   FEATURES : Nouvel épisode · Mes sagas · Cover d'épisode
   =================================================================== */
function showScreen(which){
  const map = { pick:'pickScreen', chat:'chatScreen', sagas:'sagasScreen' };
  Object.entries(map).forEach(([k,id])=>{
    const el = document.getElementById(id);
    if(el) el.style.display = (k === which) ? 'flex' : 'none';
  });
}

/* --- Covers d'épisode (Pollinations.ai, gratuit, déterministe par seed) --- */
const COVER_STYLES = [
  { id:'cinematic',  label:'🎬 Ciné',      prompt:'cinematic film poster, dramatic lighting, photorealistic, depth of field' },
  { id:'anime',      label:'🌸 Anime',     prompt:'anime key visual, studio ghibli inspired, vibrant colors, detailed background' },
  { id:'watercolor', label:'🎨 Aquarelle', prompt:'delicate watercolor illustration, soft washes, artistic, elegant' },
  { id:'comic',      label:'💥 BD',        prompt:'bold comic book cover art, ink lines, cel shading, dynamic' },
  { id:'storybook',  label:'📖 Conte',     prompt:'whimsical storybook illustration, warm cozy, painterly' },
  { id:'pixel',      label:'🕹️ Pixel',     prompt:'retro pixel art, 16-bit, richly detailed scene' },
];
function coverStylePrompt(id){ return (COVER_STYLES.find(s=>s.id===id) || COVER_STYLES[0]).prompt; }
function _seedFrom(str){ let h = 0; const s = String(str||''); for(let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i))>>>0; } return h % 1000000; }
/* portrait = affiche de série (Mes sagas) ; paysage = cover d'épisode dans le fil */
function coverUrl(desc, seed, styleId, portrait){
  const clean = String(desc||'').replace(/\*\*/g,'').replace(/\([^)]*\)/g,'').slice(0,180);
  const prompt = `${coverStylePrompt(styleId)}, ${clean}, rich vivid colors, highly detailed, no text, no words, no letters`;
  const dim = portrait ? 'width=512&height=768' : 'width=768&height=432';
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${dim}&nologo=true&seed=${seed}`;
}
function coverDesc(){ return sagaSetting || sagaTitle || ((LANGUAGES.find(l=>l.code===pickedLang)?.label || '') + ' adventure'); }
function buildCover(episodeNum, styleId, salt, portrait){
  const ep = episodeNum || progress.episode || 1;
  return coverUrl(coverDesc(), _seedFrom((pickedLang||'') + ':' + ep + ':' + (salt||0)), styleId || sagaCoverStyle, portrait);
}
function currentCoverUrl(episodeNum){ return buildCover(episodeNum, sagaCoverStyle, coverSalt, false); }

function appendEpisodeCover(title, episodeNum){
  const log = document.getElementById('chatLog');
  if(!log) return;
  document.querySelectorAll('.episode-cover').forEach(e=>e.remove());
  const card = document.createElement('div');
  card.className = 'episode-cover';
  card.id = 'lastEpisodeCover';
  const img = new Image();
  img.loading = 'lazy';
  img.alt = title || 'Couverture de l\'épisode';
  img.src = sagaCover || currentCoverUrl(episodeNum);
  card.appendChild(img);
  const cap = document.createElement('div');
  cap.className = 'episode-cover-cap';
  cap.innerHTML = '<small>Épisode ' + (episodeNum || progress.episode || 1) + ' · terminé</small>' + escapeHtml(title || 'À suivre…');
  card.appendChild(cap);
  log.appendChild(card);
  scrollChat();
}

/* Choix de style / régénération depuis la modale de célébration */
function renderCoverStyleChips(){
  const box = document.getElementById('celCoverStyles');
  if(!box) return;
  box.innerHTML = COVER_STYLES.map(s =>
    '<button type="button" class="cover-style-chip' + (s.id===sagaCoverStyle?' active':'') + '" onclick="setCoverStyle(\'' + s.id + '\')">' + s.label + '</button>'
  ).join('');
}
function refreshCoverImages(){
  const url = sagaCover;
  const cov = document.getElementById('celCover'); if(cov && url){ cov.src = url; }
  const last = document.querySelector('#lastEpisodeCover img'); if(last && url){ last.src = url; }
}
window.setCoverStyle = function(id){
  sagaCoverStyle = id; coverSalt = 0;
  sagaCover = buildCover(progress.episode || 1, sagaCoverStyle, coverSalt, false);
  renderCoverStyleChips(); refreshCoverImages(); saveSaga();
};
window.regenerateCover = function(){
  coverSalt = (coverSalt || 0) + 1;
  sagaCover = buildCover(progress.episode || 1, sagaCoverStyle, coverSalt, false);
  refreshCoverImages(); saveSaga();
};

/* --- Nouvel épisode : continue la MÊME saga (même intrigue/perso) --- */
window.newEpisode = function(){
  if(!pickedLang || !pickedLevel){ backToPicker(); return; }
  if(!useDailyEpisode()){
    addMsg('feedback wrong', '🎬 Tes 2 épisodes gratuits du jour sont terminés. Reviens demain, ou <a href="/pricing" style="color:var(--wave);font-weight:800;">passe Premium</a> pour l\'illimité !', true);
    return;
  }
  showScreen('chat');
  document.querySelectorAll('.quick-chips').forEach(e=>e.remove());
  chapter = 0;
  episodeConsumed = false;
  updateSceneMeta();
  const hasSaga = sagaRecap && chatHistory.length > 0;
  const ep = progress.episode || 1;
  const cover = sagaCover || currentCoverUrl(ep);
  playEpisodeTransition({ label: 'Épisode ' + ep, title: sagaTitle || (hasSaga ? 'La suite…' : 'Nouvelle histoire'), cover: cover }).then(() => {
    if(hasSaga){
      const log = document.getElementById('chatLog');
      const sep = document.createElement('div');
      sep.className = 'prev-banner';
      sep.innerHTML = '<div class="prev-label">🎬 Nouvel épisode</div>' + formatRecap(sagaRecap);
      if(log) log.appendChild(sep);
      callAI(null, { newEpisode:true });
    } else {
      startScene();
    }
  });
};

/* --- Mes sagas : une histoire par langue, reprise en 1 clic --- */
window.openSagas = async function(){
  showScreen('sagas');
  const list = document.getElementById('sagasList');
  if(!list) return;
  list.innerHTML = '<div class="sagas-loading">Chargement de tes histoires…</div>';
  let rows = [];
  try{
    const { data, error } = await supabase.from('saga').select('*').eq('user_id', userId).order('updated_at', { ascending:false });
    if(!error && Array.isArray(data)) rows = data;
  }catch(e){}
  // Repli : au moins la saga courante si la table n'est pas dispo
  if(!rows.length && pickedLang && chatHistory.length){
    rows = [{ language:pickedLang, level:pickedLevel, recap:sagaRecap, setting:sagaSetting, episode:progress.episode, chapter, history:chatHistory }];
  }
  renderSagas(rows);
};

function renderSagas(rows){
  const list = document.getElementById('sagasList');
  if(!list) return;
  if(!rows || !rows.length){
    list.innerHTML = '<div class="sagas-empty">Aucune histoire pour l\'instant. Lance ta première saga ci-dessous ✨</div>';
    return;
  }
  list.innerHTML = '<div class="sagas-grid">' + rows.map(s=>{
    const lang = LANGUAGES.find(l=>l.code===s.language);
    const flag = lang ? lang.flag : '🌊';
    const label = lang ? lang.label : (s.language||'Histoire');
    const lvl = (LEVELS.find(l=>l.code===s.level)?.label) || s.level || '';
    const ep = s.episode || 1;
    const title = (s.title && s.title.trim()) ? s.title : (label + ' · Saga');
    const desc = s.setting || s.title || (label + ' adventure');
    const cover = (s.cover && s.cover.trim()) ? s.cover : coverUrl(desc, _seedFrom((s.language||'') + ':' + ep), s.cover_style || 'cinematic', true);
    return '<div class="saga-card">' +
      '<div class="saga-poster">' +
        '<img class="saga-poster-img" loading="lazy" alt="Affiche ' + escapeHtml(label) + '" src="' + cover + '" onerror="this.style.visibility=\'hidden\';this.parentNode.classList.add(\'noimg\');this.parentNode.setAttribute(\'data-flag\',\'' + flag + '\');">' +
        '<div class="saga-poster-grad"></div>' +
        '<span class="saga-poster-badge">' + flag + '</span>' +
        '<span class="saga-poster-ep">Ép. ' + ep + '</span>' +
        '<div class="saga-poster-info">' +
          '<div class="saga-poster-title">' + escapeHtml(title) + '</div>' +
          (lvl ? '<div class="saga-poster-sub">' + escapeHtml(label) + ' · ' + escapeHtml(lvl) + '</div>' : '<div class="saga-poster-sub">' + escapeHtml(label) + '</div>') +
        '</div>' +
      '</div>' +
      '<div class="saga-actions">' +
        '<button class="btn small" onclick="resumeSagaByLang(\'' + s.language + '\')">▶ Reprendre</button>' +
        '<button class="btn ghost small saga-del" title="Supprimer" onclick="deleteSaga(\'' + s.language + '\')">🗑️</button>' +
      '</div>' +
    '</div>';
  }).join('') + '</div>';
}

window.resumeSagaByLang = async function(lang){
  const s = await loadSaga(lang);
  pickedLang = lang;
  pickedLevel = (s && s.level) || pickedLevel || progress.level;
  progress.language = pickedLang;
  progress.level = pickedLevel;
  try{ await saveProgress(); }catch(e){}
  showScreen('chat');
  if(s && Array.isArray(s.history) && s.history.length){ resumeScene(s); }
  else { startScene(); }
};

window.deleteSaga = async function(lang){
  if(!confirm('Supprimer définitivement cette histoire ?')) return;
  try{ await supabase.from('saga').delete().eq('user_id', userId).eq('language', lang); }catch(e){}
  if(lang === pickedLang){ chatHistory = []; sagaRecap = ''; sagaSetting = ''; sagaTitle = ''; sagaCover = ''; }
  openSagas();
};

/* ===================================================================
   NOTIFICATIONS PWA — « ton prochain épisode t'attend »
   Push serveur si VAPID configuré (api/vapid + api/subscribe + cron
   api/send-reminders). Sinon, dégrade proprement (aucune erreur).
   =================================================================== */
function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i);
  return out;
}
async function getVapidKey(){
  try{ const r = await fetch('/api/vapid'); if(!r.ok) return null; const j = await r.json(); return (j && j.key) ? j.key : null; }catch(e){ return null; }
}
function notifEnabled(){ return ('Notification' in window) && Notification.permission === 'granted' && localStorage.getItem('sunami-notif') === '1'; }
function updateNotifButtons(){
  const on = notifEnabled();
  document.querySelectorAll('.notif-cta').forEach(b=>{
    b.textContent = on ? '🔔 Rappels activés ✓' : '🔔 Me rappeler mon épisode';
    b.disabled = on;
  });
  const celBtn = document.getElementById('celNotifBtn');
  if(celBtn && on) celBtn.style.display = 'none';
}
async function subscribePush(){
  if(!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const key = await getVapidKey();
  if(!key) return; // VAPID non configuré côté serveur -> pas de push (pas d'erreur)
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if(!sub){ sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: urlBase64ToUint8Array(key) }); }
  try{ await fetch('/api/subscribe', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id:userId, subscription: sub }) }); }catch(e){}
}
window.enableNotifications = async function(){
  if(!('Notification' in window)){ alert('Les notifications ne sont pas supportées sur ce navigateur.'); return; }
  let perm = Notification.permission;
  if(perm !== 'granted'){ perm = await Notification.requestPermission(); }
  if(perm !== 'granted'){ return; }
  localStorage.setItem('sunami-notif','1');
  try{ await subscribePush(); }catch(e){}
  try{ new Notification('🌊 Sunami', { body:'C\'est noté ! On te préviendra quand ton prochain épisode t\'attend.', icon:'/og-preview.png' }); }catch(e){}
  track('notif_enabled');
  updateNotifButtons();
};
function refreshPushSubscription(){
  if(notifEnabled()){ subscribePush().catch(()=>{}); }
}
function maybeOfferNotifications(){
  if(notifEnabled()) return;
  if(!('Notification' in window) || Notification.permission === 'denied') return;
  const b = document.getElementById('celNotifBtn'); if(b) b.style.display = 'inline-flex';
}



let appEntered = false;
async function enterApp(email, uid){
  if(appEntered) return;
  appEntered = true;
  document.getElementById('appScreen').style.display = 'flex';
  document.getElementById('userLabel').textContent = email;
  userId = uid;
  userEmail = email;
  await loadProgress(uid);
  await pullCloud();
  showDevNotif();
  await touchStreak();
  updateXpChip();
  updateProgressChips();
  updateNotifButtons();
  refreshPushSubscription();
  Ambience.initFromStorage();
  track('app_open');
  maybeOnboarding();
  setTimeout(maybeShowWeeklyReport, 2000);

  if (progress.language && progress.level){
    pickedLang = progress.language;
    pickedLevel = progress.level;
    document.getElementById('pickScreen').style.display = 'none';
    document.getElementById('chatScreen').style.display = 'flex';
    updateSceneMeta();
    resumeOrStart();
  } else {
    renderPickers();
  }
}

/* Garde d'accès : app réservée aux connectés */
window.addEventListener('DOMContentLoaded', async ()=>{
  const { data } = await supabase.auth.getSession();
  if(data.session){ enterApp(data.session.user.email, data.session.user.id); }
  else { window.location.replace('/'); }

  // Parrainage
  claimReferral();
  loadReferralCode();

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

function addMsg(type, text, html){
  const log = document.getElementById('chatLog');
  const div = document.createElement('div');
  div.className = 'msg ' + type;
  if(html) div.innerHTML = text;
  else div.textContent = text;
  log.appendChild(div);
  scrollChat();
  return div;
}

// Message d'erreur AVEC bouton "Réessayer" (relance callAI avec les mêmes args)
function retryMsg(message, userReply, opts){
  const el = addMsg('feedback wrong', message);
  const b = document.createElement('button');
  b.className = 'chip retry-chip'; b.type = 'button'; b.textContent = '↻ Réessayer';
  b.onclick = ()=>{ el.remove(); callAI(userReply, opts); };
  el.appendChild(document.createElement('br'));
  el.appendChild(b);
  return el;
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
function setMascotExpression(emo){
  const av = document.getElementById('sceneAvatar');
  if(!av) return;
  av.classList.remove('emo-happy','emo-surprised','emo-think');
  if(emo === 'happy') av.classList.add('emo-happy');
  if(emo === 'surprised') av.classList.add('emo-surprised');
  if(emo === 'think') av.classList.add('emo-think');
}
function formatStory(s){ return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<b class="vocab-hl">$1</b>').replace(/\n/g, '<br>'); }
/* Rendu léger pour les résumés ("Previously on…") : gras markdown sans surlignage vocab */
function formatRecap(s){ return escapeHtml(String(s||'')).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); }

/* ===== RPG / Webtoon : rendu immersif des messages ===== */
function emotionToExpr(e){ return (e === 'surprised' || e === 'think' || e === 'happy') ? e : 'happy'; }

function wireVocab(container){
  if(!container) return;
  container.querySelectorAll('.vocab-hl').forEach(el => {
    el.addEventListener('click', () => { try{ speak(el.textContent, el); }catch(_){} });
  });
}

/* Sépare narration (hors guillemets) et répliques de PNJ (entre guillemets) */
function parseStorySegments(text){
  const parts = [];
  const re = /([«"“][^»"”]+[»"”])/g;
  let last = 0, m;
  while((m = re.exec(text))){
    if(m.index > last){ const nar = text.slice(last, m.index).trim(); if(nar) parts.push({ type:'narration', text:nar }); }
    parts.push({ type:'dialogue', text:m[1].trim() });
    last = m.index + m[1].length;
  }
  if(last < text.length){ const nar = text.slice(last).trim(); if(nar) parts.push({ type:'narration', text:nar }); }
  if(parts.length === 0) parts.push({ type:'narration', text:text.trim() });
  return parts;
}

const NAME_EMOJIS = ['🧑','👩','👨','🧙','🧕','👴','🧒','🕵️','👳','👸','🧑‍🌾','🧑‍🍳','👮','🧑‍🎓','👩‍⚕️','🧜','🧑‍🚀','🥷'];
/* Avatar déterministe par NOM de personnage (même perso -> même avatar) */
function charVisual(name){
  const key = (name || '?').toLowerCase();
  let h = 0; for(let i=0;i<key.length;i++) h = (h*31 + key.charCodeAt(i))>>>0;
  return { emoji: NAME_EMOJIS[h % NAME_EMOJIS.length], color: 'hsl(' + (h % 360) + ' 62% 52%)' };
}
/* Rôle d'un personnage (moteur + registre local) */
function roleOf(name, chars){
  if(!name) return '';
  const find = arr => (arr||[]).find(c => c && c.name && c.name.toLowerCase() === name.toLowerCase());
  const c = find(chars) || find(characters);
  return (c && c.role) ? c.role : 'person';
}
/* Portrait IA d'un personnage (déterministe par nom) */
function charPortraitUrl(name, role){
  const desc = (role && role.trim() && role.toLowerCase() !== 'personnage') ? role : 'person';
  const prompt = coverStylePrompt(sagaCoverStyle) + ', character portrait, close-up face of a ' + desc + ', expressive, centered, plain background, no text, no words';
  return 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + '?width=256&height=256&nologo=true&seed=' + _seedFrom('portrait:' + (name||'?').toLowerCase());
}

/* Transition cinématique d'épisode (title card) */
function playEpisodeTransition(opts){
  opts = opts || {};
  return new Promise(resolve => {
    const o = document.getElementById('episodeTransition');
    if(!o){ resolve(); return; }
    const bg = o.querySelector('.et-bg');
    if(bg) bg.style.backgroundImage = opts.cover ? ('url("' + opts.cover + '")') : 'none';
    const l = o.querySelector('.et-label'); if(l) l.textContent = opts.label || '';
    const t = o.querySelector('.et-title'); if(t) t.textContent = opts.title || '';
    o.classList.add('show'); o.setAttribute('aria-hidden', 'false');
    setTimeout(() => { o.classList.remove('show'); o.setAttribute('aria-hidden', 'true'); setTimeout(resolve, 550); }, 2000);
  });
}

/* Carte de la saga : parcours des épisodes */
window.openSagaMap = function(){
  const modal = document.getElementById('sagaMapModal');
  if(!modal) return;
  renderSagaMap();
  modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
};
window.closeSagaMap = function(){
  const modal = document.getElementById('sagaMapModal');
  if(modal){ modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
};
function renderSagaMap(){
  const el = document.getElementById('sagaMapBody');
  if(!el) return;
  const cur = progress.episode || 1;
  const total = Math.max(cur, 1);
  let html = '<div class="smap-track">';
  for(let ep=1; ep<=total; ep++){
    const done = ep < cur, active = ep === cur;
    const cover = buildCover(ep, sagaCoverStyle, 0, true);
    html += '<div class="smap-node ' + (active ? 'active' : (done ? 'done' : '')) + '">' +
      '<div class="smap-thumb" style="background-image:url(\'' + cover + '\')">' + (active ? '<span class="smap-pin">🌊</span>' : (done ? '<span class="smap-check">✓</span>' : '')) + '</div>' +
      '<div class="smap-ep">Épisode ' + ep + '</div></div>';
    if(ep < total) html += '<div class="smap-link"></div>';
  }
  html += '</div>';
  const chaps = Math.min(chapter, 5);
  html += '<div class="smap-chaps"><span>Chapitres de l\'épisode ' + cur + '</span><div class="smap-dots">';
  for(let i=1;i<=5;i++){ html += '<span class="smap-dot ' + (i<=chaps ? 'on' : '') + '"></span>'; }
  html += '</div></div>';
  if(sagaSetting){ html += '<div class="smap-setting">📍 ' + escapeHtml(sagaSetting) + '</div>'; }
  el.innerHTML = html;
}
function escapeReg(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
/* Liste des noms connus (moteur + registre local) */
function knownNames(chars){
  const set = new Set();
  const add = n => { n = (n||'').trim(); if(n.length >= 2) set.add(n); };
  (chars || []).forEach(c => { if(c && c.name){ add(c.name); c.name.trim().split(/\s+/).forEach(add); } });
  (characters || []).forEach(c => { if(c && c.name){ add(c.name); c.name.trim().split(/\s+/).forEach(add); } });
  return [...set].sort((a,b) => b.length - a.length);
}
/* Devine qui parle : nom le plus proche dans la narration précédente */
function detectSpeaker(prevText, dialogueText, names, last){
  let best = null, bestIdx = -1;
  const hay = prevText || '';
  names.forEach(nm => {
    try{ const re = new RegExp('\\b' + escapeReg(nm) + '\\b', 'g'); let m, idx = -1; while((m = re.exec(hay))) idx = m.index; if(idx > bestIdx){ bestIdx = idx; best = nm; } }catch(e){}
  });
  if(best) return best;
  for(const nm of names){ try{ if(new RegExp('\\b' + escapeReg(nm) + '\\b').test(dialogueText)) return nm; }catch(e){} }
  return last || null;
}

/* Type de décor déduit du lieu courant (pour l'ambiance sonore) */
function sceneTypeFrom(setting){
  const s = (setting || '').toLowerCase();
  const has = (...k) => k.some(w => s.includes(w));
  if(has('mer','plage','océan','ocean','sea','beach','port','vague','bord de')) return 'sea';
  if(has('forêt','foret','forest','bois','jungle','montagne','nature','parc','park','campagne')) return 'forest';
  if(has('pluie','rain','orage','tempête','storm')) return 'rain';
  if(has('café','cafe','bar','restaurant','marché','marche','market','boutique','magasin','cuisine')) return 'cafe';
  if(has('ville','city','rue','street','métro','metro','gare','aéroport','airport','avenue','centre-ville')) return 'city';
  if(has('nuit','night','soir','minuit','obscur')) return 'night';
  return 'default';
}

/* ===== Ambiance sonore procédurale (Web Audio, 0 fichier) ===== */
const Ambience = (function(){
  let ctx = null, master = null, nodes = [], curType = 'default', enabled = false;
  function ensure(){
    if(ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    return true;
  }
  function noiseBuffer(){
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for(let i=0;i<len;i++){ const w = Math.random()*2-1; last = (last + 0.02*w) / 1.02; d[i] = last * 3.2; }
    return buf;
  }
  function clearNodes(){ nodes.forEach(n => { try{ n.stop && n.stop(); }catch(e){} try{ n.disconnect(); }catch(e){} }); nodes = []; }
  function build(type){
    clearNodes(); if(!ctx) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(); src.loop = true;
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain(); g.gain.value = 0.5;
    if(type === 'sea'){ filt.type='lowpass'; filt.frequency.value=520; g.gain.value=0.5;
      const lfo=ctx.createOscillator(), lg=ctx.createGain(); lfo.frequency.value=0.12; lg.gain.value=0.35; lfo.connect(lg); lg.connect(g.gain); lfo.start(); nodes.push(lfo); }
    else if(type === 'forest'){ filt.type='lowpass'; filt.frequency.value=950; g.gain.value=0.32; }
    else if(type === 'rain'){ filt.type='highpass'; filt.frequency.value=1200; g.gain.value=0.4; }
    else if(type === 'city'){ filt.type='lowpass'; filt.frequency.value=340; g.gain.value=0.45; }
    else if(type === 'cafe'){ filt.type='lowpass'; filt.frequency.value=720; g.gain.value=0.3; }
    else if(type === 'night'){ filt.type='lowpass'; filt.frequency.value=420; g.gain.value=0.28;
      const osc=ctx.createOscillator(), og=ctx.createGain(); osc.type='sine'; osc.frequency.value=110; og.gain.value=0.015; osc.connect(og); og.connect(master); osc.start(); nodes.push(osc); }
    else { filt.type='lowpass'; filt.frequency.value=600; g.gain.value=0.3; }
    src.connect(filt); filt.connect(g); g.connect(master); src.start(); nodes.push(src);
  }
  function setScene(type){ curType = type || 'default'; if(enabled && ensure()) build(curType); }
  function toggle(){
    if(!ensure()) return false;
    enabled = !enabled;
    if(enabled){ if(ctx.state === 'suspended') ctx.resume(); build(curType); master.gain.setTargetAtTime(0.06, ctx.currentTime, 0.5); }
    else { master.gain.setTargetAtTime(0, ctx.currentTime, 0.3); setTimeout(clearNodes, 400); }
    try{ localStorage.setItem('sunami-amb', enabled ? '1' : '0'); }catch(e){}
    return enabled;
  }
  function initFromStorage(){
    let on = false; try{ on = localStorage.getItem('sunami-amb') === '1'; }catch(e){}
    if(!on) return;
    enabled = true;
    const start = () => { if(ensure()){ if(ctx.state==='suspended') ctx.resume(); build(curType); master.gain.setTargetAtTime(0.06, ctx.currentTime, 0.6); } const b=document.getElementById('ambBtn'); if(b) b.textContent='🔊'; document.removeEventListener('click', start); };
    document.addEventListener('click', start, { once:true });
  }
  return { setScene, toggle, initFromStorage };
})();
window.toggleAmbience = function(){
  const on = Ambience.toggle();
  const btn = document.getElementById('ambBtn');
  if(btn) btn.textContent = on ? '🔊' : '🔈';
};

async function renderStoryMessage(fullText, chars){
  const log = document.getElementById('chatLog');
  if(!log) return;
  const segs = parseStorySegments(fullText);
  const names = knownNames(chars);
  let lastBubble = null, lastSpeaker = null;
  for(let i=0;i<segs.length;i++){
    const seg = segs[i];
    const isNpc = seg.type === 'dialogue';
    const row = document.createElement('div');
    row.className = 'story-row ' + (isNpc ? 'npc' : 'narration');
    let speaker = null, vis = null;
    if(isNpc){
      const prev = (i > 0 && segs[i-1].type === 'narration') ? segs[i-1].text : '';
      speaker = detectSpeaker(prev, seg.text, names, lastSpeaker);
      if(speaker) lastSpeaker = speaker;
      vis = speaker ? charVisual(speaker) : { emoji:'🗣️', color:'hsl(210 8% 45%)' };
      const role = roleOf(speaker, chars);
      const portrait = speaker ? charPortraitUrl(speaker, role) : '';
      row.innerHTML = portrait
        ? '<div class="story-avatar npc-avatar" style="background:' + vis.color + '"><img src="' + portrait + '" loading="lazy" alt="" onerror="this.remove();this.parentNode.textContent=\'' + vis.emoji + '\';"></div>'
        : '<div class="story-avatar npc-avatar" style="background:' + vis.color + '">' + vis.emoji + '</div>';
    } else {
      row.innerHTML = '<div class="story-avatar narrator-avatar"><svg viewBox="0 0 120 140"><use href="#mascot"/></svg></div>';
    }
    const bubble = document.createElement('div');
    bubble.className = 'story-bubble ' + (isNpc ? 'npc-bubble' : 'narration-bubble');
    if(isNpc && speaker){ const nm = document.createElement('div'); nm.className = 'npc-name'; nm.textContent = speaker; bubble.appendChild(nm); }
    const span = document.createElement('span');
    const cursor = document.createElement('span'); cursor.className = 'stream-cursor';
    bubble.appendChild(span); bubble.appendChild(cursor);
    row.appendChild(bubble);
    log.appendChild(row);
    scrollChat();
    await typewriter(span, seg.text);
    cursor.remove();
    wireVocab(bubble);
    lastBubble = bubble;
  }
  if(lastBubble){ addSpeaker(lastBubble, cleanForSpeech(fullText)); }
}

/* Réaction de la mascotte (petit saut) */
function mascotReact(){
  const av = document.getElementById('sceneAvatar');
  if(!av) return;
  setMascotExpression('happy');
  av.classList.remove('pop'); void av.offsetWidth; av.classList.add('pop');
  setTimeout(() => av.classList.remove('pop'), 700);
}

/* Animation "+X XP" qui s'envole */
function popXp(n){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.createElement('div');
  el.className = 'xp-pop';
  el.textContent = '+' + n + ' XP';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

/* Bannière d'ambiance : illustration de décor générée depuis le lieu courant */
function bannerUrl(desc, seed, styleId){
  const clean = String(desc || '').replace(/\*\*/g,'').replace(/\([^)]*\)/g,'').slice(0,160);
  const prompt = coverStylePrompt(styleId) + ', wide scenic landscape background of ' + clean + ', atmospheric, empty scenery, no people, no characters, no text, no words';
  return 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + '?width=768&height=384&nologo=true&seed=' + seed;
}
function updateSceneBanner(){
  const bg = document.getElementById('sceneBannerBg');
  if(!bg) return;
  const label = (LANGUAGES.find(l => l.code === pickedLang)?.label) || '';
  const desc = sagaSetting || (label + ' city street');
  const url = bannerUrl(desc, _seedFrom((pickedLang||'') + ':scene:' + (sagaSetting||'')), sagaCoverStyle);
  if(bg.getAttribute('data-src') !== url){ bg.setAttribute('data-src', url); bg.src = url; }
  Ambience.setScene(sceneTypeFrom(sagaSetting));
}
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

async function callAI(userReply, opts){
  opts = opts || {};
  const sendBtn = document.getElementById('sendBtn');
  const input = document.getElementById('userInput');
  sendBtn.disabled = true; input.disabled = true;
  const sceneCard = document.getElementById('sceneBanner');

  // "Previously on Sunami" — affiche un résumé de l'épisode précédent
  if(userReply && chatHistory.length > 0){
    const prev = localStorage.getItem('sunami_prev');
    if(prev){
      const banner = document.createElement('div');
      banner.className = 'prev-banner';
      banner.innerHTML = '<div class="prev-label">📺 Previously on Sunami…</div>' + formatRecap(prev);
      document.getElementById('chatLog').appendChild(banner);
      scrollChat();
    }
  }

  if(sceneCard){ sceneCard.classList.add('thinking'); sceneCard.classList.remove('speaking'); }
  setMascotColor('green');
  setMascotExpression('think');

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
      body: JSON.stringify({
        history: chatHistory, userReply,
        language: pickedLang, level: pickedLevel, theme: pickedTheme, universe: pickedUniverse || '',
        vocabulary: getWordsForReview(5),
        recap: sagaRecap, characters, setting: sagaSetting,
        protagonist: sagaProtagonist, episode: progress.episode || 1, chapter,
        newEpisode: !!opts.newEpisode,
      }),
      signal: clientCtrl.signal,
    });
    clearTimeout(clientTimeoutId);

    if(res.status === 429){
      loadingEl.remove();
      if(sceneCard) sceneCard.classList.remove('thinking');
      setMascotColor('red');
      retryMsg('⏳ Trop de demandes d\u2019un coup — patiente ~30 secondes puis réessaie.', userReply, opts);
      sendBtn.disabled = false; input.disabled = false;
      return;
    }

    const data = await res.json().catch(() => ({}));

    if(!res.ok || data.error){
      loadingEl.remove();
      if(sceneCard) sceneCard.classList.remove('thinking');
      setMascotColor('red');
      retryMsg('Le conteur a rencontré un souci. Réessaie dans un instant.', userReply, opts);
      sendBtn.disabled = false; input.disabled = false;
      return;
    }

    const fullText = data.text || '';
    const grammar = data.grammar || null;
    loadingEl.remove();

    if(!fullText.trim()){
      if(sceneCard) sceneCard.classList.remove('thinking');
      setMascotColor('red');
      retryMsg('Le conteur n\u2019a rien répondu — réessaie.', userReply, opts);
      sendBtn.disabled = false; input.disabled = false;
      return;
    }

    if(userReply){
      chatHistory.push({ role:'user', content:userReply });
      const gained = 8 + Math.floor(Math.random()*7);
      addXp(gained);
      popXp(gained);
      mascotReact();
      if(window.SFX) SFX.play('correct');
      addFeedback();
      track('reply_sent', { language: pickedLang, level: pickedLevel });
    }

    if(sceneCard){ sceneCard.classList.remove('thinking'); sceneCard.classList.add('speaking'); }
    setMascotExpression(emotionToExpr(data.emotion));
    const speech = cleanForSpeech(fullText);
    await renderStoryMessage(fullText, data.characters);
    chatHistory.push({ role:'assistant', content: fullText });
    chapter += 1; updateSceneMeta();
    registerChapter(fullText);
    if(!episodeConsumed){ consumeDailyEpisode(); episodeConsumed = true; }
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
      if(isPerfect){ stats.perfectCount = (stats.perfectCount || 0) + 1; saveStats(); checkAchievements(); }
    } else if(userReply){
      setMascotColor('green');
    }

    /* ---- Continuité & persistance (moteur JSON structuré) ---- */
    if(data.recap) sagaRecap = data.recap;
    if(data.sagaTitle && !sagaTitle) sagaTitle = data.sagaTitle;
    if(data.setting) sagaSetting = data.setting;
    if(!sagaProtagonist && userEmail){ sagaProtagonist = userEmail.split('@')[0] || ''; }
    mergeStructuredVocab(data.vocab);
    mergeStructuredCharacters(data.characters);
    renderComprehension(data.quiz);
    renderChoices(data.choices);
    if(data.episodeComplete){
      sagaCliffhanger = cliffhangerFrom(fullText);
      try{ localStorage.setItem('sunami-cliffhanger', sagaCliffhanger); }catch(e){}
    }
    saveSaga();
    syncCloud();
    if(data.episodeComplete){ onEpisodeComplete(data.episodeTitle); }

    sendBtn.disabled = false; input.disabled = false; input.focus();
    scrollChat();
  }catch(err){
    clearTimeout(clientTimeoutId);
    try{ loadingEl.remove(); }catch(_){}
    if(sceneCard) sceneCard.classList.remove('thinking','speaking');
    setMascotColor('red');
    console.error('[CLIENT] Erreur callAI — name=' + (err.name || '?') + ' message=' + (err.message || '?'));
    if(err.name === 'AbortError'){
      retryMsg('⏱️ Le conteur met trop de temps à répondre.', userReply, opts);
    } else {
      retryMsg('⚠️ Problème de connexion. Vérifie ta connexion et réessaie.', userReply, opts);
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
    addMsg('feedback wrong', '🎬 Tes 2 épisodes gratuits du jour sont terminés. Reviens demain, ou <a href="/pricing" style="color:var(--wave);font-weight:800;">passe Premium</a> pour l\'illimité !', true);
    return;
  }
  chapter = 0;
  episodeConsumed = false;
  chatHistory = [];
  sagaRecap = '';
  sagaSetting = '';
  sagaTitle = '';
  sagaCover = '';
  coverSalt = 0;
  sagaProtagonist = (userEmail && userEmail.split('@')[0]) || '';
  if(!progress.episode) progress.episode = 1;
  track('story_start', { language: pickedLang, level: pickedLevel, theme: pickedTheme || 'aucun' });
  document.getElementById('chatLog').innerHTML = '';
  const input = document.getElementById('userInput');
  if(input) input.disabled = false;
  updateSceneMeta();
  const pb = document.getElementById('scenePrevBadge');
  if(pb) pb.style.display = 'none';
  updateSceneBanner();
  callAI(null);
}

function sendReply(){
  const input = document.getElementById('userInput');
  const val = input.value.trim();
  if(!val) return;
  document.querySelectorAll('.quick-chips').forEach(e=>e.remove());
  if(!useDailyEpisode()){
    addMsg('feedback wrong', '🎬 Tes 2 épisodes gratuits du jour sont terminés. Reviens demain, ou <a href="/pricing" style="color:var(--wave);font-weight:800;">passe Premium</a> pour l\'illimité !', true);
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
// Polish : masque le micro si la reconnaissance vocale n'est pas supportée (iOS Safari, Firefox…)
document.addEventListener('DOMContentLoaded', () => {
  if(!(window.SpeechRecognition || window.webkitSpeechRecognition)){
    const m = document.getElementById('micBtn'); if(m) m.style.display = 'none';
  }
});

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

/* ===================================================================
   Effets sonores (Web Audio) · Onboarding · Poster de partage
   =================================================================== */
const SFX = (function(){
  let ctx = null;
  function ac(){ if(ctx) return ctx; const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null; ctx = new AC(); return ctx; }
  function on(){ try{ return localStorage.getItem('sunami-sfx') !== '0'; }catch(e){ return true; } }
  function tone(freq, t0, dur, type, vol){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.14, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function play(kind){
    if(!on()) return; const c = ac(); if(!c) return; if(c.state === 'suspended') c.resume();
    const t = c.currentTime;
    if(kind === 'correct'){ tone(660, t, 0.12, 'sine', 0.12); tone(990, t + 0.09, 0.16, 'sine', 0.12); }
    else if(kind === 'levelup'){ [523,659,784,1046].forEach((f,i) => tone(f, t + i*0.09, 0.22, 'triangle', 0.13)); }
    else if(kind === 'complete'){ [392,523,659,784,1046].forEach((f,i) => tone(f, t + i*0.10, 0.30, 'sawtooth', 0.10)); }
  }
  return { play };
})();
window.SFX = SFX;
window.toggleSfx = function(btn){
  const isOn = (function(){ try{ return localStorage.getItem('sunami-sfx') !== '0'; }catch(e){ return true; } })();
  const next = isOn ? '0' : '1';
  try{ localStorage.setItem('sunami-sfx', next); }catch(e){}
  if(btn) btn.textContent = next === '0' ? '🔇 Effets coupés' : '🔊 Effets activés';
  if(next === '1') SFX.play('correct');
};

/* Onboarding première visite */
let obIdx = 0;
function obSlides(){ return document.querySelectorAll('#obSlides .ob-slide'); }
function renderObDots(){
  const d = document.getElementById('obDots'); if(!d) return;
  const n = obSlides().length; d.innerHTML = '';
  for(let i=0;i<n;i++){ const s = document.createElement('span'); s.className = 'ob-dot' + (i === obIdx ? ' on' : ''); d.appendChild(s); }
}
window.obNextSlide = function(){
  const slides = obSlides(); if(!slides.length) return;
  if(obIdx >= slides.length - 1){ closeOnboarding(); return; }
  slides[obIdx].classList.remove('active'); obIdx++; slides[obIdx].classList.add('active');
  renderObDots();
  const btn = document.getElementById('obNext'); if(btn) btn.textContent = (obIdx >= slides.length - 1) ? 'Commencer ✨' : 'Suivant';
};
window.closeOnboarding = function(){
  const o = document.getElementById('onboarding'); if(o){ o.classList.remove('open'); o.setAttribute('aria-hidden','true'); }
  try{ localStorage.setItem('sunami-onboarded','1'); }catch(e){}
};
function maybeOnboarding(){
  let seen = false; try{ seen = localStorage.getItem('sunami-onboarded') === '1'; }catch(e){}
  if(seen) return;
  const o = document.getElementById('onboarding'); if(!o) return;
  obIdx = 0; obSlides().forEach((s,i) => s.classList.toggle('active', i === 0));
  renderObDots();
  const btn = document.getElementById('obNext'); if(btn) btn.textContent = 'Suivant';
  o.classList.add('open'); o.setAttribute('aria-hidden','false');
}

/* Poster de partage */
function sagaShareText(){
  const lang = (LANGUAGES.find(l => l.code === pickedLang)?.label) || 'une langue';
  return 'Je vis une histoire pour apprendre ' + lang + ' sur Sunami 🌊 — Épisode ' + (progress.episode || 1) + ', ' + (progress.streak || 0) + ' j de série !';
}
window.openSharePoster = function(){
  const m = document.getElementById('posterModal'); if(!m) return;
  const ep = progress.episode || 1;
  const bg = document.getElementById('posterBg'); if(bg) bg.src = sagaCover || currentCoverUrl(ep);
  const t = document.getElementById('posterTitle'); if(t) t.textContent = sagaTitle || 'Ma saga Sunami';
  const lang = (LANGUAGES.find(l => l.code === pickedLang)?.label);
  const e = document.getElementById('posterEp'); if(e) e.textContent = 'Épisode ' + ep + (lang ? (' · ' + lang) : '');
  const st = document.getElementById('posterStats');
  if(st) st.innerHTML = '🔥 ' + (progress.streak || 0) + ' j&nbsp;&nbsp; ⭐ ' + xp + ' XP&nbsp;&nbsp; 📚 ' + ((stats.words || []).length) + ' mots';
  m.classList.add('open'); m.setAttribute('aria-hidden','false');
};
window.closePoster = function(){ const m = document.getElementById('posterModal'); if(m){ m.classList.remove('open'); m.setAttribute('aria-hidden','true'); } };
window.shareSaga = async function(){
  const url = 'https://sunami-rho.vercel.app', text = sagaShareText();
  try{ if(navigator.share){ await navigator.share({ title:'Sunami', text, url }); track('share_saga'); return; } }catch(e){ return; }
  try{ await navigator.clipboard.writeText(text + ' ' + url); alert('Texte + lien copiés !'); }catch(e){}
};
window.copySagaLink = async function(){ try{ await navigator.clipboard.writeText('https://sunami-rho.vercel.app'); alert('Lien copié !'); }catch(e){} };

document.addEventListener('DOMContentLoaded', () => {
  const b = document.querySelector('[onclick="toggleSfx(this)"]');
  if(b){ let off=false; try{ off = localStorage.getItem('sunami-sfx') === '0'; }catch(e){} b.textContent = off ? '🔇 Effets coupés' : '🔊 Effets activés'; }
});

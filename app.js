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
  window.speechSynthesis.speak(u);
}

window.openSettings = function(){
  applySettings();
  const em = document.getElementById('setEmail');
  const lbl = document.getElementById('userLabel');
  if(em && lbl) em.textContent = lbl.textContent ? ('Connecté : ' + lbl.textContent) : '';
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

document.addEventListener('keydown', e => { if(e.key === 'Escape') window.closeSettings(); });
document.addEventListener('DOMContentLoaded', applySettings);

/* ===== XP (gratuit) ===== */
let xp = parseInt(localStorage.getItem('sunami-xp') || '0', 10) || 0;
function updateXpChip(){
  const c = document.getElementById('xpCount'); if(c) c.textContent = xp;
  const chip = document.getElementById('xpChip'); if(chip) chip.style.display = 'inline-flex';
}
function addXp(n){
  xp += n; localStorage.setItem('sunami-xp', String(xp)); updateXpChip();
  const chip = document.getElementById('xpChip');
  if(chip){ chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
}

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
let pickedTheme = 'surprise';
let chapter = 0;

const THEMES = [
  {code:'surprise', label:'Surprise', emoji:'🎲'},
  {code:'un voyage / une aventure', label:'Voyage', emoji:'🧳'},
  {code:'une enquête / un mystère', label:'Mystère', emoji:'🕵️'},
  {code:'la vie quotidienne', label:'Quotidien', emoji:'☕'},
  {code:'un conte fantastique', label:'Fantastique', emoji:'🐉'},
  {code:'une histoire d\'amitié ou d\'amour', label:'Romance', emoji:'💛'},
];

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
  const themeGrid = document.getElementById('themeGrid');
  if(themeGrid){
    themeGrid.innerHTML = '';
    pickedTheme = 'surprise';
    THEMES.forEach(t=>{
      const c = document.createElement('div');
      c.className = 'pick-card' + (t.code === 'surprise' ? ' active' : '');
      c.innerHTML = `<div style="font-size:24px;line-height:1;margin-bottom:6px;">${t.emoji}</div>${t.label}`;
      c.onclick = ()=>{
        document.querySelectorAll('#themeGrid .pick-card').forEach(x=>x.classList.remove('active'));
        c.classList.add('active');
        pickedTheme = t.code;
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
let progress = { season: 1, episode: 1, streak: 0, last_active: null, language: null, level: null };

async function loadProgress(uid){
  const { data } = await supabase.from('progress').select('*').eq('user_id', uid).maybeSingle();
  if (data) progress = { ...progress, ...data };
  return data;
}

async function touchStreak(){
  const today = new Date().toISOString().slice(0,10);
  if (progress.last_active !== today){
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

function addTranslate(bubble, original){
  const btn = document.createElement('button');
  btn.className = 'speak-btn'; btn.type = 'button';
  btn.setAttribute('aria-label','Traduire en français'); btn.title = 'Traduire';
  btn.textContent = '🇫🇷';
  btn.onclick = async ()=>{
    const existing = bubble.querySelector('.translation');
    if(existing){ existing.remove(); return; }
    btn.disabled = true; const old = btn.textContent; btn.textContent = '…';
    try{
      const r = await fetch('/api/assist', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'translate', text: cleanForSpeech(original) || original, language: pickedLang, level: pickedLevel })
      });
      const d = await r.json();
      const p = document.createElement('div'); p.className = 'translation';
      p.textContent = '🇫🇷 ' + (d.result || (d.error === 'rate_limit' ? 'Patiente un peu puis réessaie.' : 'Traduction indisponible.'));
      bubble.appendChild(p); scrollChat();
    }catch(e){}
    btn.textContent = old; btn.disabled = false;
  };
  bubble.appendChild(btn);
}

function clearSuggestions(){ const r = document.getElementById('suggestRow'); if(r) r.innerHTML = ''; }

window.getHints = async function(){
  const row = document.getElementById('suggestRow'); if(!row) return;
  const last = [...chatHistory].reverse().find(m => m.role === 'assistant');
  if(!last){ return; }
  const btn = document.getElementById('hintBtn');
  row.innerHTML = '<span class="suggest-loading">💡 je réfléchis…</span>';
  if(btn) btn.disabled = true;
  try{
    const r = await fetch('/api/assist', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ mode:'suggest', text: last.content, language: pickedLang, level: pickedLevel })
    });
    const d = await r.json();
    row.innerHTML = '';
    if(d.suggestions && d.suggestions.length){
      d.suggestions.forEach(s=>{
        const chip = document.createElement('button');
        chip.className = 'suggest-chip'; chip.type = 'button'; chip.textContent = s;
        chip.onclick = ()=>{ const inp = document.getElementById('userInput'); inp.value = s; clearSuggestions(); sendReply(); };
        row.appendChild(chip);
      });
    } else {
      row.innerHTML = '<span class="suggest-loading">' + (d.error === 'rate_limit' ? '⏳ patiente un peu…' : 'Pas de suggestion.') + '</span>';
      setTimeout(clearSuggestions, 1600);
    }
  }catch(e){ clearSuggestions(); }
  if(btn) btn.disabled = false;
};

async function callAI(userReply){
  const sendBtn = document.getElementById('sendBtn');
  const input = document.getElementById('userInput');
  sendBtn.disabled = true; input.disabled = true;
  const loadingEl = addMsg('loading', '···');

  try{
    const res = await fetch('/api/generate', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ history: chatHistory, userReply, language: pickedLang, level: pickedLevel, theme: pickedTheme })
    });

    if(res.status === 429){
      loadingEl.remove();
      addMsg('feedback wrong', '⏳ Trop de demandes d\u2019un coup — patiente ~30 secondes puis réessaie.');
      sendBtn.disabled = false; input.disabled = false;
      return;
    }
    if(!res.ok || !res.body){
      let e = {}; try{ e = await res.json(); }catch(_){}
      loadingEl.remove();
      addMsg('feedback wrong', 'Erreur : ' + (e.error || ('HTTP ' + res.status)));
      sendBtn.disabled = false; input.disabled = false;
      return;
    }

    loadingEl.remove();
    if(userReply){ chatHistory.push({ role:'user', content:userReply }); addXp(10); }

    // Bulle du conteur qui se remplit en direct
    const bubble = document.createElement('div');
    bubble.className = 'msg character';
    const span = document.createElement('span');
    bubble.appendChild(span);
    document.getElementById('chatLog').appendChild(bubble);

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let full = '';
    while(true){
      const { done, value } = await reader.read();
      if(done) break;
      full += dec.decode(value, { stream:true });
      span.textContent = full;
      scrollChat();
    }

    if(!full.trim()){
      bubble.remove();
      addMsg('feedback wrong', 'Le conteur n\u2019a rien répondu — réessaie.');
      sendBtn.disabled = false; input.disabled = false;
      return;
    }

    bubble.innerHTML = formatStory(full);
    const speech = cleanForSpeech(full);
    addSpeaker(bubble, speech);
    addTranslate(bubble, full);
    chatHistory.push({ role:'assistant', content: full });
    chapter += 1; updateSceneMeta();
    if(settings.autoplay) speak(speech);
    clearSuggestions();

    sendBtn.disabled = false; input.disabled = false; input.focus();
    scrollChat();
  }catch(err){
    try{ loadingEl.remove(); }catch(_){}
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
  clearSuggestions();
  addMsg('user', val);
  input.value = '';
  callAI(val);
}
window.sendReply = sendReply;

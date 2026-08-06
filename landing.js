/* Sunami — logique de la landing (marketing) : démo, capture email, login, reveal.
   Volontairement léger : la logique lourde (chat, TTS, gamification) vit dans app.js. */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://cdtabuyomtkfasvugtck.supabase.co';
const supabaseKey = 'sb_publishable_ms6RPYdPVcO3c9A6X1ruQQ_uiYl1Dxo';
const supabase = createClient(supabaseUrl, supabaseKey);

/* Déjà connecté ? -> on file directement vers l'app */
(async function(){
  const { data } = await supabase.auth.getSession();
  if(data.session) window.location.replace('/app');
})();
supabase.auth.onAuthStateChange((event, session)=>{
  if(session) window.location.replace('/app');
});

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
  const s = demoScenes[i];
  document.getElementById('demoText').innerHTML = s.text;
  const c = document.getElementById('demoChoices');
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

/* ===== Reveal au scroll ===== */
document.addEventListener('DOMContentLoaded', ()=>{
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const els = document.querySelectorAll('.reveal:not(.in)');
  if(reduce || !('IntersectionObserver' in window)){ els.forEach(el=>el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold:0.12, rootMargin:'0px 0px -8% 0px' });
  els.forEach(el=>io.observe(el));
});

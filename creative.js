const $ = id => document.getElementById(id);

const marketConfig = {
  fr: {
    locale: 'fr-FR',
    label: 'France',
    searches: [
      ['frustrated person talking to camera','young person frustrated conversation','person struggling to speak'],
      ['student tired studying phone','person forgetting something studying','student frustrated notes'],
      ['awkward conversation reaction','nervous person talking friend','person embarrassed conversation'],
      ['person suddenly understands happy','young person excited discovery','person smiling idea phone'],
    ],
    variants: [
      ['Je comprends l’anglais… mais quand il faut parler, je bloque.', 'Le pire ? Je connais les mots.', 'Mais au moment de parler… trou noir.', 'Alors j’ai essayé une autre façon.', 'Et là, j’ai enfin eu envie de continuer.', 'Je te montre → lien en bio.'],
      ['Tu connais ce moment où tu comprends tout…', '…mais dès qu’on te parle en anglais, tu paniques ?', 'Ça m’arrivait tout le temps.', 'J’ai changé une seule chose.', 'Et ça a complètement changé ma façon de pratiquer.', 'Lien en bio.'],
      ['J’apprenais l’anglais depuis des mois.', 'Je faisais mes exercices.', 'Je connaissais plein de mots.', 'Mais parler ? Impossible.', 'J’ai trouvé une autre manière de pratiquer.', 'Regarde le lien en bio.'],
    ]
  },
  us: { locale:'en-US', label:'USA', searches:[['person frustrated talking to camera','young adult struggling conversation'],['student tired studying phone','person forgetting lesson'],['awkward conversation reaction','nervous person talking'],['person excited discovery','young person happy phone']], variants:[['I understand English… but when I have to speak, I freeze.','The worst part? I know the words.','But the second I speak… nothing.','So I tried a different way.','And suddenly I actually wanted to keep practicing.','Link in bio.']] },
  es: { locale:'es-ES', label:'España', searches:[['persona frustrada hablando a cámara','joven con dificultad para hablar'],['estudiante cansado estudiando móvil','persona olvidando lección'],['conversación incómoda reacción','persona nerviosa hablando'],['persona feliz descubriendo algo','joven sonriendo teléfono']], variants:[['Entiendo inglés… pero cuando tengo que hablar, me bloqueo.','Lo peor es que conozco las palabras.','Pero al hablar… nada.','Así que probé otra forma.','Y por fin me dieron ganas de seguir practicando.','Link en bio.']] },
  de: { locale:'de-DE', label:'Deutschland', searches:[['person spricht frustriert kamera','junge person schwieriges gespräch'],['student müde lernen handy','person vergisst lektion'],['unangenehmes gespräch reaktion','nervös sprechen'],['person glücklich entdeckung','junge person telefon']], variants:[['Ich verstehe Englisch… aber beim Sprechen blockiere ich.','Das Schlimmste? Ich kenne die Wörter.','Aber sobald ich sprechen soll… nichts.','Also habe ich etwas anderes ausprobiert.','Und plötzlich wollte ich weiterüben.','Link in Bio.']] }
};

function planFromBrief(brief, market) {
  const base = marketConfig[market].searches;
  const b = brief.toLowerCase();
  if (b.includes('parl') || b.includes('spea')) {
    return base;
  }
  if (b.includes('oubli') || b.includes('forget')) {
    return [base[1], base[0], base[2], base[3]];
  }
  return base;
}

async function searchQueries(queries, locale, targetDuration) {
  const r = await fetch('/api/pexels', {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({queries, locale, target_duration:targetDuration, per_page:8})
  });
  const data = await r.json();
  if(!r.ok) throw new Error(data.error || 'Erreur Pexels');
  return data.videos || [];
}

function makeCard(v, scene) {
  const card=document.createElement('article'); card.className='card';
  card.innerHTML=`<div class="scene">${scene}</div><video src="${v.url}" poster="${v.image}" muted playsinline loop preload="metadata"></video><div class="meta"><div class="score">${v.score.toFixed(1)} · ${v.duration.toFixed(1)}s</div><div class="query">${v.query}</div><div class="credit">${v.photographer} · Pexels</div></div>`;
  const vid=card.querySelector('video');
  card.addEventListener('mouseenter',()=>vid.play().catch(()=>{}));
  card.addEventListener('mouseleave',()=>{vid.pause(); vid.currentTime=0;});
  return card;
}

function renderVariants(market) {
  const box=document.createElement('section'); box.className='variants';
  box.innerHTML='<h2>3 hooks à tester</h2><p>Le moteur garde le problème au centre et ne révèle Sunami qu’à la fin.</p>';
  marketConfig[market].variants.forEach((v,i)=>{
    const el=document.createElement('div'); el.className='variant';
    el.innerHTML=`<b>V${i+1}</b><div>${v.map((x,j)=>`<span class="line ${j===v.length-1?'cta':''}">${x}</span>`).join('')}</div>`;
    box.appendChild(el);
  });
  return box;
}

async function run(){
  const market=$('market').value;
  const seconds=Number($('duration').value);
  const brief=$('brief').value.trim();
  const cfg=marketConfig[market];
  const status=$('status'); const results=$('results');
  status.textContent='Analyse du problème → recherche de vrais plans → classement…'; results.innerHTML='';
  try {
    results.appendChild(renderVariants(market));
    const sceneQueries=planFromBrief(brief, market);
    const all=[];
    for(let i=0;i<sceneQueries.length;i++){
      status.textContent=`Recherche scène ${i+1}/4…`;
      const vids=await searchQueries(sceneQueries[i],cfg.locale,Math.max(1,seconds/9));
      const sceneBest=vids.slice(0,5);
      const section=document.createElement('section'); section.className='scene-block';
      section.innerHTML=`<h2>Scène ${i+1}</h2><p>${['Le blocage','La frustration','Le moment gênant','La découverte'][i]}</p>`;
      const grid=document.createElement('div'); grid.className='scene-grid';
      sceneBest.forEach(v=>grid.appendChild(makeCard(v,i+1)));
      section.appendChild(grid); results.appendChild(section);
      all.push(...sceneBest);
    }
    status.textContent=`${all.length} candidats trouvés. Sélectionne les plans les plus humains : on privilégie l’émotion et l’action, pas les vidéos trop “stock”.`;
  } catch(e) { status.textContent=e.message; }
}

$('generate').addEventListener('click',run);

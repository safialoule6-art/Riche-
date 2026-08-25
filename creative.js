const $ = id => document.getElementById(id);

const plans = {
  fr: [
    ['person talking to camera frustrated','person frustrated conversation','young person struggling to speak'],
    ['student studying tired phone','student forgetting lesson','person confused studying'],
    ['awkward conversation reaction','person nervous talking','friend conversation reaction'],
    ['person excited discovery','young person happy phone','person smiling idea']
  ],
  us: [['person talking to camera frustrated','young adult struggling conversation'],['student studying tired phone','person forgetting lesson'],['awkward conversation reaction','person nervous talking'],['person excited discovery','young person happy phone']],
  es: [['persona frustrada hablando a cámara','persona con dificultad para hablar'],['estudiante cansado estudiando','persona olvidando lección'],['conversación incómoda reacción','persona nerviosa hablando'],['persona feliz descubriendo algo','joven sonriendo teléfono']],
  de: [['person spricht frustriert kamera','person schwieriges gespräch'],['student müde lernen handy','person vergisst lernen'],['unangenehmes gespräch reaktion','nervös sprechen'],['person glücklich entdeckung','junge person telefon']]
};

const copy = {
  fr: ['Tu veux apprendre l’anglais ?','Tu fais tout ce qu’il faut…','Tu connais les mots.','Mais dès qu’il faut parler…','plus rien.','Moi aussi, j’en avais marre.','Alors j’ai essayé autre chose.','Une histoire. Tu réponds. Elle continue.','Et sans t’en rendre compte… tu pratiques.','Je te montre. Lien en bio ↓'],
  us: ['You want to learn English?','You do everything right…','You know the words.','But when you have to speak…','nothing.','I was tired of that too.','So I tried something different.','A story. You answer. It keeps going.','And without noticing… you practice.','I’ll show you. Link in bio ↓']
};

async function searchQueries(queries, locale, targetDuration){
  const r = await fetch('/api/pexels', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({queries,locale,target_duration:targetDuration,per_page:6})});
  const data = await r.json();
  if(!r.ok) throw new Error(data.error || 'Pexels error');
  return data.videos || [];
}

async function run(){
  const market=$('market').value;
  const seconds=Number($('duration').value);
  const locale={fr:'fr-FR',us:'en-US',es:'es-ES',de:'de-DE'}[market];
  const status=$('status'); const results=$('results');
  status.textContent='Recherche de clips humains et verticaux…'; results.innerHTML='';
  const qs=plans[market].flat();
  try{
    const videos=await searchQueries(qs,locale,Math.max(1,seconds/10));
    const best=videos.slice(0,12);
    best.forEach(v=>{
      const card=document.createElement('article'); card.className='card';
      card.innerHTML=`<video src="${v.url}" poster="${v.image}" muted playsinline loop preload="metadata"></video><div class="meta"><div class="score">score ${v.score.toFixed(1)}</div><div class="query">${v.query}</div><div class="credit">${v.photographer} · Pexels</div></div>`;
      const vid=card.querySelector('video');
      card.addEventListener('mouseenter',()=>vid.play().catch(()=>{}));
      card.addEventListener('mouseleave',()=>vid.pause());
      results.appendChild(card);
    });
    status.textContent=`${best.length} clips trouvés. On peut maintenant sélectionner les meilleurs plans pour le montage.`;
  }catch(e){status.textContent=e.message}
}
$('generate').addEventListener('click',run);

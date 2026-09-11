/* Sunami — couche UX légère, sans toucher à la logique métier/auth.
   Chargée via analytics.js pour rester indépendante des gros fichiers app/landing. */
(function(){
  'use strict';

  function css(){
    if(document.getElementById('sunami-ux-style')) return;
    var s=document.createElement('style'); s.id='sunami-ux-style';
    s.textContent=`
      .sunami-journey{margin:0 auto 22px;max-width:420px;text-align:left;padding:12px 14px;border:1px solid var(--line);border-radius:16px;background:color-mix(in srgb,var(--card) 88%,transparent);box-shadow:0 8px 24px -18px rgba(20,184,166,.45)}
      .sunami-journey-top{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:11px;font-weight:800;color:var(--muted);margin-bottom:8px}
      .sunami-journey-top strong{color:var(--foam)}
      .sunami-journey-track{height:7px;border-radius:99px;background:var(--line);overflow:hidden}
      .sunami-journey-fill{height:100%;width:20%;border-radius:99px;background:linear-gradient(90deg,var(--wave-2),var(--wave));transition:width .35s var(--ease)}
      .sunami-promise{display:flex;justify-content:center;flex-wrap:wrap;gap:7px;margin:-8px auto 20px;color:var(--muted);font-size:11px;font-weight:800}
      .sunami-promise span{padding:5px 9px;border-radius:99px;background:var(--surf);border:1px solid var(--line)}
      .sunami-tap{animation:sunamiTap .28s var(--ease)}
      @keyframes sunamiTap{50%{transform:scale(.97)}}
      .sunami-loading{pointer-events:none;opacity:.78!important}
      .sunami-loading::after{content:'  •••';letter-spacing:2px}
      @media(prefers-reduced-motion:reduce){.sunami-journey-fill{transition:none}.sunami-tap{animation:none}}
    `;
    document.head.appendChild(s);
  }

  function addOnboardingUX(){
    var pick=document.getElementById('pickScreen');
    if(!pick || document.getElementById('sunamiJourney')) return;
    var hero=pick.querySelector('.pick-hero');
    var steps=pick.querySelectorAll('.pick-step');
    if(!hero || !steps.length) return;

    var journey=document.createElement('div');
    journey.id='sunamiJourney'; journey.className='sunami-journey';
    journey.innerHTML='<div class="sunami-journey-top"><span><strong id="sunamiJourneyCount">1</strong> / '+steps.length+'</span><span id="sunamiJourneyLabel">Ton histoire se construit</span></div><div class="sunami-journey-track"><div class="sunami-journey-fill" id="sunamiJourneyFill"></div></div>';
    hero.insertAdjacentElement('afterend',journey);

    var promise=document.createElement('div'); promise.className='sunami-promise';
    promise.innerHTML='<span>⚡ ~60 secondes</span><span>🎭 histoire personnalisée</span><span>🌊 gratuit</span>';
    journey.insertAdjacentElement('afterend',promise);

    function current(){
      for(var i=0;i<steps.length;i++){
        var r=steps[i].getBoundingClientRect();
        var visible=r.top < window.innerHeight*.65 && r.bottom > 80;
        if(visible && getComputedStyle(steps[i]).display!=='none') return i;
      }
      var active=pick.querySelector('.pick-step.active,.pick-step.current');
      if(active){var n=parseInt(active.dataset.step,10);if(!isNaN(n))return n;}
      return 0;
    }
    function update(){
      var i=current(), total=steps.length, pct=Math.max(20,((i+1)/total)*100);
      var c=document.getElementById('sunamiJourneyCount'), f=document.getElementById('sunamiJourneyFill'), l=document.getElementById('sunamiJourneyLabel');
      if(c)c.textContent=i+1; if(f)f.style.width=pct+'%';
      if(l)l.textContent=i===total-1?'Prêt ? Le conteur arrive…':i===0?'On fait connaissance…':'Ton histoire se construit…';
    }
    update();
    var mo=new MutationObserver(update); mo.observe(pick,{subtree:true,attributes:true,attributeFilter:['class','style']});
    window.addEventListener('resize',update,{passive:true});

    pick.addEventListener('click',function(e){
      var b=e.target.closest('.pick-grid button,.pick-next,#startBtn');
      if(!b)return;
      b.classList.remove('sunami-tap'); void b.offsetWidth; b.classList.add('sunami-tap');
      setTimeout(update,30);
    });

    var name=document.getElementById('firstName');
    if(name){
      setTimeout(function(){ if(!name.value && document.visibilityState==='visible') name.focus(); },250);
      name.addEventListener('keydown',function(e){
        if(e.key==='Enter'){
          var next=pick.querySelector('.pick-step[data-step="0"] .pick-next');
          if(next && !next.disabled){e.preventDefault();next.click();}
        }
      });
    }
  }

  function polishLanding(){
    var b=document.getElementById('googleBtn');
    if(b && !b.dataset.sunamiUx){
      b.dataset.sunamiUx='1';
      b.addEventListener('click',function(){
        if(b.dataset.loading==='1') return;
        b.dataset.loading='1'; b.classList.add('sunami-loading');
        var original=b.textContent; b.dataset.original=original; b.textContent='Préparation de ton histoire…';
        setTimeout(function(){
          if(document.body.contains(b) && b.dataset.loading==='1'){
            b.dataset.loading='0'; b.classList.remove('sunami-loading'); b.textContent=b.dataset.original||original;
          }
        },7000);
      },false);
    }
  }

  function boot(){css();addOnboardingUX();polishLanding();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  new MutationObserver(function(){addOnboardingUX();polishLanding();}).observe(document.documentElement,{childList:true,subtree:true});
})();

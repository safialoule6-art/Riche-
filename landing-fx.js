/* Sunami — effets interactifs de la landing (niveau top SaaS).
   100% additif : n'altère ni l'i18n, ni la démo jouable, ni l'auth. */
(function(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer:fine)').matches;

  /* 1) Barre de progression de lecture */
  const bar = document.getElementById('scrollProgress');
  if(bar){
    const onScroll = () => {
      const h = document.documentElement;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      const p = Math.min(1, Math.max(0, h.scrollTop / max));
      bar.style.transform = 'scaleX(' + p + ')';
    };
    document.addEventListener('scroll', onScroll, { passive:true });
    onScroll();
  }

  /* 2) Halo lumineux qui suit le curseur (desktop) */
  const glow = document.getElementById('cursorGlow');
  if(glow && fine && !reduce){
    let x = innerWidth/2, y = innerHeight/2, tx = x, ty = y;
    window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive:true });
    (function raf(){
      x += (tx - x) * 0.15; y += (ty - y) * 0.15;
      glow.style.transform = 'translate(' + (x - 300) + 'px,' + (y - 300) + 'px)';
      requestAnimationFrame(raf);
    })();
  }

  /* 3) Tilt 3D sur le mockup et les cartes */
  if(fine && !reduce){
    document.querySelectorAll('.hm-phone, .feature-card, .price-card').forEach(el => {
      el.style.transition = 'transform .15s ease';
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(820px) rotateX(' + (-py*7) + 'deg) rotateY(' + (px*7) + 'deg)';
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* 4) Démo du hero qui rejoue en boucle (effet "vivant") */
  const screen = document.querySelector('.hero-mockup .hm-screen');
  if(screen && !reduce){
    const items = screen.querySelectorAll('.hm-msg, .hm-input');
    if(items.length){
      screen.classList.add('hm-animate');
      const step = 720, startDelay = 350, pause = 2600;
      const play = () => {
        items.forEach(it => it.classList.remove('hm-show'));
        items.forEach((it, i) => setTimeout(() => it.classList.add('hm-show'), startDelay + i*step));
      };
      play();
      setInterval(play, startDelay + items.length*step + pause);
    }
  }
})();

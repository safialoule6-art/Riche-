// Free browser renderer. Isolated from Sunami production files.
// Uses the same-origin Pexels proxy so remote clips can safely be drawn to canvas.
function wrap(ctx,text,maxWidth,fontSize){ctx.font=`800 ${fontSize}px Arial,sans-serif`;const words=text.split(/\s+/);const lines=[];let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test}if(line)lines.push(line);return lines}
function drawCaption(ctx,text,x,y,maxWidth,fontSize,accent,isCta=false){
  const lines=wrap(ctx,text,maxWidth,fontSize),lh=fontSize*1.08,start=y-(lines.length-1)*lh/2;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`800 ${fontSize}px Arial,sans-serif`;
  for(let i=0;i<lines.length;i++){
    const yy=start+i*lh, words=lines[i].split(' '), widths=words.map(w=>ctx.measureText(w).width), gap=fontSize*.22;
    const total=widths.reduce((a,b)=>a+b,0)+gap*(words.length-1);let cx=x-total/2;
    for(let j=0;j<words.length;j++){
      const w=words[j], ww=widths[j], lower=w.toLowerCase().replace(/[^a-zàâçéèêëîïôûùüÿœ'-]/gi,'');
      const highlight=isCta||/anglais|parler|bloque|bloqué|mots|rien|impossible|change|façon|pratiques|pratique|histoire|link|bio/.test(lower);
      const color=highlight?accent:'#fff';
      ctx.lineWidth=12;ctx.strokeStyle='rgba(0,0,0,.62)';ctx.strokeText(w,cx+ww/2,yy);ctx.fillStyle=color;ctx.fillText(w,cx+ww/2,yy);cx+=ww+gap;
    }
  }
}
function makeAudio(ac,duration){const dest=ac.createMediaStreamDestination(),master=ac.createGain();master.gain.value=.035;master.connect(dest);const notes=[220,277.18,329.63,369.99,329.63,277.18,246.94,329.63];let t=ac.currentTime+.05;for(let i=0;t<ac.currentTime+duration+1;i++){const o=ac.createOscillator(),g=ac.createGain();o.type='triangle';o.frequency.value=notes[i%notes.length];g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.16,t+.025);g.gain.exponentialRampToValueAtTime(.001,t+.34);o.connect(g);g.connect(master);o.start(t);o.stop(t+.36);t+=.30}return dest.stream}
function chooseMime(){const choices=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm'];return choices.find(x=>MediaRecorder.isTypeSupported(x))||''}
export async function renderCreative({videos,lines,duration=12,onProgress=()=>{}}){
  if(!videos?.length)throw new Error('Aucun clip sélectionné.');
  const W=1080,H=1920,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d',{alpha:false});
  const els=[];
  for(const item of videos.slice(0,4)){
    const v=document.createElement('video');v.crossOrigin='anonymous';v.muted=true;v.playsInline=true;v.preload='auto';v.src=item.renderUrl||item.url;
    await new Promise((ok,bad)=>{v.onloadedmetadata=ok;v.onerror=()=>bad(new Error('Un clip Pexels ne peut pas être chargé.'))});
    v.currentTime=0;els.push(v);
  }
  const ac=new AudioContext(),audio=makeAudio(ac,duration),stream=new MediaStream([...canvas.captureStream(30).getVideoTracks(),...audio.getAudioTracks()]);
  const mime=chooseMime();if(!mime)throw new Error('Ce navigateur ne supporte pas l’export vidéo. Essaie Chrome.');
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000}),chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);const done=new Promise(r=>rec.onstop=r);rec.start(250);await ac.resume();await Promise.all(els.map(v=>v.play().catch(()=>{})));
  const start=performance.now(),sceneDur=duration/4,lineDur=duration/lines.length;
  function frame(now){
    const elapsed=(now-start)/1000;if(elapsed>=duration){rec.stop();return}
    const scene=Math.min(3,Math.floor(elapsed/sceneDur)),local=elapsed%sceneDur,v=els[scene%els.length];
    const scale=Math.max(W/v.videoWidth,H/v.videoHeight)*(1+Math.min(.055,local/sceneDur*.055));
    const dw=v.videoWidth*scale,dh=v.videoHeight*scale,pan=Math.sin((local/sceneDur)*Math.PI)*18;
    ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(pan,0);ctx.drawImage(v,(W-dw)/2,(H-dh)/2,dw,dh);ctx.restore();
    // Subtle vignette/contrast layer for readable captions.
    const grad=ctx.createLinearGradient(0,H*.48,0,H);grad.addColorStop(0,'rgba(0,0,0,0)');grad.addColorStop(1,'rgba(0,0,0,.55)');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    const li=Math.min(lines.length-1,Math.floor(elapsed/lineDur)),accent=li===lines.length-1?'#7CFF57':li%2?'#5BC7FF':'#FFFFFF';
    drawCaption(ctx,lines[li]||'',W/2,H*.72,W*.82,70,accent,li===lines.length-1);
    onProgress(Math.round(elapsed/duration*100));requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);await done;audio.getTracks().forEach(t=>t.stop());els.forEach(v=>{v.pause();v.src='';});
  const blob=new Blob(chunks,{type:mime}),ext=mime.startsWith('video/mp4')?'mp4':'webm';return{blob,url:URL.createObjectURL(blob),filename:`sunami-tiktok-${Date.now()}.${ext}`};
}

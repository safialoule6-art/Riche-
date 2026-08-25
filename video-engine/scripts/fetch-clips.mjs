import {mkdir, writeFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';

const endpoint = process.env.PEXELS_ENDPOINT || 'https://sunami-rho.vercel.app/api/pexels';
const jobs = [
  ['young person talking to camera worried','person nervous speaking selfie'],
  ['young person awkward conversation','person listening confused conversation'],
  ['person embarrassed reaction conversation','young adult speechless reaction'],
  ['person frustrated phone','young person frustrated studying'],
  ['student studying phone tired','young person learning language'],
  ['person frustrated conversation','young adult thinking stressed'],
  ['young person smiling discovery phone','person excited finding something phone'],
  ['young person happy phone selfie','person talking to camera smiling'],
];

await mkdir('public/clips',{recursive:true});
const manifest=[];
for(let i=0;i<jobs.length;i++){
  const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({queries:jobs[i],locale:'fr-FR',target_duration:1.6,per_page:10})});
  if(!r.ok) throw new Error(`Pexels endpoint ${r.status}`);
  const data=await r.json();
  const candidates=(data.videos||[]).filter(v=>Number(v.height)>=Number(v.width)).sort((a,b)=>(b.score||0)-(a.score||0));
  if(!candidates[0]) throw new Error(`No portrait clip for scene ${i+1}`);
  const v=candidates[0];
  const target=`public/clips/clip-${String(i+1).padStart(2,'0')}.mp4`;
  const response=await fetch(v.url);
  if(!response.ok) throw new Error(`Download failed for scene ${i+1}`);
  await pipeline(response.body,createWriteStream(target));
  manifest.push({scene:i+1,id:v.id,source:v.url,pexels:v.pexels_url,photographer:v.photographer,query:v.query});
  console.log(`scene ${i+1}: ${v.id} ${v.photographer}`);
}
await writeFile('public/clips/manifest.json',JSON.stringify(manifest,null,2));

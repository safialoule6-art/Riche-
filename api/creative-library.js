// Public read-only bridge from the latest GitHub Release to the Creative Engine.
// The release is created only after the agent has produced and validated 50 videos.
export const config = { runtime: 'edge' };
const REPO = 'safialoule6-art/Riche-';
function json(data, status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, s-maxage=60, stale-while-revalidate=300'}})}
export default async function handler(){
  try{
    const r=await fetch(`https://api.github.com/repos/${REPO}/releases/latest`,{headers:{Accept:'application/vnd.github+json','User-Agent':'sunami-creative-engine'}});
    if(!r.ok)return json({videos:[],error:`GitHub releases ${r.status}`},r.status===404?200:r.status);
    const release=await r.json();
    const videos=(release.assets||[])
      .filter(a=>/^sunami-\d{2}\.mp4$/i.test(a.name) && a.state==='uploaded')
      .sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}))
      .map(a=>({name:a.name,url:a.browser_download_url,size:a.size,digest:a.digest||null}));
    return json({release:release.tag_name,created_at:release.created_at,videos,count:videos.length});
  }catch(e){return json({videos:[],error:String(e?.message||e)},200)}
}

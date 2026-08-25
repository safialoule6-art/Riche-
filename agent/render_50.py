"""Run the Sunami autopilot with decisions made by the local AI agent.

The browser is the execution tool; the LLM decides the creative angles. The job is
strict: it succeeds only after 50 real downloadable MP4s exist.
"""
from __future__ import annotations
import asyncio, json, shutil, subprocess
from pathlib import Path
from playwright.async_api import async_playwright

SITE='https://sunami-rho.vercel.app/creative.html?autopilot=50&agent=1'
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'agent/artifacts/videos'; OUT.mkdir(parents=True,exist_ok=True)
CONCEPTS=ROOT/'agent/artifacts/agent-concepts.json'

def clean_output():
    for p in OUT.glob('*'):
        if p.is_file(): p.unlink()

def mp4_normalize():
    mp4s=[]
    for src in sorted(OUT.glob('*')):
        if src.suffix.lower()=='.mp4':
            dst=src.with_name(src.stem+'-ready.mp4')
        elif src.suffix.lower()=='.webm':
            dst=src.with_suffix('.mp4')
        else: continue
        subprocess.run(['ffmpeg','-y','-i',str(src),'-c:v','libx264','-preset','ultrafast','-crf','28','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',str(dst)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        if dst!=src: src.unlink()
        if dst.name.endswith('-ready.mp4'):
            final=dst.with_name(dst.name.replace('-ready.mp4','.mp4')); dst.replace(final)
        mp4s.append(final if 'final' in locals() else dst)
    mp4s=sorted([p for p in OUT.glob('*.mp4')])
    if len(mp4s)!=50: raise RuntimeError(f'FFmpeg normalization produced {len(mp4s)}/50 MP4s')
    for i,p in enumerate(mp4s,1):
        target=OUT/f'sunami-{i:02d}.mp4'
        if p!=target:
            if target.exists(): target.unlink()
            p.rename(target)
    return sorted(OUT.glob('sunami-*.mp4'))

async def main():
    if not CONCEPTS.exists(): raise RuntimeError('agent-concepts.json manquant: l agent IA n a pas produit ses décisions')
    concepts=json.loads(CONCEPTS.read_text(encoding='utf-8'))
    if len(concepts)!=50: raise RuntimeError(f'Agent IA a produit {len(concepts)}/50 concepts')
    clean_output()
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        context=await browser.new_context(accept_downloads=True,viewport={'width':390,'height':844},device_scale_factor=1)
        page=await context.new_page()
        errors=[]
        page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' else None)
        await page.add_init_script('window.__SUNAMI_AGENT_CONCEPTS__ = '+json.dumps(concepts,ensure_ascii=False)+';')
        await page.goto(SITE,wait_until='domcontentloaded',timeout=60000)
        await page.wait_for_selector('#libraryGrid',timeout=60000)
        await page.wait_for_function("""()=>{const s=document.querySelector('#status')?.textContent||'';return s.includes('50/50')||s.includes('Autopilot arrêté')||s.includes('échec')}""",timeout=50*60*1000)
        links=page.locator('#libraryGrid a.download'); count=await links.count(); status=await page.locator('#status').inner_text()
        if count!=50: raise RuntimeError(f'Autopilot produced {count}/50 downloadable videos. Status: {status}')
        for i in range(count):
            async with page.expect_download(timeout=120000) as di:
                await links.nth(i).click()
            d=await di.value; await d.save_as(str(OUT/f'raw-{i+1:02d}{Path(d.suggested_filename or ".webm").suffix}'))
            print(f'downloaded {i+1}/{count}')
        await browser.close()
    mp4s=mp4_normalize()
    (OUT.parent/'batch-errors.txt').write_text('\n'.join(errors),encoding='utf-8')
    (OUT.parent/'batch-status.json').write_text(json.dumps({'status':'success','videos':50,'format':'mp4','agent':'qwen3-local'},ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps({'videos':len(mp4s),'agent':'qwen3-local','status':'success'}))

if __name__=='__main__': asyncio.run(main())

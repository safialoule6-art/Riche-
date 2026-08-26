"""Autonomous local creative director for Sunami.
Uses Ollama JSON mode + retries so generation never depends on fragile array extraction.
"""
from __future__ import annotations
import json, os, re, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; ART=ROOT/'agent/artifacts'; ART.mkdir(parents=True,exist_ok=True)
MODEL=os.getenv('OLLAMA_MODEL','qwen3:4b'); OLLAMA='http://127.0.0.1:11434/api/chat'
RULES=[
'French TikTok first: natural spoken French, never translated ad copy.',
'First seconds show only the human problem; no Sunami or mascot until final beat.',
'POV/UGC/reaction/conversation footage first; avoid generic corporate stock.',
'Never show labels such as hook/problem/solution.',
'Short spoken-looking lines, varied rhythm, concrete situations and emotional specificity.',
'Captions are mobile-first and emphasize only important words with color.',
'CTA only the final beat: Link en bio.',
'No app pitch, feature list or fake miracle claim.',
'Every concept materially different.'
]
SYSTEM='Tu es le directeur créatif TikTok de Sunami. Pense comme un créateur français qui doit arrêter le scroll en 2026. Décisions originales, concrètes et naturelles. Ne copie jamais une créa existante et ne parle pas comme une IA.'

def call_llm(prompt,strict=False):
    body=json.dumps({'model':MODEL,'stream':False,'format':'json','options':{'temperature':0.75 if strict else 0.9,'num_ctx':6000,'num_predict':1800},'messages':[{'role':'system','content':SYSTEM+(' Réponds uniquement avec un objet JSON valide.' if strict else '')},{'role':'user','content':prompt}]}).encode()
    req=urllib.request.Request(OLLAMA,data=body,headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=300) as r: return json.loads(r.read()).get('message',{}).get('content','')

def parse_obj(text):
    text=re.sub(r'<think>.*?</think>','',text,flags=re.S).strip()
    try:
        x=json.loads(text)
        if isinstance(x,dict): return x
    except Exception: pass
    a,b=text.find('{'),text.rfind('}')
    if a>=0 and b>a:
        x=json.loads(text[a:b+1])
        if isinstance(x,dict): return x
    raise ValueError('JSON object absent or invalid')

def load_research():
    p=ART/'browser-report.json'
    if not p.exists(): return {}
    try: return json.loads(p.read_text(encoding='utf-8')).get('tiktok_research',{})
    except Exception: return {}

def load_remotion():
    parts=[]
    for name,limit in [('remotion-best-practices/SKILL.md',1800),('remotion-captions/SKILL.md',1400),('remotion-render/SKILL.md',1000)]:
        p=ROOT/'.agents/skills'/name
        if p.exists(): parts.append(f'--- {name} ---\n'+p.read_text(encoding='utf-8',errors='ignore')[:limit])
    return '\n'.join(parts)

def searches(v,hook):
    out=[]
    if isinstance(v,list):
        for q in v:
            if isinstance(q,list) and q: out.append([str(q[0]),str(q[1]) if len(q)>1 else str(q[0])])
            elif isinstance(q,str) and q.strip(): out.append([q.strip(),q.strip()])
    for q in [f'{hook} personne français','conversation anglais français','personne bloquée anglais','ami conversation anglais']:
        if len(out)>=4: break
        if not any(x[0].lower()==q.lower() for x in out): out.append([q,q])
    return out[:4]

def validate(items,seen):
    clean=[]
    for c in items if isinstance(items,list) else []:
        if not isinstance(c,dict): continue
        hook=str(c.get('hook','')).strip(); lines=c.get('lines')
        if not hook or not isinstance(lines,list) or len(lines)<4: continue
        key=re.sub(r'\s+',' ',hook.lower())
        if key in seen: continue
        if any(x in hook.lower() for x in ['découvre sunami','application sunami','solution miracle']): continue
        lines=[str(x).strip() for x in lines if str(x).strip() and str(x).strip().lower()!='link en bio.'][:5]
        if len(lines)<4: continue
        c['hook']=hook; c['lines']=lines+['Link en bio.']; c['searches']=searches(c.get('searches'),hook); c['market']='fr'; c['locale']='fr-FR'
        c['rules']={'noProductBeforeLast':True,'noMascotBeforeReveal':True,'ugcFirst':True,'ctaLast':True,'maxSeconds':12}
        clean.append(c); seen.add(key)
    return clean

def main():
    research=load_research(); visible=str(research.get('visible_text_sample',''))[:2200]; remotion=load_remotion()[:4200]
    situations=['ami bilingue','restaurant','travail','appel','aéroport','date','série','jeu','cours','message vocal','voyage','peur du jugement','petite victoire','mot qui bloque','accent']
    all_items=[]; seen=set()
    for batch in range(10):
        start=batch*5+1; sit=situations[batch:batch+5]
        prompt=f'''Crée les concepts {start} à {start+4} d'un lot de 50 vidéos TikTok FR.
PROBLÈME: « Je comprends l'anglais mais dès qu'il faut parler, je bloque. »
RÈGLES:\n{chr(10).join('- '+x for x in RULES)}
ANGLES: {', '.join(sit)}
SIGNAUX TIKTOK OBSERVÉS:\n{visible}
GUIDANCE REMOTION:\n{remotion}
HOOKS DÉJÀ PRIS:\n{json.dumps([x['hook'] for x in all_items[-25:]],ensure_ascii=False)}
Réponds avec exactement un objet JSON de forme {{"concepts":[{{"hook":"phrase naturelle","lines":["hook","ligne 2","ligne 3","ligne 4"],"searches":[["requête Pexels","synonyme"],["requête Pexels","synonyme"]]}}]}}. Le tableau doit contenir 5 objets. Aucun markdown ni explication.'''
        accepted=[]; err='unknown'
        for attempt in range(2):
            try:
                obj=parse_obj(call_llm(prompt,strict=attempt==1)); accepted=validate(obj.get('concepts'),seen)
                if accepted: break
                err='0 valid concepts'
            except Exception as e: err=str(e)[:180]
            print(json.dumps({'batch':batch+1,'attempt':attempt+1,'accepted':0,'error':err},ensure_ascii=False),flush=True)
        all_items.extend(accepted)
        print(json.dumps({'batch':batch+1,'accepted':len(accepted),'total':len(all_items),'model':MODEL},ensure_ascii=False),flush=True)
        if len(all_items)>=50: break
    if len(all_items)<50: raise SystemExit(f'Agent IA: seulement {len(all_items)}/50 concepts valides')
    final=all_items[:50]
    for i,c in enumerate(final,1): c['id']=f'FR-AI-{i:02d}'
    (ART/'agent-concepts.json').write_text(json.dumps(final,ensure_ascii=False,indent=2),encoding='utf-8')
    (ART/'creative-director-report.json').write_text(json.dumps({'agent':'qwen3-local','model':MODEL,'concepts':50,'research_used':bool(visible),'remotion_guidance_loaded':bool(remotion)},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'agent':'qwen3-local','model':MODEL,'concepts':50,'status':'success'},ensure_ascii=False),flush=True)
if __name__=='__main__': main()

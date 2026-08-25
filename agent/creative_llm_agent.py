"""Free local creative director for Sunami.

It uses Ollama + Qwen3 locally on the GitHub runner. No paid LLM API is required.
The model receives public TikTok Creative Center observations and Sunami's creative
contract, then decides the 50 angles, hooks, scene searches and CTA lines.
"""
from __future__ import annotations
import json, os, re, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'agent'/'artifacts'; ART.mkdir(parents=True,exist_ok=True)
MODEL=os.getenv('OLLAMA_MODEL','qwen3:0.6b')
OLLAMA='http://127.0.0.1:11434/api/chat'

RULES=[
 'French TikTok first: natural French, not translated ad copy.',
 'First 2 seconds are the human problem; never show or name Sunami before the final beat.',
 'POV/UGC/reaction/conversation footage preferred; no generic corporate stock.',
 'No headings such as hook/problem/solution in the video.',
 'Short spoken-looking lines, varied rhythm, concrete situations and emotional specificity.',
 'Color only important caption words; captions must be readable on a phone.',
 'CTA is only the final beat: link en bio.',
 'Every concept must be materially different from the others.',
]

def call_llm(prompt:str)->str:
    body=json.dumps({'model':MODEL,'stream':False,'options':{'temperature':0.9,'num_ctx':12000},'messages':[{'role':'system','content':'Tu es un directeur créatif TikTok français très exigeant. Tu dois prendre des décisions, pas répéter un brief. Retourne uniquement du JSON valide quand on te le demande.'},{'role':'user','content':prompt}]}).encode()
    req=urllib.request.Request(OLLAMA,data=body,headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=240) as r:return json.loads(r.read())['message']['content']

def extract_json(text:str):
    text=re.sub(r'<think>.*?</think>','',text,flags=re.S).strip()
    m=re.search(r'```(?:json)?\s*(\[.*?\])\s*```',text,re.S)
    if m:text=m.group(1)
    else:
        start=text.find('['); end=text.rfind(']'); text=text[start:end+1] if start>=0 and end>start else text
    return json.loads(text)

def main():
    research={}
    p=ART/'browser-report.json'
    if p.exists():
        try:research=json.loads(p.read_text(encoding='utf-8')).get('tiktok_research',{})
        except Exception:pass
    visible=str(research.get('visible_text_sample',''))[:9000]
    prompt=f'''Objectif: produire 50 concepts de vidéos TikTok de 12 secondes pour Sunami, une app d'apprentissage des langues.
Problème actuel: « Je comprends l'anglais mais dès qu'il faut parler, je bloque. »

Tu as le pouvoir de choisir les angles. Observe les signaux publics ci-dessous provenant du TikTok Creative Center et déduis des patterns (rythme, situation, curiosité, langage, type de créa). Ne copie aucun script ni aucune vidéo.

RÈGLES:
{chr(10).join('- '+x for x in RULES)}

OBSERVATIONS TIKTOK:
{visible}

Retourne exactement une liste JSON de 50 objets. Chaque objet doit contenir:
{{"id":"FR-AI-01","market":"fr","locale":"fr-FR","hook":"...","lines":["hook","ligne 2","ligne 3","ligne 4","ligne 5","link en bio"],"searches":[["requête Pexels 1","synonyme"],["requête Pexels 2","synonyme"],["requête Pexels 3","synonyme"],["requête Pexels 4","synonyme"]],"rules":{{"noProductBeforeLast":true,"noMascotBeforeReveal":true,"ugcFirst":true,"ctaLast":true,"maxSeconds":12}}}}

Les 50 hooks doivent être différents et les situations doivent varier: conversation réelle, téléphone, travail, voyage, restaurant, film/série, ami bilingue, réunion, appel, honte, frustration, petit progrès, etc. Pas de discours marketing. Pas de « découvre cette application ». Pas de « solution miracle ».''' 
    last=''
    for _ in range(3):
        try:
            data=extract_json(call_llm(prompt if not last else prompt+'\nTa réponse précédente était invalide. Recommence uniquement avec le JSON demandé.'))
            clean=[]; seen=set()
            for c in data:
                if not isinstance(c,dict) or not c.get('hook') or not isinstance(c.get('lines'),list) or not isinstance(c.get('searches'),list):continue
                key=c['hook'].strip().lower()
                if key in seen:continue
                c['id']=f"FR-AI-{len(clean)+1:02d}"; c['market']='fr'; c['locale']='fr-FR'; c['lines']=c['lines'][:6]; c['searches']=c['searches'][:4]
                if len(c['lines'])>=4 and len(c['searches'])==4:clean.append(c);seen.add(key)
                if len(clean)==50:break
            if len(clean)>=50:
                (ART/'agent-concepts.json').write_text(json.dumps(clean,ensure_ascii=False,indent=2),encoding='utf-8')
                print(json.dumps({'agent':'qwen3-local','model':MODEL,'concepts':50}))
                return
            last=str(data)
        except Exception as e:last=str(e)
    raise SystemExit('Agent IA: impossible de produire 50 concepts JSON valides')

if __name__=='__main__':main()

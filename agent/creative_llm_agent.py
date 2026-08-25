"""Autonomous local creative director for Sunami.

Uses a stronger free local Qwen3 model and asks it to make decisions in small
batches so one giant JSON response does not stall. The agent gets an objective
and constraints, not a fixed script, and must diversify the 50 concepts.
"""
from __future__ import annotations
import json, os, re, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'agent' / 'artifacts'
ART.mkdir(parents=True, exist_ok=True)
MODEL = os.getenv('OLLAMA_MODEL', 'qwen3:4b')
OLLAMA = 'http://127.0.0.1:11434/api/chat'

RULES = [
    'French TikTok first: natural spoken French, never translated ad copy.',
    'First 2 seconds are only the human problem. Never show/name Sunami before the final beat.',
    'POV/UGC/reaction/conversation footage first; reject generic corporate stock.',
    'Never put labels such as hook/problem/solution in the video.',
    'Short spoken-looking lines, varied rhythm, concrete situations and emotional specificity.',
    'Captions are mobile-first and emphasize only important words with color.',
    'CTA is only the final beat: link en bio.',
    'No app pitch, no feature list, no fake miracle claim.',
    'Every concept must be materially different from the others.',
]

SYSTEM = '''Tu es le directeur créatif TikTok de Sunami. Tu as un objectif, des contraintes et des observations. Tu dois prendre des décisions créatives originales et exigeantes, pas paraphraser le brief. Pense comme quelqu'un qui doit arrêter le scroll dans un feed français en 2026. Ne copie jamais une créa existante.'''


def call_llm(prompt: str) -> str:
    body = json.dumps({'model': MODEL, 'stream': False,
        'options': {'temperature': 0.95, 'num_ctx': 10000},
        'messages': [{'role': 'system', 'content': SYSTEM}, {'role': 'user', 'content': prompt}]}).encode()
    req = urllib.request.Request(OLLAMA, data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=420) as r:
        return json.loads(r.read())['message']['content']


def extract_json(text: str):
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.S).strip()
    m = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', text, re.S)
    if m: text = m.group(1)
    else:
        start, end = text.find('['), text.rfind(']')
        if start >= 0 and end > start: text = text[start:end + 1]
    return json.loads(text)


def load_research():
    p = ART / 'browser-report.json'
    if not p.exists(): return {}
    try: return json.loads(p.read_text(encoding='utf-8')).get('tiktok_research', {})
    except Exception: return {}


def validate(items, seen):
    clean = []
    for c in items if isinstance(items, list) else []:
        if not isinstance(c, dict): continue
        hook = str(c.get('hook', '')).strip(); lines = c.get('lines'); searches = c.get('searches')
        if not hook or not isinstance(lines, list) or len(lines) < 5: continue
        if not isinstance(searches, list) or len(searches) < 4: continue
        key = re.sub(r'\s+', ' ', hook.lower())
        if key in seen: continue
        if any(x in hook.lower() for x in ['découvre sunami', 'application sunami', 'solution miracle']): continue
        c['hook'] = hook
        c['lines'] = [str(x).strip() for x in lines[:6] if str(x).strip()]
        if not c['lines'] or c['lines'][-1].lower() != 'link en bio.': c['lines'] = c['lines'][:5] + ['Link en bio.']
        c['searches'] = [[str(x) for x in q[:2]] for q in searches[:4] if isinstance(q, list) and q]
        if len(c['searches']) < 4: continue
        c['market'] = 'fr'; c['locale'] = 'fr-FR'
        c['rules'] = {'noProductBeforeLast': True, 'noMascotBeforeReveal': True, 'ugcFirst': True, 'ctaLast': True, 'maxSeconds': 12}
        clean.append(c); seen.add(key)
    return clean


def main():
    research = load_research()
    visible = str(research.get('visible_text_sample', ''))[:12000]
    all_items, seen = [], set()
    situations = [
        'conversation avec un ami bilingue', 'restaurant', 'travail et reunion', 'appel telephonique',
        'voyage et aeroport', 'date ou rencontre', 'film ou serie', 'jeu video', 'classe ou cours',
        'message vocal', 'visite a l etranger', 'honte devant quelqu un', 'petite victoire',
        'comprehension parfaite mais parole bloquee', 'accent et peur du jugement']
    for batch in range(5):
        start = batch * 10 + 1
        sit = situations[batch*3:(batch+1)*3]
        prompt = f'''OBJECTIF: produire les concepts {start} a {start+9} d'un batch total de 50 videos TikTok FR pour Sunami, app d'apprentissage des langues.
Probleme: « Je comprends l'anglais mais des qu'il faut parler, je bloque. »
Tu choisis librement les angles. Etudie les signaux publics observes dans TikTok Creative Center et deduis des patterns de retention, situation, rythme et langage, sans copier une video.

CONTRAINTES:
{chr(10).join('- '+x for x in RULES)}
SITUATIONS A PRIVILEGIER: {', '.join(sit)}
OBSERVATIONS TIKTOK:
{visible}
HOOKS DEJA UTILISES: {json.dumps([x['hook'] for x in all_items], ensure_ascii=False)}

Retourne EXACTEMENT 10 objets JSON dans une liste, chacun avec:
{{"hook":"...","lines":["hook","ligne 2","ligne 3","ligne 4","ligne 5","Link en bio."],"searches":[["requete Pexels 1","synonyme"],["requete Pexels 2","synonyme"],["requete Pexels 3","synonyme"],["requete Pexels 4","synonyme"]]}}
Hooks naturels et spécifiques. Aucun marketing visible avant la fin.'''
        last_error = ''
        for _ in range(3):
            try:
                parsed = extract_json(call_llm(prompt if not last_error else prompt + '\nLa sortie precedente etait invalide. Recommence avec exactement 10 objets JSON valides.'))
                new = validate(parsed, seen); all_items.extend(new)
                print(json.dumps({'batch': batch + 1, 'accepted': len(new), 'total': len(all_items), 'model': MODEL}))
                if len(new) >= 8: break
                last_error = 'batch insuffisant'
            except Exception as e: last_error = str(e)
        if len(all_items) >= 50: break
    if len(all_items) < 50: raise SystemExit(f'Agent IA: seulement {len(all_items)}/50 concepts valides')
    final = all_items[:50]
    for i, c in enumerate(final, 1): c['id'] = f'FR-AI-{i:02d}'
    (ART / 'agent-concepts.json').write_text(json.dumps(final, ensure_ascii=False, indent=2), encoding='utf-8')
    (ART / 'creative-director-report.json').write_text(json.dumps({'agent':'qwen3-local','model':MODEL,'concepts':50,'research_used':bool(visible)}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'agent':'qwen3-local','model':MODEL,'concepts':50,'status':'success'}))

if __name__ == '__main__': main()

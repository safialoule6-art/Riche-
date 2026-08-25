"""Autonomous local creative director for Sunami.

The model receives live TikTok research plus the official Remotion agent skills as
production guidance. It decides the creative angles; the browser and renderer execute
them. The task is bounded to 10 short calls so the free GitHub runner can finish.
"""
from __future__ import annotations
import json, os, re, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "agent" / "artifacts"
ART.mkdir(parents=True, exist_ok=True)
MODEL = os.getenv("OLLAMA_MODEL", "qwen3:4b")
OLLAMA = "http://127.0.0.1:11434/api/chat"

RULES = [
    "French TikTok first: natural spoken French, never translated ad copy.",
    "The first seconds show only the human problem; no Sunami or mascot until the final beat.",
    "POV/UGC/reaction/conversation footage first; avoid generic corporate stock.",
    "Never show labels such as hook/problem/solution.",
    "Short spoken-looking lines, varied rhythm, concrete situations and emotional specificity.",
    "Captions are mobile-first and emphasize only important words with color.",
    "CTA is only the final beat: Link en bio.",
    "No app pitch, feature list or fake miracle claim.",
    "Every concept must be materially different.",
]
SYSTEM = """Tu es le directeur créatif TikTok de Sunami. Pense comme un créateur français
qui doit arrêter le scroll en 2026. Tu prends des décisions créatives originales,
concrètes et naturelles. Ne copie jamais une créa existante et ne parle pas comme une IA."""


def call_llm(prompt: str) -> str:
    body = json.dumps({
        "model": MODEL, "stream": False,
        "options": {"temperature": 0.9, "num_ctx": 6000, "num_predict": 1400},
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt},
        ],
    }).encode()
    req = urllib.request.Request(OLLAMA, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())["message"]["content"]


def extract_json(text: str):
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S).strip()
    m = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.S)
    if m:
        text = m.group(1)
    else:
        start, end = text.find("["), text.rfind("]")
        if start < 0 or end <= start:
            raise ValueError("JSON array absent")
        text = text[start:end + 1]
    return json.loads(text)


def load_research():
    p = ART / "browser-report.json"
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8")).get("tiktok_research", {})
    except Exception:
        return {}


def load_remotion_guidance():
    parts = []
    for name, limit in [
        ("remotion-best-practices/SKILL.md", 2200),
        ("remotion-captions/SKILL.md", 1600),
        ("remotion-render/SKILL.md", 1200),
    ]:
        p = ROOT / ".agents" / "skills" / name
        if p.exists():
            text = p.read_text(encoding="utf-8", errors="ignore")
            parts.append(f"--- {name} ---\n{text[:limit]}")
    return "\n".join(parts)


def normalize_searches(value, hook: str):
    out = []
    if isinstance(value, list):
        for q in value:
            if isinstance(q, list) and q:
                out.append([str(q[0]), str(q[1]) if len(q) > 1 else str(q[0])])
            elif isinstance(q, str) and q.strip():
                out.append([q.strip(), q.strip()])
    fallbacks = [
        f"{hook} personne français", "conversation anglais français", "personne bloquée anglais",
        "ami conversation anglais",
    ]
    for q in fallbacks:
        if len(out) >= 4:
            break
        if not any(x[0].lower() == q.lower() for x in out):
            out.append([q, q])
    return out[:4]


def validate(items, seen):
    clean = []
    for c in items if isinstance(items, list) else []:
        if not isinstance(c, dict):
            continue
        hook = str(c.get("hook", "")).strip()
        lines = c.get("lines")
        if not hook or not isinstance(lines, list) or len(lines) < 4:
            continue
        key = re.sub(r"\s+", " ", hook.lower())
        if key in seen:
            continue
        if any(x in hook.lower() for x in ["découvre sunami", "application sunami", "solution miracle"]):
            continue
        cleaned = [str(x).strip() for x in lines if str(x).strip()][:5]
        if not cleaned:
            continue
        cleaned = [x for x in cleaned if x.lower() != "link en bio."][:5]
        cleaned.append("Link en bio.")
        c["hook"] = hook
        c["lines"] = cleaned
        c["searches"] = normalize_searches(c.get("searches"), hook)
        c["market"] = "fr"
        c["locale"] = "fr-FR"
        c["rules"] = {"noProductBeforeLast": True, "noMascotBeforeReveal": True, "ugcFirst": True, "ctaLast": True, "maxSeconds": 12}
        clean.append(c)
        seen.add(key)
    return clean


def main():
    research = load_research()
    visible = str(research.get("visible_text_sample", ""))[:2800]
    remotion = load_remotion_guidance()[:5000]
    situations = [
        "ami bilingue", "restaurant", "travail", "appel", "aéroport", "date", "série", "jeu", "cours", "message vocal",
        "voyage", "honte du jugement", "petite victoire", "mot qui bloque", "accent",
    ]
    all_items, seen = [], set()

    for batch in range(10):
        start = batch * 5 + 1
        sit = situations[batch:batch + 5]
        prompt = f"""OBJECTIF: créer les concepts {start} à {start+4} d'un lot de 50 vidéos TikTok FR.
PROBLÈME: « Je comprends l'anglais mais dès qu'il faut parler, je bloque. »

RÈGLES:
{chr(10).join('- ' + x for x in RULES)}

ANGLES À EXPLORER: {', '.join(sit)}
SIGNaux OBSERVÉS DANS TIKTOK CREATIVE CENTER:
{visible}

GUIDANCE DE PRODUCTION REMOTION (à utiliser comme référence de montage/captions, pas à réciter):
{remotion}

HOOKS DÉJÀ PRIS: {json.dumps([x['hook'] for x in all_items[-20:]], ensure_ascii=False)}

Retourne UNIQUEMENT une liste JSON de 5 objets. Format minimal obligatoire:
[{{"hook":"phrase naturelle", "lines":["hook", "ligne 2", "ligne 3", "ligne 4"], "searches":[["requête Pexels","synonyme"],["requête Pexels","synonyme"]]}}]
Pas de markdown. Pas d'explication. Pas de texte avant/après le JSON."""
        try:
            parsed = extract_json(call_llm(prompt))
            new = validate(parsed, seen)
            all_items.extend(new)
            print(json.dumps({"batch": batch + 1, "accepted": len(new), "total": len(all_items), "model": MODEL, "remotion_guidance": bool(remotion)}, ensure_ascii=False), flush=True)
        except Exception as exc:
            print(json.dumps({"batch": batch + 1, "accepted": 0, "error": str(exc)[:180]}, ensure_ascii=False), flush=True)
        if len(all_items) >= 50:
            break

    if len(all_items) < 50:
        raise SystemExit(f"Agent IA: seulement {len(all_items)}/50 concepts valides")

    final = all_items[:50]
    for i, c in enumerate(final, 1):
        c["id"] = f"FR-AI-{i:02d}"
    (ART / "agent-concepts.json").write_text(json.dumps(final, ensure_ascii=False, indent=2), encoding="utf-8")
    (ART / "creative-director-report.json").write_text(json.dumps({"agent": "qwen3-local", "model": MODEL, "concepts": 50, "research_used": bool(visible), "remotion_guidance_loaded": bool(remotion)}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"agent": "qwen3-local", "model": MODEL, "concepts": 50, "status": "success"}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()

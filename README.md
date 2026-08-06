# Sunami 🌊

App d'apprentissage de langue par **épisodes narratifs interactifs** avec un tuteur IA dynamique.

> Vis une histoire. Apprends une langue.

## Concept

Au lieu d'exercices répétitifs, un **conteur IA** raconte une histoire immersive **dans la langue cible**, adaptée au niveau CECR de l'apprenant (A1 → C2). Le vocabulaire clé est mis en valeur (avec une traduction en français) et le conteur pose une question à chaque chapitre pour faire répondre et progresser l'apprenant. **100% gratuit.**

**6 langues** : 🇬🇧 Anglais · 🇪🇸 Espagnol · 🇩🇪 Allemand · 🇮🇹 Italien · 🇸🇦 Arabe · 🇵🇹 Portugais

## Stack

- **Frontend statique** (pas de framework, mobile-first) :
  - `index.html` + `landing.js` — landing marketing (`/`)
  - `app.html` + `app.js` — l'application (`/app`)
  - `styles.css` (design partagé) · `theme.js` (thème clair/sombre)
- **API** : `api/generate.js` — **fonction Edge Vercel** qui appelle **Groq** (`llama-3.1-8b-instant`) en **streaming** (réponse mot à mot)
- **Auth** : Supabase (Google OAuth)
- **DB** : Supabase Postgres
  - `progress` — streak, langue, niveau (par user)
  - `leads` — emails capturés depuis la landing

## Variables d'environnement (à configurer sur Vercel)

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Clé API Groq (modèle : `llama-3.1-8b-instant`). Utilisée uniquement côté serveur dans `api/generate.js`. |

⚠️ **Ne jamais** commit de clé API dans le code. Toujours passer par `process.env`.

## Notes IA (Groq)

- **Streaming** activé (`stream: true`) : le texte s'affiche mot à mot.
- **Gestion 429** : si la limite de requêtes Groq est atteinte, l'API renvoie `{ error: "rate_limit" }` et le front affiche un message d'attente propre.
- **Historique restreint** aux **10 derniers messages** pour limiter les tokens de contexte.

## Pixels & tracking (à configurer avant le marketing)

Dans `index.html` / `app.html`, remplacer les placeholders :
- `G-XXXXXXXXXX` → ton ID Google Analytics 4

## URL de production

https://sunami-rho.vercel.app

## Roadmap (idées)

- [ ] i18n : EN/ES/DE landing pages pour marché international
- [ ] Plus de thèmes d'histoires (voyage, boulot, romance, polar…)
- [ ] Partage social d'extraits d'histoire
- [ ] Paiements (plus tard) : Payoneer / Dodo Payments
- [ ] App native iOS/Android (React Native ou Capacitor)

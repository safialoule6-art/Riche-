# Sunami 🌊

App d'apprentissage de langue par **épisodes narratifs interactifs** avec un tuteur IA dynamique.

> Vis une histoire. Apprends une langue.

## Concept

Au lieu d'exercices répétitifs, l'utilisateur vit une **histoire continue** : chaque jour, un nouvel épisode de la même intrigue, avec des personnages récurrents. L'IA génère les répliques en temps réel, calées sur le niveau CECR de l'apprenant (A1 → C2).

**6 langues** : 🇬🇧 Anglais · 🇪🇸 Espagnol · 🇩🇪 Allemand · 🇮🇹 Italien · 🇸🇦 Arabe · 🇵🇹 Portugais

## Stack

- **Frontend** : `index.html` — vanilla JS, pas de framework, mobile-first
- **API** : `api/generate.js` — fonction serverless Vercel qui appelle OpenRouter (Claude Sonnet) pour générer les scènes
- **Auth** : Supabase (Google OAuth)
- **DB** : Supabase Postgres
  - `progress` — saison, épisode, streak, langue, niveau (par user)
  - `leads` — emails capturés depuis la landing (pour nurturing)

## Variables d'environnement (à configurer sur Vercel)

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | Clé API OpenRouter (modèle : `anthropic/claude-sonnet-4.5`) |

⚠️ **Ne jamais** commit de clé API dans le code. Toujours passer par `process.env.OPENROUTER_API_KEY`.

## Pixels & tracking (à configurer avant le marketing)

Dans `index.html`, remplacer les placeholders :
- `G-XXXXXXXXXX` → ton ID Google Analytics 4
- `DXXXXXXXXXXXXXXXXXXXXX` → ton ID TikTok Pixel

## URL de production

https://sunami-luma14.vercel.app

## Roadmap (idées)

- [ ] i18n : EN/ES/DE landing pages pour marché international
- [ ] Notifications email (Brevo) pour l'épisode 2 du jour
- [ ] Plus de scénarios (voyage, boulot, romance, polar…)
- [ ] Système de partage social d'extraits d'épisode
- [ ] App native iOS/Android (React Native ou Capacitor)

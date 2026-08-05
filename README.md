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
| `INFLOW_API_KEY` | Clé **privée** InflowPay (`inflow_prod_...`) — paiements Sunami Super. Utilisée uniquement côté serveur dans `api/create-payment.js`. |

⚠️ **Ne jamais** commit de clé API dans le code. Toujours passer par `process.env`.

## Paiements — Sunami Super (InflowPay)

- Offre : **abonnement Super à 5€/mois** (épisodes illimités + cœurs illimités + badge doré).
- Flux : le front appelle `POST /api/create-payment` → la fonction serverless crée le paiement avec `INFLOW_API_KEY` → renvoie `purchaseUrl` → le navigateur est **redirigé vers le checkout hébergé InflowPay**.
- Retour : `/success` (active Super) et `/cancel`.
- ⚠️ **À faire pour la prod** : l'activation de Super est aujourd'hui posée côté client (`localStorage`) sur la page `/success`. Pour un entitlement fiable et non contournable, ajoute un **webhook InflowPay** côté serveur qui marque l'utilisateur comme premium en base (Supabase), et lis ce statut au chargement.

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

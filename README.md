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
| `INFLOW_API_KEY` | Clé **privée** InflowPay (`inflow_prod_...`) — création de paiement (`api/create-payment.js`). |
| `INFLOW_WEBHOOK_SECRET` | Secret de signature du webhook InflowPay (`whsec_...`) — vérification Svix (`api/inflow-webhook.js`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé **service_role** Supabase (Settings → API) — écriture de l'entitlement premium côté serveur. **Secret.** |
| `SUPABASE_URL` | (optionnel) URL du projet Supabase, sinon valeur par défaut du code. |

⚠️ **Ne jamais** commit de clé API dans le code. Toujours passer par `process.env`.

## Paiements — Sunami Super (InflowPay)

- Offre : **abonnement Super à 5€/mois** (épisodes illimités + cœurs illimités + badge doré).
- Flux : le front appelle `POST /api/create-payment` (avec l'`userId` Supabase) → la fonction crée le paiement avec `INFLOW_API_KEY`, enregistre `paymentId → userId` dans la table `payments`, et renvoie `purchaseUrl` → le navigateur est **redirigé vers le checkout hébergé InflowPay**.
- Retour : `/success` et `/cancel`.
- **Entitlement fiable (webhook)** : InflowPay envoie un webhook signé (Svix) à `POST /api/inflow-webhook`. On vérifie la signature avec `INFLOW_WEBHOOK_SECRET`, on retrouve l'utilisateur (metadata `userId` ou table `payments`) et on met `premium = true` (+ `premium_until`) sur sa ligne `progress`. Le client lit ce statut au chargement (source de vérité).

### Mise en place (ordre à respecter)
1. Exécuter **`supabase.sql`** dans Supabase → SQL Editor (colonnes premium + table `payments`).
2. Sur Vercel → Settings → Environment Variables : `INFLOW_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (et `SUPABASE_URL` si besoin). Redéployer.
3. Sur le dashboard InflowPay → **Add webhook** : URL = `https://sunami-rho.vercel.app/api/inflow-webhook`, événements = `checkout_session.*` (ou tous). Copier le **secret** (`whsec_...`).
4. Ajouter ce secret sur Vercel : `INFLOW_WEBHOOK_SECRET = whsec_...`. Redéployer.
5. Tester avec une **carte de test** InflowPay (docs → Test Cards) et vérifier que `progress.premium` passe à `true`.

> Enforcement complet : les limites (cœurs / 1 épisode par jour) sont aujourd'hui appliquées côté client. Pour rendre le premium 100% non contournable, il faudrait aussi vérifier le statut premium dans `api/generate.js` avant de générer une scène.

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

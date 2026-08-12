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
| `GROQ_API_KEY` | Clé API Groq (modèle : `llama-3.1-8b-instant`). Utilisée côté serveur dans `api/generate.js` et `api/support.js`. |
| `GROQ_API_KEY_2` | *(optionnel)* Seconde clé Groq : bascule automatique en cas de rate-limit 429. |
| `SUPABASE_URL` | URL du projet Supabase (ex : `https://xxxx.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé **service role** Supabase, utilisée côté serveur uniquement (`api/refund.js`, `api/referral.js`, `api/subscribe.js`, `api/send-reminders.js`). Contourne la RLS. **Ne jamais** l'exposer côté client. |

> Les fonctions serveur acceptent aussi l'ancien nom `SUPABASE_SERVICE_KEY` en secours, mais `SUPABASE_SERVICE_ROLE_KEY` est le nom recommandé.

> Push (optionnel) : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` (voir plus bas).

⚠️ **Ne jamais** commit de clé API dans le code. Toujours passer par `process.env`.

## Base de données (migrations SQL)

À exécuter **une fois** dans l'éditeur SQL de Supabase :

| Fichier | Rôle |
|---|---|
| Fichier | Rôle |
|---|---|
| **`sql/setup.sql`** | **⭐ Tout-en-un (recommandé)** — regroupe saga + état joueur + push + affiliation + sécurité (RLS), avec garde-fous. **Colle-le une fois dans le SQL Editor de Supabase et clique Run.** Idempotent. |
| `sql/saga.sql` | Persistance de la saga (historique + résumé + cliffhanger) et état joueur durable (XP, vocabulaire, personnages…). |
| `sql/affiliate.sql` | Programme d'affiliation. |
| `sql/security.sql` | Sécurité (RLS) : verrouille `progress`, `leads`, `refund_requests`, `referrals`. |

> `sql/setup.sql` contient déjà le contenu des trois autres : si tu l'exécutes, tu n'as pas besoin de lancer les autres.

> Tant que le SQL n'est pas exécuté, l'app fonctionne quand même : elle retombe sur le stockage local (aucune régression), mais la synchro multi-appareils, la reprise cloud et le push personnalisé sont désactivés.

## Moteur narratif (continuité)

`api/generate.js` renvoie un **JSON structuré** : `sagaTitle`, `story`, `recap` (résumé cumulatif de la saga), `characters`, `setting`, `vocab` (avec traduction FR), `episodeComplete` + `episodeTitle`, et `choices` (suggestions de réponse). Le `recap` est renvoyé à chaque tour → la même intrigue et les mêmes personnages sont conservés d'un épisode à l'autre, même au-delà de la fenêtre de contexte.

## Covers & affiches de série

- Chaque cliffhanger génère une **couverture d'épisode** via [Pollinations.ai](https://pollinations.ai) (gratuit, sans clé, déterministe par *seed*). L'utilisateur peut **changer de style** (Ciné, Anime, Aquarelle, BD, Conte, Pixel) ou **régénérer** l'image ; le choix est mis en cache dans `saga.cover` / `saga.cover_style`.
- L'écran **Mes sagas** affiche une **affiche de série** par langue (jaquette portrait + titre auto-généré).

## Notifications push (rappels d'épisode)

Rappel quotidien « ton prochain épisode t'attend » via Web Push.

**Activation :**
1. Générer les clés : `npx web-push generate-vapid-keys`
2. Configurer sur Vercel : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (ex : `mailto:hello@sunami.app`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, et éventuellement `CRON_SECRET`.
3. Exécuter `sql/saga.sql` (crée la table `push_subscriptions`).
4. Le **Vercel Cron** (`vercel.json`) appelle `/api/send-reminders` chaque jour à 17:00 UTC et notifie les inactifs du jour.

> Sans ces variables, la fonctionnalité se désactive proprement (aucune erreur, l'app fonctionne normalement). `api/send-reminders.js` dépend de `web-push` (voir `package.json`).

## Notes IA (Groq)

- **Streaming** activé (`stream: true`) : le texte s'affiche mot à mot.
- **Gestion 429** : si la limite de requêtes Groq est atteinte, l'API renvoie `{ error: "rate_limit" }` et le front affiche un message d'attente propre.
- **Historique restreint** aux **10 derniers messages** pour limiter les tokens de contexte.

## Pixels & tracking (à configurer avant le marketing)

Tout est centralisé dans **`analytics.js`** (chargé par `index.html` et `app.html`). Un seul endroit à éditer :

- `GA_ID` → ton ID Google Analytics 4 (`G-XXXXXXXXXX`)
- `TIKTOK_ID` → ton ID TikTok Pixel (`DXXXXXXXXXXXXXXXXXXXXX`)

Tant que les IDs contiennent un `X` (placeholders), **aucun pixel n'est chargé** et `window.sunamiTrack()` devient un no-op silencieux (aucune erreur en dev, les events sont juste loggés en console).

Événements suivis (GA4 + TikTok) : `login_start`, `lead`, `demo_progress`, `app_open`, `story_start`, `reply_sent`, `chapter_complete`, `level_up`, `streak_milestone`, `daily_goal`, `share`.

## URL de production

https://sunami-rho.vercel.app

## Roadmap (idées)

- [ ] i18n : EN/ES/DE landing pages pour marché international
- [ ] Plus de thèmes d'histoires (voyage, boulot, romance, polar…)
- [ ] Partage social d'extraits d'histoire
- [ ] Paiements (plus tard) : Payoneer / Dodo Payments
- [ ] App native iOS/Android (React Native ou Capacitor)

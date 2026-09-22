# Sunami Mobile

Application Expo TypeScript autonome pour Sunami : onboarding animé, progression, streak, mascotte interactive et carte d'histoire.

## Installation

Depuis ce dossier :

```bash
npx expo install lottie-react-native react-native-reanimated react-native-screens react-native-safe-area-context
npm install @react-navigation/native @react-navigation/native-stack
npx expo start
```

Commandes utiles : `npx expo start --ios`, `npx expo start --android`, `npx expo start --web`, `npm run typecheck`.

## Lottie distant

Aucun fichier `.json` local n'est requis. Les animations utilisent `source={{ uri }}` avec les URLs fournies : loader, trois étapes d'onboarding et mascotte. Le tap sur Sunny appelle `lottieRef.current?.reset()` puis `play()`.

## Architecture

- `src/screens/LoadingScreen.tsx` : splash et barre de progression `withTiming`.
- `src/screens/OnboardingScreen.tsx` : trois étapes avec fade, zoom et progression animée.
- `src/screens/HomeScreen.tsx` : accueil, streak, épisode et statistiques.
- `src/components/AnimatedPressable.tsx` : rebond tactile `withSpring`.
- `src/components/MascotComponent.tsx` : mascotte Lottie interactive.
- `src/constants/animations.ts` : contenu et URLs CDN.

Les alertes de l'écran principal sont des points d'intégration pour connecter l'authentification, Supabase et l'API narrative déjà présents dans le dossier parent.

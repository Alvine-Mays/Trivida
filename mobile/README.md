# Trivida Mobile (Expo)

Prerequis
- Node 18+
- npm 9+/bun/yarn (npm recommandé)
- Expo CLI (npx expo)

ENV
- Créez un fichier `.env` à la racine de `mobile/` (ou exportez dans votre shell):
  - `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000`
  - `EXPO_PUBLIC_DEFAULT_LOCALE=fr`
  - `EXPO_PUBLIC_DEFAULT_CURRENCY=XAF`

Installation
- `npm install`

Développement
- Lancez le backend (voir backend/README.md) puis:
- `npm start` et scannez le QR dans Expo Go (ou `npm run android` / `npm run ios`).

Navigation & écrans
- Auth: connexion/inscription (stockage du token sécurisé dans AsyncStorage)
- Onglets: Décision (templates+score), Finance (summary avec baseCurrency), Événements (liste + public/RSVP)

Production
- Renseignez `EXPO_PUBLIC_API_BASE_URL` vers l’API Render.
- Build natif (EAS):
  - `npm install -g eas-cli`
  - `eas login`
  - `eas build -p android` et/ou `eas build -p ios`
- Alternative OTA: `npx expo publish` (nécessite un build natif installé sur devices).

Notes
- Thème sombre, polices via @expo-google-fonts (Poppins/Roboto)
- Mini UI kit: Button, Card, Input
- i18n simple FR/EN (src/i18n.ts)

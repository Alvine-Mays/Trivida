# Démarrage (FR)

Ce guide explique comment lancer l’API backend et l’app mobile en local, configurer les variables d’environnement, et brancher le cron quotidien des rappels d’essai.

## 1) Backend API
- Prérequis: Node >= 18, MongoDB (ou URI cloud)
- Configuration
  - Copiez docs/provisioning/backend.env.fr.example vers backend/.env et renseignez:
    - MONGODB_URI
    - JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
    - CRON_SECRET (obligatoire pour /cron/*)
    - EXPO_ACCESS_TOKEN (optionnel)
    - FLW_* (si vous voulez créer de vrais liens Flutterwave en local)
- Installer & lancer
```
cd backend
npm install
npm run dev
# build prod
npm run build && npm start
```
- API locale: http://localhost:4000

## 2) Application mobile (Expo)
- Prérequis: Node >= 18, Expo CLI, outils iOS/Android
- Config API
  - L’app lit process.env.EXPO_PUBLIC_API_BASE_URL
  - Lancer avec:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000 npm start
```
  - ou créez mobile/.env à partir de mobile/.env.example
- Premier lancement
```
cd mobile
npm install
npm start
```
- Connexion/inscription pour obtenir un token.
- Push: l’app demande la permission; si refusée, planifie des notifications locales (J-7/J-3/J-1 à 09:00 Africa/Brazzaville).

## 3) Cron rappels d’essai
- Endpoint: POST /cron/trial/reminders (header X-Cron-Key: $CRON_SECRET)
- Horaire: tous les jours à 09:00 Africa/Brazzaville via un scheduler externe.
- Voir docs/trial-notifications.md pour les textes, l’idempotence, et des exemples de configuration.

## 4) Abonnements via CinetPay
- Endpoint: POST /billing/subscriptions/initiate (Bearer token requis)
- Corps: { months: 1|3|12|..., network?: 'MTN'|'AIRTEL', phone: string }
- Réponse: { requestId, status: 'pending', amount, currency: 'XAF', months, discountPercent, paymentUrl? }
- Webhook: POST /billing/cinetpay/webhook (vérification via /payment/check)
- Statut: GET /billing/mobile-money/status/:requestId
- Reçus: GET /billing/receipts/:id.csv, GET /billing/receipts/:id.pdf

## 5) Appels utiles
- POST /auth/register, POST /auth/login, GET /auth/me
- POST /users/push-tokens
- POST /cron/trial/reminders

## 6) Notes
- Fuseau horaire: Africa/Brazzaville
- Langues: FR et EN; fallback FR
- Deep link: data.screen==='CheckoutMobileMoney' ouvre l’écran de paiement

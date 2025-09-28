# Trivida — Guide complet (FR)

Ce document regroupe la documentation fonctionnelle et technique du projet (backend + mobile), la configuration d’environnement, les flux (essai 14j, notifications, paiements via Flutterwave, reçus), la sécurité, et les étapes de déploiement.

## 1) Architecture
- Backend: TypeScript, Express, MongoDB (Mongoose)
- Mobile: Expo/React Native
- Push: Expo Push (fallback local notifications)
- Paiements: CinetPay (agrégateur) pour MTN MoMo CG et Airtel Money CG
- Abonnements: 2000 XAF/mois, remises: 3 mois (-5%), 12 mois (-15%)
- Reçus: CSV/PDF générés côté backend après paiement réussi
- Upsell: bandeaux/CTA + analytics côté backend

## 2) Modèle Premium & Essai
- Essai: 14 jours Premium offerts à la première inscription (User.trialEndsAt)
- Basculer en gratuit: chaque jour à 09:00 Africa/Brazzaville, le cron /cron/trial/reminders bascule tous les essais expirés en plan 'free'
- Un seul essai: pas de réactivation; aucune API ne réinitialise l’essai
- Gating: endpoints Premium-only renvoient 403 "Premium required" en mode gratuit
- Points: Premium-only (accumulation et consommation uniquement en premium/essai)

## 3) Notifications d’essai (J-7/J-3/J-1)
- Endpoint sécurisé: POST /cron/trial/reminders
- Calcul en TZ: Africa/Brazzaville
- Idempotence: User.trialRemindersSent.{d7,d3,d1}
- Texte FR/EN, deep link data: { screen: 'CheckoutMobileMoney', reason: 'trial', daysLeft }
- Fallback local: si pas de token Expo, l’app planifie des notifications locales J-7/J-3/J-1 à 09:00 Africa/Brazzaville

## 4) Paiements et Abonnements via CinetPay
- Prix: 2000 XAF/mois, remises (-5% / -15%)
- Initiation: POST /billing/subscriptions/initiate { months, network?: 'MTN'|'AIRTEL', phone }
  - Calcule amount = round(months * 2000 * (1 - discount))
  - Crée un PaymentIntent (provider='cinetpay') et un lien de paiement (paymentUrl) si CINETPAY_API_KEY/SITE_ID sont configurés
- Webhook: POST /billing/cinetpay/webhook
  - Vérifie le statut via /payment/check (CinetPay)
  - Sur succès (ACCEPTED): status=SUCCESS, Premium actif et premiumUntil prolongé, Receipt créé
- Statut: GET /billing/mobile-money/status/:requestId

## 5) Reçus (CSV/PDF)
- Modèle Receipt: paymentIntentId, userId, receiptNumber, amount, currency, months, unitPrice, discountPercent, network, msisdn, provider, providerRef, issuedAt
- Endpoints (auth):
  - GET /billing/receipts/:id.csv
  - GET /billing/receipts/:id.pdf

## 6) Upsell Analytics
- POST /analytics/upsell (auth) avec { event, screen? }
- Événements: 'premium_required', 'cta_clicked', 'checkout_opened'
- Mobile: Interception 403 → alerte CTA; bandeau réutilisable sur écrans clés

## 7) Sécurité
- Cron: header X-Cron-Key = CRON_SECRET
- Flutterwave: header verif-hash = FLW_WEBHOOK_HASH
- Auth: JWT Access/Refresh (voir backend/.env)
- Rate limit, Helmet, CORS configurés

## 8) Configuration d’environnement
Voir docs/provisioning/backend.env.fr.example (backend) et mobile/.env.example (mobile) pour des exemples commentés en français.

Variables clés Backend:
- MONGODB_URI: connexion MongoDB
- JWT_*: secrets JWT
- CRON_SECRET: clé pour endpoints cron
- EXPO_ACCESS_TOKEN: access token Expo (optionnel)
- PREMIUM_PRICE_XAF: (défaut 2000)
- CINETPAY_*: clés CinetPay (SITE_ID, API_KEY), notify/return URL

Variables clés Mobile:
- EXPO_PUBLIC_API_BASE_URL: URL de l’API backend
- (optionnel) EXPO_PUBLIC_* pour config additionnelle

## 9) Lancement local
Backend
```
cd backend
cp ../docs/provisioning/backend.env.fr.example .env
npm install
npm run dev
```
Mobile
```
cd mobile
cp .env.example .env
npm install
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000 npm start
```

## 10) Cron quotidien
- Appel à 09:00 Africa/Brazzaville: POST /cron/trial/reminders
- Exemple cURL:
```
curl -X POST -H "X-Cron-Key: $CRON_SECRET" "$API_BASE/cron/trial/reminders"
```
- Exemples Render/Cloudflare/GitHub Actions disponibles dans docs/trial-notifications.md

## 11) Endpoints principaux
- Auth: /auth/register, /auth/login, /auth/refresh, /auth/me, /auth/logout
- User Push: POST /users/push-tokens
- Cron: POST /cron/trial/reminders
- Subscriptions: POST /billing/subscriptions/initiate, POST /billing/flutterwave/webhook
- Statut: GET /billing/mobile-money/status/:requestId
- Reçus: GET /billing/receipts/:id.csv, GET /billing/receipts/:id.pdf
- Analytics: POST /analytics/upsell

## 12) Acceptation
- Rappels envoyés J-7/J-3/J-1 (ou fallback local), pas de doublons
- Notification ouvre 'CheckoutMobileMoney'
- Paiement Flutterwave (MTN/Airtel via agrégateur), remises appliquées, Premium prolongé
- Reçus téléchargeables (CSV/PDF)
- Upsell visible en gratuit + interception 403

## 13) Dossiers utiles
- backend/src/routes/*.ts — API
- backend/src/models/*.ts — modèles Mongoose (User, PaymentIntent, Receipt…)
- mobile/src/screens/*.tsx — écrans (incl. CheckoutMobileMoney)
- mobile/src/components/UpsellBanner.tsx — bandeau upsell
- docs/*.md — documentation détaillée

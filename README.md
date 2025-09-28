# Trivida — Documentation (FR)

Ce dépôt contient l’API backend (TypeScript/Express/MongoDB) et l’application mobile (Expo/React Native). Cette page résume l’architecture et renvoie vers la documentation détaillée en français.

## Aperçu
- Essai Premium 14 jours à l’inscription, puis bascule automatique en mode gratuit
- Rappels d’essai J-7/J-3/J-1 à 09:00 Africa/Brazzaville (push Expo + fallback local)
- Abonnements via Flutterwave (MTN/Airtel), 2000 XAF/mois, remises: 3 mois (-5%), 12 mois (-15%)
- Reçus CSV/PDF après paiement réussi
- Upsell: bannières en mode gratuit + interception 403 “Premium required”

## Architecture
- Backend: Express + Mongoose (MongoDB)
- Mobile: Expo/React Native
- Push: Expo Push (avec fallback de notifications locales)
- Paiements: Flutterwave (agrégateur) → MTN MoMo CG / Airtel Money CG

## Démarrage rapide
- Guide complet (FR): docs/guide-complet-fr.md
- Démarrage (FR): docs/getting-started.md
- Exemples d’environnement:
  - Backend (.env): docs/provisioning/backend.env.fr.example
  - Mobile (.env): mobile/.env.example

## Fonctionnalités principales
- Notifications d’essai
  - docs/trial-notifications.md
- Abonnements CinetPay (prix & remises, webhook)
  - docs/cinetpay-subscriptions.md
  - docs/mobile-money-integration.md (intégration CinetPay)
  - docs/mobile-money-checkout.md (écran mobile)
- Premium & Points
  - docs/premium.md
- Analytics d’upsell
  - docs/upsell-analytics.md
- Reçus (CSV/PDF)
  - docs/receipts.md

## Endpoints principaux (résumé)
- Auth: /auth/register, /auth/login, /auth/refresh, /auth/me, /auth/logout
- Cron: POST /cron/trial/reminders (X-Cron-Key: $CRON_SECRET)
- Abonnements: POST /billing/subscriptions/initiate, POST /billing/flutterwave/webhook
- Statut paiement: GET /billing/mobile-money/status/:requestId
- Reçus: GET /billing/receipts/:id.csv, GET /billing/receipts/:id.pdf
- Analytics: POST /analytics/upsell

## Sécurité & Opérations
- CRON_SECRET requis pour /cron/*
- Webhook Flutterwave: header verif-hash doit correspondre à FLW_WEBHOOK_HASH
- Rate limiting, Helmet, CORS configurés par défaut

## Structure
- backend/: API Express, modèles Mongoose, routes
- mobile/: app Expo (navigation, écrans, push, upsell)
- docs/: documentation fonctionnelle et technique (FR)

Pour toute question, voir le guide complet (docs/guide-complet-fr.md) ou les fichiers README dans chaque sous-projet.

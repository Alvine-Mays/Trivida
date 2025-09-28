# PR: Notifications d’essai + Abonnements CinetPay + Upsell + Reçus + Robustesse prod (FR)

Résumé
- Ajoute les rappels d’essai J-7/J-3/J-1 (09:00 Africa/Brazzaville) via cron sécurisé + idempotence
- Remplace MTN/Airtel directs par CinetPay pour les abonnements Premium (2000 XAF/mois; remises 3m -5%, 12m -15%)
- Ajoute l’écran mobile de paiement (réseaux MTN/Airtel via CinetPay), deep link depuis push
- Ajoute l’upsell (bandeau + interception 403) avec analytics
- Génère des reçus CSV/PDF après paiement réussi
- Durcit la gestion d’erreurs, ajoute arrêt propre (graceful shutdown) et endpoint de debug DB
- Documentation FR complète + exemples .env

Type de changements
- Feature: notifications d’essai, paiements CinetPay, reçus
- Amélioration: robustesse erreurs, debug DB, upsell, docs FR
- Breaking: suppression des webhooks MTN/Airtel directs au profit de CinetPay

Détails des changements

Backend
- Cron d’essai
  - Route: POST /cron/trial/reminders (X-Cron-Key)
  - TZ Africa/Brazzaville; idempotent via User.trialRemindersSent.{d7,d3,d1}
  - Fallback local géré côté mobile si pas de token Expo
  - Flip auto trial→free pour essais expirés
- Paiements via CinetPay
  - POST /billing/subscriptions/initiate { months, network?: 'MTN'|'AIRTEL', phone }
    - Calcule remises (3m=5%, 12m=15%), crée PaymentIntent, appelle /payment (si CINETPAY_* configurés)
  - POST /billing/cinetpay/webhook
    - Vérifie via /payment/check (ACCEPTED/REFUSED), active Premium et prolonge premiumUntil
  - GET /billing/mobile-money/status/:requestId
- Reçus
  - Modèle: backend/src/models/Receipt.ts
  - Création au webhook SUCCESS (idempotent)
  - GET /billing/receipts/:id.csv et GET /billing/receipts/:id.pdf (pdfkit)
- Upsell analytics
  - POST /analytics/upsell (meta: event, screen?) → AuditLog
- Robustesse prod
  - errorHandler: réponses génériques, Zod 400, DuplicateKey 409, X-Request-Id
  - app.ts: X-Request-Id + /health
  - index.ts: graceful shutdown (SIGINT/SIGTERM), handlers uncaughtException/unhandledRejection
  - db.ts: timeouts configurables, option DEV tlsAllowInvalidCertificates via MONGODB_TLS_INSECURE=1
  - /debug/db-check: ok/state/host/name/ms/driver (sans secrets)

Mobile
- Écran de paiement (conserve route 'CheckoutMobileMoney' pour deep link)
  - Sélection réseau (MTN/Airtel), 1/3/12 mois, affichage remise/total, téléphone
  - Appelle /billing/subscriptions/initiate puis ouvre paymentUrl
- Upsell
  - Bandeau UpsellBanner sur écrans clés (Finance/Decision)
  - Interception 403 "Premium required": alerte CTA → ouvre paiement, analytics

Scripts
- scripts/test-backend.sh — tests e2e cURL (inscription, login, cron, init Flutterwave, webhook success, statut, vérif Premium)

Docs (FR)
- docs/guide-complet-fr.md — vue d’ensemble + déploiement
- docs/getting-started.md — démarrage local
- docs/trial-notifications.md — cron d’essai
- docs/cinetpay-subscriptions.md — flux abonnement/WEBHOOK
- docs/mobile-money-integration.md — intégration CinetPay
- docs/mobile-money-checkout.md — écran mobile
- docs/premium.md — modèle Premium/essai/points
- docs/upsell-analytics.md — analytics upsell
- docs/receipts.md — reçus CSV/PDF
- docs/provisioning/backend.env.fr.example — .env complet FR backend
- mobile/.env.example — .env mobile
- README.md (racine) — index FR des docs

Sécurité
- CRON_SECRET obligatoire pour /cron/*
- CinetPay: vérification côté serveur via /payment/check (pas de secret exposé dans le webhook) ; pas de fuite d’erreurs internes
- X-Request-Id pour corrélation et logs serveurs

Variables d’environnement à renseigner
- Backend (.env)
  - MONGODB_URI (prod ou local)
  - JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, BCRYPT_SALT_ROUNDS
  - CRON_SECRET
  - PREMIUM_PRICE_XAF (défaut 2000)
  - CINETPAY_BASE_URL=https://api-checkout.cinetpay.com/v2, CINETPAY_SITE_ID, CINETPAY_API_KEY, CINETPAY_NOTIFY_URL, (optionnel) CINETPAY_RETURN_URL, API_PUBLIC_BASE_URL
  - MONGO_SERVER_SELECTION_TIMEOUT_MS=10000, MONGO_SOCKET_TIMEOUT_MS=20000
  - (DEV) MONGODB_TLS_INSECURE=1 si TLS local pose souci (à éviter en prod)
- Mobile (.env)
  - EXPO_PUBLIC_API_BASE_URL

Migrations / Breaking changes
- Webhooks directs MTN/Airtel supprimés; remplacés par Flutterwave
- Les points ne sont plus utilisables comme fallback en mode gratuit (Premium-only)

Tests manuels (cURL)
- Voir scripts/test-backend.sh (lancer backend, définir CRON_SECRET/FLW_WEBHOOK_HASH, exécuter le script)
- Vérif DB: GET /debug/db-check → ok:true

Checklist QA
- [ ] /cron/trial/reminders envoie J-7/J-3/J-1 (ou fallback local si pas de token Expo), pas de doublons
- [ ] Notification → ouvre 'CheckoutMobileMoney' dans l’app
- [ ] /billing/subscriptions/initiate calcule remises 1/3/12m et renvoie paymentUrl si CINETPAY_* configurés
- [ ] Webhook (/payment/check) ACCEPTED → Premium actif + premiumUntil augmenté + Receipt créé
- [ ] Reçus téléchargeables en CSV/PDF
- [ ] /debug/db-check ok en prod et dev
- [ ] Arrêt propre (SIGTERM) ferme HTTP + Mongo sans erreur

Déploiement
- Renseigner .env prod (CRON_SECRET, CINETPAY_*, JWT, MONGODB_URI)
- Scheduler externe pour /cron/trial/reminders à 09:00 Africa/Brazzaville
- Déclarer le webhook CinetPay → POST /billing/cinetpay/webhook (voir docs)

Rollback
- Désactiver temporairement l’init Flutterwave (absence FLW_SECRET_KEY) pour rester en mode "pending" sans liens
- Réduire l’upsell (désactiver le bandeau) en mobile si nécessaire

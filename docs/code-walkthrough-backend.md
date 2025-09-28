# Walkthrough du code Backend (FR)

src/index.ts — Entrée serveur
- Démarre la connexion Mongo, crée l’app, écoute sur PORT
- Arrêt propre (closing HTTP + mongoose.disconnect) et handlers uncaught/unhandled

src/app.ts — Configuration Express
- Helmet, CORS (env), compression, json/urlencoded (conserve rawBody), X-Request-Id, rate limiting global
- Routes montées: /auth, /users, /decision, /finance, /events, /savings, /public, /external, /notifications, /cron, /business, /billing, /analytics, (/debug hors prod)
- /health, notFound, errorHandler

src/db.ts — Connexion Mongo
- Timeouts configurables; option DEV tlsAllowInvalidCertificates

middleware/error.ts — Gestion d’erreurs
- 404, Zod 400, DuplicateKey 409, ApiError, 500 INTERNAL_ERROR sans fuite; requestId renvoyé

routes/auth.router.ts — Authentification
- register/login/refresh/logout/me + OAuth placeholders
- rate limit dédié sur /register, /login, /refresh

routes/billing.router.ts — Paiements & reçus
- POST /billing/subscriptions/initiate: calcule remises, crée PaymentIntent, appelle CinetPay /payment et renvoie paymentUrl
- POST /billing/cinetpay/webhook: vérification via /payment/check (ou sandbox), mapping d’états, activation Premium, création Receipt
- GET /billing/mobile-money/status/:requestId: statut PaymentIntent
- GET /billing/receipts: liste des reçus utilisateur
- GET /billing/receipts/:id.csv|.pdf: téléchargement reçu

routes/cron.router.ts — Crons
- /cron/trial/reminders: J-7/J-3/J-1 (TZ Africa/Brazzaville), idempotence, skip no-token, flip trial→free

routes/debug.router.ts — Debug DB
- /debug/db-check: ping, latence, host, version driver (hors prod)

models/*.ts — Modèles Mongoose
- User: plan, trialEndsAt, premiumUntil, expoPushTokens, trialRemindersSent
- PaymentIntent: provider=cinetpay, amount, months, discountPercent, status, providerRef/link
- Receipt: champs fiscaux légers pour justificatif

services/expo.ts — Push Expo
- Envoi batch vers Expo Push (token)

utils/* — Utilitaires
- errors.ts, jwt.ts, currency.ts, etc.

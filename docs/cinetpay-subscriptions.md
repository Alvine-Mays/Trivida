# Abonnements via CinetPay — Mobile Money (MTN/Airtel, CG)

Vue d’ensemble
- Prix: 2000 XAF / mois (config PREMIUM_PRICE_XAF)
- Réductions: 3 mois → -5%; 12 mois → -15%
- Agrégateur: CinetPay (paiement XAF, MTN MoMo CG & Airtel Money CG)

Configuration (backend)
- CINETPAY_BASE_URL=https://api-checkout.cinetpay.com/v2
- CINETPAY_SITE_ID=...
- CINETPAY_API_KEY=...
- CINETPAY_NOTIFY_URL=https://api.votre-domaine.com/billing/cinetpay/webhook (ou utilisez API_PUBLIC_BASE_URL pour construire l’URL)
- (optionnel) CINETPAY_RETURN_URL=https://votre-domaine.com/thanks

API Backend
- POST /billing/subscriptions/initiate (auth)
  - Body: { months: number, network?: 'MTN'|'AIRTEL', phone: string }
  - Calcule amount = round(months * PREMIUM_PRICE_XAF * (1 - discount))
  - Crée PaymentIntent (provider='cinetpay'), appelle /payment (CinetPay) et renvoie paymentUrl
  - Réponse: { requestId, status: 'pending', amount, currency: 'XAF', months, discountPercent, paymentUrl }
- POST /billing/cinetpay/webhook
  - CinetPay appelle notify_url avec transaction_id, etc.
  - Le backend vérifie le statut via /payment/check (apikey+site_id) → status 'ACCEPTED'|'REFUSED'|'PENDING'
  - Sur ACCEPTED: active Premium et prolonge premiumUntil, crée un Receipt
- GET /billing/mobile-money/status/:requestId (auth)
  - Retourne le statut PaymentIntent

App Mobile
- L’écran 'CheckoutMobileMoney' ne change pas: envoie months/network/phone, reçoit paymentUrl, ouvre la collecte hébergée CinetPay.

Notes
- La source de vérité paiement = /payment/check côté webhook
- Les remises sont appliquées côté backend (1/3/12 mois)
- Reçus (CSV/PDF) sont disponibles après succès

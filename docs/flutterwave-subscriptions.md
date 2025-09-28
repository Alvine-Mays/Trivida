# Abonnements via Flutterwave — Mobile Money (MTN/Airtel)

Vue d’ensemble
- Prix: 2000 XAF / mois (config PREMIUM_PRICE_XAF)
- Réductions: 3 mois → -5%; 12 mois → -15%
- Agrégateur: Flutterwave (gère les paiements MTN MoMo CG et Airtel Money CG)

Configuration (backend)
- FLW_BASE_URL=https://api.flutterwave.com/v3
- FLW_PUBLIC_KEY=...
- FLW_SECRET_KEY=...
- FLW_WEBHOOK_HASH=... (hash de vérification du header verif-hash)

API Backend
- POST /billing/subscriptions/initiate (auth)
  - Body: { months: number, network?: 'MTN'|'AIRTEL', phone: string }
  - Calcule le montant final avec remise, crée un PaymentIntent (provider='flutterwave'). Si FLW_SECRET_KEY est défini, crée un lien de paiement (paymentUrl) via l’API Flutterwave et le renvoie au client.
  - Réponse: { requestId, status: 'pending', amount, currency: 'XAF', months, discountPercent, paymentUrl? }
- POST /billing/flutterwave/webhook
  - Vérifie verif-hash == FLW_WEBHOOK_HASH
  - Sur succès (tx_ref=requestId): set PaymentIntent.status='SUCCESS', passe l’utilisateur en Premium et prolonge premiumUntil de 'months', crée un Receipt si absent.
- GET /billing/mobile-money/status/:requestId (auth)
  - Retourne le statut du PaymentIntent.

App Mobile
- Écran 'CheckoutMobileMoney' (conservé pour deep link)
  - Sélection réseau (MTN/Airtel), durée (1/3/12 mois), téléphone
  - Affiche le prix, la remise, le total
  - Appelle POST /billing/subscriptions/initiate puis ouvre paymentUrl si présent

Notes
- La vérité de l’état de paiement est le webhook; redirect_url est optionnelle.
- Un polling vers /billing/mobile-money/status/:requestId peut être ajouté si besoin.

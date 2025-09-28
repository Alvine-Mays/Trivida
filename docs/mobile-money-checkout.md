# Écran de paiement (Checkout) — FR

L’écran mobile 'CheckoutMobileMoney' sert à initier un abonnement Premium via CinetPay (réseaux MTN/Airtel).

UI
- Réseau: MTN MoMo CG / Airtel Money CG
- Durée: 1 / 3 / 12 mois (remise: 3→5%, 12→15%)
- Téléphone (format national CG)
- Affichage du montant (prix barré + total après remise)

API appelée
- POST /billing/subscriptions/initiate
  - { months: number, network?: 'MTN'|'AIRTEL', phone: string }
  - Réponse: { requestId, status: 'pending', amount, currency: 'XAF', months, discountPercent, paymentUrl? }
  - Ouvre paymentUrl si fourni

Remarques
- prix mensuel = 2000 XAF (config PREMIUM_PRICE_XAF)
- L’état final du paiement est confirmé par le webhook CinetPay (vérification via /payment/check)

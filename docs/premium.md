# Modèle Premium (FR)

Tarification
- 2000 XAF / mois (configurable via PREMIUM_PRICE_XAF)
- Remises: 3 mois (-5%), 12 mois (-15%)

Essai
- 14 jours Premium à l’inscription (trialEndsAt)
- Cron quotidien bascule les essais expirés en plan 'free'
- Pas de réactivation d’essai

Gating
- Les fonctionnalités Premium renvoient 403 "Premium required" en mode gratuit
- Le front affiche un message d’upsell et un bouton vers le paiement

Points
- Premium-only: accumulation/consommation seulement en Premium/essai
- Boost actif en Premium

Activation
- Mobile: 'CheckoutMobileMoney' appelle /billing/subscriptions/initiate (Flutterwave)
- Webhook 'SUCCESS': bascule en Premium et prolonge premiumUntil

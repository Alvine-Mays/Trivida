# Analytics d’upsell (FR)

Backend
- POST /analytics/upsell (auth) — stocke un AuditLog { type: 'upsell', meta: { event, screen? } }
- Événements: 'premium_required', 'cta_clicked', 'checkout_opened'

Mobile
- Intercepte 403 "Premium required" → affiche une alerte CTA et log 'premium_required'
- Bandeau d’upsell réutilisable sur écrans clés; CTA log 'cta_clicked'
- Ouverture du checkout log 'checkout_opened'

Évolutions possibles
- GET /analytics/upsell/summary (agrégation par jour/semaine et par type)

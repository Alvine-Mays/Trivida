# Rappels de fin d’essai (J-7, J-3, J-1)

Vue d’ensemble
- Objectif: envoyer des rappels à J-7/J-3/J-1 chaque jour à 09:00 Africa/Brazzaville via un endpoint cron sécurisé. Chaque push ouvre l’écran de paiement.
- Public: exploitation backend (cron) et mobile (push + fallback local)

Flux backend
- Endpoint: POST /cron/trial/reminders
- Sécurité: header X-Cron-Key: $CRON_SECRET (config.cronKey)
- Fuseau horaire: Africa/Brazzaville (calcul des fenêtres par jour dans ce TZ)
- Source de vérité:
  - User.trialEndsAt si présent
  - Sinon: createdAt + 14 jours (remonté en missingTrialEndsAtCount pour migration ultérieure)
- Idempotence: User.trialRemindersSent.{d7|d3|d1}; pas de renvoi le même jour (TZ Africa/Brazzaville)
- Cible: users plan 'trial'. Sans token Expo → ignorés côté backend; l’app planifie les notifications locales.
- Messages & deep link:
  - Data: { screen: 'CheckoutMobileMoney', reason: 'trial', daysLeft }
  - Textes FR/EN: 
    - J-7 FR: « Votre période d’essai se termine dans 7 jours » / EN: « Your trial ends in 7 days »
    - J-3 FR: « Plus que 3 jours d’essai » / EN: « Only 3 days left in your trial »
    - J-1 FR: « Dernier jour d’essai » / EN: « Final day of your trial »
    - Corps FR: « Activez Trivida via Mobile Money pour continuer. » / EN: « Activate Trivida via Mobile Money to keep going. »

Invocation cron
- Horaire: 09:00 Africa/Brazzaville (exécuter via Render/Cloudflare/GitHub Actions). Endpoint idempotent.
- cURL:
```
curl -X POST -H "X-Cron-Key: $CRON_SECRET" "$API_BASE/cron/trial/reminders"
```

Exemples de scheduler
- Render (UTC): 08:00 UTC (Africa/Brazzaville = UTC+1, pas de DST)
- Cloudflare Workers: cron 0 8 * * * (fetch POST + header X-Cron-Key)
- GitHub Actions: workflow cron '0 8 * * *' → curl POST

Expiration d’essai
- Le même cron bascule automatiquement les essais expirés (trialEndsAt <= now) vers plan: 'free'.

Comportement mobile
- Deep link: data.screen === 'CheckoutMobileMoney' ouvre l’écran de paiement.
- Fallback local: si l’utilisateur n’a pas de token Expo ou refuse la permission, l’app planifie des notifications locales J-7/J-3/J-1 à 09:00 Africa/Brazzaville (dedup via AsyncStorage).

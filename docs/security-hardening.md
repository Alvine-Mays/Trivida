# Sécurisation et durcissement (Prod)

Contrôles en place
- Helmet, CORS, compression, rate limiting global
- X-Request-Id injecté pour chaque requête
- Handler d’erreurs générique (INTERNAL_ERROR) sans fuite d’implémentation; détails loggués serveur uniquement
- Validation Zod sur les entrées critiques (auth, billing, etc.)
- Arrêt propre (graceful shutdown): SIGINT/SIGTERM + handlers uncaughtException/unhandledRejection
- /debug/db-check monté uniquement hors production
- Webhook CinetPay protégé par vérification côté serveur via /payment/check (aucun secret dans le webhook), rate limit dédié + allowlist IP optionnelle
- JWT stateless, pas de cookies sensibles exposés

Recommandations PROD
- CORS_ORIGIN: liste blanche des domaines front
- HTTPS/Reverse Proxy: activer HSTS côté proxy, TLS à jour
- Secrets: rotation régulière (JWT secrets, CINETPAY_API_KEY), stockage chiffré
- Logs: agrégation centralisée (X-Request-Id), retention, alertes 5xx anormales
- Base: backups, TTL indexes, alertes latence
- Cron externe: planifier /cron/trial/reminders à 09:00 Africa/Brazzaville
- Monitoring: /health check et latence /debug/db-check (staging)

Variables utiles
- RATE_LIMIT_* (global), limiter dédié auth (/auth) et webhook (CinetPay)
- CINETPAY_IP_ALLOWLIST: adresses acceptées sur le webhook (si communiquées par CinetPay)
- MONGO_SERVER_SELECTION_TIMEOUT_MS, MONGO_SOCKET_TIMEOUT_MS, MONGODB_TLS_INSECURE (DEV uniquement)

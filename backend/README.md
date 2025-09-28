# Trivida Backend (MVP)

Stack: Node.js 18+, Express, MongoDB (Mongoose), Zod validation, JWT (HS256), Helmet/CORS/rate-limit, compression.

Structure
- src/index.ts — bootstrap server, middlewares, routers
- src/config.ts — env config (aligné à docs/provisioning/backend.env.example)
- src/db.ts — connexion MongoDB
- src/middleware — auth, errors, cron key
- src/models — schémas Mongoose
- src/routes — Auth, Users, Decision, Finance, Savings, Events, Public, External (FX/Weather/Timezone), Notifications, Cron
- src/services — oauth (Google/Apple), users, fx, expo
- src/utils — jwt, slug, etag, pagination, currency

Scripts
- dev: tsx watch src/index.ts
- build: tsc
- start: node dist/index.js
- typecheck: tsc --noEmit
- test: vitest run (Mongo en mémoire)
- test:watch: vitest

Démarrage (dev)
1) Copier `docs/provisioning/backend.env.example` vers `backend/.env` et remplir les valeurs:
   - MONGODB_URI, JWT_*_SECRET, CRON_KEY
   - OPENWEATHER_API_KEY, TIMEZONEDB_API_KEY (optionnels pour tests externes)
   - GOOGLE_OAUTH_CLIENT_ID_* et APPLE_AUDIENCE (pour OAuth réel)
2) Installer deps: `npm ci`
3) Lancer: `npm run dev`

Production (Render)
- Voir `docs/provisioning/provisioning.md` et `docs/provisioning/render.yaml`
- Déployer repo GitHub connecté, Render utilisera:
  - build: `npm ci && npm run build`
  - start: `node dist/index.js`
- Configurer les variables d’env (cf. render.yaml)

Points clés
- JWT access: 15 min; refresh: 7 jours avec rotation et stockage en Session (jti+hash). Logout révoque les sessions de l’utilisateur.
- ETag: header `ETag=updatedAt.getTime()` sur GET; If-Match requis sur PATCH/DELETE pour éviter les conflits (412).
- FX/Weather/Timezone: caches DB (12h/1h/30j) avec TTL, endpoints `/fx/rates`, `/weather`, `/timezone`.
- Finance: conversions vers `baseCurrency` dans `/finance/summary` et `/finance/export.csv` via `/fx/rates` (cache 12 h).
- Events: slug public unique, privé par code hashé, budget réel via confirmations + plusOnes.
- Savings: CRUD + `/savings/plans/:id/projection` (intérêt simple, weekly/monthly).
- Notifications Expo: `/notifications/test` + Cron jobs `/cron/*` protégés par `X-Cron-Key`.

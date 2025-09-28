# Provisioning — Trivida MVP

Cible: Backend Node/Express sur Render, MongoDB Atlas (free tier), app mobile Expo. Notifications Expo. OAuth Google/Apple. Données externes: ExchangeRate.host, OpenWeatherMap, TimeZoneDB.

---

## 1) MongoDB Atlas (cluster, utilisateur, IP)
1. Créer un cluster Free (M0) — région la plus proche des utilisateurs.
2. Créer un utilisateur DB dédié (ex: `trivida_svc`) avec rôle `readWrite` sur la DB applicative (ex: `trivida`).
3. IP allowlist: en dev, autoriser `0.0.0.0/0` (à restreindre plus tard). En prod, autoriser uniquement Render egress IPs si disponibles.
4. Obtenir la chaîne de connexion SRV (MongoDB+SRV). Exemple:
   `MONGODB_URI=mongodb+srv://trivida_svc:<password>@<cluster>.mongodb.net/trivida`

## 2) Render — Service Web (backend)
1. Nouveau Web Service → connecter repo (ou Docker). Runtime Node 18+.
2. Build Command: `bun install` ou `npm ci && npm run build` selon projet. Start Command: `node dist/index.js` (ou `bun start`).
3. Configurer variables d’environnement (voir `backend.env.example`).
4. Activer auto-deploy sur branche principale.
5. Activer gzip (via compression Express).
6. Configurer CORS origin (en dev: `*`, en prod: app et Netlify).

## 3) Render — Cron Jobs
Créer 3 Cron Jobs pointant vers les endpoints sécurisés par en-tête `X-Cron-Key`:
- Savings reminders: POST `https://<backend>/cron/savings/reminders` — CRON: `0 8 * * *` (UTC ajusté si nécessaire) — Header `X-Cron-Key: <CRON_KEY>`
- Budget alerts: POST `https://<backend>/cron/budget/alerts` — CRON: `0 7 * * *` — Header idem
- FX warm (optionnel): POST `https://<backend>/cron/fx/warm` — CRON: `0 */12 * * *` — Header idem

Astuce: Pour l’heure locale utilisateur, calculer pour chaque utilisateur la prochaine exécution 8h locale et établir une file (le cron quotidien déclenche le batch du jour).

## 4) Expo Notifications
1. L’app enregistre un `expoPushToken` par device. Sauvegarder via `/users/push-tokens`.
2. Envoi: Backend → `https://exp.host/--/api/v2/push/send`. `EXPO_ACCESS_TOKEN` optionnel (recommandé pour débit élevé). Persister `ticketId` puis vérifier `receipt`.
3. Tester via `/notifications/test` (envoi à tous tokens de l’utilisateur courant).

## 5) OAuth Google/Apple

Google
- Créer un projet Google Cloud → OAuth consent screen (External) → Scopes de base (email, profile).
- Créer des OAuth Client IDs (Android, iOS, Web). Renseigner `GOOGLE_OAUTH_CLIENT_ID_*` côté backend.
- Côté mobile, utiliser Expo AuthSession/Google pour obtenir `idToken`, l’envoyer à `/auth/oauth/google`.

Apple
- Compte Apple Developer requis.
- Configurer Sign in with Apple pour l’app (Services ID / Bundle ID). 
- Côté mobile, obtenir `idToken` puis appeler `/auth/oauth/apple`.
- Backend: vérifier signature via JWKS Apple (pas besoin de clé privée pour valider un idToken). Variables fournies pour évolutions futures.

## 6) Externes & Caches
- ExchangeRate.host (illimité): pas de clé, base URL `https://api.exchangerate.host`.
- OpenWeatherMap: créer clé API, stocker `OPENWEATHER_API_KEY`.
- TimeZoneDB: créer clé, stocker `TIMEZONEDB_API_KEY`.
- TTL: FX 12h, Weather 1h, Timezone 30j — implémenter via `expiresAt` + TTL index.

## 7) Netlify (web plus tard)
- Créer un site Netlify (repo du futur web). 
- Définir `EXPO_PUBLIC_API_BASE_URL` côté site si besoin (les routes publiques existent déjà `GET /public/events/:slug`).

## 8) Rotation des secrets
- Garder secrets dans Render env vars et Atlas (jamais en repo).
- Politique: rotation semestrielle au minimum; rotation immédiate en cas d’incident.
- Rafraîchir `JWT_*_SECRET`, `CRON_KEY`, clés API externes.

## 9) Variables d’environnement
- Backend: voir `docs/provisioning/backend.env.example`
- App (Expo): voir `docs/provisioning/app.env.example`

---

Checklist provisioning
- [ ] Atlas cluster M0 + utilisateur + URI
- [ ] Render Web Service déployé + ENV
- [ ] Cron Jobs configurés + `X-Cron-Key`
- [ ] Clés OWM et TimeZoneDB en place
- [ ] OAuth Google/Apple testés
- [ ] Expo push test OK

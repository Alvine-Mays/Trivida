# Trivida — Spécification technique MVP (Expo RN + Node/Express + MongoDB Atlas)

Objectif: MVP mobile (Expo/React Native) avec backend Node.js/Express et MongoDB Atlas (free tier). Hébergement: Render. Langues: fr + en. Devise par défaut: XAF. Auth: Email+MDP fort, OAuth Google/Apple, JWT access 15 min, refresh rotation 7 jours. Notifications: Expo. Offline: AsyncStorage + file d’actions + ETag/412. Événements: lien public par slug unique + option privée par code d’accès. RSVP avec +1 et coût par invité. Caches externes: FX 12h, Météo 1h, Timezone 30j.

Alignement OpenAPI: voir `docs/openapi/trivida-openapi.yaml` (les endpoints et schémas sont identiques à cette spec).

---

## 1) Modèles MongoDB (champs, index, TTL)

Convention générales
- Tous documents: `_id:ObjectId`, `createdAt:Date`, `updatedAt:Date` (gérés par Mongoose/ODM ou middleware générique). ETag = hash simple de `updatedAt` (ex: ISO millis) renvoyé via en-tête HTTP `ETag`.
- Monnaie: champs `amountMinor:number` (entiers, unité mineure ISO 4217). Par défaut XAF (0 décimales => amountMinor = montant XAF). Transaction conserve `currency` d’origine. Conversions faites au moment des agrégations/exports.
- TTL via index expirant (MongoDB TTL Index) sur champs `expiresAt`.

### User
- email: string, unique, lowercase index.
- name: string.
- locale: 'fr' | 'en' (defaut 'fr').
- currency: ISO 4217 (defaut 'XAF').
- passwordHash: string (bcrypt cost 12) — présent si email/password.
- providers: {
  - googleId?: string,
  - appleId?: string
}
- expoPushTokens: string[] (tokens Expo les plus récents, taille contrôlée, ex: max 5)
- settings?: { timeZone?: string }
- Indexes: email unique.

### Session (refresh tokens)
- userId: ObjectId (index)
- jti: string (unique)
- refreshTokenHash: string (PBKDF2/argon/bcrypt — idéalement argon2 ou bcrypt cost 12)
- userAgent?: string, ip?: string
- revoked: boolean (defaut false)
- replacedByJti?: string
- expiresAt: Date (TTL index => 7 jours)
- Indexes: jti unique, userId, TTL sur expiresAt

### Decision
- userId: ObjectId (index)
- title: string
- context?: string
- factors: { budgetImpact:number[-2..2], longTermBenefit:number[0..2], urgency:number[0..1] }
- weatherContext?: { city?:string, country?:string, loc?:{lat:number, lon:number}, condition?:string, temperature?:number }
- score: number (calculé)
- recommendation?: string (libellé d’option)
- chosenOption?: string
- status: 'pending' | 'decided' (defaut 'pending')
- Indexes: userId, createdAt desc

### FinanceCategory
- userId: ObjectId (index)
- name: string
- type: 'expense' | 'income' | 'savings'
- color?: string (hex), icon?: string
- Indexes: unique composé (userId + name)

### Transaction
- userId: ObjectId (index)
- categoryId: ObjectId (index)
- eventId?: ObjectId (index)
- amountMinor: number (entier)
- currency: string (ISO 4217, defaut 'XAF')
- date: Date (index desc)
- note?: string
- Indexes: userId+date desc, categoryId, eventId

### SavingsPlan
- userId: ObjectId (index)
- name: string
- cadence: 'weekly' | 'monthly'
- targetAmountMinor: number
- currency: string (defaut 'XAF')
- startDate: Date
- annualInterestRate?: number (ex: 0.06 => 6%)
- autoRemind: boolean (defaut true)
- nextReminderAt?: Date
- Indexes: userId

### ExchangeRateCache (TTL 12h)
- base: string (defaut 'XAF')
- target: string
- rate: number
- fetchedAt: Date
- expiresAt: Date (TTL 12h)
- Indexes: unique (base+target), TTL sur expiresAt

### WeatherCache (TTL 1h)
- key: string (ex: `${lat},${lon}` ou ville normalisée)
- payload: object (réponse OWM pertinente)
- fetchedAt: Date
- expiresAt: Date (TTL 1h)
- Indexes: unique key, TTL

### TimezoneCache (TTL 30j)
- key: string (ex: `${lat},${lon}`)
- payload: object (réponse TimeZoneDB pertinente)
- fetchedAt: Date
- expiresAt: Date (TTL 30j)
- Indexes: unique key, TTL

### Event
- userId: ObjectId (index)
- title: string
- dateTime: Date
- timeZone?: string
- location?: string
- visibility: 'public' | 'private'
- accessCodeHash?: string (si private)
- slug: string (unique). Collisions => suffixes incrementaux (`-1`, `-2`, ...). Réservés: ["admin","login","api","public","assets"]
- costPerGuestMinor: number
- currency: string (defaut 'XAF')
- allowPlusOnes: boolean (defaut true)
- capacity?: number
- Indexes: slug unique, userId

### Invitee
- eventId: ObjectId (index)
- name: string (requis)
- email?: string, phone?: string
- status: 'pending' | 'yes' | 'no' | 'maybe' (defaut 'pending')
- plusOnes: number (defaut 0)
- Indexes: eventId, unique partiel optionnel (eventId+email) si fourni

### Notification
- userId: ObjectId (index)
- type: 'savings_reminder' | 'budget_alert' | 'event_reminder' | 'generic'
- message: string
- data?: object
- status: 'queued' | 'sent' | 'failed'
- targetPushToken: string
- ticketId?: string
- receiptStatus?: 'ok' | 'error'
- Indexes: userId, status

### AuditLog (optionnel)
- userId?: ObjectId, action: string, entity: string, entityId?: ObjectId, meta?: object, createdAt
- Index: createdAt desc

---

## 2) Endpoints REST + schémas (Zod côté backend) + erreurs

Standard
- Auth: JWT Bearer HS256. Access 15 min. Refresh rotation 7 jours (jti + hash en DB). Logout révoque. 
- Sécurité: Helmet, CORS limité, rate limit (ex: 60 req/min IP), validation Zod.
- Pagination: cursor-based `?cursor=<base64(JSON:{createdAt,_id})>&limit=...` tri desc `createdAt` (fallback `_id`).
- En-têtes ressources: `ETag: "<updatedAt.getTime()>"`. Updates exigent `If-Match` = ETag courant. Sinon 412.
- Erreurs (machine-friendly): `{ code:string, message:string, details?:any }`.
  - `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `SESSION_REVOKED`, `PRECONDITION_FAILED`.

Auth
- POST `/auth/register` body: { email, password, name?, locale?, currency? } → 201 { user, tokens }
- POST `/auth/login` body: { email, password } → 200 { user, tokens }
- POST `/auth/oauth/google` body: { idToken } → 200 { user, tokens } (verify Google idToken)
- POST `/auth/oauth/apple` body: { idToken } → 200 { user, tokens }
- POST `/auth/refresh` body: { refreshToken } → 200 { tokens } (rotation, invalide l’ancien jti)
- POST `/auth/logout` → 204 (révoque toute session active du jti courant)
- GET `/auth/me` → 200 { user }

Users
- PATCH `/users` body: { name?, locale? ('fr'|'en'), currency? (ISO), settings? } → 200 { user }
- POST `/users/push-tokens` body: { token:string } → 201
- DELETE `/users/push-tokens` body: { token:string } → 204

Decision
- GET `/decision/templates?query=...` → 200 { templates:[{pattern,options,defaults}] } (utilise dataset v1)
- POST `/decision/score` body: { factors } → 200 { score:number, rankedOptions:[{label,score}] }
- POST `/decisions` body: { title, context?, factors, weatherContext? } → 201 { decision }
- GET `/decisions?cursor&limit&status` → 200 { items, nextCursor? }
- GET `/decisions/:id` → 200 { decision } + ETag
- PATCH `/decisions/:id` If-Match requis; body: { title?, factors?, chosenOption?, status? } → 200 { decision }
- DELETE `/decisions/:id` → 204

Finance
- Categories: GET/POST `/finance/categories`; GET/PATCH/DELETE `/finance/categories/:id`
- Transactions: GET/POST `/finance/transactions`; GET/PATCH/DELETE `/finance/transactions/:id`
- Summary: GET `/finance/summary?from&to&baseCurrency=XAF` → totaux par type/catégorie, conversion via FX cache
- Export: GET `/finance/export.csv?from&to&baseCurrency` → `text/csv`

Savings
- GET/POST `/savings/plans`; GET/PATCH/DELETE `/savings/plans/:id`
- GET `/savings/plans/:id/projection?periods=...` → montants par période + intérêts simples

FX / Weather / Timezone
- GET `/fx/rates?base=XAF&symbols=USD,EUR` → depuis cache 12h sinon ExchangeRate.host
- GET `/weather?lat&lon&units=metric` → cache 1h (OpenWeatherMap)
- GET `/timezone?lat&lon` → cache 30j (TimeZoneDB)

Events & Invitees
- POST `/events` body: { title, dateTime, timeZone?, location?, visibility, accessCode?, costPerGuestMinor, currency?, allowPlusOnes?, capacity? } [si private, `accessCode` hashé en DB]
- GET `/events?cursor&limit` → 200 { items, nextCursor? }
- GET `/events/:id` → 200 { event } + ETag
- PATCH `/events/:id` (If-Match) → 200 { event }
- DELETE `/events/:id` → 204
- GET `/events/:id/budget` → 200 { actualBudgetMinor, currency, yesCount, plusOnesYes }
- GET `/events/:eventId/invitees` → 200 { items }
- POST `/events/:eventId/invitees` → 201 { invitee }
- PATCH `/invitees/:id` → 200 { invitee }
- DELETE `/invitees/:id` → 204

Public
- GET `/public/events/:slug` → 200 { eventPublic } (si private, requiert `accessCode` query; sinon 403)
- POST `/public/events/:slug/rsvp` body: { name, email?, phone?, status:'yes'|'no'|'maybe', plusOnes?:number, accessCode? } → 201/200 { invitee }

Notifications & CRON
- POST `/notifications/test` body: { message? } → envoi à tous tokens Expo de l’utilisateur
- POST `/cron/savings/reminders` (CronKey) → planifie/envoie rappels quotidiens 8h locale
- POST `/cron/budget/alerts` (CronKey) → alerte dépassement budget
- POST `/cron/fx/warm` (CronKey, optionnel) → prefetch FX toutes 12h

### Schémas de données (extraits Zod → JSON)
- Error: `{ code:string, message:string, details?:any }`
- Tokens: `{ accessToken:string, accessTokenExpiresAt:number, refreshToken:string, refreshTokenExpiresAt:number }`
- User: `{ _id, email, name, locale, currency, expoPushTokens? }`
- Decision: `{ _id, userId, title, context?, factors, weatherContext?, score, recommendation?, chosenOption?, status, createdAt, updatedAt }`
- FinanceCategory: `{ _id, userId, name, type, color?, icon? }`
- Transaction: `{ _id, userId, categoryId, eventId?, amountMinor, currency, date, note? }`
- SavingsPlan: `{ _id, userId, name, cadence, targetAmountMinor, currency, startDate, annualInterestRate?, autoRemind, nextReminderAt? }`
- Event: `{ _id, userId, title, dateTime, timeZone?, location?, visibility, slug, costPerGuestMinor, currency, allowPlusOnes, capacity?, createdAt, updatedAt }`
- Invitee: `{ _id, eventId, name, email?, phone?, status, plusOnes }`

---

## 3) Règles Décision (dataset + algo)

Dataset: `data/decision_rules.v1.json`
- weights: budgetImpact 0.5, longTermBenefit 0.35, urgency 0.15
- scales: normalisation linéaire selon min/max par facteur
- templates: patterns pour matcher l’intention (ex: « épargn », « dîner », « sortir ») → propose 2 options + defaults de facteurs
- genericOptions: fallback global si aucun motif

Algorithme de scoring
1. Normaliser chaque facteur sur [0..1] via `x' = (x - min) / (max - min)` selon `scales`.
2. Score = `0.5*budgetImpact' + 0.35*longTermBenefit' + 0.15*urgency'`.
3. Pour chaque option candidate, ajuster via heuristique simple (ex: « Épargner maintenant » +0.05 si longTermBenefit > 1.2). Retourner `rankedOptions` par score décroissant.

Intégration météo (optionnelle)
- Si météo défavorable (pluie/intempéries via OWM), pénaliser options extérieures (ex: dîner dehors −0.1). Mappage simple condition → delta.

---

## 4) Finance & Épargne — calculs

- Conversions FX à l’affichage/agrégation: utiliser `/fx/rates` (cache 12h). Conversion base → `baseCurrency` (defaut XAF).
- Résumés: totaux par type (income/expense/savings) et par catégorie; période [from,to].
- Export CSV: colonnes (date, category, note, amountMinor, currency, amountInBaseMinor, baseCurrency).
- Épargne (intérêt simple):
  - Période = weekly/monthly selon `cadence`.
  - Intérêt simple périodique = `principal * (annualRate / periodsPerYear)`.
  - Projection N périodes → cumuls et date de fin estimée.
- Liaison événements: `eventId` sur Transaction.

---

## 5) Événements & RSVP

- Slug public unique: généré à partir du titre (kebab-case). Si collision, suffixes `-1`, `-2`, ... Filtrer contre la liste réservée.
- Événement privé: `visibility='private'` + `accessCodeHash` (hash bcrypt). Accès public nécessite `accessCode` correct.
- RSVP public: nom requis, email/phone optionnels. `plusOnes` autorisés si `allowPlusOnes`.
- Budget réel: `costPerGuestMinor * (countYes + sum(plusOnes des yes))`.

---

## 6) Authentification & Sécurité

- Email+MDP: MDP min 8, 1 maj, 1 chiffre; hash bcrypt cost 12.
- OAuth Google/Apple: vérifier `idToken` côté backend (audience, signature, expiry).
- JWT: HS256. Access 15 min. Refresh 7 jours rotation:
  - Stocker en `Session` (jti + hash du refresh). 
  - `refresh` invalide l’ancien jti (revoked=true, replacedByJti) et crée un nouveau.
  - Logout révoque jti courant.
- Headers de sécurité: Helmet. CORS: origines connues (dev: `*`). Rate limit: ex 60/mn.
- Validation: Zod sur toutes entrées. Réponses d’erreur avec `code`.

---

## 7) Offline & Synchronisation

- Côté app: AsyncStorage
  - `actionQueue`: file d’actions CRUD { entity, op, payload, localId, ts }.
  - Stratégie: d’abord en local; sync en arrière-plan.
- ETag & conflits:
  - GET renvoie `ETag: updatedAtMillis`.
  - PATCH/DELETE doivent envoyer `If-Match`. 
  - Si ETag différent → 412 PRECONDITION_FAILED avec payload `{ server, client }` (snapshots) pour UI de résolution (options garder/écraser/fusionner).
- Diff simple client: comparer champs scalaires; fusion permissive pour champs non conflictuels.

---

## 8) i18n

- Langues: FR + EN
- Namespaces mobile: `common`, `auth`, `decision`, `finance`, `events`.
- Backend neutre langue: renvoie codes d’erreur; le client mappe vers messages localisés.
- Formats devise/nombres: `Intl.NumberFormat` avec currency par défaut `XAF`.

---

## 9) Notifications (Expo)

- Stocker `expoPushTokens` par utilisateur (max 5, déduplication). 
- Envoi: tickets/receipts Expo; persister `ticketId`, `receiptStatus`. 
- Rappels épargne: job quotidien 8h locale (TimeZoneDB pour zone). 
- Alertes budget: job périodique (quotidien) si dépenses > seuil (heuristique simple). 
- FX warmer (optionnel): toutes 12h.

---

## 10) Performance

- Pagination cursor-based sur `createdAt` (desc), limit max 100.
- Projections ciblées (mongoose `.select`).
- Indexations listées par modèle.
- Gzip/Compression activée.
- Limites payload (ex: 1–2MB). 
- Rate limits par route sensible (auth).

---

## 11) Acceptation (checklist par module)

Auth
- [ ] Register/Login/OAuth/Refresh/Logout OK
- [ ] MDP complexe, bcrypt cost 12
- [ ] JWT access 15min, refresh rotation 7j (Session.jti+hash)

Décision
- [ ] Scoring conforme weights/scales v1
- [ ] Intégration météo conditionnelle (pénalités simples)
- [ ] Dataset v1 parsé et utilisé

Finance/Épargne
- [ ] CRUD catégories/transactions
- [ ] Résumé converti en devise de base (XAF par défaut)
- [ ] Export CSV cohérent
- [ ] Projection épargne simple (weekly/monthly)

Événements/RSVP
- [ ] Slug unique + réservés gérés (suffixes)
- [ ] Privé via code d’accès hashé
- [ ] RSVP public name requis, +1 supporté
- [ ] Budget réel conforme formule

Offline/i18n
- [ ] ETag sur GET, If-Match sur PATCH/DELETE
- [ ] 412 avec payload de résolution
- [ ] Mapping codes d’erreur → messages FR/EN

Notifications
- [ ] Expo tokens stockés, envoi tickets/receipts
- [ ] CRON Render (épargne 8h locale, budget, FX warmer)

Performance
- [ ] Pagination cursor-based
- [ ] Projections/indexations appliquées

---

Notes de décisions (MVP)
- Storage monétaire: integers `amountMinor` + `currency` pour simplicité et robustesse.
- Refresh token: transmis dans le body pour mobile (plus simple qu’httpOnly); à durcir ensuite (DPoP/Binding).
- Public/private event: `accessCode` en query/body pour endpoints publics; hashé côté serveur.
- Conflits offline: UX « demander » priorisée; pas de merge complexe MVP.

# Backlog priorisé — Trivida MVP

Priorisation: P0 (critique), P1 (important), P2 (nice to have)

---

## P0 — Auth & Fondations

Story: En tant qu’utilisateur, je peux créer un compte avec email et mot de passe fort afin d’accéder à l’app.
- Critères d’acceptation
  - MDP min 8, 1 maj, 1 chiffre, hash bcrypt 12
  - À la connexion, je reçois access (15min) et refresh (7j rotation)
  - Refresh invalide l’ancien jeton (Session.jti+hash)

Story: En tant qu’utilisateur, je peux me connecter avec Google/Apple.
- Critères d’acceptation
  - Vérification `idToken` backend
  - Compte fusionné si email identique

Story: En tant qu’utilisateur, je peux consulter/mettre à jour mon profil (nom, langue, devise).
- Critères d’acceptation
  - PATCH `/users` avec validation Zod

Fondations backend
- Helmet, CORS, rate limiting, gzip activés
- Zod sur toutes entrées
- Errors `{code,message}`
- Pagination cursor-based

---

## P0 — Décision (dataset v1)

Story: En tant qu’utilisateur, je peux calculer un score de décision à partir de facteurs.
- Critères d’acceptation
  - Normalisation selon `factors.scales`
  - Pondération selon `factors.weights`

Story: En tant qu’utilisateur, je peux enregistrer une décision avec une recommandation proposée.
- Critères d’acceptation
  - Création `/decisions` calcule score + recommendation
  - Liste paginée `/decisions`
  - Détail avec ETag; modification exige If-Match

Story: En tant qu’utilisateur, je vois des options suggérées selon mon texte.
- Critères d’acceptation
  - `/decision/templates?query=...` utilise `decision_rules.v1.json`

---

## P0 — Finance & Épargne

Story: En tant qu’utilisateur, je gère mes catégories.
- Critères d’acceptation
  - CRUD catégories, unicité (userId+name)

Story: En tant qu’utilisateur, j’enregistre des transactions (revenus, dépenses, épargne).
- Critères d’acceptation
  - `amountMinor` entier + `currency` (defaut XAF)
  - Lier à un événement optionnel

Story: En tant qu’utilisateur, je consulte un résumé avec conversions de devises.
- Critères d’acceptation
  - `/finance/summary?from&to&baseCurrency=XAF`
  - Utilise cache FX (12h)

Story: En tant qu’utilisateur, je peux exporter mes données en CSV.
- Critères d’acceptation
  - `/finance/export.csv` avec montants convertis

Story: En tant qu’utilisateur, je planifie mon épargne (hebdo/mensuel) avec intérêt simple.
- Critères d’acceptation
  - CRUD plans
  - `/savings/plans/:id/projection` renvoie l’échéancier

---

## P0 — Événements & RSVP

Story: En tant qu’utilisateur, je crée un événement avec lien public.
- Critères d’acceptation
  - Slug unique; collisions gérées par suffixe; réservés filtrés
  - Option `private` avec code d’accès (hashé en DB)

Story: En tant qu’invité, je vois une page publique de l’événement et je peux RSVP (+1).
- Critères d’acceptation
  - GET `/public/events/:slug` (si privé, nécessite `accessCode`)
  - POST `/public/events/:slug/rsvp` name requis, plusOnes autorisé

Story: En tant qu’organisateur, je vois le budget réel.
- Critères d’acceptation
  - GET `/events/:id/budget` = `costPerGuestMinor * (yes + plusOnesYes)`

---

## P0 — Offline & Sync

Story: En tant qu’utilisateur, je peux continuer hors-ligne et synchroniser mes actions.
- Critères d’acceptation
  - File d’actions AsyncStorage
  - ETag sur GET et If-Match sur PATCH/DELETE
  - 412 renvoie `{server,client}` pour écran de résolution

---

## P1 — Notifications

Story: En tant qu’utilisateur, je reçois un rappel d’épargne à 8h locale.
- Critères d’acceptation
  - Cron Render quotidien + TimeZoneDB
  - Tickets/receipts Expo persistés

Story: En tant qu’utilisateur, je reçois une alerte budget si je dépasse un seuil.
- Critères d’acceptation
  - Cron quotidien + règle simple (> moyenne des 4 semaines)

---

## P1 — i18n & Accessibilité

Story: En tant qu’utilisateur, je vois l’app en FR/EN.
- Critères d’acceptation
  - Namespaces `common, auth, decision, finance, events`
  - Mapping codes d’erreur → messages localisés

Story: En tant qu’utilisateur, je peux utiliser l’app avec un bon contraste et focus visibles.
- Critères d’acceptation
  - Contraste ≥ 4.5:1; cibles tactiles ≥ 44px

---

## P2 — Divers

- Endpoint HEAD pour récupérer ETag sans payload
- Raccourcis UI (dupliquer transaction/événement)
- Import CSV

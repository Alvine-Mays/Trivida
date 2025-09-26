# Paiements Mobile Money — MTN et Airtel CG (Guide d’intégration)

Objectif: Activer le plan Premium Trivida par Mobile Money (MTN/Airtel CG) avec webhooks de confirmation côté backend. Vous fournissez les API/credentials. Ce guide détaille la configuration attendue et les endpoints à exposer.

---

## 1) Variables d’environnement (backend)

- MM_PROVIDER: mtn|airtel (indicatif, optionnel)
- MTN_MOMO_API_KEY, MTN_MOMO_API_SECRET, MTN_MOMO_SUBSCRIPTION_KEY (si MTN MoMo API)
- AIRTEL_API_KEY, AIRTEL_API_SECRET (si Airtel Money API)
- BILLING_WEBHOOK_SECRET: secret HMAC utilisé pour signer/valider les webhooks (X-Signature)

Ajoutez-les à `backend/.env` et/ou Render.

## 2) Endpoints backend (déjà stubbés)

- POST `/billing/mtn/webhook`
- POST `/billing/airtel/webhook`

Payload attendu (exemple minimal):
```json
{
  "userId": "<ObjectId>",
  "reference": "MM-2025-0001",
  "amount": 2000,
  "currency": "XAF",
  "status": "success",
  "periodDays": 30,
  "timestamp": 1735600000000
}
```

Headers:
- `X-Signature`: HMAC-SHA256 du body (UTF-8) avec `BILLING_WEBHOOK_SECRET` (hex/base64). 

Traitement:
- Si `status=success` → `users.plan = 'premium'`, `users.premiumUntil = now + periodDays`, `users.trialEndsAt` laissé tel quel.
- Idempotence: ignorer si la même `reference` déjà traitée (extensible en ajoutant une collection `BillingEvents`).

Réponses:
- 200 JSON `{ ok: true }`.
- 400/401 si invalid/missing signature.

NB: Vous pouvez enrichir le payload avec le MSISDN (numéro), opérateur, etc. Aucune donnée de carte n’est stockée.

## 3) Flux recommandés

1. L’utilisateur clique “Demander l’activation” (écran Abonnement & Points) → vous le contactez (WhatsApp/Email) ou utilisez votre frontend de paiement MoMo/Airtel.
2. À la confirmation opérateur, votre serveur de paiement appelle le webhook correspondant.
3. L’utilisateur voit son plan Premium actif (plan/premiumUntil) via `/auth/me`.

## 4) Test & validation

- Envoyez un POST sur `/billing/mtn/webhook` avec un JSON de test et un header X-Signature correct → vérifiez que le plan passe en Premium.
- Vérifiez ensuite l’accès aux fonctionnalités Premium (export, rapports détaillés) sans consommer de points.

## 5) Extensions possibles

- Endpoint `/billing/checkout` (optionnel): initier une demande MoMo/Airtel côté backend (pull/push), gérer les statuts, persister `BillingEvents`.
- Notifications in-app: envoyer une notification “Abonnement activé” via `/notifications/test`.

## 6) Sécurité

- Validez toujours la signature `X-Signature`.
- Filtrez par IP (si liste officielle dispo) et ajoutez un identifiant d’événement idempotent.
- Journalisez en JSON (sans PII) pour audit.

---

Si vous fournissez des spécificités API (endpoints opérateurs, signatures, schémas précis), j’adapterai immédiatement les webhooks et la vérification.

# Reçus — CSV/PDF (FR)

Modèle
- Receipt: paymentIntentId, userId, receiptNumber (RCT-<requestId>), amount, currency, months, unitPrice, discountPercent, network, msisdn, provider, providerRef, issuedAt

Création
- Au webhook Flutterwave (SUCCESS): un reçu est créé (idempotent) et Premium est prolongé

Endpoints (auth)
- GET /billing/receipts/:id.csv — CSV simple (en-tête + une ligne)
- GET /billing/receipts/:id.pdf — PDF généré (pdfkit) avec les champs essentiels

Sécurité
- Seul le propriétaire (userId) peut télécharger son reçu

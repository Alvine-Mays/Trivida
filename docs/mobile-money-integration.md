# Intégration Mobile Money via CinetPay (FR)

CinetPay remplace l’intégration directe MTN/Airtel. Un seul webhook est utilisé et vérifié par appel /payment/check.

Endpoints
- Initiation: POST /billing/subscriptions/initiate
- Webhook: POST /billing/cinetpay/webhook
- Statut: GET /billing/mobile-money/status/:requestId

Vérification webhook
- Le backend appelle /payment/check (apikey + site_id) avec transaction_id reçu
- Statuts: ACCEPTED → SUCCESS, REFUSED → FAILED, sinon PENDING

Mapping d’états (interne)
- INITIATED → PENDING → SUCCESS / FAILED / CANCELED
- SUCCESS: activation Premium (plan='premium', premiumUntil + months), création Receipt

Variables d’environnement
- CINETPAY_BASE_URL, CINETPAY_SITE_ID, CINETPAY_API_KEY, CINETPAY_NOTIFY_URL, (optionnel) CINETPAY_RETURN_URL, API_PUBLIC_BASE_URL (si utilisé pour fabriquer notify_url)

Sécurité & Observabilité
- Vérification côté serveur via /payment/check (pas de secret exposé dans le webhook)
- Logs avec X-Request-Id, endpoints /health et /debug/db-check pour diagnostic

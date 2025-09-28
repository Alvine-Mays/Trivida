#!/usr/bin/env bash
set -euo pipefail

# Script de tests Backend Trivida — cURL
# Prérequis: backend démarré (par défaut: http://localhost:4000)

API_BASE="${API_BASE:-http://localhost:4000}"
CRON_SECRET="${CRON_SECRET:-changez-moi}"
FLW_WEBHOOK_HASH="${FLW_WEBHOOK_HASH:-changez-moi}"
# Génération d'un email unique pour chaque test
TEST_EMAIL="${TEST_EMAIL:-test_$(date +%s)@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-Password123}"
TEST_PHONE="${TEST_PHONE:-060123456}"
TEST_NETWORK="${TEST_NETWORK:-MTN}"   # MTN | AIRTEL
TEST_MONTHS="${TEST_MONTHS:-1}"       # 1 | 3 | 12

# Utilitaire: extraire un champ JSON (sans jq)
json_get() {
  local key="$1"; shift
  local input="$*"
  echo "$input" | sed -n "s/.*\"${key}\"\\s*:\\s*\"\\([^\"]*\\)\".*/\\1/p" | head -n1
}

# Vérifier que le backend est joignable
if ! curl -sS "$API_BASE" >/dev/null 2>&1; then
  echo "Erreur: impossible d'atteindre $API_BASE. Lancez le backend avant ce script." >&2
  exit 1
fi

echo "— Tests cURL — API_BASE=$API_BASE —"

# 1) Inscription (tolère le 409 si l’email existe déjà)
REG_RES=$(curl -sS -X POST "$API_BASE/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"locale\":\"fr\"}" || true)

# Détecter conflit ou succès
REG_CODE=$(echo "$REG_RES" | json_get code || true)
if [[ "$REG_CODE" == "CONFLICT" ]]; then
  echo "[register] Email déjà utilisé, on continue avec cet utilisateur."
else
  echo "[register] $REG_RES"
fi

# 2) Connexion
LOGIN_RES=$(curl -sSfS -X POST "$API_BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}") || {
    echo "Erreur: impossible de se connecter avec $TEST_EMAIL" >&2
    exit 1
}
ACCESS_TOKEN=$(echo "$LOGIN_RES" | json_get accessToken)
if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "Erreur: token d'accès introuvable" >&2
  exit 1
fi
echo "[login] accessToken=${ACCESS_TOKEN:0:12}..."

# 3) Profil
curl -sSfS -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE/auth/me" | sed 's/.*/[me] &/'

# 4) Cron rappels d’essai
curl -sSfS -X POST "$API_BASE/cron/trial/reminders" -H "X-Cron-Key: $CRON_SECRET" | sed 's/.*/[cron] &/'

# 5) Initiation abonnement (Flutterwave)
SUB_INIT_RES=$(curl -sSfS -X POST "$API_BASE/billing/subscriptions/initiate" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"months\":$TEST_MONTHS,\"network\":\"$TEST_NETWORK\",\"phone\":\"$TEST_PHONE\"}") || {
    echo "Erreur: impossible d'initier l'abonnement" >&2
    exit 1
}
echo "$SUB_INIT_RES" | sed 's/.*/[init] &/'
REQ_ID=$(json_get requestId "$SUB_INIT_RES")
AMOUNT=$(json_get amount "$SUB_INIT_RES")
if [[ -z "$REQ_ID" ]]; then
  echo "Erreur: requestId non trouvé dans la réponse d'initiation" >&2
  exit 1
fi
echo "[init] requestId=$REQ_ID amount=$AMOUNT"

# 6) Webhook Flutterwave (SUCCESS) — simulation
FLW_PAYLOAD="{\"data\":{\"status\":\"successful\",\"tx_ref\":\"$REQ_ID\",\"id\":\"FLW-DEMO-1\"}}"
curl -sSfS -X POST "$API_BASE/billing/flutterwave/webhook" \
  -H "Content-Type: application/json" \
  -H "verif-hash: $FLW_WEBHOOK_HASH" \
  -d "$FLW_PAYLOAD" | sed 's/.*/[webhook] &/'

# 7) Statut paiement
curl -sSfS -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE/billing/mobile-money/status/$REQ_ID" | sed 's/.*/[status] &/'

# 8) Vérifier Premium
curl -sSfS -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE/auth/me" | sed 's/.*/[me-2] &/'

#!/usr/bin/env bash
set -euo pipefail

# Script de tests Backend Trivida (FR) — uniquement avec cURL
# Prérequis: backend démarré (par défaut: http://localhost:4000)
# Personnalisez les variables ci-dessous selon votre environnement.

API_BASE="${API_BASE:-http://localhost:4000}"
CRON_SECRET="${CRON_SECRET:-changez-moi}"
FLW_WEBHOOK_HASH="${FLW_WEBHOOK_HASH:-changez-moi}"
TEST_EMAIL="${TEST_EMAIL:-e2e_$(date +%s)@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-Password123}"
TEST_PHONE="${TEST_PHONE:-060123456}"
TEST_NETWORK="${TEST_NETWORK:-MTN}"
TEST_MONTHS="${TEST_MONTHS:-1}"

# Utilitaire: extraire un champ JSON (best-effort sans jq)
json_get() {
  local key="$1"; shift
  local input="$*"
  echo "$input" | sed -n "s/.*\"${key}\"\s*:\s*\"\([^\"]*\)\".*/\\1/p" | head -n1
}

# Vérifier la connectivité à l’API
if ! curl -sS "$API_BASE" >/dev/null 2>&1; then
  echo "Erreur: impossible d'atteindre $API_BASE. Lancez le backend avant ce script." >&2
  exit 1
fi

echo "— Tests cURL — API_BASE=$API_BASE —"

# 1) Inscription (tolère le 409 si l’email existe déjà)
REG_RES=$(curl -sS -X POST "$API_BASE/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"locale\":\"fr\"}") || true
echo "[register] $REG_RES"

# 2) Connexion
LOGIN_RES=$(curl -sSfS -X POST "$API_BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
ACCESS_TOKEN=$(echo "$LOGIN_RES" | sed -n 's/.*"accessToken"\s*:\s*"\([^"]*\)".*/\1/p' | head -n1)
if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "Erreur: token d'accès introuvable" >&2
  exit 1
fi
echo "[login] accessToken=${ACCESS_TOKEN:0:12}..."

# 3) Profil
curl -sSfS -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE/auth/me" | sed 's/.*/[me] &/'

# 4) Cron rappels d’essai
curl -sSfS -X POST "$API_BASE/cron/trial/reminders" -H "X-Cron-Key: $CRON_SECRET" | sed 's/.*/[cron] &/'

# 5) Initiations abonnement (CinetPay) — 1, 3 et 12 mois
run_initiate() {
  local months="$1"
  local expected
  if [[ "$months" == "1" ]]; then
    expected=2000
  elif [[ "$months" == "3" ]]; then
    expected=$(( 3*2000*95/100 ))
  elif [[ "$months" == "12" ]]; then
    expected=$(( 12*2000*85/100 ))
  else
    expected=0
  fi
  local res=$(curl -sSfS -X POST "$API_BASE/billing/subscriptions/initiate" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "{\"months\":$months,\"network\":\"$TEST_NETWORK\",\"phone\":\"$TEST_PHONE\"}")
  echo "$res" | sed "s/.*/[init-$months] &/"
  local rid=$(json_get requestId "$res")
  local amt=$(json_get amount "$res")
  if [[ -z "$rid" ]]; then echo "Erreur: requestId manquant (months=$months)" >&2; exit 1; fi
  echo "[check-$months] attendu=$expected XAF; reçu=$amt XAF"
  if [[ -n "$amt" && "$amt" != "$expected" ]]; then echo "Alerte: montant inattendu" >&2; fi
  echo "$rid"
}

RID1=$(run_initiate 1)
RID3=$(run_initiate 3)
RID12=$(run_initiate 12)

# 6) Webhook CinetPay (ACCEPTED) — simulation sandbox
# IMPORTANT: Démarrer le backend avec CINETPAY_SANDBOX_MODE=1 pour permettre ce test
sandbox_webhook() {
  local rid="$1"
  local payload="{\"transaction_id\":\"$rid\",\"status\":\"ACCEPTED\"}"
  curl -sSfS -X POST "$API_BASE/billing/cinetpay/webhook" \
    -H "Content-Type: application/json" \
    -d "$payload" | sed 's/.*/[webhook] &/'
  curl -sSfS -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE/billing/mobile-money/status/$rid" | sed 's/.*/[status] &/'
}

sandbox_webhook "$RID1"
sandbox_webhook "$RID3"
sandbox_webhook "$RID12"

# 7) Vérifier Premium
curl -sSfS -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE/auth/me" | sed 's/.*/[me-2] &/'

# 8) Lister reçus + télécharger le CSV du plus récent
LIST=$(curl -sSfS -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE/billing/receipts?limit=1")
echo "$LIST" | sed 's/.*/[receipts] &/'
RID=$(echo "$LIST" | sed -n 's/.*"_id"\s*:\s*"\([^"]*\)".*/\1/p' | head -n1)
if [[ -n "$RID" ]]; then
  echo "[receipt-csv]"
  curl -sSfS -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE/billing/receipts/$RID.csv" | head -n 2
fi

echo "✅ Scénarios cURL terminés. (Backend sandbox: export CINETPAY_SANDBOX_MODE=1 ; définir CRON_SECRET)"
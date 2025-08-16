#!/bin/bash
# create_secret_fixed_json.sh
set -euo pipefail

WALLET_ID=${1:-}
PRIVATE_KEY=${2:-}
MNEMONIC=${3:-}

if [[ -z "${WALLET_ID}" || -z "${PRIVATE_KEY}" || -z "${MNEMONIC}" ]]; then
  echo "Usage: $0 <wallet_id> <encryptedPrivateKey> <mnemonic>"
  exit 1
fi

# ===== Config “come ce l’hai ora” (lasciate hardcoded) =====
KC_BASE="http://localhost:8080"
REALM="myrealm"
CLIENT_ID="secret-manager"
CLIENT_SECRET="neXMowQqlq92XsV9AzGn1n05twBOww4A"

echo "🔑 Ottenimento token (client_credentials)…"
TOKEN_RESP=$(curl -sS --location --request POST "${KC_BASE}/realms/${REALM}/protocol/openid-connect/token" \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "client_id=${CLIENT_ID}" \
  --data-urlencode "client_secret=${CLIENT_SECRET}" \
  --data-urlencode 'grant_type=client_credentials')

ACCESS_TOKEN=$(jq -r '.access_token // empty' <<<"${TOKEN_RESP}")

if [[ -z "${ACCESS_TOKEN}" ]]; then
  echo "❌ Errore nel recupero del token. Risposta completa:"
  echo "${TOKEN_RESP}" | jq . || echo "${TOKEN_RESP}"
  exit 1
fi
echo "✅ Token ottenuto."

echo "🔎 Recupero UUID del client (${CLIENT_ID})…"
# query filtrata (più veloce e meno fragile)
CLIENTS_JSON=$(curl -sS -w '\n%{http_code}' -X GET \
  "${KC_BASE}/admin/realms/${REALM}/clients?clientId=${CLIENT_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

CLIENTS_BODY=$(head -n -1 <<<"${CLIENTS_JSON}")
CLIENTS_CODE=$(tail -n1 <<<"${CLIENTS_JSON}")

if [[ "${CLIENTS_CODE}" != "200" ]]; then
  echo "❌ Admin API ha risposto ${CLIENTS_CODE}. Body:"
  echo "${CLIENTS_BODY}" | jq . || echo "${CLIENTS_BODY}"
  exit 1
fi

CLIENT_UUID=$(jq -r '.[0].id // empty' <<<"${CLIENTS_BODY}")

if [[ -z "${CLIENT_UUID}" || "${CLIENT_UUID}" == "null" ]]; then
  echo "❌ Client '${CLIENT_ID}' non trovato nel realm '${REALM}'. Risposta:"
  echo "${CLIENTS_BODY}" | jq . || echo "${CLIENTS_BODY}"
  exit 1
fi
echo "✅ UUID client: ${CLIENT_UUID}"

echo "📝 Preparo segreto JSON da salvare in attributes…"
SECRET_JSON=$(jq -n \
  --arg pk "$PRIVATE_KEY" \
  --arg mn "$MNEMONIC" \
  '{encryptedPrivateKey: $pk, mnemonic: $mn}')

# NB: attributes è una mappa string->string. Salviamo l’oggetto come stringa JSON.
PUT_DATA=$(jq -n \
  --arg wid "wallet-${WALLET_ID}" \
  --arg secret "$(jq -c . <<<"${SECRET_JSON}")" \
  '{ attributes: { ($wid): $secret } }')

echo "📤 Aggiorno client (PUT attributes)…"
UPDATE_JSON=$(curl -sS -o /dev/null -w '%{http_code}' -X PUT \
  "${KC_BASE}/admin/realms/${REALM}/clients/${CLIENT_UUID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${PUT_DATA}")

if [[ "${UPDATE_JSON}" != "204" && "${UPDATE_JSON}" != "200" ]]; then
  echo "❌ Update fallito (HTTP ${UPDATE_JSON}). Payload inviato:"
  echo "${PUT_DATA}" | jq .
  exit 1
fi
echo "✅ Attributo impostato (HTTP ${UPDATE_JSON})."

echo "🔍 Verifica attributo salvato…"
GET_CLIENT=$(curl -sS -X GET \
  "${KC_BASE}/admin/realms/${REALM}/clients/${CLIENT_UUID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

SAVED=$(jq -r --arg wid "wallet-${WALLET_ID}" '.attributes[$wid] // empty' <<<"${GET_CLIENT}")

if [[ -z "${SAVED}" ]]; then
  echo "⚠️  Attributo non risulta leggibile. Dettaglio client:"
  echo "${GET_CLIENT}" | jq . || echo "${GET_CLIENT}"
  exit 1
fi

echo "✅ Segreto 'wallet-${WALLET_ID}' creato/aggiornato con successo."

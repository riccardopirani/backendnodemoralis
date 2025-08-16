#!/bin/sh
# create_secret_fixed_json.sh  (POSIX /bin/sh compatible)
set -eu

WALLET_ID=${1-}
PRIVATE_KEY=${2-}
MNEMONIC=${3-}

if [ -z "$WALLET_ID" ] || [ -z "$PRIVATE_KEY" ] || [ -z "$MNEMONIC" ]; then
  echo "Usage: $0 <wallet_id> <encryptedPrivateKey> <mnemonic>"
  exit 1
fi

# === CONFIG BASE ===
KC_BASE="http://18.102.14.247:8080"
REALM="myrealm"
CLIENT_ID="secret-manager"

# === CREDENZIALI ADMIN (bootstrap) ===
# Assicurati di aver creato l'admin e riavviato il container:
#   docker exec -it keycloak /opt/keycloak/bin/kc.sh create bootstrap-admin --user admin --password 'AdminPass!234'
ADMIN_USER="admin"
ADMIN_PASS="adminpassword"

json() {
  # Stampa JSON formattato se possibile, altrimenti echo raw
  printf '%s' "$1" | jq -r '.' 2>/dev/null || printf '%s\n' "$1"
}

ADMIN_TOKEN=$(
  curl -sS -X POST "$KC_BASE/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "client_id=admin-cli&username=$ADMIN_USER&password=$ADMIN_PASS&grant_type=password" \
  | jq -r '.access_token // empty'
)

if [ -z "${ADMIN_TOKEN}" ]; then
  curl -sS -X POST "$KC_BASE/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "client_id=admin-cli&username=$ADMIN_USER&password=$ADMIN_PASS&grant_type=password"
  exit 1
fi

CLIENTS_JSON=$(
  curl -sS -X GET "$KC_BASE/admin/realms/$REALM/clients?clientId=$CLIENT_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json"
)
CLIENT_UUID=$(printf '%s' "$CLIENTS_JSON" | jq -r '.[0].id // empty')

if [ -z "$CLIENT_UUID" ] || [ "$CLIENT_UUID" = "null" ]; then
  json "$CLIENTS_JSON"
  exit 1
fi

SECRET_JSON=$(
  curl -sS -X GET "$KC_BASE/admin/realms/$REALM/clients/$CLIENT_UUID/client-secret" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json"
)
CLIENT_SECRET=$(printf '%s' "$SECRET_JSON" | jq -r '.value // empty')

if [ -z "$CLIENT_SECRET" ]; then
  json "$SECRET_JSON"
  exit 1
fi

ACCESS_TOKEN=$(
  curl -sS --location --request POST "$KC_BASE/realms/$REALM/protocol/openid-connect/token" \
    --header 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "client_id=$CLIENT_ID" \
    --data-urlencode "client_secret=$CLIENT_SECRET" \
    --data-urlencode 'grant_type=client_credentials' \
  | jq -r '.access_token // empty'
)

if [ -z "$ACCESS_TOKEN" ]; then
  curl -sS --location --request POST "$KC_BASE/realms/$REALM/protocol/openid-connect/token" \
    --header 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "client_id=$CLIENT_ID" \
    --data-urlencode "client_secret=$CLIENT_SECRET" \
    --data-urlencode 'grant_type=client_credentials' | jq .
  exit 1
fi

# Costruisco JSON dell'attributo
SECRET_PAYLOAD=$(jq -n \
  --arg pk "$PRIVATE_KEY" \
  --arg mn "$MNEMONIC" \
  '{encryptedPrivateKey: $pk, mnemonic: $mn}')

# NOTA: Keycloak vuole attributes come mappa string->arrayDiStringhe o stringa.
# Salviamo la stringa JSON del segreto come valore (stringa).
PUT_DATA=$(jq -n \
  --arg wid "wallet-$WALLET_ID" \
  --arg secret "$(printf '%s' "$SECRET_PAYLOAD")" \
  '{ attributes: { ($wid): $secret } }')

# Eseguiamo PUT e leggiamo HTTP code
HTTP_CODE=$(curl -sS -o /tmp/kc_update_resp.txt -w "%{http_code}" \
  -X PUT "$KC_BASE/admin/realms/$REALM/clients/$CLIENT_UUID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PUT_DATA")

if [ "$HTTP_CODE" != "204" ] && [ "$HTTP_CODE" != "200" ]; then
  cat /tmp/kc_update_resp.txt
  exit 1
fi

echo "wallet-$WALLET_ID"

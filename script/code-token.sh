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
KC_BASE="http://localhost:8080"
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

echo "🔑 Ottenimento token admin (realm master)..."
ADMIN_TOKEN=$(
  curl -sS -X POST "$KC_BASE/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "client_id=admin-cli&username=$ADMIN_USER&password=$ADMIN_PASS&grant_type=password" \
  | jq -r '.access_token // empty'
)

if [ -z "${ADMIN_TOKEN}" ]; then
  echo "❌ Impossibile ottenere admin token. Risposta:"
  curl -sS -X POST "$KC_BASE/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "client_id=admin-cli&username=$ADMIN_USER&password=$ADMIN_PASS&grant_type=password"
  exit 1
fi
echo "✅ Admin token ok."

echo "🔎 Cerco clientId='$CLIENT_ID' nel realm '$REALM'..."
CLIENTS_JSON=$(
  curl -sS -X GET "$KC_BASE/admin/realms/$REALM/clients?clientId=$CLIENT_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json"
)
CLIENT_UUID=$(printf '%s' "$CLIENTS_JSON" | jq -r '.[0].id // empty')

if [ -z "$CLIENT_UUID" ] || [ "$CLIENT_UUID" = "null" ]; then
  echo "❌ Client '$CLIENT_ID' non trovato. Risposta:"
  json "$CLIENTS_JSON"
  echo "ℹ️  Crea un client CONFIDENTIAL con Service Accounts abilitati."
  exit 1
fi
echo "✅ UUID client: $CLIENT_UUID"

echo "🔐 Recupero il client secret reale..."
SECRET_JSON=$(
  curl -sS -X GET "$KC_BASE/admin/realms/$REALM/clients/$CLIENT_UUID/client-secret" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json"
)
CLIENT_SECRET=$(printf '%s' "$SECRET_JSON" | jq -r '.value // empty')

if [ -z "$CLIENT_SECRET" ]; then
  echo "❌ Impossibile leggere il client secret. Risposta:"
  json "$SECRET_JSON"
  echo "ℹ️  Verifica che il client sia CONFIDENTIAL e che il tuo utente admin abbia i permessi."
  exit 1
fi
echo "✅ Client secret letto."

echo "🧪 Provo a ottenere un access token via client_credentials..."
ACCESS_TOKEN=$(
  curl -sS --location --request POST "$KC_BASE/realms/$REALM/protocol/openid-connect/token" \
    --header 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "client_id=$CLIENT_ID" \
    --data-urlencode "client_secret=$CLIENT_SECRET" \
    --data-urlencode 'grant_type=client_credentials' \
  | jq -r '.access_token // empty'
)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ client_credentials fallita. Risposta completa:"
  curl -sS --location --request POST "$KC_BASE/realms/$REALM/protocol/openid-connect/token" \
    --header 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "client_id=$CLIENT_ID" \
    --data-urlencode "client_secret=$CLIENT_SECRET" \
    --data-urlencode 'grant_type=client_credentials' | jq .
  echo "ℹ️  Controlla che il client '$CLIENT_ID' sia CONFIDENTIAL e abbia Service Accounts abilitati."
  exit 1
fi
echo "✅ Token ottenuto."

echo "📝 Creazione/aggiornamento attributo segreto..."
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
  echo "❌ Update attributo fallito (HTTP $HTTP_CODE). Possibile risposta:"
  cat /tmp/kc_update_resp.txt
  exit 1
fi

echo ""
echo "✅ Segreto 'wallet-$WALLET_ID' creato/aggiornato con successo."

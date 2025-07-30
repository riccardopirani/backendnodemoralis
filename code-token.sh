#!/bin/bash
# create_secret_fixed_json.sh

WALLET_ID=$1
PRIVATE_KEY=$2
MNEMONIC=$3

if [ -z "$WALLET_ID" ] || [ -z "$PRIVATE_KEY" ] || [ -z "$MNEMONIC" ]; then
  echo "Usage: $0 <wallet_id> <encryptedPrivateKey> <mnemonic>"
  exit 1
fi

echo "🔑 Ottenimento token..."
ACCESS_TOKEN=$(curl -s --location --request POST "http://localhost:8080/realms/myrealm/protocol/openid-connect/token" \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "client_id=secret-manager" \
  --data-urlencode "client_secret=neXMowQqlq92XsV9AzGn1n05twBOww4A" \
  --data-urlencode 'grant_type=client_credentials' | jq -r '.access_token')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
  echo "❌ Errore nel recupero del token"
  exit 1
fi
echo "✅ Token ottenuto."

echo "🔎 Recupero UUID del client..."
CLIENT_UUID=$(curl -s -X GET "http://localhost:8080/admin/realms/myrealm/clients" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  | jq -r '.[] | select(.clientId == "secret-manager") | .id')

if [ -z "$CLIENT_UUID" ]; then
  echo "❌ Errore: Client non trovato."
  exit 1
fi
echo "✅ UUID client: $CLIENT_UUID"

echo "📝 Creazione/aggiornamento attributo segreto..."
SECRET_JSON=$(jq -n \
  --arg pk "$PRIVATE_KEY" \
  --arg mn "$MNEMONIC" \
  '{encryptedPrivateKey: $pk, mnemonic: $mn}')

PUT_DATA=$(jq -n \
  --arg wid "wallet-$WALLET_ID" \
  --arg secret "$SECRET_JSON" \
  '{
    attributes: {
      ($wid): $secret
    }
  }')

curl -s -X PUT "http://localhost:8080/admin/realms/myrealm/clients/$CLIENT_UUID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PUT_DATA"
echo ""
echo "✅ Segreto 'wallet-$WALLET_ID' creato/aggiornato con successo."
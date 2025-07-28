#!/bin/bash
# read_secret.sh
# Uso: ./read_secret.sh <wallet_id>

WALLET_ID=$1

if [ -z "$WALLET_ID" ]; then
  echo "Usage: $0 <wallet_id>"
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
echo "📄 Recupero attributi..."
ATTRIBUTES=$(curl -s -X GET "http://localhost:8080/admin/realms/myrealm/clients/$CLIENT_UUID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" | jq -r '.attributes')

echo "🔍 Decodifica segreto per wallet-$WALLET_ID..."
echo "📦 Attributi completi:"
echo "$ATTRIBUTES" | jq .
SECRET=$ATTRIBUTES
echo "✅ Segreto trovato:"
# Rimuove caratteri di controllo e decodifica il JSON
echo "$SECRET" | tr -d '\000-\031' | jq .
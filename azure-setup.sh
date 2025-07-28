#!/bin/bash

# Variabili di configurazione
SUBSCRIPTION_ID="36473f6d-5dad-4a33-ab61-5e8a74071ee5"
RESOURCE_GROUP="jetcv-rg"
LOCATION="westeurope"
KEYVAULT_NAME="jetcvvault"
SECRET_NAME="encryption-key"
SECRET_VALUE="9Fj5EzLquUK8esycbj32/gNosUNpFdALP08VTQP6vdU="

echo "🔐 Login ad Azure (se necessario)..."
az account show &>/dev/null || az login

echo "📌 Imposto la subscription corretta..."
az account set --subscription "$SUBSCRIPTION_ID"

echo "📦 Creo il Resource Group: $RESOURCE_GROUP..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"

echo "🔐 Creo il Key Vault: $KEYVAULT_NAME..."
az keyvault create \
  --name "$KEYVAULT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION"

echo "👤 Recupero il tuo objectId Azure AD..."
OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)

echo "🔑 Concedo accesso al Key Vault all'utente: $OBJECT_ID..."
az keyvault set-policy \
  --name "$KEYVAULT_NAME" \
  --object-id "$OBJECT_ID" \
  --secret-permissions get list set delete

echo "📝 Creo il secret '$SECRET_NAME' nel Key Vault..."
az keyvault secret set \
  --vault-name "$KEYVAULT_NAME" \
  --name "$SECRET_NAME" \
  --value "$SECRET_VALUE"

echo "✅ Fatto! Secret salvato nel Key Vault:"
echo "   🔐 Nome: $SECRET_NAME"
echo "   🧰 Vault: $KEYVAULT_NAME"

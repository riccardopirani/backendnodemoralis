#!/bin/bash

# Variabili di configurazione
SUBSCRIPTION_ID="63ed3ec9-a2d0-4e7d-87e4-108a2b4b3ae7"
RESOURCE_GROUP="gruppo1"
LOCATION="westeurope"
KEYVAULT_NAME="jetcvvault"
SECRET_NAME="encryption-key"
SECRET_VALUE="9Fj5EzLquUK8esycbj32/gNosUNpFdALP08VTQP6vdU="

OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)
az role assignment create \
  --assignee "$OBJECT_ID" \
  --role "Key Vault Administrator" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEYVAULT_NAME"
#!/bin/bash

# 📌 Sostituisci con i tuoi valori
vaultName="jetcv-test"
appId="57915629-0db0-4a9c-8db8-1d0a9fd3102f"

# ✅ Imposta i permessi su Azure Key Vault per lo SPN (Service Principal)
az keyvault set-policy \
  --name "$vaultName" \
  --spn "$appId" \
  --secret-permissions get list set delete

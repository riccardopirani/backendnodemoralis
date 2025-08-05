#!/bin/bash

# Script per aggiornare il database con Prisma
# Assicurati di avere installato Prisma CLI globalmente o localmente nel progetto

echo "�� Avvio aggiornamento del database..."

# 1️⃣ Genera i client aggiornati
npx prisma generate

# 2️⃣ Crea una nuova migration (chiederà nome)
MIGRATION_NAME="update-user-table"
echo "🛠️ Creazione migration: $MIGRATION_NAME"
npx prisma migrate dev --name $MIGRATION_NAME

# 3️⃣ (Opzionale) Deploy delle migration su ambienti non di sviluppo
# echo "📦 Deploy migration su DB di produzione..."
# npx prisma migrate deploy

echo "✅ Database aggiornato con successo!"

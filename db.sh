#!/bin/bash

# =================== CONFIG ===================
DB_INSTANCE_ID="database-1"
DB_ENGINE="postgres"
DB_CLASS="db.t4g.micro"
DB_USER="postgres"
DB_PASSWORD="4cWnfrzZcG&ebQbP"
DB_NAME="postgres"
DB_PORT=5432
DB_STORAGE=20
BACKUP_ID="${DB_INSTANCE_ID}-backup-$(date +%Y%m%d%H%M)"
# ===============================================

echo "🔎 Verifico se l'istanza $DB_INSTANCE_ID esiste..."
EXISTS=$(aws rds describe-db-instances \
    --db-instance-identifier "$DB_INSTANCE_ID" \
    --query "DBInstances[0].DBInstanceIdentifier" \
    --output text 2>/dev/null)

if [ "$EXISTS" != "None" ] && [ -n "$EXISTS" ]; then
    echo "📦 Creazione snapshot di backup: $BACKUP_ID"
    aws rds create-db-snapshot \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --db-snapshot-identifier "$BACKUP_ID"
    echo "⏳ Attendo il completamento dello snapshot..."
    aws rds wait db-snapshot-available \
        --db-snapshot-identifier "$BACKUP_ID"

    echo "🗑️ Eliminazione istanza RDS esistente..."
    aws rds delete-db-instance \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --skip-final-snapshot
    echo "⏳ Attendo eliminazione..."
    aws rds wait db-instance-deleted \
        --db-instance-identifier "$DB_INSTANCE_ID"
else
    echo "ℹ️ Nessuna istanza trovata, procedo con la creazione."
fi

echo "🚀 Creazione nuova istanza RDS pubblica..."
aws rds create-db-instance \
    --db-instance-identifier "$DB_INSTANCE_ID" \
    --db-instance-class "$DB_CLASS" \
    --engine "$DB_ENGINE" \
    --master-username "$DB_USER" \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage "$DB_STORAGE" \
    --publicly-accessible \
    --backup-retention-period 7 \
    --port "$DB_PORT"

echo "⏳ Attendo che l'istanza sia disponibile..."
aws rds wait db-instance-available \
    --db-instance-identifier "$DB_INSTANCE_ID"

echo "🔑 Recupero Security Group ID..."
SG_ID=$(aws rds describe-db-instances \
    --db-instance-identifier "$DB_INSTANCE_ID" \
    --query "DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId" \
    --output text)

echo "🔧 Configuro Security Group per accesso da 0.0.0.0/0..."
aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port "$DB_PORT" \
    --cidr 0.0.0.0/0 2>/dev/null || echo "ℹ️ Regola già esistente."

echo "🌍 Recupero nuovo endpoint..."
ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "$DB_INSTANCE_ID" \
    --query "DBInstances[0].Endpoint.Address" \
    --output text)

echo "✅ Nuova istanza creata con successo!"
echo "🔑 DATABASE_URL da usare nel tuo .env:"
echo "DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@${ENDPOINT}:${DB_PORT}/${DB_NAME}?sslmode=require\""

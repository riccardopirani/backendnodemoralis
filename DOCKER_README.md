# 🐳 Docker Deployment Guide

Questa guida spiega come utilizzare gli script Docker per il deployment del JetCV NFT Backend.

## 📋 Prerequisiti

- Docker installato e in esecuzione
- Docker Compose installato
- Git (per clonare il repository)

## 🚀 Deployment Rapido

### Script Semplice
```bash
# Deployment rapido con ricostruzione container
npm run docker-quick
```

### Script Completo
```bash
# Deployment completo con controlli e migrazioni
npm run docker-deploy
```

### Deployment con Pulizia Immagini
```bash
# Deployment con rimozione immagini vecchie
bash script/docker-deploy.sh --clean-images
```

## 📁 Struttura File

```
backendnodemoralis/
├── docker-compose.yml          # Configurazione Docker Compose
├── Dockerfile                  # Immagine Docker
├── env.example                 # Template variabili ambiente
├── script/
│   ├── docker-deploy.sh       # Script deployment completo
│   └── docker-quick.sh        # Script deployment rapido
└── ...
```

## 🔧 Configurazione

### 1. File Environment
Copia il template delle variabili ambiente:
```bash
cp env.example .env
```

### 2. Modifica .env
Aggiorna il file `.env` con le tue configurazioni:
```env
# Blockchain
PRIVATE_KEY=your_private_key_here
ANKR_RPC_URL=https://polygon-rpc.com
CONTRACT_ADDRESS=your_contract_address_here

# Storage
WEB3_STORAGE_TOKEN=your_web3_storage_token_here
LIGHTHOUSE_API_KEY=your_lighthouse_api_key_here

# Database
DATABASE_URL=postgresql://jetcv_user:jetcv_password@postgres:5432/jetcv_db
```

## 🐳 Servizi Docker

### PostgreSQL Database
- **Porta**: 5432
- **Database**: jetcv_db
- **Utente**: jetcv_user
- **Password**: jetcv_password

### Backend API
- **Porta**: 4000
- **Health Check**: http://localhost:4000/api-docs.json
- **Logs**: `docker-compose logs -f backend`

### Redis Cache (Opzionale)
- **Porta**: 6379
- **Utilizzo**: Caching e sessioni

## 📊 Comandi Utili

### Gestione Container
```bash
# Avvia servizi
docker-compose up -d

# Ferma servizi
docker-compose down

# Riavvia servizi
docker-compose restart

# Ricostruisci e avvia
docker-compose up -d --build

# Ricostruisci senza cache
docker-compose build --no-cache
```

### Logs e Debug
```bash
# Visualizza logs backend
docker-compose logs -f backend

# Visualizza logs database
docker-compose logs -f postgres

# Visualizza tutti i logs
docker-compose logs -f

# Entra nel container backend
docker-compose exec backend bash
```

### Database
```bash
# Esegui migrazioni
docker-compose exec backend npm run db:migrate

# Genera client Prisma
docker-compose exec backend npm run db:generate

# Apri Prisma Studio
docker-compose exec backend npm run db:studio
```

### Pulizia
```bash
# Rimuovi container e volumi
docker-compose down -v

# Rimuovi immagini
docker-compose down --rmi all

# Pulizia completa
docker system prune -a
```

## 🔍 Troubleshooting

### Container non si avvia
```bash
# Controlla logs
docker-compose logs

# Controlla status
docker-compose ps

# Riavvia con rebuild
docker-compose up -d --build
```

### Database non raggiungibile
```bash
# Controlla health check database
docker-compose exec postgres pg_isready -U jetcv_user -d jetcv_db

# Riavvia solo database
docker-compose restart postgres
```

### Porte già in uso
```bash
# Controlla porte utilizzate
lsof -i :4000
lsof -i :5432

# Cambia porte in docker-compose.yml
```

## 📈 Monitoraggio

### Health Checks
- **Backend**: http://localhost:4000/api-docs.json
- **Database**: `pg_isready` command
- **Redis**: `redis-cli ping`

### Metriche
```bash
# Utilizzo risorse
docker stats

# Spazio disco
docker system df

# Container attivi
docker ps
```

## 🔐 Sicurezza

### Variabili Sensibili
- Non committare mai il file `.env`
- Usa `.env.example` come template
- Rotazione chiavi private regolare

### Network
- Container isolati in rete `jetcvnft-network`
- Porte esposte solo se necessario
- Health checks per monitoraggio

## 🚀 Production Deployment

### Preparazione
```bash
# Build per produzione
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Variabili ambiente produzione
NODE_ENV=production
```

### Backup Database
```bash
# Backup database
docker-compose exec postgres pg_dump -U jetcv_user jetcv_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U jetcv_user -d jetcv_db < backup.sql
```

## 📝 Logs

### Livelli Log
- **DEBUG**: Informazioni dettagliate
- **INFO**: Informazioni generali
- **WARN**: Avvisi
- **ERROR**: Errori

### Rotazione Logs
```bash
# Configurazione logrotate
docker-compose exec backend logrotate /etc/logrotate.conf
```

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
- name: Deploy with Docker
  run: |
    npm run docker-deploy
```

### Automated Deployment
```bash
# Script per deployment automatico
./script/docker-deploy.sh --clean-images
```

## 📞 Supporto

Per problemi con il deployment Docker:
1. Controlla i logs: `docker-compose logs`
2. Verifica configurazione: `docker-compose config`
3. Ricostruisci: `docker-compose build --no-cache`
4. Apri issue su GitHub

## 🎯 Best Practices

1. **Sempre usare volumi per dati persistenti**
2. **Health checks per tutti i servizi**
3. **Logs centralizzati**
4. **Backup regolari database**
5. **Monitoraggio risorse**
6. **Rotazione logs**
7. **Security updates regolari**

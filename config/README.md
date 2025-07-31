# Configurazione Database

Questo file centralizza la configurazione della connessione al database PostgreSQL.

## Struttura

- `database.js` - Configurazione centralizzata per PostgreSQL su Amazon RDS

## Utilizzo

### Per i Controller (connessioni multiple)

```javascript
import pool from "../config/database.js";

// Utilizzo del pool per query
const result = await pool.query("SELECT * FROM users");
```

### Per operazioni una tantum (come dbSync.js)

```javascript
import { createClient } from "../config/database.js";

const client = createClient();
await client.connect();
// ... operazioni
await client.end();
```

## Vantaggi

1. **Centralizzazione**: Una sola configurazione per tutto il progetto
2. **Manutenibilità**: Modifiche alla configurazione in un solo posto
3. **Consistenza**: Stessa configurazione per tutti i file
4. **Gestione errori**: Logging centralizzato per problemi di connessione

## Variabili d'ambiente richieste

- `DB_HOST` - Host del database
- `DB_USER` - Username del database
- `DB_PASSWORD` - Password del database
- `DB_NAME` - Nome del database
- `DB_PORT` - Porta del database (opzionale, default: 5432)

#!/usr/bin/env bash
set -euo pipefail

SSH_HOST="${HOST:-18.102.14.247}"
SSH_USER="${SSH_USER:-ec2-user}"   # <= use SSH_USER, not USER
SSH_KEY="${KEY:-jetcvnft-key.pem}"
PORT="${PORT:-4000}"
PROJECT_DIR="${PROJECT_DIR:-/home/ec2-user/backendnodemoralis-test}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
SERVICE="backendnodemoralis-test-api"

echo "➡️  Connessione a ${SSH_USER}@${SSH_HOST} (porta ${PORT})..."

ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SSH_HOST}" "
  set -euo pipefail
  echo '✅ Connesso a' \$(hostname) '— user:' \$(whoami)

  PORT='${PORT}'
  PROJECT_DIR='${PROJECT_DIR}'
  COMPOSE_FILE='${COMPOSE_FILE}'
  SERVICE='${SERVICE}'

  if command -v firewall-cmd >/dev/null 2>&1 && systemctl is-active --quiet firewalld; then
    sudo firewall-cmd --permanent --add-port=\"${PORT}/tcp\" >/dev/null || true
    sudo firewall-cmd --reload >/dev/null || true
  elif command -v ufw >/dev/null 2>&1; then
    sudo ufw allow \"${PORT}/tcp\" || true
  fi

  if [ -f \"\${PROJECT_DIR}/\${COMPOSE_FILE}\" ]; then
    cd \"\${PROJECT_DIR}\"
    if docker compose version >/dev/null 2>&1; then
      [ -n \"\${SERVICE}\" ] && docker compose up -d \"\${SERVICE}\" || docker compose up -d
    elif command -v docker-compose >/dev/null 2>&1; then
      [ -n \"\${SERVICE}\" ] && docker-compose up -d \"\${SERVICE}\" || docker-compose up -d
    fi
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -tlpn | grep \":${PORT}\" || true
  else
    netstat -tlpn 2>/dev/null | grep \":${PORT}\" || true
  fi

  docker ps --format 'table {{.ID}}\t{{.Image}}\t{{.Ports}}\t{{.Names}}' | grep \":${PORT}->\" || true
"
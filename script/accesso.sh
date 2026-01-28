#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KEY_PATH="${SCRIPT_DIR}/jetcvnft-key.pem"

if [ ! -f "$KEY_PATH" ]; then
  echo "Missing key file: $KEY_PATH" >&2
  exit 1
fi

chmod 600 "$KEY_PATH"
ssh -i "$KEY_PATH" ec2-user@18.102.14.247
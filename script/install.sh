#!/bin/bash

set -e

echo "🚀 Installazione ambiente Anchor + Solana su macOS"

# 1. Installa Homebrew se non presente
if ! command -v brew &> /dev/null; then
    echo "📦 Installo Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# 2. Installa dipendenze base
echo "📦 Installo dipendenze di sistema..."
brew install pkg-config build-essential libssl-dev cmake

# 3. Installa Rust
if ! command -v rustc &> /dev/null; then
    echo "🦀 Installo Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi
rustc --version
cargo --version

# 4. Installa Solana CLI
if ! command -v solana &> /dev/null; then
    echo "💠 Installo Solana CLI..."
    sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi
solana --version

# 5. Installa Anchor CLI
if ! command -v anchor &> /dev/null; then
    echo "⚓ Installo Anchor CLI..."
    cargo install --git https://github.com/coral-xyz/anchor avm --locked
    avm install latest
    avm use latest
fi
anchor --version

# 6. Configurazione Devnet
echo "🔧 Configuro Solana Devnet..."
solana config set --url https://api.devnet.solana.com
if [ ! -f "$HOME/.config/solana/id.json" ]; then
    solana-keygen new --outfile ~/.config/solana/id.json
fi
solana airdrop 2

echo "✅ Installazione completata!"

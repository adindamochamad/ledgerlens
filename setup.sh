#!/bin/bash
# ================================================================
# LedgerLens — Setup Script
# Jalankan sekali untuk menyiapkan lingkungan development.
# ================================================================

set -e

echo "🔍 LedgerLens Setup"
echo "==================="

# Cek Python 3.9+
if ! command -v python3 &>/dev/null; then
  echo "❌ Python 3 tidak ditemukan. Install Python 3.9+ dulu."
  exit 1
fi

VERSI_PYTHON=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "✓ Python $VERSI_PYTHON ditemukan"

# Buat virtual environment
if [ ! -d ".venv" ]; then
  echo "→ Membuat virtual environment..."
  python3 -m venv .venv
fi

# Aktifkan venv
source .venv/bin/activate
echo "✓ Virtual environment aktif"

# Install dependensi
echo "→ Menginstall dependensi Python..."
pip install -r requirements.txt --quiet

# Buat file .env dari template jika belum ada
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  echo "✓ File .env dibuat dari .env.example"
fi

echo ""
echo "✅ Setup selesai!"
echo ""
echo "Cara menjalankan tool secara manual (untuk test):"
echo "  source .venv/bin/activate"
echo "  echo '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"describe\"}' | python3 tools/main.py"
echo ""
echo "Cara test smoke (pastikan tool tidak keluar setelah satu request):"
echo "  bash smoke_test.sh"

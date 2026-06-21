#!/bin/bash
# ================================================================
# LedgerLens — Jalankan demo end-to-end
# 1. Generate data demo
# 2. Test tool Python
# 3. Start anna-app dev (jika belum jalan)
# ================================================================

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO="$ROOT/demo"
FOLDER_STRUK="$DEMO/struk"
CSV_BANK="$DEMO/mutasi_januari_2024.csv"

echo "🔍 LedgerLens Demo Setup"
echo "========================"

# 1. Generate data
echo ""
echo "→ Generating demo data..."
cd "$ROOT"
source .venv/bin/activate 2>/dev/null || true
python3 "$DEMO/generasi_demo.py"

# 2. Test tool
echo ""
echo "→ Testing tool dengan data demo..."
printf '{"jsonrpc":"2.0","id":1,"method":"describe"}\n{"jsonrpc":"2.0","id":2,"method":"invoke","params":{"tool":"ringkasan_folder","arguments":{"path_folder":"%s"}}}\n{"jsonrpc":"2.0","id":3,"method":"invoke","params":{"tool":"parse_csv_bank","arguments":{"path_file":"%s"}}}\n' "$FOLDER_STRUK" "$CSV_BANK" \
  | python3 "$ROOT/executas/ledgerlens/ledgerlens_plugin.py" 2>/dev/null \
  | while IFS= read -r baris; do
      echo "$baris" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if d.get('id') == 2:
    data = d['result']['data']
    print(f\"  ringkasan_folder: {data['jumlah_file_struk']} struk, {data['total_ukuran_kb']} KB\")
elif d.get('id') == 3:
    data = d['result']['data']
    print(f\"  parse_csv_bank: {data['jumlah_transaksi']} transaksi, debit {data['total_debit']:,.0f}\")
" 2>/dev/null || true
    done

echo ""
echo "✅ Tool test selesai!"
echo ""
echo "📋 Path untuk demo UI:"
echo "   Folder struk : $FOLDER_STRUK"
echo "   CSV bank     : $CSV_BANK"
echo ""
echo "→ Jalankan anna-app dev di terminal terpisah:"
echo "   cd $ROOT && anna-app dev"
echo ""
echo "→ Buka http://localhost:5180 dan paste path di atas."
echo ""

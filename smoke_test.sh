#!/bin/bash
# ================================================================
# LedgerLens — Smoke Test
# Verifikasi bahwa tool tetap berjalan setelah satu request (wajib!)
# Tool wajib long-running: hanya keluar saat stdin ditutup (EOF),
# bukan setelah satu request selesai diproses.
# ================================================================

set -e
echo "🧪 Menjalankan smoke test LedgerLens Tool..."

# Buat named pipe (FIFO) agar stdin tetap terbuka
FIFO_PATH=$(mktemp -t ledgerlens_smoke)
rm "$FIFO_PATH"
mkfifo "$FIFO_PATH"

# Jalankan tool dengan stdin dari FIFO (tidak langsung ditutup)
python3 tools/main.py < "$FIFO_PATH" &
PID=$!

# Kirim satu request lewat FIFO, tapi FIFO masih terbuka
exec 3>"$FIFO_PATH"
echo '{"jsonrpc":"2.0","id":1,"method":"describe"}' >&3

# Tunggu 2 detik, kemudian cek apakah proses masih berjalan
sleep 2

if kill -0 $PID 2>/dev/null; then
  echo "✅ LULUS: Tool tetap berjalan setelah respond ke describe"
else
  echo "❌ GAGAL: Tool keluar setelah satu request — ini bug kritis!"
  echo "   Anna akan menampilkan tool sebagai 'Stopped'."
  exec 3>&-
  rm -f "$FIFO_PATH"
  exit 1
fi

# Tutup FIFO (kirim EOF) untuk mengakhiri tool dengan bersih
exec 3>&-
wait $PID 2>/dev/null || true
rm -f "$FIFO_PATH"

echo ""
echo "🧪 Test invoke ringkasan_folder..."
printf '{"jsonrpc":"2.0","id":1,"method":"describe"}\n{"jsonrpc":"2.0","id":2,"method":"invoke","params":{"tool":"ringkasan_folder","arguments":{"path_folder":"/tmp"}}}\n' \
  | python3 tools/main.py 2>/dev/null | tail -1 | python3 -m json.tool

echo ""
echo "🧪 Test invoke ambil_memori_vendor..."
printf '{"jsonrpc":"2.0","id":1,"method":"describe"}\n{"jsonrpc":"2.0","id":2,"method":"invoke","params":{"tool":"ambil_memori_vendor","arguments":{}}}\n' \
  | python3 tools/main.py 2>/dev/null | tail -1 | python3 -m json.tool

echo ""
echo "✅ Semua smoke test lulus!"

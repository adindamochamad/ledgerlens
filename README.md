# 🔍 LedgerLens

> **Rekonsiliasi struk & mutasi bank — siap audit pajak dalam hitungan detik.**

LedgerLens adalah Anna App untuk rekonsiliasi keuangan pribadi/usaha kecil.
Drop folder berisi 50 struk + 1 CSV bank → AI mencocokkan semua transaksi
→ "3 transaksi tanpa struk = risiko audit" → kamu review yang ambigu → selesai.

Data tetap di mesin kamu. Tidak ada yang dikirim ke server manapun.

---

## Cara Pakai (Pengguna)

1. Install LedgerLens dari Anna App Store
2. Di chat Anna, ketik: `#ledgerlens`
3. Anna akan buka dashboard dan memandu kamu:
   - Masukkan path folder struk kamu
   - Masukkan path file CSV mutasi bank
   - Klik **Mulai Rekonsiliasi**
4. Review transaksi ambigu di panel kanan
5. Export laporan rekonsiliasi (JSON/CSV)

---

## Setup Development

### Prasyarat

- Python 3.9+
- Anna Desktop (untuk test integrasi penuh)

### Instalasi

```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/ledgerlens
cd ledgerlens

# Jalankan setup otomatis
chmod +x setup.sh && ./setup.sh

# Verifikasi tool berjalan dengan benar
chmod +x smoke_test.sh && ./smoke_test.sh
```

### Test Manual Tool

```bash
source .venv/bin/activate

# Test describe
echo '{"jsonrpc":"2.0","id":1,"method":"describe"}' | python3 tools/main.py

# Test ringkasan_folder
echo '{"jsonrpc":"2.0","id":1,"method":"describe"}
{"jsonrpc":"2.0","id":2,"method":"invoke","params":{"tool":"ringkasan_folder","arguments":{"path_folder":"/Users/kamu/Dokumen/Struk"}}}' \
  | python3 tools/main.py

# Test parse_csv_bank
echo '{"jsonrpc":"2.0","id":1,"method":"describe"}
{"jsonrpc":"2.0","id":2,"method":"invoke","params":{"tool":"parse_csv_bank","arguments":{"path_file":"/Users/kamu/Downloads/mutasi.csv"}}}' \
  | python3 tools/main.py
```

### Test UI Standalone

Buka `ui/index.html` langsung di browser (tanpa Anna). App berjalan dalam
mode dev dengan data contoh untuk verifikasi tampilan.

---

## Struktur Proyek

```
ledgerlens/
├── tools/
│   └── main.py          # Anna Tool: stdio JSON-RPC 2.0 server (Python)
├── ui/
│   ├── index.html       # App UI: halaman utama SPA
│   ├── app.js           # Logika UI + integrasi Anna SDK
│   └── styles.css       # Stylesheet
├── docs/
│   ├── STRATEGI.md      # Strategi hackathon & roadmap fitur
│   └── ALUR_KERJA.md    # Diagram alur rekonsiliasi lengkap
├── manifest.json        # Anna App manifest (schema: 2)
├── requirements.txt     # Dependensi Python
├── setup.sh             # Setup otomatis
├── smoke_test.sh        # Verifikasi tool long-running
└── README.md            # Dokumentasi ini
```

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                     MESIN PENGGUNA                          │
│                                                             │
│  ┌──────────────┐    stdio    ┌────────────────────────┐   │
│  │  Anna Agent  │◄──JSON-RPC─►│  LedgerLens Tool       │   │
│  │  (LLM AI)    │             │  (Python 3, tools/)    │   │
│  └──────┬───────┘             │                        │   │
│         │                     │  • baca PDF/gambar     │   │
│         │  iframe             │  • parse CSV bank      │   │
│         ▼                     │  • simpan memori       │   │
│  ┌──────────────┐             └──────────┬─────────────┘   │
│  │  App UI      │                        │                  │
│  │  (dashboard) │                        ▼                  │
│  │  ui/         │             ┌────────────────────────┐   │
│  └──────────────┘             │  File Lokal Pengguna   │   │
│                               │  • Folder struk        │   │
│                               │  • CSV mutasi bank     │   │
│                               │  ~/.ledgerlens/        │   │
│                               │    memori_vendor.json  │   │
│                               └────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Alur Data

```
Pengguna input path folder + CSV
        │
        ▼
[Tool] ringkasan_folder → ringkasan file
[Tool] parse_csv_bank → daftar transaksi terstruktur
[Tool] daftar_file_struk → daftar path struk
[Tool] ambil_memori_vendor → konteks vendor yang dikenal
        │
        ▼
[AI Anna] baca setiap struk via baca_struk
[AI Anna] ekstrak: vendor, tanggal, nominal dari struk
[AI Anna] cocokkan struk ↔ transaksi bank
[AI Anna] tandai status: cocok / tanpa_struk / ambigu / mismatch
        │
        ▼
[App UI] tampilkan tabel hasil
[App UI] antrian human-review untuk ambigu
        │
        ▼
[Pengguna] konfirmasi kategori
[Tool] simpan_memori_vendor → pembelajaran persisten
[Tool] simpan_hasil_rekonsiliasi → export JSON
```

---

## Tool API Reference

| Tool | Deskripsi | Parameter Wajib |
|------|-----------|-----------------|
| `ringkasan_folder` | Ringkasan cepat folder struk | `path_folder` |
| `daftar_file_struk` | Daftar semua file PDF/gambar | `path_folder` |
| `baca_struk` | Baca isi struk (teks/base64) | `path_file` |
| `parse_csv_bank` | Parse CSV mutasi bank | `path_file` |
| `ambil_memori_vendor` | Ambil pemetaan vendor→kategori | — |
| `simpan_memori_vendor` | Simpan kategori vendor baru | `vendor`, `kategori` |
| `simpan_hasil_rekonsiliasi` | Export hasil ke JSON | `data_rekonsiliasi` |

---

## Roadmap

### v0.1 — Hackathon MVP (selesai)
- [x] Tool Python: baca PDF/gambar, parse CSV, memori vendor
- [x] App UI: dashboard rekonsiliasi, tab human-review, statistik
- [x] Anna App manifest (schema 2 dengan UI)
- [x] Mode dev standalone (tanpa Anna)

### v0.2 — Rekonsiliasi AI-Driven (saat ini)
- [x] Core brain dipindah dari heuristik frontend → seam AI (`rekonsiliasiAnna`)
- [x] Iterasi struk sekuensial via Executa `baca_struk` + progress per file
- [x] Integrasi `anna.llm.complete` (host_api LLM) untuk ekstraksi vendor/nominal/tanggal dari teks struk
- [x] Matcher nominal ±5% / tanggal ±2 hari / vendor fuzzy → cocok/mismatch/ambigu/tanpa_struk
- [x] Fallback offline (fixture + heuristik) agar demo tetap jalan tanpa host Anna
- [ ] **Keterbatasan diketahui:** `llm.complete` text-only — struk gambar/scan belum bisa di-OCR via UI; hanya PDF ber-teks (vision via agent/chat = rencana v0.3)
- [ ] Export ke Excel/CSV (bukan hanya JSON)
- [ ] Dukungan format bank lebih banyak (BCA, Mandiri, BNI, BRI, OCBC)
- [ ] Filter per periode (bulan/kuartal/tahun)

### v0.3 — Vision & Fitur Lanjutan
- [ ] OCR struk gambar via agent-session / chat-agent Anna (vision)
- [ ] Generate laporan pajak ringkas (format PPh 21/25)
- [ ] Integrasi dengan Google Drive / iCloud untuk sumber struk
- [ ] Multi-currency support
- [ ] Notifikasi bulanan ("Kamu punya X transaksi belum dikategorikan")

---

## Kontribusi Hackathon

**Event:** Global Online Hackathon — Build AI Apps for the Rest of Us
**Platform:** [Anna](https://anna.partners)
**Deadline:** 22 Juni 2026, 23:59 ET

**Mengapa LedgerLens layak menang:**
- **Usefulness 9/10** — Jutaan UKM & freelancer menghadapi masalah ini menjelang pajak
- **Fit Anna 9/10** — Butuh akses file lokal (hanya bisa via Anna Tool), state persisten, human-review
- **ChatGPT Test 9/10** — ChatGPT tidak bisa akses folder lokal kamu
- **Working Demo** — Langsung bisa demo dengan folder struk nyata
- **"For the Rest of Us"** — Bukan untuk programmer, tapi untuk pemilik warung, freelancer, ibu rumah tangga yang jualan online

---

## Lisensi

MIT License — bebas digunakan dan dimodifikasi.

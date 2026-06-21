# Alur Kerja Rekonsiliasi LedgerLens

Dokumen ini menjelaskan alur end-to-end dari klik **Mulai Rekonsiliasi**
sampai hasil muncul, beserta batasan platform yang penting dipahami.

---

## 1. Diagram Alur

```
┌──────────────┐
│  Pengguna    │  ketik path folder struk + path CSV bank di UI
└──────┬───────┘
       │ klik "Mulai Rekonsiliasi"  (mulaiRekonsiliasi → rekonsiliasiAnna)
       ▼
┌─────────────────────────────────────────────────────────────┐
│  UI (bundle/app.js)                                          │
│                                                             │
│  1) tools.invoke parse_csv_bank   ──► daftar transaksi bank │
│  2) tools.invoke daftar_file_struk ─► daftar path struk     │
│  3) tools.invoke ambil_memori_vendor ► peta vendor→kategori │
│                                                             │
│  Untuk SETIAP file struk (progress per file):               │
│  4) tools.invoke baca_struk  ──► teks_terekstrak / base64   │
│  5) analisisStrukDenganAI:                                   │
│       • ADA teks  → anna.llm.complete (ekstraksi nyata)     │
│       • TANPA teks → fallback fixture/heuristik nama file   │
│                                                             │
│  6) cocokkanStrukDenganBank:                                │
│       vendor (fuzzy) + nominal (±5%) + tanggal (±2 hari)    │
│       → status: cocok / mismatch / ambigu / tanpa_struk     │
└──────┬──────────────────────────────────────────────────────┘
       ▼
┌──────────────┐   tab "Perlu Review" untuk ambigu/mismatch
│  Dashboard   │   ringkasan audit: "X transaksi tanpa struk = risiko"
└──────┬───────┘
       │ pengguna konfirmasi kategori
       ▼
  tools.invoke simpan_memori_vendor   (loop pembelajaran)
  tools.invoke simpan_hasil_rekonsiliasi  (export JSON lokal)
  chat.append_artifact                 (ringkasan balik ke chat — opsional)
```

---

## 2. Seam AI (titik integrasi tunggal)

Seluruh "kecerdasan" terpusat di satu fungsi: `analisisStrukDenganAI`
([bundle/app.js](../bundle/app.js)). Ini memudahkan audit dan testing.

| Kondisi | Jalur | Sumber data |
|---------|-------|-------------|
| Struk **PDF ber-teks** | `anna.llm.complete` (text-only) | Ekstraksi AI nyata |
| Struk **gambar / scan** | fallback | fixture dev / tebakan nama file |

### ⚠️ Batasan platform yang menentukan desain

`anna.llm.complete` **text-only** — messages gaya Anthropic, hanya block
`{type:"text"}`. Tidak ada input gambar, dan tidak ada host API vision
(`image.*` hanya generate/edit). Konsekuensi:

- **Hanya struk dengan text-layer** (PDF digital) yang benar-benar diproses AI.
- **Struk foto/scan** tanpa OCR jatuh ke fallback → bukan AI.
- Karena itu **demo utama memakai struk PDF ber-teks** (lihat
  [demo/struk_pdf/](../demo/struk_pdf/), generator: `demo/generasi_demo_pdf.py`).
- OCR gambar via vision = roadmap v0.3 (perlu jalur agent-session/model vision).

---

## 3. Logika Matching

Untuk tiap transaksi bank, cari struk kandidat lalu beri status:

| Status | Kriteria |
|--------|----------|
| `cocok` | vendor fuzzy-match **dan** nominal ±5% **dan** tanggal ±2 hari |
| `mismatch` | vendor & tanggal cocok, tapi **nominal beda > 5%** |
| `ambigu` | lebih dari satu struk kandidat / keyakinan rendah |
| `tanpa_struk` | tidak ada struk yang cocok untuk transaksi bank ini |

Contoh dari dataset demo (`demo/struk_pdf/mutasi.csv`):

- INDOMARET / SHELL / ALFAMART / PLN / GOJEK → **cocok**
- TOKOPEDIA: bank Rp 1.250.000 vs struk Rp 1.100.000 (12% > 5%) → **mismatch**
- ATM Tarik Tunai / Shopee / Grab Food → **tanpa_struk**
  (total Rp 1.650.000 = headline "risiko audit pajak")

---

## 4. Privasi & Penyimpanan

- **File mentah** (PDF/CSV) tidak pernah keluar dari mesin pengguna — hanya
  Executa lokal yang membacanya dari disk.
- **Memori vendor** & **hasil rekonsiliasi** disimpan di `~/.ledgerlens/`
  (validasi tulis ketat: hanya ke home directory).
- Hanya **konten teks** struk yang dikirim ke `llm.complete` untuk ekstraksi.

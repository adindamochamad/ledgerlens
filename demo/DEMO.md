# Demo LedgerLens — Panduan Rekaman Video

> **PENTING:** Pakai dataset **PDF** untuk video submission. Hanya struk PDF
> ber-teks yang benar-benar diekstrak AI (`anna.llm.complete` text-only).
> Dataset gambar (`demo/struk/`) hanya untuk menguji tampilan UI — di sana
> ekstraksi pakai fixture, **bukan AI**. Jangan dipakai untuk klaim "AI".

## Path demo (AI nyata — pakai ini untuk video)

| Input | Path |
|-------|------|
| Folder struk | `/Users/mac/Development/ledgerlens/demo/struk_pdf` |
| CSV bank | `/Users/mac/Development/ledgerlens/demo/struk_pdf/mutasi.csv` |

Dataset: **6 struk PDF** + **9 transaksi bank**.

## Jalankan demo

```bash
cd /Users/mac/Development/ledgerlens

# (Re)generate dataset PDF — text-layer, terbaca AI
source .venv/bin/activate
python3 demo/generasi_demo_pdf.py

# UI harness di dalam Anna (LLM tersedia → AI nyata)
anna-app dev
# Buka URL yang dicetak (mis. http://localhost:5180)
```

## Alur demo (2 menit)

1. **Tunjukkan folder** `demo/struk_pdf` — 6 struk PDF
2. **Tunjukkan** `mutasi.csv` — 9 transaksi bank Januari
3. Buka UI → masukkan kedua path
4. Klik **Scan** → 6 file struk; **Muat** → 9 transaksi
5. Klik **Mulai Rekonsiliasi** — *"Anna membaca tiap struk PDF dan
   mengekstrak vendor, tanggal, nominal — data tidak keluar dari laptop."*
6. **Highlight hasil:**
   - ✅ **5 cocok** (Indomaret, Shell, Alfamart, PLN, Gojek)
   - ✗ **1 selisih nominal** (Tokopedia: bank Rp 1.250.000 vs struk Rp 1.100.000)
   - ⚠ **3 tanpa struk** senilai **Rp 1.650.000** → *"risiko audit pajak"*
7. Buka tab **Perlu Review** → konfirmasi kategori Tokopedia → *"Anna ingat
   ini untuk bulan depan."* (memori vendor tersimpan)
8. Tutup: *"Data tetap lokal. ChatGPT tidak bisa akses folder ini —
   hanya app dengan akses mesin kamu, seperti Anna."*

## Hasil yang diharapkan

| Status | Transaksi |
|--------|-----------|
| Cocok | Indomaret, Shell SPBU, Alfamart, PLN, Gojek |
| Mismatch | Tokopedia (bank 1.250.000 vs struk 1.100.000) |
| Tanpa struk | ATM Tarik Tunai (1.000.000), Shopee (420.000), Grab Food (230.000) |

**Headline:** "3 transaksi senilai Rp 1.650.000 tidak ada buktinya = risiko audit."

---

## (Opsional) Demo UI dengan dataset gambar

Hanya untuk menunjukkan tampilan/UX, **bukan** klaim AI. Ekstraksi memakai
fixture di `app.js`, karena `llm.complete` tidak bisa OCR gambar.

| Input | Path |
|-------|------|
| Folder struk | `demo/struk` (9 JPG) |
| CSV bank | `demo/mutasi_januari_2024.csv` (12 transaksi) |

Regenerate: `python3 demo/generasi_demo.py`

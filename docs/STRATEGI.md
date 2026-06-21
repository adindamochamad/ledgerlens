# Strategi Hackathon LedgerLens
## "Build AI Apps for the Rest of Us" — Anna Platform

---

## 🎯 Positioning Strategis

### Tagline Demo

> "Drop folder 50 struk + 1 CSV bank.
> Klik Run.
> **'3 transaksi tanpa struk = risiko audit pajak.'**
> ChatGPT tidak bisa lihat foldermu."

### Mengapa Ini Menang

| Kriteria Juri | Skor | Alasan |
|---------------|------|--------|
| Usefulness & user value | 9/10 | Real pain point jutaan UKM/freelancer Indonesia & global |
| Working demo | 9/10 | UI nyata + tool Python berjalan → bisa demo live |
| Meaningful use of AI | 9/10 | AI baca OCR, kategorisasi, matching multi-dokumen |
| Fit with Anna | 9/10 | Akses file lokal + state + human-review = 100% Anna |
| Creativity & execution | 7/10 | Konsep jelas, eksekusi bersih |

---

## 📋 Rencana 7 Hari (15–22 Juni)

### Hari 1–2 (15–16 Juni): Foundation
**Target:** Tool berjalan + UI bisa dibuka

- [x] Inisialisasi struktur proyek
- [x] Tool Python: describe + invoke loop
- [x] Tool: `ringkasan_folder`, `daftar_file_struk`, `baca_struk`
- [x] Tool: `parse_csv_bank` (deteksi kolom otomatis)
- [x] Tool: `ambil_memori_vendor`, `simpan_memori_vendor`
- [x] App UI: layout 2-panel + tabel transaksi
- [x] Smoke test: tool tidak keluar setelah 1 request
- [x] **Register di Anna Developer Console** (app_id 17, published 2026-06-15)
- [x] Upload tool sebagai Executa (`tool-adindamochamad-ledgerlens-r2zhgf93`)
- [x] Test tool dari Anna chat
- [ ] **Re-publish** manifest terbaru (sudah declare `host_api.llm` — versi store masih pra-LLM)

### Hari 3–4 (17–18 Juni): Integrasi Anna
**Target:** End-to-end flow berjalan di Anna

- [ ] Daftarkan Anna App dengan manifest.json
- [ ] Upload UI bundle ke Anna
- [ ] Test `#ledgerlens` di Anna chat
- [ ] Verifikasi `system_prompt_addendum` memandu AI dengan benar
- [ ] Test dengan 5–10 struk + CSV nyata
- [ ] Fix bug integrasi

### Hari 5 (19 Juni): Polish & Edge Cases
**Target:** Demo tidak bisa gagal

- [ ] Handle CSV dengan format berbeda (BCA, Mandiri, BNI)
- [ ] Handle folder dengan file non-struk (filter ketat)
- [ ] Handle PDF scanned (teks kosong → fallback base64)
- [ ] Loading states di UI (semua tombol disabled saat proses)
- [ ] Error messages yang ramah pengguna
- [ ] Test dengan 50+ struk (performa)

### Hari 6 (20 Juni): Demo Data & Video
**Target:** Materi submission siap

- [x] Buat dataset demo: 6 struk **PDF ber-teks** + CSV bank (`demo/struk_pdf/`)
      — pivot dari gambar ke PDF karena `llm.complete` text-only (AI nyata hanya untuk teks)
- [ ] Rekam video demo 2–3 menit:
  - Tunjukkan folder struk
  - Ketik `#ledgerlens` di Anna
  - Klik Run → lihat dashboard muncul
  - Rekonsiliasi berjalan → hasil muncul
  - Highlight "3 transaksi tanpa struk"
  - Review 1 transaksi ambigu → konfirmasi kategori
  - Tunjukkan memori vendor tersimpan
- [ ] Screenshot untuk submission

### Hari 7 (21–22 Juni): Submission
**Target:** Submit sebelum deadline 22 Juni 23:59 ET

- [ ] Final testing dengan data bersih
- [ ] Tulis deskripsi proyek untuk submission form:
  - What: rekonsiliasi struk ↔ bank
  - Who: UKM, freelancer, ibu jualan online
  - How AI is used: OCR, kategorisasi, matching, human-review
  - Fit Anna: akses file lokal + state + UI
- [ ] Submit: shareable Anna App + zip proyek + video

---

## 🏆 Script Demo (2 Menit)

**[0:00–0:20] Hook**
> "Menjelang laporan pajak, saya punya 50 struk di folder ini dan 1 CSV mutasi bank.
> Biasanya butuh 2–3 jam untuk mencocokkan semua ini manual."

**[0:20–0:50] Demo LedgerLens**
> Buka Anna → ketik `#ledgerlens` → dashboard muncul
> "Saya masukkan path folder dan CSV saya..."
> Klik **Mulai Rekonsiliasi**
> "Anna membaca semua struk dan CSV — data tidak keluar dari laptop saya."

**[0:50–1:20] Hasil**
> Dashboard muncul: 14 Cocok, 3 Tanpa Struk, 2 Ambigu
> "**3 transaksi senilai Rp 1,7 juta tidak ada buktinya — risiko audit pajak.**"
> Buka tab Perlu Review → konfirmasi kategori Shopee = Belanja Online
> "Sekarang Anna mengingat ini untuk bulan depan."

**[1:20–1:40] ChatGPT Test**
> "ChatGPT tidak bisa lihat folder struk saya.
> Ini hanya bisa dilakukan oleh app yang punya akses ke mesin saya — seperti Anna."

**[1:40–2:00] Penutup**
> "LedgerLens bukan chatbot. Ini workflow nyata:
> input → proses AI → human-review → output yang actionable."

---

## 🔑 Poin Diferensiasi vs Kompetitor

### vs ChatGPT / Claude web
- ChatGPT **tidak bisa** akses folder lokal kamu
- Upload satu per satu struk ke ChatGPT → hilang konteks antar file
- ChatGPT tidak punya memori vendor bulan depan
- **LedgerLens: bisa semua ini**

### vs Spreadsheet manual
- Butuh 2–3 jam per bulan untuk matching manual
- Mudah salah kategorisasi
- Tidak ada deteksi mismatch otomatis
- **LedgerLens: selesai dalam hitungan detik**

### vs Aplikasi akuntansi (Jurnal, Wave, dsb)
- Mahal / butuh langganan
- Harus upload data ke cloud (privasi)
- Overkill untuk freelancer/UKM kecil
- **LedgerLens: gratis, lokal, fokus satu task**

---

## 🎤 Teks Deskripsi Submission

**What you built:**
LedgerLens adalah Anna App untuk rekonsiliasi keuangan personal/UKM.
Pengguna drop folder struk (PDF/foto) + CSV mutasi bank → AI membaca
setiap struk, mengekstrak data, mencocokkan dengan transaksi bank,
menandai yang tanpa bukti, dan membangun memori vendor untuk akurasi
yang meningkat setiap bulan.

**Who it is for:**
Freelancer, pemilik toko kecil, ibu jualan online — siapapun yang
mengelola keuangan sendiri dan perlu rekap untuk laporan pajak atau
audit. Bukan untuk akuntan profesional yang sudah punya tools enterprise.

**How AI is used:**
1. OCR/ekstraksi teks dari struk PDF dan foto
2. Kategorisasi otomatis berdasarkan nama vendor
3. Matching transaksi bank ↔ struk (tanggal ±2 hari, nominal ±5%)
4. Deteksi anomali: mismatch, duplikasi, transaksi tanpa bukti
5. Human-review untuk kasus ambigu
6. Pembelajaran vendor→kategori yang persisten antar sesi

**How it connects to Anna:**
- **Tool**: Python JSON-RPC server untuk akses file lokal (hanya bisa via Anna)
- **App UI**: Dashboard interaktif dengan human-review queue
- **State**: Memori vendor yang persisten via `storage.set`
- **System prompt**: Anna dipandu menjadi asisten rekonsiliasi yang terfokus
- Tanpa Anna, ini tidak mungkin: ChatGPT tidak bisa akses folder lokal

---

## 📊 Metrik Keberhasilan MVP

- [ ] Tool bisa baca folder dengan 50 file dalam < 30 detik
- [ ] Parse CSV dengan benar untuk format BCA, Mandiri, BNI
- [ ] UI menampilkan tabel transaksi tanpa lag
- [ ] Human-review bisa diselesaikan dalam < 2 menit
- [ ] Memori vendor tersimpan dan dimuat di sesi berikutnya
- [ ] Smoke test lulus (tool tidak exit setelah 1 request)
- [ ] Demo berjalan tanpa error di depan juri

---

## ⚠️ Risiko & Mitigasi

| Risiko | Kemungkinan | Mitigasi |
|--------|-------------|----------|
| Anna App review lambat | Medium | Submit hari 5, bukan hari 7 |
| Format CSV bank tidak terbaca | Medium | Test dengan 5 format, buat parser robust |
| PDF scanned gagal → teks kosong | High | Fallback ke base64, beri instruksi di UI |
| Tool keluar setelah 1 request | Low | Smoke test wajib sebelum submit |
| `describe` timeout (>5 detik) | Low | Tool minimal, tidak ada import berat di startup |
| Demo fail karena network | Low | Siapkan video pre-recorded sebagai backup |

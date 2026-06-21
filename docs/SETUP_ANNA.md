# Setup Anna — LedgerLens (Langkah Setelah Register)

Ikuti urutan ini setelah akun Developer Console aktif di https://anna.partners/dashboard

---

## 1. Prasyarat lokal

```bash
# Node 22+ (sudah ada)
node --version

# Anna CLI (sudah diinstall)
anna-app --version

# uv — wajib untuk anna-app dev
pip install uv
# atau: brew install uv
```

---

## 2. Login CLI ke akun Anna

```bash
anna-app login
```

Buka URL yang muncul di browser, authorize, lalu verifikasi:

```bash
anna-app whoami
```

---

## 3. Test lokal (tanpa upload)

```bash
cd /Users/mac/Development/ledgerlens

# Validasi manifest + bundle
anna-app validate

# Jalankan harness lokal (buka URL yang dicetak, biasanya http://127.0.0.1:5180)
anna-app dev
```

Di harness lokal:
- UI LedgerLens terbuka di iframe
- Tool Python di `executas/ledgerlens/` dijalankan via stdio
- Mode dev memakai data mock jika path folder/CSV tidak ada

---

## 4. Publish Executa (Tool) — langkah pertama

Anna App membutuhkan Executa yang sudah terdaftar di platform.

```bash
cd /Users/mac/Development/ledgerlens

# Publish app + bundled executa sekaligus (rekomendasi)
anna-app apps publish --dry-run   # cek dulu tanpa upload
anna-app apps publish             # upload manifest, bundle, dan executa
```

Atau publish executa saja jika perlu:

```bash
cd executas/ledgerlens
anna-app executa publish --publish
```

Setelah publish, catat `tool_id` yang muncul (dev: `tool-dev-ledgerlens`, production: `tool-<handle>-ledgerlens`).

---

## 5. Di Developer Console (dashboard)

1. Buka **Apps** → app **LedgerLens** (atau buat baru jika belum ada)
2. Tab **Listing**: isi name, tagline, description, logo, screenshots
3. Tab **Versions**: pastikan manifest v0.1.0 ter-upload
4. Tab **Bundle**: pastikan `index.html`, `app.js`, `styles.css` ada
5. Klik **Validate** di editor versi
6. **Submit for review** (hackathon: submit sebelum 22 Juni 23:59 ET)

---

## 6. Test di Anna (setelah app ter-install)

1. Install LedgerLens dari App Store (atau dev install dari console)
2. Di chat Anna, ketik: `#ledgerlens`
3. Minta Anna buka dashboard: *"Buka LedgerLens dan scan folder struk saya"*
4. Masukkan path absolut folder struk + CSV bank
5. Jalankan rekonsiliasi

---

## 7. Submit hackathon

Siapkan:
- [ ] Anna App yang bisa di-install / share link
- [ ] Zip repo atau link GitHub
- [ ] Deskripsi singkat (template di `docs/STRATEGI.md`)
- [ ] Video demo 2 menit (opsional tapi sangat membantu)

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `validate` gagal tool_id | Pastikan `required_executas[].tool_id` = `tool-dev-ledgerlens` |
| Tool "Stopped" di Anna | Tool harus long-running; jalankan `bash smoke_test.sh` |
| `uv not found` | `pip install uv` lalu `anna-app doctor` |
| UI kosong di dev | Buka URL dari `anna-app dev`, bukan file `index.html` langsung |
| `permission_denied` di tools.invoke | Cek `manifest.ui.host_api.tools` includes tool_id |

---

## Struktur proyek (anna-app)

```
ledgerlens/
├── manifest.json          ← versi app + prompt + ui ACL
├── app.json               ← metadata App Store
├── bundle/                ← SPA (iframe UI)
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── executas/ledgerlens/ ← Python tool (stdio JSON-RPC)
│   ├── ledgerlens_plugin.py
│   └── pyproject.toml
└── tools/main.py          ← salinan legacy (sama dengan plugin)
```

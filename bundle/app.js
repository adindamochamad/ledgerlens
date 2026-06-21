/**
 * LedgerLens — Logika UI Utama
 * Menghubungkan Anna App SDK dengan interface rekonsiliasi struk & mutasi bank.
 */

"use strict";

// =====================================================================
// STATE APLIKASI: semua data reaktif aplikasi disimpan di sini
// =====================================================================

const statusAplikasi = {
  // Data yang dimuat
  daftarFilStruk: [],
  transaksiBank: [],
  petaVendorDikenal: {},

  // Hasil rekonsiliasi dari AI
  hasilRekonsiliasi: [],

  // Data struk hasil ekstraksi AI (vendor/nominal/tanggal) per file —
  // ditampung di sini sebelum proses matching dengan transaksi bank.
  strukTerekstrak: [],

  // Antrian transaksi yang perlu di-review oleh pengguna
  antrianReview: [],

  // Indeks kartu review yang sedang aktif di modal
  indeksReviewAktif: -1,

  // Flag status proses
  sedangMemuat: false,
  reklonsiliasiBerjalan: false,
  koneksiAnna: false,
};

// =====================================================================
// REFERENSI ELEMEN DOM
// =====================================================================

const el = {
  // Header & status
  statusKoneksi: document.getElementById("status-koneksi"),

  // Input langkah 1: folder struk
  inputPathFolder: document.getElementById("input-path-folder"),
  tombolScanFolder: document.getElementById("tombol-scan-folder"),
  hasilScanFolder: document.getElementById("hasil-scan-folder"),
  jumlahStruk: document.getElementById("jumlah-struk"),
  jumlahCsv: document.getElementById("jumlah-csv"),
  ukuranTotal: document.getElementById("ukuran-total"),
  peringatanFolder: document.getElementById("peringatan-folder"),

  // Input langkah 2: CSV bank
  inputPathCsv: document.getElementById("input-path-csv"),
  tombolMuatCsv: document.getElementById("tombol-muat-csv"),
  hasilMuatCsv: document.getElementById("hasil-muat-csv"),
  jumlahTransaksiBank: document.getElementById("jumlah-transaksi-bank"),
  totalDebit: document.getElementById("total-debit"),

  // Kontrol rekonsiliasi
  tombolMulaiRekonsiliasi: document.getElementById("tombol-mulai-rekonsiliasi"),
  progresRekonsiliasi: document.getElementById("progres-rekonsiliasi"),
  labelProgres: document.getElementById("label-progres"),
  isiProgres: document.getElementById("isi-progres"),

  // Panel statistik
  panelStatistik: document.getElementById("panel-statistik"),
  statCocok: document.getElementById("stat-cocok"),
  statTanpaStruk: document.getElementById("stat-tanpa-struk"),
  statAmbigu: document.getElementById("stat-ambigu"),
  statMismatch: document.getElementById("stat-mismatch"),
  bannerRisiko: document.getElementById("banner-risiko"),
  teksRisiko: document.getElementById("teks-risiko"),

  // Tabel utama
  placeholderTabel: document.getElementById("placeholder-tabel"),
  kontainerTabelUtama: document.getElementById("kontainer-tabel-utama"),
  filterTransaksi: document.getElementById("filter-transaksi"),
  filterStatus: document.getElementById("filter-status"),
  isiTabelTransaksi: document.getElementById("isi-tabel-transaksi"),

  // Antrian review
  badgeReview: document.getElementById("badge-review"),
  daftarKartuReview: document.getElementById("daftar-kartu-review"),

  // Tanpa struk
  placeholderTanpaStruk: document.getElementById("placeholder-tanpa-struk"),
  daftarTanpaStruk: document.getElementById("daftar-tanpa-struk"),

  // Memori vendor
  daftarMemoriVendor: document.getElementById("daftar-memori-vendor"),

  // Modal
  modalReview: document.getElementById("modal-review"),
  modalJudul: document.getElementById("modal-judul"),
  modalIsi: document.getElementById("modal-isi"),
  modalSimpan: document.getElementById("modal-simpan"),
  modalLewati: document.getElementById("modal-lewati"),
  modalTutup: document.getElementById("modal-tutup"),

  // Toast
  kontainerToast: document.getElementById("kontainer-toast"),
};

// =====================================================================
// INTEGRASI ANNA APP SDK
// Jika berjalan di luar Anna (mode dev standalone), gunakan mock.
// =====================================================================

// Production tool_id — dev harness mem-proxy ID ini ke executa lokal
const TOOL_ID_PRODUKSI = "tool-adindamochamad-ledgerlens-r2zhgf93";

function dapatkanToolId() {
  // ACL host_api.tools `required:*` hanya whitelist tool_id di required_executas.
  // Jangan pakai tool-dev-ledgerlens di invoke — harness tidak mengizinkannya.
  return TOOL_ID_PRODUKSI;
}

let runtimeAnna = null;

async function inisialisasiAnna() {
  try {
    const modul = await import("/static/anna-apps/_sdk/latest/index.js");
    runtimeAnna = await modul.AnnaAppRuntime.connect();

    await runtimeAnna.window.set_title({ title: "LedgerLens — Receipt Reconciliation" });
    await muatMemoriVendorDariAnna();

    perbarui_status_koneksi(true);
    tampilkan_toast("Connected to Anna!", "sukses");
  } catch (_galat) {
    console.warn("[LedgerLens] Anna SDK unavailable, dev mode active.");
    runtimeAnna = null;
    perbarui_status_koneksi(false);
  } finally {
    // Panggil ready() sekali setelah init selesai (SDK mungkin sudah auto-ready)
    if (runtimeAnna?.window?.ready) {
      try {
        await runtimeAnna.window.ready();
      } catch (_err) {
        /* abaikan jika harness sudah ready */
      }
    }
  }
}

/**
 * Panggil tool Executa LedgerLens via host Anna (atau mock di mode dev).
 * @param {string} nama_tool
 * @param {object} argumen
 * @returns {Promise<object>}
 */
async function panggilTool(nama_tool, argumen = {}) {
  if (runtimeAnna && runtimeAnna.tools) {
    const hasil = await runtimeAnna.tools.invoke({
      tool_id: dapatkanToolId(),
      method: nama_tool,
      args: argumen,
    });
    // Host mengembalikan envelope { success, data } — ambil payload data
    if (hasil && typeof hasil === "object" && "data" in hasil) {
      return hasil.data;
    }
    return hasil;
  }

  // Mode dev / preview standalone tanpa Anna host
  return panggilToolMock(nama_tool, argumen);
}

/**
 * Mock tool caller untuk pengembangan lokal tanpa Anna.
 * Meniru respons tool dengan data contoh.
 */
async function panggilToolMock(nama_tool, argumen) {
  // Simulasi delay jaringan
  await tunggu(400 + Math.random() * 300);

  const responsMock = {
    daftar_file_struk: {
      sukses: true,
      path_folder: argumen.path_folder,
      jumlah_file: Object.keys(EKSTRAKSI_DEMO_STRUK).length,
      daftar_file: Object.keys(EKSTRAKSI_DEMO_STRUK).map((nama) => ({
        nama_file: nama,
        path_absolut: `${argumen.path_folder}/${nama}`,
        tipe: nama.split(".").pop().toLowerCase(),
        ukuran_kb: 120,
      })),
    },
    baca_struk: {
      sukses: true,
      path_file: argumen.path_file,
      nama_file: String(argumen.path_file || "").split("/").pop(),
      tipe: "gambar",
      mime_type: "image/jpeg",
      ukuran_kb: 120,
      // Mode dev: konten asli tidak dibaca. analisisStrukDenganAI() akan
      // memakai fixture EKSTRAKSI_DEMO_STRUK sebagai pengganti output LLM.
      konten_base64: "DEV_MOCK_BASE64",
    },
    ringkasan_folder: {
      sukses: true,
      path_folder: argumen.path_folder,
      jumlah_file_struk: Object.keys(EKSTRAKSI_DEMO_STRUK).length,
      jumlah_file_csv: 1,
      total_file: Object.keys(EKSTRAKSI_DEMO_STRUK).length + 1,
      total_ukuran_kb: 1840,
      rincian_per_tipe: { ".jpg": Object.keys(EKSTRAKSI_DEMO_STRUK).length, ".csv": 1 },
      potensi_masalah: [],
      estimasi: { perlu_ocr: true, siap_diproses: true },
    },
    parse_csv_bank: {
      sukses: true,
      path_file: argumen.path_file,
      jumlah_transaksi: 18,
      total_debit: 4_250_000,
      total_kredit: 8_000_000,
      transaksi: buatDataTransaksiContoh(),
    },
    ambil_memori_vendor: {
      sukses: true,
      jumlah_vendor: 5,
      peta_vendor: {
        "indomaret": { nama_asli: "Indomaret", kategori: "Daily Shopping", catatan: "" },
        "shell spbu": { nama_asli: "Shell SPBU", kategori: "Fuel", catatan: "" },
        "grab food": { nama_asli: "Grab Food", kategori: "Food & Beverages", catatan: "" },
        "tokopedia": { nama_asli: "Tokopedia", kategori: "Online Shopping", catatan: "" },
        "shopee": { nama_asli: "Shopee", kategori: "Online Shopping", catatan: "" },
      },
    },
    simpan_memori_vendor: {
      sukses: true,
      vendor: argumen.vendor,
      kategori: argumen.kategori,
      aksi: "ditambahkan",
    },
  };

  return responsMock[nama_tool] || { sukses: false, pesan: `Mock: tool '${nama_tool}' tidak ada.` };
}

// =====================================================================
// HELPER UTILITAS
// =====================================================================

function tunggu(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatRupiah(angka) {
  if (!angka && angka !== 0) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(angka);
}

function formatTanggal(teks_tanggal) {
  if (!teks_tanggal) return "—";
  return teks_tanggal;
}

function perbarui_status_koneksi(terhubung) {
  statusAplikasi.koneksiAnna = terhubung;
  el.statusKoneksi.className = `badge ${terhubung ? "badge-terhubung" : "badge-menunggu"}`;
  el.statusKoneksi.textContent = terhubung ? "Connected" : "Dev Mode";
}

/** Tandai step workflow sebagai selesai (visual stepper) */
function tandaiStepSelesai(id_elemen) {
  const step = document.getElementById(id_elemen);
  if (step) {
    step.classList.add("step-selesai");
    step.classList.remove("step-aktif");
  }
}

function tandaiStepAktif(id_elemen) {
  document.querySelectorAll(".step").forEach((s) => s.classList.remove("step-aktif"));
  const step = document.getElementById(id_elemen);
  if (step) step.classList.add("step-aktif");
}

const ikon_scan = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`;
const ikon_load = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
const ikon_reconcile = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;

function tampilkan_toast(pesan, tipe = "info", durasi_ms = 3500) {
  const toast = document.createElement("div");
  toast.className = `toast ${tipe}`;
  // Ikon untuk setiap jenis notifikasi
  const ikon_pesan = { sukses: "✓", peringatan: "⚠", error: "✗", info: "ℹ" };
  toast.innerHTML = `<span>${ikon_pesan[tipe] || "ℹ"}</span> ${pesan}`;
  el.kontainerToast.appendChild(toast);
  setTimeout(() => toast.remove(), durasi_ms);
}

function tampilkan_elemen(elemen) {
  elemen.classList.remove("tersembunyi");
}

function sembunyikan_elemen(elemen) {
  elemen.classList.add("tersembunyi");
}

/**
 * Escape karakter HTML agar aman dimasukkan ke innerHTML.
 * Mencegah XSS dari data CSV atau nama file yang berisi karakter khusus.
 */
function esc(nilai) {
  return String(nilai ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// =====================================================================
// DATA CONTOH untuk mode mock dev
// =====================================================================

function buatDataTransaksiContoh() {
  const daftar_vendor = [
    { nama: "GRAB* FOOD", jumlah: 87_000, status: "cocok" },
    { nama: "INDOMARET 12345", jumlah: 156_000, status: "cocok" },
    { nama: "TRANSFER MASUK", jumlah: 2_500_000, status: "cocok" },
    { nama: "SHELL SPBU SUDIRMAN", jumlah: 350_000, status: "tanpa_struk" },
    { nama: "SHOPEE*12345678", jumlah: 420_000, status: "ambigu" },
    { nama: "ATM TUNAI BCA", jumlah: 500_000, status: "tanpa_struk" },
    { nama: "ALFAMART 9876", jumlah: 67_500, status: "cocok" },
    { nama: "PLN PREPAID", jumlah: 200_000, status: "cocok" },
    { nama: "TOKOPEDIA*GADGET", jumlah: 1_250_000, status: "mismatch" },
    { nama: "RESTO PADANG JAYA", jumlah: 95_000, status: "ambigu" },
    { nama: "GOJEK GOCAR", jumlah: 45_000, status: "cocok" },
    { nama: "NETFLIX.COM", jumlah: 54_000, status: "cocok" },
    { nama: "ATM TUNAI MANDIRI", jumlah: 1_000_000, status: "tanpa_struk" },
    { nama: "STARBUCKS SUDIRMAN", jumlah: 78_000, status: "cocok" },
    { nama: "TRANSFER BIAYA ADM", jumlah: 10_000, status: "cocok" },
    { nama: "UNIQLO GRAND INDONESIA", jumlah: 849_000, status: "ambigu" },
    { nama: "BUKALAPAK*SELLER", jumlah: 320_000, status: "tanpa_struk" },
    { nama: "PERTAMINA SPBU", jumlah: 210_000, status: "cocok" },
  ];

  const bulan = ["2024-01", "2024-01", "2024-01", "2024-01", "2024-01",
                  "2024-02", "2024-02", "2024-02", "2024-02", "2024-02",
                  "2024-03", "2024-03", "2024-03", "2024-03", "2024-03",
                  "2024-03", "2024-03", "2024-03"];

  return daftar_vendor.map((item, i) => {
    const masuk = /MASUK/i.test(item.nama);
    return {
      id_transaksi: `TX${String(i + 1).padStart(6, "0")}`,
      nomor_baris: i + 2,
      tanggal: `${bulan[i]}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
      keterangan: item.nama,
      jenis: masuk ? "kredit" : "debit",
      jumlah: item.jumlah,
      debit: masuk ? 0 : item.jumlah,
      kredit: masuk ? item.jumlah : 0,
      saldo: 5_000_000 - item.jumlah * (i + 1),
      referensi: `REF${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      // Status sengaja "belum_diproses" — diisi oleh cocokkanStrukDenganBank()
      // agar mock pun melewati jalur matching AI-driven yang sebenarnya.
      status_rekonsiliasi: "belum_diproses",
    };
  });
}

function tebakKategori(nama_vendor) {
  const petaKategori = {
    "GRAB": "Transportation",
    "GOJEK": "Transportation",
    "GOCAR": "Transportation",
    "FOOD": "Food & Beverages",
    "RESTO": "Food & Beverages",
    "STARBUCKS": "Food & Beverages",
    "INDOMARET": "Daily Shopping",
    "ALFAMART": "Daily Shopping",
    "SHELL": "Fuel",
    "PERTAMINA": "Fuel",
    "SPBU": "Fuel",
    "SHOPEE": "Online Shopping",
    "TOKOPEDIA": "Online Shopping",
    "BUKALAPAK": "Online Shopping",
    "UNIQLO": "Clothing",
    "PLN": "Utilities",
    "NETFLIX": "Entertainment",
    "ATM": "Cash Withdrawal",
    "TRANSFER": "Transfer",
  };

  const namaUpper = nama_vendor.toUpperCase();
  for (const [kata_kunci, kategori] of Object.entries(petaKategori)) {
    if (namaUpper.includes(kata_kunci)) return kategori;
  }
  return "Others";
}

// =====================================================================
// HANDLER: Scan Folder Struk
// =====================================================================

async function handleScanFolder() {
  const path_folder = el.inputPathFolder.value.trim();
  if (!path_folder) {
    tampilkan_toast("Please enter a folder path first.", "peringatan");
    return;
  }

  el.tombolScanFolder.disabled = true;
  el.tombolScanFolder.innerHTML = '<span class="spinner"></span> Scanning...';

  try {
    const hasil = await panggilTool("ringkasan_folder", { path_folder });

    if (!hasil.sukses) {
      tampilkan_toast(`Scan failed: ${hasil.pesan}`, "error");
      return;
    }

    // Perbarui tampilan statistik scan
    el.jumlahStruk.textContent = hasil.jumlah_file_struk;
    el.jumlahCsv.textContent = hasil.jumlah_file_csv;
    el.ukuranTotal.textContent = hasil.total_ukuran_kb.toLocaleString("en-US");

    tampilkan_elemen(el.hasilScanFolder);

    // Tampilkan peringatan jika ada masalah di folder
    if (hasil.potensi_masalah.length > 0) {
      el.peringatanFolder.textContent = hasil.potensi_masalah.join(" | ");
      tampilkan_elemen(el.peringatanFolder);
    } else {
      sembunyikan_elemen(el.peringatanFolder);
    }

    // Simpan daftar file ke state untuk rekonsiliasi
    const hasilDaftar = await panggilTool("daftar_file_struk", { path_folder });
    if (hasilDaftar.sukses) {
      statusAplikasi.daftarFilStruk = hasilDaftar.daftar_file;
    }

    tampilkan_toast(`${hasil.jumlah_file_struk} receipt files found.`, "sukses");
    tandaiStepSelesai("langkah-folder");
    tandaiStepAktif("langkah-csv");
    periksaKesiapanRekonsiliasi();
  } catch (galat) {
    tampilkan_toast("Error scanning folder.", "error");
    console.error("[LedgerLens]", galat);
  } finally {
    el.tombolScanFolder.disabled = false;
    el.tombolScanFolder.innerHTML = `${ikon_scan} Scan`;
  }
}

// =====================================================================
// HANDLER: Muat CSV Bank
// =====================================================================

async function handleMuatCsv() {
  const path_file = el.inputPathCsv.value.trim();
  if (!path_file) {
    tampilkan_toast("Please enter a CSV file path first.", "peringatan");
    return;
  }

  el.tombolMuatCsv.disabled = true;
  el.tombolMuatCsv.innerHTML = '<span class="spinner"></span> Loading...';

  try {
    const hasil = await panggilTool("parse_csv_bank", { path_file });

    if (!hasil.sukses) {
      tampilkan_toast(`Failed to parse CSV: ${hasil.pesan}`, "error");
      return;
    }

    statusAplikasi.transaksiBank = hasil.transaksi || [];

    el.jumlahTransaksiBank.textContent = hasil.jumlah_transaksi;
    el.totalDebit.textContent = formatRupiah(hasil.total_debit);

    tampilkan_elemen(el.hasilMuatCsv);
    tampilkan_toast(`${hasil.jumlah_transaksi} bank transactions loaded.`, "sukses");
    tandaiStepSelesai("langkah-csv");
    tandaiStepAktif("langkah-rekonsiliasi");
    periksaKesiapanRekonsiliasi();
  } catch (galat) {
    tampilkan_toast("Error reading CSV file.", "error");
    console.error("[LedgerLens]", galat);
  } finally {
    el.tombolMuatCsv.disabled = false;
    el.tombolMuatCsv.innerHTML = `${ikon_load} Load`;
  }
}

// =====================================================================
// LOGIKA: Periksa apakah rekonsiliasi bisa dimulai
// =====================================================================

function periksaKesiapanRekonsiliasi() {
  const punya_csv = statusAplikasi.transaksiBank.length > 0;
  const punya_struk = statusAplikasi.daftarFilStruk.length > 0;

  // Butuh minimal CSV untuk mulai; folder struk sangat dianjurkan
  el.tombolMulaiRekonsiliasi.disabled = !punya_csv;

  // Beri petunjuk jika folder struk belum di-scan
  if (punya_csv && !punya_struk) {
    el.tombolMulaiRekonsiliasi.title =
      "⚠ Scan your receipt folder first for best results. Without receipts, all transactions will be flagged as 'No Receipt'.";
  } else {
    el.tombolMulaiRekonsiliasi.title = "";
  }
}

// =====================================================================
// CORE BRAIN — REKONSILIASI AI-DRIVEN (production)
// Frontend hanya orkestrasi: iterasi struk → tool `baca_struk` (Executa)
// → seam analisisStrukDenganAI() (Anna LLM) → cocokkanStrukDenganBank().
// Helper ekstrakKataKunciDariNamaStruk/vendorCocokStruk dipakai matcher +
// jalur fallback offline saat host LLM Anna belum tersedia.
// =====================================================================

function ekstrakKataKunciDariNamaStruk(nama_file) {
  return nama_file
    .replace(/^struk_\d+_/i, "")
    .replace(/\.(jpg|jpeg|png|pdf|webp)$/i, "")
    .replace(/_/g, " ")
    .toLowerCase();
}

function vendorCocokStruk(keterangan, kata_kunci_struk) {
  const ket = keterangan.toLowerCase();
  const kata = kata_kunci_struk.toLowerCase();
  if (ket.includes(kata)) return true;
  // Handle GRAB* FOOD ↔ grab food, GOJEK ↔ gojek
  const kata_utama = kata.split(" ")[0];
  return kata_utama.length >= 3 && ket.includes(kata_utama);
}

// Fixture ekstraksi DEV — meniru output Anna LLM saat membaca tiap struk.
// HANYA dipakai saat host LLM Anna tidak tersedia (mode dev/offline), sehingga
// matcher tetap berjalan di atas data realistis (vendor + nominal + tanggal).
const EKSTRAKSI_DEMO_STRUK = {
  "struk_01_indomaret.jpg":    { vendor: "Indomaret",    nominal: 156_000,   tanggal: "2024-01-08", kategori: "Daily Shopping" },
  "struk_02_grab_food.jpg":    { vendor: "Grab Food",    nominal: 87_000,    tanggal: "2024-01-12", kategori: "Food & Beverages" },
  "struk_04_shopee.jpg":       { vendor: "Shopee",       nominal: 420_000,   tanggal: "2024-01-19", kategori: "Online Shopping" },
  "struk_05_alfamart.jpg":     { vendor: "Alfamart",     nominal: 67_500,    tanggal: "2024-02-03", kategori: "Daily Shopping" },
  "struk_07_pln.jpg":          { vendor: "PLN Prepaid",  nominal: 200_000,   tanggal: "2024-02-15", kategori: "Utilities" },
  // Nominal struk ≠ bank (1.25jt) → harus terdeteksi sebagai mismatch oleh matcher
  "struk_08_tokopedia.jpg":    { vendor: "Tokopedia",    nominal: 1_100_000, tanggal: "2024-02-20", kategori: "Online Shopping" },
  "struk_09_gojek.jpg":        { vendor: "Gojek",        nominal: 45_000,    tanggal: "2024-03-04", kategori: "Transportation" },
  "struk_10_resto_padang.jpg": { vendor: "Resto Padang", nominal: 95_000,    tanggal: "2024-03-09", kategori: "Food & Beverages" },
  "struk_12_netflix.jpg":      { vendor: "Netflix",      nominal: 54_000,    tanggal: "2024-03-15", kategori: "Entertainment" },
};

/**
 * SEAM ANALISIS — titik integrasi AI tunggal.
 * Di production memanggil host LLM Anna untuk mengekstrak vendor/nominal/
 * tanggal dari konten struk (teks PDF / gambar base64). Di dev/offline
 * fallback ke fixture + heuristik nama file sehingga demo tetap jalan.
 *
 * @param {object} hasilBaca  hasil tool `baca_struk` (konten_base64/teks_terekstrak)
 * @param {string} namaFile
 * @returns {Promise<{vendor:string,nominal:number,tanggal:string,kategori:string,keyakinan:number,sumber:string}>}
 */
async function analisisStrukDenganAI(hasilBaca, namaFile) {
  // ---- Jalur PRODUCTION (Anna LLM) ------------------------------------
  // TERVERIFIKASI dari skema + dispatcher Anna (host_api/methods.json,
  // sampling dispatcher v0.10.0): `anna.llm.complete()` bersifat TEXT-ONLY
  // (messages gaya Anthropic, hanya content block {type:"text"}). Tidak ada
  // input gambar; tidak ada host API vision (image.* hanya generate/edit).
  // ⇒ Hanya struk dengan TEKS (PDF text-layer) yang bisa diekstrak via LLM.
  //   Struk gambar/scan tanpa teks jatuh ke fallback (lihat catatan di bawah).
  const adaTeks = (hasilBaca?.teks_terekstrak || "").trim().length > 0;
  if (runtimeAnna?.llm && typeof runtimeAnna.llm.complete === "function" && adaTeks) {
    try {
      const instruksi =
        "Dari TEKS struk berikut, ekstrak: vendor/toko, tanggal (YYYY-MM-DD), " +
        "dan nominal total (angka saja, tanpa pemisah ribuan). " +
        'Balas HANYA JSON valid: {"vendor":"","tanggal":"","nominal":0,"kategori":""}.\n\n' +
        "Teks struk:\n" + hasilBaca.teks_terekstrak;

      const jawaban = await runtimeAnna.llm.complete({
        system: "You are a precise receipt data extractor. Reply with JSON only.",
        messages: [{ role: "user", content: [{ type: "text", text: instruksi }] }],
        maxTokens: 512,
        temperature: 0,
      });

      const data = ekstrakJsonAman(ambilTeksDariJawabanLLM(jawaban));
      // Gabungkan hasil AI dengan ekstraksi teks deterministik: jika model
      // flaky (JSON gagal/nominal kosong), vendor & total tetap terbaca dari
      // teks struk yang terstruktur → demo tidak pernah "amount not read".
      const nominal = parseNominalAman(data.nominal) || ekstrakTotalDariTeks(hasilBaca.teks_terekstrak);
      const vendor = data.vendor || ekstrakVendorDariTeks(hasilBaca.teks_terekstrak) || namaFile;
      if (vendor || nominal) {
        return {
          vendor,
          nominal,
          tanggal: data.tanggal || "",
          kategori: data.kategori || tebakKategori(vendor),
          keyakinan: 0.9,
          sumber: "anna_llm",
        };
      }
    } catch (galat) {
      console.warn("[LedgerLens] llm.complete failed, using fallback:", galat);
      // jatuh ke fallback di bawah
    }
  }

  // ---- Jalur FALLBACK (dev/offline) -----------------------------------
  const fixture = EKSTRAKSI_DEMO_STRUK[namaFile];
  if (fixture) {
    return { ...fixture, keyakinan: 0.85, sumber: "fixture_dev" };
  }
  // Tanpa fixture → hanya bisa terka vendor dari nama file (nominal tak diketahui)
  const vendor = ekstrakKataKunciDariNamaStruk(namaFile);
  return {
    vendor,
    nominal: 0,
    tanggal: "",
    kategori: tebakKategori(vendor),
    keyakinan: vendor ? 0.5 : 0.2,
    sumber: "nama_file",
  };
}

/** Normalisasi balasan anna.llm.complete → string. Tangani string / {text} /
 *  {content} (string atau array content-block) / {data} / {message.content}. */
function ambilTeksDariJawabanLLM(jawaban) {
  if (!jawaban) return "";
  if (typeof jawaban === "string") return jawaban;
  if (typeof jawaban.text === "string") return jawaban.text;
  const c = jawaban.content ?? jawaban.data ?? jawaban.message?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((b) => (typeof b === "string" ? b : b?.text ?? "")).join("");
  // Anna llm.complete mengembalikan content sebagai satu content-block objek:
  // {type:"text", text:"…"} — tangani agar nominal/vendor tidak hilang.
  if (c && typeof c === "object" && typeof c.text === "string") return c.text;
  return "";
}

/** Ambil objek JSON pertama dari teks balasan LLM (toleran terhadap teks pembungkus). */
function ekstrakJsonAman(teks) {
  if (!teks) return {};
  try {
    return JSON.parse(teks);
  } catch (_) {
    /* coba cari blok {…} */
  }
  const cocok = String(teks).match(/\{[\s\S]*\}/);
  if (cocok) {
    try {
      return JSON.parse(cocok[0]);
    } catch (_) {
      /* abaikan */
    }
  }
  return {};
}

function parseTanggalAman(teks) {
  if (!teks) return null;
  const t = Date.parse(teks);
  return Number.isNaN(t) ? null : t;
}

/** Parse nominal dari balasan LLM secara tahan banting: terima angka ATAU
 *  string berpemisah (mis. "1.100.000", "Rp 156.000") — model sering abaikan
 *  instruksi "tanpa pemisah ribuan". Ambil digit saja (buang desimal koma). */
function parseNominalAman(nilai) {
  if (typeof nilai === "number") return Number.isFinite(nilai) ? nilai : 0;
  if (typeof nilai !== "string") return 0;
  const bersih = nilai.split(",")[0].replace(/[^\d]/g, "");
  return bersih ? parseInt(bersih, 10) : 0;
}

/** Ekstraksi total deterministik dari TEKS struk (jaring pengaman saat LLM
 *  gagal/flaky). Cari baris ber-"TOTAL" lalu ambil angka terakhir di baris itu. */
function ekstrakTotalDariTeks(teks) {
  if (!teks) return 0;
  let total = 0;
  for (const baris of String(teks).split(/\r?\n/)) {
    if (/total/i.test(baris)) {
      const angka = baris.match(/\d[\d.,]*/g);
      if (angka) total = parseNominalAman(angka[angka.length - 1]);
    }
  }
  return total;
}

/** Vendor deterministik dari TEKS struk: baris non-kosong pertama (nama toko). */
function ekstrakVendorDariTeks(teks) {
  if (!teks) return "";
  const baris = String(teks).split(/\r?\n/).map((b) => b.trim()).filter(Boolean);
  return baris[0] || "";
}

function selisihHari(a, b) {
  const ta = parseTanggalAman(a);
  const tb = parseTanggalAman(b);
  if (ta === null || tb === null) return null;
  return Math.abs(ta - tb) / 86_400_000;
}

/**
 * Cocokkan transaksi bank dengan struk yang sudah diekstrak AI.
 * Aturan (selaras system_prompt_addendum): nominal ±5%, tanggal ±2 hari,
 * vendor fuzzy. Status: cocok / mismatch / ambigu / tanpa_struk.
 */
function cocokkanStrukDenganBank(transaksi_bank, struk_terekstrak) {
  return transaksi_bank.map((tx) => {
    const out = { ...tx };

    // Pemasukan (kredit) tidak butuh struk pembelian
    if (out.kredit > 0 || out.jenis === "kredit") {
      out.status_rekonsiliasi = "cocok";
      out.kategori_ai = out.kategori_ai || "Transfer";
      out.catatan_ai = "";
      return out;
    }

    out.kategori_ai = tebakKategori(out.keterangan);

    // Kandidat = struk yang vendornya cocok dengan keterangan transaksi
    const kandidat = struk_terekstrak.filter((s) =>
      vendorCocokStruk(out.keterangan, s.vendor || "")
    );

    if (kandidat.length === 0) {
      out.status_rekonsiliasi = "tanpa_struk";
      out.catatan_ai = "No receipt found for this transaction.";
      return out;
    }

    // Skor tiap kandidat berdasarkan kedekatan nominal (jika diketahui)
    const berskor = kandidat
      .map((s) => {
        const punyaNominal = s.nominal > 0;
        const selisihRel = punyaNominal ? Math.abs(s.nominal - out.jumlah) / out.jumlah : null;
        return { struk: s, punyaNominal, selisihRel, hari: selisihHari(s.tanggal, out.tanggal) };
      })
      .sort((a, b) => (a.selisihRel ?? 1) - (b.selisihRel ?? 1));

    const terbaik = berskor[0];
    out.struk_terpasang = terbaik.struk.nama_file || terbaik.struk.vendor;
    if (terbaik.struk.kategori) out.kategori_ai = terbaik.struk.kategori;

    // Lebih dari satu struk sama-sama dekat nominalnya → ambigu, perlu review
    const dekatGanda = berskor.filter((k) => k.selisihRel !== null && k.selisihRel <= 0.05).length;
    if (kandidat.length > 1 && dekatGanda !== 1) {
      out.status_rekonsiliasi = "ambigu";
      out.catatan_ai = `${kandidat.length} receipts could match — needs review.`;
      return out;
    }

    if (terbaik.punyaNominal) {
      if (terbaik.selisihRel <= 0.05) {
        out.status_rekonsiliasi = "cocok";
        out.catatan_ai = `Matched with ${out.struk_terpasang}.`;
      } else {
        out.status_rekonsiliasi = "mismatch";
        out.catatan_ai = `Receipt ${formatRupiah(terbaik.struk.nominal)} ≠ bank ${formatRupiah(out.jumlah)}.`;
      }
    } else {
      // Nominal tak terbaca (fallback nama file) → andalkan keyakinan vendor
      const yakin = terbaik.struk.keyakinan >= 0.7;
      out.status_rekonsiliasi = yakin ? "cocok" : "ambigu";
      out.catatan_ai = yakin
        ? `Matched with ${out.struk_terpasang}.`
        : "Vendor match only (amount not read) — please review.";
    }
    return out;
  });
}

/**
 * Orkestrator rekonsiliasi AI-driven. Membaca tiap struk via Executa
 * `baca_struk` SECARA SEKUENSIAL, mengekstrak datanya lewat seam AI,
 * lalu mencocokkannya dengan transaksi bank.
 * @param {Array} transaksi_bank
 * @param {Array} daftar_file_struk
 * @param {(idx:number,total:number,namaFile:?string)=>void} onProgress
 * @returns {Promise<Array>}
 */
async function rekonsiliasiAnna(transaksi_bank, daftar_file_struk, onProgress) {
  const struk_terekstrak = [];

  for (let i = 0; i < daftar_file_struk.length; i++) {
    const file = daftar_file_struk[i];
    if (onProgress) onProgress(i, daftar_file_struk.length, file.nama_file);

    let hasilBaca = null;
    try {
      // Kurir: Executa Python membaca file dari disk → teks/base64
      hasilBaca = await panggilTool("baca_struk", { path_file: file.path_absolut });
    } catch (galat) {
      console.warn(`[LedgerLens] Gagal baca ${file.nama_file}:`, galat);
    }

    // Otak: AI mengekstrak vendor/nominal/tanggal dari konten struk
    const ekstraksi = await analisisStrukDenganAI(hasilBaca || {}, file.nama_file);
    struk_terekstrak.push({ nama_file: file.nama_file, ...ekstraksi });
  }

  statusAplikasi.strukTerekstrak = struk_terekstrak;
  if (onProgress) onProgress(daftar_file_struk.length, daftar_file_struk.length, null);

  // Matching dievaluasi atas hasil ekstraksi AI, bukan nama file mentah
  return cocokkanStrukDenganBank(transaksi_bank, struk_terekstrak);
}

// =====================================================================
// HANDLER: Mulai Rekonsiliasi
// Memicu pipeline AI-driven (rekonsiliasiAnna) + progress bar per file.
// =====================================================================

/** Update progress bar (#isi-progres) + label secara snappy. */
function setProgres(persen, label) {
  if (el.isiProgres) el.isiProgres.style.width = `${Math.max(0, Math.min(100, persen))}%`;
  if (el.labelProgres && label != null) el.labelProgres.textContent = label;
}

async function handleMulaiRekonsiliasi() {
  if (statusAplikasi.transaksiBank.length === 0) {
    tampilkan_toast("Please load a bank statement CSV first.", "peringatan");
    return;
  }

  el.tombolMulaiRekonsiliasi.disabled = true;
  tampilkan_elemen(el.progresRekonsiliasi);
  setProgres(0, "Preparing…");

  try {
    // Core brain berjalan di rekonsiliasiAnna: baca tiap struk via Executa,
    // ekstrak via seam AI, lalu match. Callback meng-update UI tiap file.
    statusAplikasi.hasilRekonsiliasi = await rekonsiliasiAnna(
      statusAplikasi.transaksiBank,
      statusAplikasi.daftarFilStruk,
      (idx, total, namaFile) => {
        if (namaFile) {
          const persen = total ? Math.round((idx / total) * 90) : 0;
          setProgres(persen, `Reading receipt ${idx + 1}/${total}: ${namaFile}`);
        } else {
          setProgres(95, "Matching receipts to transactions…");
        }
      }
    );

    setProgres(100, "Done");

    statusAplikasi.antrianReview = statusAplikasi.hasilRekonsiliasi.filter(
      (t) => ["ambigu", "mismatch"].includes(t.status_rekonsiliasi)
    );

    // Perbarui semua panel
    perbaruiStatistikRekonsiliasi();
    renderTabelTransaksi();
    renderAntrianReview();
    renderDaftarTanpaStruk();
    tampilkan_elemen(el.panelStatistik);

    // Sembunyikan tabel placeholder
    sembunyikan_elemen(el.placeholderTabel);
    tampilkan_elemen(el.kontainerTabelUtama);

    tampilkan_toast("Reconciliation complete!", "sukses");
    tandaiStepSelesai("langkah-rekonsiliasi");
  } catch (galat) {
    tampilkan_toast("Error during reconciliation.", "error");
    console.error("[LedgerLens]", galat);
  } finally {
    el.tombolMulaiRekonsiliasi.disabled = false;
    setTimeout(() => sembunyikan_elemen(el.progresRekonsiliasi), 600);
  }
}

// =====================================================================
// ONBOARDING: Muat data contoh (1 klik, tanpa setup folder/CSV)
// Mengisi dashboard dengan dataset demo 5 cocok / 1 mismatch / 3 tanpa
// struk supaya pengguna baru langsung paham cara kerja rekonsiliasi.
// Konsisten dengan demo/struk_pdf/mutasi.csv (cerita Rp 1.650.000).
// =====================================================================

const DATA_CONTOH = [
  { id_transaksi: "DEMO01", tanggal: "2024-01-05", keterangan: "INDOMARET 12345 JAKARTA", jenis: "debit", jumlah: 156000, debit: 156000, kredit: 0, kategori_ai: "Daily Shopping", status_rekonsiliasi: "cocok", catatan_ai: "Matched with indomaret.pdf.", struk_terpasang: "indomaret.pdf" },
  { id_transaksi: "DEMO02", tanggal: "2024-01-10", keterangan: "SHELL SPBU SUDIRMAN", jenis: "debit", jumlah: 350000, debit: 350000, kredit: 0, kategori_ai: "Fuel", status_rekonsiliasi: "cocok", catatan_ai: "Matched with shell_spbu.pdf.", struk_terpasang: "shell_spbu.pdf" },
  { id_transaksi: "DEMO03", tanggal: "2024-01-14", keterangan: "ALFAMART 9876", jenis: "debit", jumlah: 67500, debit: 67500, kredit: 0, kategori_ai: "Daily Shopping", status_rekonsiliasi: "cocok", catatan_ai: "Matched with alfamart.pdf.", struk_terpasang: "alfamart.pdf" },
  { id_transaksi: "DEMO04", tanggal: "2024-01-15", keterangan: "ATM TARIK TUNAI", jenis: "debit", jumlah: 1000000, debit: 1000000, kredit: 0, kategori_ai: "Cash Withdrawal", status_rekonsiliasi: "tanpa_struk", catatan_ai: "No receipt found for this transaction." },
  { id_transaksi: "DEMO05", tanggal: "2024-01-18", keterangan: "PLN PREPAID TOKEN", jenis: "debit", jumlah: 200000, debit: 200000, kredit: 0, kategori_ai: "Utilities", status_rekonsiliasi: "cocok", catatan_ai: "Matched with pln.pdf.", struk_terpasang: "pln.pdf" },
  { id_transaksi: "DEMO06", tanggal: "2024-01-20", keterangan: "TOKOPEDIA*GADGET", jenis: "debit", jumlah: 1250000, debit: 1250000, kredit: 0, kategori_ai: "Online Shopping", status_rekonsiliasi: "mismatch", catatan_ai: "Receipt Rp 1.100.000 ≠ bank Rp 1.250.000.", struk_terpasang: "tokopedia.pdf" },
  { id_transaksi: "DEMO07", tanggal: "2024-01-22", keterangan: "GOJEK GOCAR", jenis: "debit", jumlah: 45000, debit: 45000, kredit: 0, kategori_ai: "Transportation", status_rekonsiliasi: "cocok", catatan_ai: "Matched with gojek.pdf.", struk_terpasang: "gojek.pdf" },
  { id_transaksi: "DEMO08", tanggal: "2024-01-24", keterangan: "SHOPEE*8842JKT", jenis: "debit", jumlah: 420000, debit: 420000, kredit: 0, kategori_ai: "Online Shopping", status_rekonsiliasi: "tanpa_struk", catatan_ai: "No receipt found for this transaction." },
  { id_transaksi: "DEMO09", tanggal: "2024-01-27", keterangan: "GRAB* FOOD", jenis: "debit", jumlah: 230000, debit: 230000, kredit: 0, kategori_ai: "Food & Beverages", status_rekonsiliasi: "tanpa_struk", catatan_ai: "No receipt found for this transaction." },
];

function muatDataContoh() {
  // Klon agar render path tidak memutasi konstanta sumber
  const contoh = DATA_CONTOH.map((t) => ({ ...t }));
  const fileStruk = ["indomaret.pdf", "shell_spbu.pdf", "alfamart.pdf", "pln.pdf", "tokopedia.pdf", "gojek.pdf"]
    .map((nama) => ({ nama_file: nama, tipe: "pdf", ukuran_kb: 12 }));
  const totalDebit = contoh.reduce((s, t) => s + (t.debit || 0), 0);

  statusAplikasi.hasilRekonsiliasi = contoh;
  statusAplikasi.transaksiBank = contoh;
  statusAplikasi.daftarFilStruk = fileStruk;
  statusAplikasi.antrianReview = contoh.filter((t) =>
    ["ambigu", "mismatch"].includes(t.status_rekonsiliasi)
  );

  // Stat panel kiri (struk + CSV + bank) agar konsisten dengan dataset demo
  el.jumlahStruk.textContent = fileStruk.length;
  el.jumlahCsv.textContent = 1;
  el.ukuranTotal.textContent = (2100).toLocaleString("en-US");
  el.jumlahTransaksiBank.textContent = contoh.length;
  el.totalDebit.textContent = formatRupiah(totalDebit);
  tampilkan_elemen(el.hasilScanFolder);
  tampilkan_elemen(el.hasilMuatCsv);
  sembunyikan_elemen(el.peringatanFolder);

  // Tandai semua langkah selesai
  tandaiStepSelesai("langkah-folder");
  tandaiStepSelesai("langkah-csv");
  tandaiStepSelesai("langkah-rekonsiliasi");

  // Render dashboard (jalur yang sama dengan rekonsiliasi nyata)
  perbaruiStatistikRekonsiliasi();
  renderTabelTransaksi();
  renderAntrianReview();
  renderDaftarTanpaStruk();
  tampilkan_elemen(el.panelStatistik);
  sembunyikan_elemen(el.placeholderTabel);
  tampilkan_elemen(el.kontainerTabelUtama);

  tampilkan_toast("Sample data loaded — this is a demo dataset, no AI was run.", "info");
}

// =====================================================================
// RENDER: Statistik Rekonsiliasi
// =====================================================================

function perbaruiStatistikRekonsiliasi() {
  const transaksi = statusAplikasi.hasilRekonsiliasi;

  const jumlah_cocok = transaksi.filter((t) => t.status_rekonsiliasi === "cocok").length;
  const jumlah_tanpa_struk = transaksi.filter((t) => t.status_rekonsiliasi === "tanpa_struk").length;
  const jumlah_ambigu = transaksi.filter((t) => t.status_rekonsiliasi === "ambigu").length;
  const jumlah_mismatch = transaksi.filter((t) => t.status_rekonsiliasi === "mismatch").length;

  el.statCocok.textContent = jumlah_cocok;
  el.statTanpaStruk.textContent = jumlah_tanpa_struk;
  el.statAmbigu.textContent = jumlah_ambigu;
  el.statMismatch.textContent = jumlah_mismatch;

  // Perbarui badge antrian review
  const jumlah_perlu_review = jumlah_ambigu + jumlah_mismatch;
  if (jumlah_perlu_review > 0) {
    el.badgeReview.textContent = jumlah_perlu_review;
    tampilkan_elemen(el.badgeReview);
  } else {
    sembunyikan_elemen(el.badgeReview);
  }

  // Banner risiko audit: pisahkan "tanpa struk" (tak ada bukti sama sekali)
  // dari "mismatch" (struk ada tapi nominal beda) agar akurat dengan tabel.
  const transaksi_berisiko = jumlah_tanpa_struk + jumlah_mismatch;
  if (transaksi_berisiko > 0) {
    const nilai_tanpa_struk = transaksi
      .filter((t) => t.status_rekonsiliasi === "tanpa_struk")
      .reduce((s, t) => s + (t.jumlah || 0), 0);
    const bagian = [];
    if (jumlah_tanpa_struk > 0) {
      bagian.push(`${jumlah_tanpa_struk} without receipt (${formatRupiah(nilai_tanpa_struk)})`);
    }
    if (jumlah_mismatch > 0) {
      bagian.push(`${jumlah_mismatch} amount mismatch`);
    }
    el.teksRisiko.textContent = `${bagian.join(" + ")} = tax audit risk.`;
    tampilkan_elemen(el.bannerRisiko);
  } else {
    sembunyikan_elemen(el.bannerRisiko);
  }
}

// =====================================================================
// RENDER: Tabel Transaksi Utama
// =====================================================================

function renderTabelTransaksi(filter_teks = "", filter_status_val = "") {
  const daftar_filtered = statusAplikasi.hasilRekonsiliasi.filter((t) => {
    const cocok_teks = !filter_teks ||
      t.keterangan.toLowerCase().includes(filter_teks.toLowerCase()) ||
      t.tanggal.includes(filter_teks);
    const cocok_status = !filter_status_val || t.status_rekonsiliasi === filter_status_val;
    return cocok_teks && cocok_status;
  });

  el.isiTabelTransaksi.innerHTML = daftar_filtered.map((t) => {
    const kelas_jumlah = t.jenis === "debit" ? "kolom-debit" : "kolom-kredit";
    return `
    <tr>
      <td>${esc(formatTanggal(t.tanggal))}</td>
      <td>
        <div class="tx-desc">${esc(t.keterangan)}</div>
        ${t.catatan_ai ? `<div class="tx-note">${esc(t.catatan_ai)}</div>` : ""}
      </td>
      <td class="kolom-jumlah ${kelas_jumlah}">
        ${t.jenis === "debit" ? "−" : "+"}${formatRupiah(t.jumlah)}
      </td>
      <td><span class="tx-kategori">${esc(t.kategori_ai || "—")}</span></td>
      <td>
        <span class="badge-status ${esc(t.status_rekonsiliasi)}">
          ${labelStatus(t.status_rekonsiliasi)}
        </span>
      </td>
      <td>
        ${t.status_rekonsiliasi !== "cocok"
          ? `<button class="tombol-review" onclick="bukaModalReview('${esc(t.id_transaksi)}')">Review</button>`
          : ""}
      </td>
    </tr>`;
  }).join("");
}

function ikonStatus(status) {
  const peta = { cocok: "✓", tanpa_struk: "⚠", ambigu: "?", mismatch: "✗", belum_diproses: "○" };
  return peta[status] || "—";
}

function labelStatus(status) {
  const peta = {
    cocok: "Matched",
    tanpa_struk: "No Receipt",
    ambigu: "Ambiguous",
    mismatch: "Mismatch",
    belum_diproses: "Pending",
  };
  return peta[status] || status;
}

// =====================================================================
// RENDER: Antrian Review
// =====================================================================

function renderAntrianReview() {
  const daftar_perlu_review = statusAplikasi.hasilRekonsiliasi.filter(
    (t) => ["ambigu", "mismatch", "tanpa_struk"].includes(t.status_rekonsiliasi)
  );

  if (daftar_perlu_review.length === 0) {
    el.daftarKartuReview.innerHTML = `
      <div class="placeholder-tabel">
        <div class="ikon-placeholder">✅</div>
        <p>All transactions have been reviewed!</p>
      </div>`;
    return;
  }

  const daftar_kategori_umum = [
    "Food & Beverages", "Transportation", "Daily Shopping",
    "Fuel", "Online Shopping", "Utilities", "Entertainment",
    "Cash Withdrawal", "Clothing", "Others"
  ];

  el.daftarKartuReview.innerHTML = daftar_perlu_review.map((t) => `
    <div class="kartu-review" id="kartu-${esc(t.id_transaksi)}">
      <div class="kartu-review-header">
        <div>
          <div class="kartu-review-judul">${esc(t.keterangan)}</div>
          <div class="kartu-review-tanggal">${esc(t.tanggal)}</div>
        </div>
        <div class="kartu-review-jumlah">${formatRupiah(t.jumlah)}</div>
      </div>
      ${t.catatan_ai ? `<div class="kartu-review-alasan">🔍 ${esc(t.catatan_ai)}</div>` : ""}
      <div class="kartu-review-aksi">
        ${daftar_kategori_umum.map((kat) => `
          <button
            class="tombol-kategori ${t.kategori_ai === kat ? 'terpilih' : ''}"
            onclick="konfirmasiKategori('${esc(t.id_transaksi)}', '${esc(kat)}', this)"
          >${esc(kat)}</button>
        `).join("")}
      </div>
    </div>
  `).join("");
}

// =====================================================================
// RENDER: Daftar Transaksi Tanpa Struk
// =====================================================================

function renderDaftarTanpaStruk() {
  const daftar_tanpa_struk = statusAplikasi.hasilRekonsiliasi.filter(
    (t) => t.status_rekonsiliasi === "tanpa_struk"
  );

  const kontainer = el.daftarTanpaStruk;

  // Sembunyikan placeholder awal karena rekonsiliasi sudah berjalan
  sembunyikan_elemen(el.placeholderTanpaStruk);

  if (daftar_tanpa_struk.length === 0) {
    kontainer.innerHTML = `
      <div class="placeholder-tabel">
        <div class="ikon-placeholder">🎉</div>
        <p>All transactions have receipt proof!</p>
      </div>`;
    tampilkan_elemen(kontainer);
    return;
  }

  kontainer.innerHTML = daftar_tanpa_struk.map((t) => `
    <div class="item-tanpa-struk">
      <div class="item-tanpa-struk-info">
        <div class="item-tanpa-struk-nama">${esc(t.keterangan)}</div>
        <div class="item-tanpa-struk-tanggal">${esc(t.tanggal)} · ${esc(t.kategori_ai || "Tanpa Kategori")}</div>
      </div>
      <div class="item-tanpa-struk-jumlah">${formatRupiah(t.jumlah)}</div>
    </div>
  `).join("");

  kontainer.classList.remove("tersembunyi");
  kontainer.style.display = "flex";
  kontainer.style.flexDirection = "column";
  kontainer.style.gap = "8px";
}

// =====================================================================
// RENDER: Memori Vendor
// =====================================================================

async function muatMemoriVendorDariAnna() {
  try {
    const hasil = await panggilTool("ambil_memori_vendor", {});
    if (hasil.sukses) {
      statusAplikasi.petaVendorDikenal = hasil.peta_vendor || {};
      renderMemoriVendor();
    }
  } catch (galat) {
    console.warn("[LedgerLens] Failed to load vendor memory:", galat);
  }
}

function renderMemoriVendor() {
  const peta = statusAplikasi.petaVendorDikenal;
  const daftar_vendor = Object.values(peta);

  if (daftar_vendor.length === 0) {
    el.daftarMemoriVendor.innerHTML = `
      <div class="placeholder-tabel">
        <div class="ikon-placeholder">🧠</div>
        <p>No vendor memory saved yet.</p>
        <p class="teks-sekunder">Confirm categories in the "Needs Review" tab to start learning.</p>
      </div>`;
    return;
  }

  el.daftarMemoriVendor.innerHTML = daftar_vendor.map((v) => `
    <div class="item-memori-vendor">
      <span class="nama-vendor">${esc(v.nama_asli)}</span>
      <span class="badge-kategori">${esc(v.kategori)}</span>
    </div>
  `).join("");
}

// =====================================================================
// AKSI: Konfirmasi Kategori dari Kartu Review
// =====================================================================

async function konfirmasiKategori(id_transaksi, kategori_baru, tombol_el) {
  // Temukan transaksi yang dimaksud
  const indeks = statusAplikasi.hasilRekonsiliasi.findIndex(
    (t) => t.id_transaksi === id_transaksi
  );
  if (indeks === -1) return;

  const transaksi = statusAplikasi.hasilRekonsiliasi[indeks];

  // Perbarui tampilan tombol kategori di kartu
  const kartu = document.getElementById(`kartu-${id_transaksi}`);
  if (kartu) {
    kartu.querySelectorAll(".tombol-kategori").forEach((t) => t.classList.remove("terpilih"));
    tombol_el.classList.add("terpilih");
  }

  // Perbarui state transaksi
  transaksi.kategori_ai = kategori_baru;

  // Transaksi tanpa struk yang dikategorikan tetap berisiko — tetap
  // "tanpa_struk" agar muncul di laporan risiko, tapi catatan diperbarui.
  if (transaksi.status_rekonsiliasi === "tanpa_struk") {
    transaksi.status_rekonsiliasi = "tanpa_struk";
    transaksi.catatan_ai = `Categorized as: ${kategori_baru}. No physical receipt found.`;
  } else {
    transaksi.status_rekonsiliasi = "cocok";
  }

  // Simpan ke memori vendor Anna
  try {
    await panggilTool("simpan_memori_vendor", {
      vendor: transaksi.keterangan,
      kategori: kategori_baru,
    });

    // Perbarui memori lokal
    const kunci_vendor = transaksi.keterangan.toLowerCase();
    statusAplikasi.petaVendorDikenal[kunci_vendor] = {
      nama_asli: transaksi.keterangan,
      kategori: kategori_baru,
    };

    tampilkan_toast(`Category "${kategori_baru}" saved for ${transaksi.keterangan}.`, "sukses");
  } catch (galat) {
    console.warn("[LedgerLens] Failed to save vendor memory:", galat);
  }

  // Perbarui statistik dan tabel
  setTimeout(() => {
    perbaruiStatistikRekonsiliasi();
    renderTabelTransaksi(
      el.filterTransaksi.value,
      el.filterStatus.value
    );
    renderAntrianReview();
    renderMemoriVendor();
  }, 500);
}

// =====================================================================
// MODAL: Review Transaksi Individual
// =====================================================================

function bukaModalReview(id_transaksi) {
  const transaksi = statusAplikasi.hasilRekonsiliasi.find(
    (t) => t.id_transaksi === id_transaksi
  );
  if (!transaksi) return;

  el.modalJudul.textContent = "Review Transaction";
  el.modalIsi.innerHTML = `
    <div style="margin-bottom:16px;">
      <strong style="font-size:16px;">${esc(transaksi.keterangan)}</strong><br/>
      <span style="color:#64748b;font-size:13px;">${esc(transaksi.tanggal)}</span>
    </div>
    <table style="width:100%;font-size:13px;border-collapse:collapse;">
      <tr>
        <td style="padding:6px 0;color:#64748b;">Amount</td>
        <td style="font-weight:700;font-family:monospace;">${formatRupiah(transaksi.jumlah)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b;">AI Category</td>
        <td>${esc(transaksi.kategori_ai || "—")}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b;">Status</td>
        <td><span class="badge-status ${esc(transaksi.status_rekonsiliasi)}">${labelStatus(transaksi.status_rekonsiliasi)}</span></td>
      </tr>
      ${transaksi.catatan_ai ? `
      <tr>
        <td style="padding:6px 0;color:#64748b;">AI Note</td>
        <td style="color:#6366f1;">${esc(transaksi.catatan_ai)}</td>
      </tr>` : ""}
    </table>
    <hr style="margin:16px 0;border-color:#e2e8f0;"/>
    <p style="font-size:13px;color:#64748b;margin-bottom:8px;">Mark as:</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="tombol tombol-primer" onclick="tandaiStatus('${esc(id_transaksi)}', 'cocok')">✓ Matched</button>
      <button class="tombol" style="background:#fee2e2;color:#991b1b;border:none;" onclick="tandaiStatus('${esc(id_transaksi)}', 'tanpa_struk')">⚠ No Receipt</button>
      <button class="tombol tombol-sekunder" onclick="tutupModal()">Cancel</button>
    </div>
  `;

  tampilkan_elemen(el.modalReview);
}

function tandaiStatus(id_transaksi, status_baru) {
  const indeks = statusAplikasi.hasilRekonsiliasi.findIndex(
    (t) => t.id_transaksi === id_transaksi
  );
  if (indeks >= 0) {
    statusAplikasi.hasilRekonsiliasi[indeks].status_rekonsiliasi = status_baru;
    perbaruiStatistikRekonsiliasi();
    renderTabelTransaksi(el.filterTransaksi.value, el.filterStatus.value);
    renderAntrianReview();
    tampilkan_toast("Transaction status updated.", "sukses");
  }
  tutupModal();
}

function tutupModal() {
  sembunyikan_elemen(el.modalReview);
}

// =====================================================================
// EKSPOR: Kirim ringkasan rekonsiliasi ke chat Anna sebagai artifact
// Menunjukkan integrasi langsung dengan host Anna via chat.append_artifact
// =====================================================================

async function kirimRingkasanKeChat() {
  const transaksi = statusAplikasi.hasilRekonsiliasi;
  if (transaksi.length === 0) return;

  const jumlah_cocok = transaksi.filter((t) => t.status_rekonsiliasi === "cocok").length;
  const jumlah_tanpa = transaksi.filter((t) => t.status_rekonsiliasi === "tanpa_struk").length;
  const jumlah_ambigu = transaksi.filter((t) => t.status_rekonsiliasi === "ambigu").length;
  const jumlah_mismatch = transaksi.filter((t) => t.status_rekonsiliasi === "mismatch").length;

  const total_debit = transaksi
    .filter((t) => t.jenis === "debit")
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);

  const daftar_tanpa_struk = transaksi
    .filter((t) => t.status_rekonsiliasi === "tanpa_struk")
    .map((t) => `- ${t.tanggal}: **${t.keterangan}** — ${formatRupiah(t.jumlah)} (${t.kategori_ai || "Belum dikategori"})`)
    .join("\n");

  const isi_laporan = `# 📊 LedgerLens Reconciliation Report

**Report date:** ${new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}

## Summary

| Status | Count |
|--------|-------|
| ✅ Matched with receipt | ${jumlah_cocok} transaction(s) |
| ⚠️ No receipt found | ${jumlah_tanpa} transaction(s) |
| 🔍 Ambiguous / needs review | ${jumlah_ambigu} transaction(s) |
| ❌ Amount mismatch | ${jumlah_mismatch} transaction(s) |
| **Total expenditure** | **${formatRupiah(total_debit)}** |

## Audit Risk

${jumlah_tanpa + jumlah_mismatch > 0
  ? `⚠️ **${jumlah_tanpa + jumlah_mismatch} transaction(s) at risk** require attention:\n\n${daftar_tanpa_struk}`
  : "✅ No transactions at risk. All transactions are properly documented."}

---
*Generated by LedgerLens — all data processed locally on your machine.*`;

  try {
    if (runtimeAnna?.chat?.append_artifact) {
      await runtimeAnna.chat.append_artifact({
        content: isi_laporan,
        content_type: "text/markdown",
      });
      tampilkan_toast("Report sent to Anna chat!", "sukses");
    } else {
      // Mode dev — salin ke clipboard sebagai fallback
      await navigator.clipboard.writeText(isi_laporan);
      tampilkan_toast("Report copied to clipboard (dev mode).", "info");
    }
  } catch (galat) {
    console.warn("[LedgerLens] Failed to send report to chat:", galat);
    tampilkan_toast("Failed to send report to chat.", "error");
  }
}

// =====================================================================
// NAVIGASI TAB
// =====================================================================

function inisialisasiNavigasiTab() {
  document.querySelectorAll(".tab-tombol").forEach((tombol) => {
    tombol.addEventListener("click", () => {
      const id_tab = tombol.dataset.tab;

      // Nonaktifkan semua tab
      document.querySelectorAll(".tab-tombol").forEach((t) => t.classList.remove("aktif"));
      document.querySelectorAll(".konten-tab").forEach((k) => k.classList.remove("aktif"));

      // Aktifkan tab yang diklik
      tombol.classList.add("aktif");
      const konten_tab = document.getElementById(`tab-${id_tab}`);
      if (konten_tab) konten_tab.classList.add("aktif");

      // Muat data memori vendor saat tab tersebut dibuka
      if (id_tab === "memori-vendor") {
        muatMemoriVendorDariAnna();
      }
    });
  });
}

// =====================================================================
// EVENT LISTENERS: Filter Tabel
// =====================================================================

function inisialisasiFilter() {
  el.filterTransaksi.addEventListener("input", () => {
    renderTabelTransaksi(el.filterTransaksi.value, el.filterStatus.value);
  });

  el.filterStatus.addEventListener("change", () => {
    renderTabelTransaksi(el.filterTransaksi.value, el.filterStatus.value);
  });
}

// =====================================================================
// INISIALISASI UTAMA
// =====================================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Hubungkan event listener tombol-tombol utama
  el.tombolScanFolder.addEventListener("click", handleScanFolder);
  el.tombolMuatCsv.addEventListener("click", handleMuatCsv);
  el.tombolMulaiRekonsiliasi.addEventListener("click", handleMulaiRekonsiliasi);
  el.modalTutup.addEventListener("click", tutupModal);
  el.modalLewati.addEventListener("click", tutupModal);
  el.modalReview.addEventListener("click", (e) => {
    if (e.target === el.modalReview) tutupModal();
  });

  // Inisialisasi komponen UI
  inisialisasiNavigasiTab();
  inisialisasiFilter();

  // Highlight step pertama saat app load
  tandaiStepAktif("langkah-folder");

  // Hubungkan ke Anna (atau mode dev jika tidak tersedia)
  // inisialisasiAnna() sudah memanggil muatMemoriVendorDariAnna() di dalamnya
  await inisialisasiAnna();

  // Prefill path demo saat dev lokal
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    if (!el.inputPathFolder.value) {
      el.inputPathFolder.value = "/Users/mac/Development/ledgerlens/demo/struk_pdf";
    }
    if (!el.inputPathCsv.value) {
      el.inputPathCsv.value = "/Users/mac/Development/ledgerlens/demo/struk_pdf/mutasi.csv";
    }
    // Mode dev: muat vendor sekali (Anna tidak terhubung, pakai mock)
    if (!runtimeAnna) {
      await muatMemoriVendorDariAnna();
    }
  }
});

// Ekspos fungsi ke global scope untuk onclick handler di HTML
window.bukaModalReview = bukaModalReview;
window.konfirmasiKategori = konfirmasiKategori;
window.tandaiStatus = tandaiStatus;
window.tutupModal = tutupModal;
window.kirimRingkasanKeChat = kirimRingkasanKeChat;
window.muatDataContoh = muatDataContoh;

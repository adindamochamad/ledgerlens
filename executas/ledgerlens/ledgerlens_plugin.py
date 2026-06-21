#!/usr/bin/env python3
"""
LedgerLens — Anna Tool (stdio JSON-RPC 2.0 server)
Baca receipt lokal + parse CSV bank → rekonsiliasi transaksi untuk audit pajak.
"""

import json
import sys
import base64
import csv
import re
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional

# =====================================================================
# MANIFEST: deskripsi semua tool yang tersedia untuk Anna LLM
# =====================================================================

MANIFEST = {
    "name": "ledgerlens",
    "display_name": "LedgerLens",
    "version": "0.2.0",
    "description": (
        "Rekonsiliasi struk dan mutasi bank di mesin pengguna. "
        "Baca folder struk (PDF/gambar), parse CSV bank, cocokkan transaksi, "
        "dan simpan pembelajaran vendor→kategori."
    ),
    "tools": [
        {
            "name": "daftar_file_struk",
            "description": (
                "Daftarkan semua file struk (PDF, JPG, PNG, JPEG, WEBP) "
                "dalam folder yang diberikan. Gunakan ini sebelum membaca isi struk."
            ),
            "parameters": [
                {
                    "name": "path_folder",
                    "type": "string",
                    "description": "Path absolut folder yang berisi file struk.",
                    "required": True,
                }
            ],
        },
        {
            "name": "baca_struk",
            "description": (
                "Baca isi satu file struk (PDF → teks ekstraksi, "
                "gambar → base64 untuk dianalisis AI). "
                "Kembalikan teks mentah atau konten untuk dianalisis."
            ),
            "parameters": [
                {
                    "name": "path_file",
                    "type": "string",
                    "description": "Path absolut file struk (PDF/JPG/PNG).",
                    "required": True,
                }
            ],
        },
        {
            "name": "parse_csv_bank",
            "description": (
                "Baca dan parse file CSV mutasi bank. "
                "Deteksi kolom tanggal, keterangan, debit/kredit, dan saldo otomatis. "
                "Kembalikan daftar transaksi terstruktur dalam JSON."
            ),
            "parameters": [
                {
                    "name": "path_file",
                    "type": "string",
                    "description": "Path absolut file CSV mutasi bank.",
                    "required": True,
                },
                {
                    "name": "baris_header",
                    "type": "integer",
                    "description": "Nomor baris header (0-indexed). Default: 0.",
                    "required": False,
                },
            ],
        },
        {
            "name": "simpan_hasil_rekonsiliasi",
            "description": (
                "Simpan hasil rekonsiliasi ke file JSON lokal. "
                "Digunakan setelah AI mencocokkan struk ↔ mutasi bank."
            ),
            "parameters": [
                {
                    "name": "data_rekonsiliasi",
                    "type": "object",
                    "description": "Objek JSON hasil rekonsiliasi dari AI.",
                    "required": True,
                },
                {
                    "name": "path_output",
                    "type": "string",
                    "description": "Path file output JSON. Default: ./ledgerlens_result.json",
                    "required": False,
                },
            ],
        },
        {
            "name": "ambil_memori_vendor",
            "description": (
                "Ambil pemetaan vendor→kategori yang sudah dipelajari dari sesi sebelumnya. "
                "Gunakan ini di awal sesi untuk konteks kategorisasi otomatis."
            ),
            "parameters": [],
        },
        {
            "name": "simpan_memori_vendor",
            "description": (
                "Simpan atau perbarui pemetaan vendor→kategori ke memori persisten. "
                "Panggil ini setelah pengguna mengonfirmasi kategori transaksi."
            ),
            "parameters": [
                {
                    "name": "vendor",
                    "type": "string",
                    "description": "Nama vendor/toko (contoh: 'Indomaret', 'Shell SPBU').",
                    "required": True,
                },
                {
                    "name": "kategori",
                    "type": "string",
                    "description": "Kategori pengeluaran (contoh: 'Makanan', 'BBM', 'ATK').",
                    "required": True,
                },
                {
                    "name": "catatan",
                    "type": "string",
                    "description": "Catatan tambahan opsional.",
                    "required": False,
                },
            ],
        },
        {
            "name": "ringkasan_folder",
            "description": (
                "Buat ringkasan cepat folder: jumlah file per tipe, "
                "estimasi total transaksi, dan potensi masalah. "
                "Gunakan ini untuk laporan awal sebelum proses penuh."
            ),
            "parameters": [
                {
                    "name": "path_folder",
                    "type": "string",
                    "description": "Path absolut folder struk.",
                    "required": True,
                }
            ],
        },
    ],
}

# =====================================================================
# PATH untuk menyimpan memori vendor (file JSON lokal di mesin user)
# =====================================================================

DIREKTORI_DATA = Path.home() / ".ledgerlens"
FILE_MEMORI_VENDOR = DIREKTORI_DATA / "memori_vendor.json"

# Batas ukuran file untuk mencegah OOM saat base64-encode file besar
BATAS_UKURAN_FILE_MB = 15
BATAS_PANJANG_VENDOR = 500


def pastikan_direktori_data():
    """Pastikan direktori data ~/.ledgerlens sudah ada."""
    DIREKTORI_DATA.mkdir(parents=True, exist_ok=True)


def validasi_path_baca(path_file: str, ekstensi_diizinkan: Optional[set] = None) -> Optional[str]:
    """
    Validasi path file sebelum dibaca.
    Kembalikan pesan error jika tidak valid, None jika aman.
    Blokir path sistem yang sensitif dan file terlalu besar.
    """
    file = Path(path_file).resolve()

    # Blokir path direktori sistem yang sensitif
    path_sensitif = ["/etc", "/proc", "/sys", "/dev", "/boot", "/root",
                     str(Path.home() / ".ssh"), str(Path.home() / ".gnupg"),
                     str(Path.home() / ".aws"), str(Path.home() / ".kube")]
    path_str = str(file)
    for sensitif in path_sensitif:
        if path_str.startswith(sensitif):
            return f"Access denied: path is in a restricted system directory."

    # Validasi ekstensi jika diberikan
    if ekstensi_diizinkan and file.suffix.lower() not in ekstensi_diizinkan:
        return None  # Biarkan fungsi pemanggil handle ini

    return None  # Aman


def validasi_path_tulis(path_output: str) -> Optional[str]:
    """
    Validasi path output sebelum ditulis.
    Hanya izinkan tulis ke dalam home directory pengguna.
    Resolve symlink untuk mencegah bypass via /tmp → /private/tmp di macOS.
    """
    file = Path(path_output).resolve()
    home_resolved = Path.home().resolve()
    data_resolved = DIREKTORI_DATA.resolve()

    direktori_diizinkan = [home_resolved, data_resolved]

    for izin in direktori_diizinkan:
        try:
            file.relative_to(izin)
            return None  # Path aman
        except ValueError:
            continue

    return "Write access denied: output path must be within your home directory."


# =====================================================================
# IMPLEMENTASI SETIAP TOOL
# =====================================================================


def daftar_file_struk(path_folder: str) -> dict:
    """Daftarkan semua file struk yang didukung dalam folder."""
    ekstensi_didukung = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
    folder = Path(path_folder)

    if not folder.exists():
        return {"sukses": False, "pesan": f"Folder not found: {path_folder}"}

    if not folder.is_dir():
        return {"sukses": False, "pesan": f"Path is not a directory: {path_folder}"}

    daftar_file = []
    for file in sorted(folder.iterdir()):
        if file.suffix.lower() in ekstensi_didukung:
            ukuran_kb = round(file.stat().st_size / 1024, 1)
            daftar_file.append({
                "nama_file": file.name,
                "path_absolut": str(file.absolute()),
                "tipe": file.suffix.lower().lstrip("."),
                "ukuran_kb": ukuran_kb,
            })

    return {
        "sukses": True,
        "path_folder": path_folder,
        "jumlah_file": len(daftar_file),
        "daftar_file": daftar_file,
    }


def baca_struk(path_file: str) -> dict:
    """
    Baca isi file struk.
    - PDF: coba ekstrak teks dulu, fallback ke base64
    - Gambar: encode ke base64 + metadata
    """
    # Validasi keamanan path sebelum membaca
    pesan_error = validasi_path_baca(path_file)
    if pesan_error:
        return {"sukses": False, "pesan": pesan_error}

    file = Path(path_file)

    if not file.exists():
        return {"sukses": False, "pesan": f"File not found: {path_file}"}

    ekstensi = file.suffix.lower()
    ukuran_kb = round(file.stat().st_size / 1024, 1)

    # Tolak file yang terlalu besar untuk mencegah OOM
    if ukuran_kb > BATAS_UKURAN_FILE_MB * 1024:
        return {
            "sukses": False,
            "pesan": f"File too large ({ukuran_kb:.0f} KB). Maximum is {BATAS_UKURAN_FILE_MB} MB.",
        }

    # Coba ekstrak teks dari PDF menggunakan pdfplumber
    if ekstensi == ".pdf":
        try:
            import pdfplumber
            with pdfplumber.open(path_file) as pdf:
                halaman_teks = []
                for nomor_halaman, halaman in enumerate(pdf.pages, 1):
                    teks = halaman.extract_text() or ""
                    halaman_teks.append({
                        "halaman": nomor_halaman,
                        "teks": teks.strip(),
                    })

                teks_gabungan = "\n\n".join(
                    h["teks"] for h in halaman_teks if h["teks"]
                )

                return {
                    "sukses": True,
                    "path_file": path_file,
                    "nama_file": file.name,
                    "tipe": "pdf",
                    "ukuran_kb": ukuran_kb,
                    "jumlah_halaman": len(pdf.pages),
                    "teks_terekstrak": teks_gabungan,
                    "per_halaman": halaman_teks,
                    "metode": "pdfplumber",
                }
        except ImportError:
            # pdfplumber tidak tersedia, kirim base64 agar AI bisa proses
            pass
        except Exception as galat:
            # Gagal ekstrak teks, fallback ke base64
            sys.stderr.write(f"[LedgerLens] Peringatan ekstrak PDF: {galat}\n")

        # Fallback: encode PDF sebagai base64
        with open(path_file, "rb") as f:
            konten_b64 = base64.b64encode(f.read()).decode("utf-8")

        return {
            "sukses": True,
            "path_file": path_file,
            "nama_file": file.name,
            "tipe": "pdf",
            "ukuran_kb": ukuran_kb,
            "konten_base64": konten_b64,
            "mime_type": "application/pdf",
            "metode": "base64_fallback",
            "catatan": "pdfplumber tidak tersedia, konten dikirim sebagai base64.",
        }

    # Gambar: encode ke base64 untuk diproses AI
    if ekstensi in {".jpg", ".jpeg", ".png", ".webp"}:
        peta_mime = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }
        mime_type = peta_mime.get(ekstensi, "image/jpeg")

        with open(path_file, "rb") as f:
            konten_b64 = base64.b64encode(f.read()).decode("utf-8")

        return {
            "sukses": True,
            "path_file": path_file,
            "nama_file": file.name,
            "tipe": "gambar",
            "mime_type": mime_type,
            "ukuran_kb": ukuran_kb,
            "konten_base64": konten_b64,
            "data_uri": f"data:{mime_type};base64,{konten_b64}",
        }

    return {
        "sukses": False,
        "pesan": f"Unsupported file type: {ekstensi}",
    }


def parse_csv_bank(path_file: str, baris_header: int = 0) -> dict:
    """
    Parse CSV mutasi bank dengan deteksi kolom otomatis.
    Mendukung berbagai format bank Indonesia umum.
    """
    # Validasi keamanan path sebelum membaca
    pesan_error = validasi_path_baca(path_file)
    if pesan_error:
        return {"sukses": False, "pesan": pesan_error}

    # Hanya izinkan file CSV/TSV
    ekstensi_csv = {".csv", ".tsv", ".txt"}
    if Path(path_file).suffix.lower() not in ekstensi_csv:
        return {"sukses": False, "pesan": f"Only CSV/TSV files are supported for bank statements."}

    file = Path(path_file)

    if not file.exists():
        return {"sukses": False, "pesan": f"File not found: {path_file}"}

    # Deteksi encoding (UTF-8 atau latin-1 umum di bank Indonesia)
    for encoding in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
        try:
            with open(path_file, "r", encoding=encoding) as f:
                isi_csv = f.read()
            break
        except UnicodeDecodeError:
            continue
    else:
        return {"sukses": False, "pesan": "Unable to read CSV file encoding (tried UTF-8, Latin-1, CP1252)."}

    baris_semua = list(csv.reader(isi_csv.splitlines()))

    if len(baris_semua) <= baris_header:
        return {"sukses": False, "pesan": "CSV file is empty or header row not found."}

    baris_kolom = baris_semua[baris_header]
    baris_data = baris_semua[baris_header + 1:]

    # Deteksi kolom berdasarkan kata kunci umum bank Indonesia
    peta_kolom = deteksi_kolom_bank(baris_kolom)

    # Parse setiap baris menjadi transaksi terstruktur
    daftar_transaksi = []
    for nomor_baris, baris in enumerate(baris_data):
        if not any(baris):  # Lewati baris kosong
            continue

        transaksi = parse_baris_transaksi(baris, baris_kolom, peta_kolom, nomor_baris)
        if transaksi:
            daftar_transaksi.append(transaksi)

    # Ringkasan statistik
    total_debit = sum(t.get("debit", 0) for t in daftar_transaksi)
    total_kredit = sum(t.get("kredit", 0) for t in daftar_transaksi)

    return {
        "sukses": True,
        "path_file": path_file,
        "jumlah_kolom": len(baris_kolom),
        "nama_kolom": baris_kolom,
        "peta_kolom_terdeteksi": peta_kolom,
        "jumlah_transaksi": len(daftar_transaksi),
        "total_debit": round(total_debit, 2),
        "total_kredit": round(total_kredit, 2),
        "transaksi": daftar_transaksi,
    }


def deteksi_kolom_bank(baris_kolom: list) -> dict:
    """
    Deteksi otomatis kolom-kolom penting dari header CSV bank.
    Mendukung variasi nama kolom berbagai bank Indonesia.
    """
    peta = {}
    kata_kunci_tanggal = ["tanggal", "tgl", "date", "waktu", "time"]
    kata_kunci_keterangan = ["keterangan", "ket", "deskripsi", "description", "remark",
                              "uraian", "transaksi", "berita"]
    kata_kunci_debit = ["debit", "db", "pengeluaran", "keluar", "withdrawn", "mutation_db"]
    kata_kunci_kredit = ["kredit", "kr", "pemasukan", "masuk", "deposit", "mutation_cr"]
    kata_kunci_saldo = ["saldo", "balance", "bal"]
    kata_kunci_referensi = ["referensi", "ref", "no", "nomor", "id", "reff"]

    for indeks, nama_kolom in enumerate(baris_kolom):
        nama_bersih = nama_kolom.lower().strip().replace(" ", "_")
        for kata in kata_kunci_tanggal:
            if kata in nama_bersih and "tanggal" not in peta:
                peta["tanggal"] = indeks
        for kata in kata_kunci_keterangan:
            if kata in nama_bersih and "keterangan" not in peta:
                peta["keterangan"] = indeks
        for kata in kata_kunci_debit:
            if kata in nama_bersih and "debit" not in peta:
                peta["debit"] = indeks
        for kata in kata_kunci_kredit:
            if kata in nama_bersih and "kredit" not in peta:
                peta["kredit"] = indeks
        for kata in kata_kunci_saldo:
            if kata in nama_bersih and "saldo" not in peta:
                peta["saldo"] = indeks
        for kata in kata_kunci_referensi:
            if kata in nama_bersih and "referensi" not in peta:
                peta["referensi"] = indeks

    return peta


def bersihkan_angka(teks: str) -> float:
    """
    Bersihkan format angka bank (titik ribuan, koma desimal) → float.
    Mendukung format Indonesia (1.234.567,89) dan Internasional (1,234,567.89).
    """
    if not teks:
        return 0.0

    # Simpan tanda negatif sebelum distripping
    teks_str = str(teks).strip()
    negatif = teks_str.startswith("-")

    # Hapus spasi, mata uang, simbol (BUKAN minus — sudah disimpan di atas)
    bersih = re.sub(r"[Rp\s$€£+\-]", "", teks_str)

    # Handle format Indonesia: 1.234.567,89 → 1234567.89
    if "," in bersih and "." in bersih:
        if bersih.rindex(",") > bersih.rindex("."):
            # Format Indonesia: titik = ribuan, koma = desimal
            bersih = bersih.replace(".", "").replace(",", ".")
        else:
            # Format internasional: koma = ribuan, titik = desimal
            bersih = bersih.replace(",", "")
    elif "," in bersih:
        # Ambiguous: hanya koma — asumsi ribuan jika >3 digit sebelum koma
        bagian = bersih.split(",")
        if len(bagian) == 2 and len(bagian[1]) == 3:
            # "500,000" → ribuan separator, bukan desimal
            bersih = bersih.replace(",", "")
        else:
            # "500,5" → desimal
            bersih = bersih.replace(",", ".")

    bersih = re.sub(r"[^\d.]", "", bersih)
    try:
        nilai = float(bersih)
        return -nilai if negatif else nilai
    except ValueError:
        return 0.0


def parse_baris_transaksi(baris: list, baris_kolom: list,
                           peta_kolom: dict, nomor_baris: int) -> Optional[dict]:
    """Parse satu baris CSV menjadi dict transaksi terstruktur."""
    def ambil(kunci: str) -> str:
        indeks = peta_kolom.get(kunci)
        if indeks is not None and indeks < len(baris):
            return baris[indeks].strip()
        return ""

    tanggal_raw = ambil("tanggal")
    keterangan = ambil("keterangan")
    debit_raw = ambil("debit")
    kredit_raw = ambil("kredit")
    saldo_raw = ambil("saldo")
    referensi = ambil("referensi")

    # Lewati baris tanpa data utama
    if not tanggal_raw and not keterangan and not debit_raw and not kredit_raw:
        return None

    debit = bersihkan_angka(debit_raw)
    kredit = bersihkan_angka(kredit_raw)
    saldo = bersihkan_angka(saldo_raw)

    # Tentukan arah transaksi
    jenis = "debit" if debit > 0 else ("kredit" if kredit > 0 else "tidak_diketahui")
    jumlah = debit if debit > 0 else kredit

    # Buat ID unik untuk transaksi ini
    id_transaksi = hashlib.md5(
        f"{tanggal_raw}|{keterangan}|{jumlah}|{nomor_baris}".encode()
    ).hexdigest()[:12]

    return {
        "id_transaksi": id_transaksi,
        "nomor_baris": nomor_baris + 1,
        "tanggal": tanggal_raw,
        "keterangan": keterangan,
        "jenis": jenis,
        "jumlah": jumlah,
        "debit": debit,
        "kredit": kredit,
        "saldo": saldo,
        "referensi": referensi,
        "status_rekonsiliasi": "belum_diproses",
        "data_mentah": dict(zip(baris_kolom, baris)),
    }


def simpan_hasil_rekonsiliasi(data_rekonsiliasi: dict,
                               path_output: Optional[str] = None) -> dict:
    """Simpan hasil rekonsiliasi ke file JSON lokal."""
    pastikan_direktori_data()

    if not path_output:
        waktu_sekarang = datetime.now().strftime("%Y%m%d_%H%M%S")
        path_output = str(DIREKTORI_DATA / f"rekonsiliasi_{waktu_sekarang}.json")
    else:
        # Validasi path output — hanya izinkan home dir atau /tmp
        pesan_error = validasi_path_tulis(path_output)
        if pesan_error:
            return {"sukses": False, "pesan": pesan_error}

    try:
        # Salin dict agar tidak memodifikasi data asli milik pemanggil
        import copy
        data_untuk_simpan = copy.deepcopy(data_rekonsiliasi)
        data_untuk_simpan["saved_at"] = datetime.now().isoformat()
        data_untuk_simpan["tool_version"] = MANIFEST["version"]

        with open(path_output, "w", encoding="utf-8") as f:
            json.dump(data_untuk_simpan, f, ensure_ascii=False, indent=2)

        return {
            "sukses": True,
            "path_file": path_output,
            "ukuran_kb": round(Path(path_output).stat().st_size / 1024, 1),
            "pesan": f"Reconciliation results saved successfully.",
        }
    except Exception as galat:
        return {"sukses": False, "pesan": f"Failed to save results: {galat}"}


def ambil_memori_vendor() -> dict:
    """Ambil semua pemetaan vendor→kategori yang sudah disimpan."""
    pastikan_direktori_data()

    if not FILE_MEMORI_VENDOR.exists():
        return {
            "sukses": True,
            "jumlah_vendor": 0,
            "peta_vendor": {},
            "pesan": "No vendor memory yet. This is your first session.",
        }

    try:
        with open(FILE_MEMORI_VENDOR, "r", encoding="utf-8") as f:
            peta_vendor = json.load(f)

        return {
            "sukses": True,
            "jumlah_vendor": len(peta_vendor),
            "peta_vendor": peta_vendor,
            "pesan": f"Found {len(peta_vendor)} known vendor(s).",
        }
    except Exception as galat:
        return {"sukses": False, "pesan": f"Failed to read vendor memory: {galat}"}


def simpan_memori_vendor(vendor: str, kategori: str,
                          catatan: str = "") -> dict:
    """Simpan atau perbarui satu pemetaan vendor→kategori."""
    # Validasi input: vendor dan kategori tidak boleh kosong
    vendor = vendor.strip()
    kategori = kategori.strip()
    if not vendor or not kategori:
        return {"sukses": False, "pesan": "Vendor name and category cannot be empty."}

    # Batasi panjang input untuk mencegah penyalahgunaan
    if len(vendor) > BATAS_PANJANG_VENDOR:
        vendor = vendor[:BATAS_PANJANG_VENDOR]
    if len(kategori) > 100:
        kategori = kategori[:100]

    pastikan_direktori_data()

    # Muat data yang sudah ada
    peta_vendor = {}
    if FILE_MEMORI_VENDOR.exists():
        try:
            with open(FILE_MEMORI_VENDOR, "r", encoding="utf-8") as f:
                peta_vendor = json.load(f)
        except Exception:
            pass

    # Normalisasi nama vendor (lowercase, hapus spasi berlebih)
    kunci_vendor = vendor.lower()
    adalah_vendor_baru = kunci_vendor not in peta_vendor

    peta_vendor[kunci_vendor] = {
        "nama_asli": vendor,
        "kategori": kategori,
        "catatan": catatan.strip()[:200],
        "terakhir_diperbarui": datetime.now().isoformat(),
    }

    try:
        with open(FILE_MEMORI_VENDOR, "w", encoding="utf-8") as f:
            json.dump(peta_vendor, f, ensure_ascii=False, indent=2)

        aksi = "added" if adalah_vendor_baru else "updated"
        return {
            "sukses": True,
            "vendor": vendor,
            "kategori": kategori,
            "aksi": aksi,
            "pesan": f"Vendor '{vendor}' successfully {aksi} with category '{kategori}'.",
        }
    except Exception as galat:
        return {"sukses": False, "pesan": f"Failed to save vendor memory: {galat}"}


def ringkasan_folder(path_folder: str) -> dict:
    """Buat ringkasan cepat folder struk tanpa membaca isinya."""
    folder = Path(path_folder)

    if not folder.exists():
        return {"sukses": False, "pesan": f"Folder not found: {path_folder}"}

    hitungan_per_tipe = {}
    total_ukuran_kb = 0.0
    daftar_file_terbaru = []

    ekstensi_didukung = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
    ekstensi_csv = {".csv", ".tsv", ".xlsx", ".xls"}

    for file in folder.iterdir():
        if not file.is_file():
            continue

        ukuran_kb = round(file.stat().st_size / 1024, 1)
        total_ukuran_kb += ukuran_kb
        ekstensi = file.suffix.lower()

        if ekstensi in ekstensi_didukung or ekstensi in ekstensi_csv:
            kategori = "struk" if ekstensi in ekstensi_didukung else "data"
            hitungan_per_tipe[ekstensi] = hitungan_per_tipe.get(ekstensi, 0) + 1

            daftar_file_terbaru.append({
                "nama": file.name,
                "tipe": ekstensi,
                "kategori": kategori,
                "ukuran_kb": ukuran_kb,
            })

    jumlah_struk = sum(
        v for k, v in hitungan_per_tipe.items() if k in ekstensi_didukung
    )
    jumlah_csv = sum(
        v for k, v in hitungan_per_tipe.items() if k in ekstensi_csv
    )

    # Estimasi potensi masalah awal
    potensi_masalah = []
    if jumlah_struk == 0:
        potensi_masalah.append("No receipt files found (PDF/images).")
    if jumlah_csv == 0:
        potensi_masalah.append("No bank statement CSV file found.")
    if total_ukuran_kb > 50_000:
        potensi_masalah.append("Total file size is large (>50 MB), processing may take longer.")

    return {
        "sukses": True,
        "path_folder": path_folder,
        "jumlah_file_struk": jumlah_struk,
        "jumlah_file_csv": jumlah_csv,
        "total_file": len(daftar_file_terbaru),
        "total_ukuran_kb": round(total_ukuran_kb, 1),
        "rincian_per_tipe": hitungan_per_tipe,
        "daftar_file": sorted(daftar_file_terbaru, key=lambda x: x["nama"]),
        "potensi_masalah": potensi_masalah,
        "estimasi": {
            "perlu_ocr": jumlah_struk > 0,
            "siap_diproses": jumlah_struk > 0 and jumlah_csv > 0,
        },
    }


# =====================================================================
# DISPATCHER: routing method JSON-RPC ke fungsi yang tepat
# =====================================================================

DAFTAR_TOOL = {
    "daftar_file_struk": lambda args: daftar_file_struk(args["path_folder"]),
    "baca_struk": lambda args: baca_struk(args["path_file"]),
    "parse_csv_bank": lambda args: parse_csv_bank(
        args["path_file"],
        baris_header=args.get("baris_header", 0),
    ),
    "simpan_hasil_rekonsiliasi": lambda args: simpan_hasil_rekonsiliasi(
        args["data_rekonsiliasi"],
        path_output=args.get("path_output"),
    ),
    "ambil_memori_vendor": lambda args: ambil_memori_vendor(),
    "simpan_memori_vendor": lambda args: simpan_memori_vendor(
        args["vendor"],
        args["kategori"],
        catatan=args.get("catatan", ""),
    ),
    "ringkasan_folder": lambda args: ringkasan_folder(args["path_folder"]),
}


def tangani_permintaan(permintaan: dict) -> dict:
    """Tangani satu permintaan JSON-RPC masuk."""
    id_permintaan = permintaan.get("id")
    method = permintaan.get("method")

    if method == "describe":
        return {"jsonrpc": "2.0", "id": id_permintaan, "result": MANIFEST}

    if method == "invoke":
        params = permintaan.get("params") or {}
        nama_tool = params.get("tool")
        argumen = params.get("arguments") or {}

        if nama_tool not in DAFTAR_TOOL:
            return {
                "jsonrpc": "2.0",
                "id": id_permintaan,
                "error": {"code": -32601, "message": f"Tool tidak dikenal: {nama_tool}"},
            }

        try:
            hasil = DAFTAR_TOOL[nama_tool](argumen)
            return {
                "jsonrpc": "2.0",
                "id": id_permintaan,
                "result": {"success": True, "data": hasil},
            }
        except KeyError as e:
            return {
                "jsonrpc": "2.0",
                "id": id_permintaan,
                "error": {"code": -32602, "message": f"Missing required parameter: {e}"},
            }
        except Exception as e:
            sys.stderr.write(f"[LedgerLens] Error tool '{nama_tool}': {e}\n")
            return {
                "jsonrpc": "2.0",
                "id": id_permintaan,
                "error": {"code": -32603, "message": f"Error internal: {e}"},
            }

    if method == "health":
        return {
            "jsonrpc": "2.0",
            "id": id_permintaan,
            "result": {"status": "ok", "version": MANIFEST["version"]},
        }

    return {
        "jsonrpc": "2.0",
        "id": id_permintaan,
        "error": {"code": -32601, "message": f"Method tidak dikenal: {method}"},
    }


# =====================================================================
# MAIN LOOP: wajib long-running, baca stdin terus sampai EOF
# =====================================================================

def main():
    sys.stderr.write(f"[LedgerLens] Tool v{MANIFEST['version']} siap. Menunggu perintah...\n")

    for baris in sys.stdin:
        baris = baris.strip()
        if not baris:
            continue

        try:
            permintaan = json.loads(baris)
        except json.JSONDecodeError as e:
            # Kirim error tapi jangan berhenti — tool harus tetap jalan
            sys.stderr.write(f"[LedgerLens] JSON tidak valid: {e}\n")
            respons = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": "JSON tidak valid"},
            }
            sys.stdout.write(json.dumps(respons) + "\n")
            sys.stdout.flush()
            continue

        respons = tangani_permintaan(permintaan)
        sys.stdout.write(json.dumps(respons) + "\n")
        sys.stdout.flush()

    sys.stderr.write("[LedgerLens] stdin ditutup, tool berhenti.\n")


if __name__ == "__main__":
    main()

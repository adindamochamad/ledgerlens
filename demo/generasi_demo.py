#!/usr/bin/env python3
"""
Generator data demo LedgerLens.
Membuat CSV mutasi bank + gambar struk dummy untuk testing/demo hackathon.
"""

from pathlib import Path
from datetime import date

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    raise SystemExit("Install Pillow dulu: pip install Pillow")

DIREKTORI_DEMO = Path(__file__).resolve().parent
FOLDER_STRUK = DIREKTORI_DEMO / "struk"
FILE_CSV = DIREKTORI_DEMO / "mutasi_januari_2024.csv"

# Transaksi bank + apakah punya struk di folder demo
DAFTAR_TRANSAKSI = [
    {"tanggal": "2024-01-05", "keterangan": "INDOMARET 12345 JAKARTA", "debit": 156_000, "punya_struk": True, "vendor_struk": "INDOMARET"},
    {"tanggal": "2024-01-07", "keterangan": "GRAB* FOOD JAKARTA", "debit": 87_000, "punya_struk": True, "vendor_struk": "GRAB FOOD"},
    {"tanggal": "2024-01-10", "keterangan": "SHELL SPBU SUDIRMAN", "debit": 350_000, "punya_struk": False, "vendor_struk": "SHELL"},
    {"tanggal": "2024-01-12", "keterangan": "SHOPEE*12345678", "debit": 420_000, "punya_struk": True, "vendor_struk": "SHOPEE"},
    {"tanggal": "2024-01-14", "keterangan": "ALFAMART 9876", "debit": 67_500, "punya_struk": True, "vendor_struk": "ALFAMART"},
    {"tanggal": "2024-01-15", "keterangan": "ATM TUNAI BCA", "debit": 500_000, "punya_struk": False, "vendor_struk": "ATM"},
    {"tanggal": "2024-01-18", "keterangan": "PLN PREPAID", "debit": 200_000, "punya_struk": True, "vendor_struk": "PLN"},
    {"tanggal": "2024-01-20", "keterangan": "TOKOPEDIA*GADGET", "debit": 1_250_000, "punya_struk": True, "vendor_struk": "TOKOPEDIA", "nominal_struk": 1_100_000},
    {"tanggal": "2024-01-22", "keterangan": "GOJEK GOCAR", "debit": 45_000, "punya_struk": True, "vendor_struk": "GOJEK"},
    {"tanggal": "2024-01-25", "keterangan": "RESTO PADANG JAYA", "debit": 95_000, "punya_struk": True, "vendor_struk": "RESTO PADANG", "nominal_struk": 120_000},
    {"tanggal": "2024-01-28", "keterangan": "TRANSFER MASUK", "debit": 0, "kredit": 2_500_000, "punya_struk": False, "vendor_struk": ""},
    {"tanggal": "2024-01-30", "keterangan": "NETFLIX.COM", "debit": 54_000, "punya_struk": True, "vendor_struk": "NETFLIX"},
]


def format_rupiah(angka: int) -> str:
    return f"Rp {angka:,.0f}".replace(",", ".")


def buat_gambar_struk(nama_file: str, vendor: str, tanggal: str, nominal: int) -> Path:
    """Buat gambar struk sederhana (JPEG) yang bisa dibaca OCR/AI."""
    lebar, tinggi = 400, 520
    gambar = Image.new("RGB", (lebar, tinggi), color=(255, 255, 255))
    kanvas = ImageDraw.Draw(gambar)

    try:
        font_judul = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
        font_normal = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
        font_kecil = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 13)
    except OSError:
        font_judul = ImageFont.load_default()
        font_normal = font_judul
        font_kecil = font_judul

    kanvas.rectangle([10, 10, lebar - 10, tinggi - 10], outline=(0, 0, 0), width=2)
    kanvas.text((lebar // 2, 40), vendor, fill=(0, 0, 0), font=font_judul, anchor="mm")
    kanvas.line([30, 70, lebar - 30, 70], fill=(0, 0, 0), width=1)
    kanvas.text((40, 90), f"Tanggal: {tanggal}", fill=(0, 0, 0), font=font_normal)
    kanvas.text((40, 120), f"No. Struk: STR-{tanggal.replace('-', '')}", fill=(0, 0, 0), font=font_kecil)
    kanvas.text((40, 160), "Item:", fill=(0, 0, 0), font=font_normal)
    kanvas.text((40, 190), "- Pembelian", fill=(0, 0, 0), font=font_kecil)
    kanvas.line([30, 240, lebar - 30, 240], fill=(0, 0, 0), width=1)
    kanvas.text((40, 270), "TOTAL:", fill=(0, 0, 0), font=font_normal)
    kanvas.text((lebar - 40, 270), format_rupiah(nominal), fill=(0, 0, 0), font=font_judul, anchor="rm")
    kanvas.text((lebar // 2, 400), "Terima kasih", fill=(100, 100, 100), font=font_kecil, anchor="mm")
    kanvas.text((lebar // 2, 430), "Struk demo LedgerLens", fill=(150, 150, 150), font=font_kecil, anchor="mm")

    path_keluar = FOLDER_STRUK / nama_file
    gambar.save(path_keluar, "JPEG", quality=85)
    return path_keluar


def buat_csv_bank() -> Path:
    """Generate CSV mutasi bank format umum BCA."""
    saldo = 5_000_000
    baris = ["Tanggal,Keterangan,Debit,Kredit,Saldo"]

    for tx in DAFTAR_TRANSAKSI:
        debit = tx.get("debit", 0)
        kredit = tx.get("kredit", 0)
        if kredit:
            saldo += kredit
        else:
            saldo -= debit
        baris.append(
            f"{tx['tanggal']},{tx['keterangan']},"
            f"{debit if debit else ''},{kredit if kredit else ''},{saldo}"
        )

    FILE_CSV.write_text("\n".join(baris) + "\n", encoding="utf-8")
    return FILE_CSV


def main():
    FOLDER_STRUK.mkdir(parents=True, exist_ok=True)

    # Bersihkan struk lama
    for file_lama in FOLDER_STRUK.glob("*"):
        if file_lama.is_file():
            file_lama.unlink()

    jumlah_struk = 0
    for indeks, tx in enumerate(DAFTAR_TRANSAKSI):
        if not tx.get("punya_struk") or not tx.get("vendor_struk"):
            continue
        nominal_struk = tx.get("nominal_struk", tx.get("debit", 0))
        nama_file = f"struk_{indeks + 1:02d}_{tx['vendor_struk'].lower().replace(' ', '_')}.jpg"
        buat_gambar_struk(nama_file, tx["vendor_struk"], tx["tanggal"], nominal_struk)
        jumlah_struk += 1

    path_csv = buat_csv_bank()

    tanpa_struk = sum(1 for t in DAFTAR_TRANSAKSI if t.get("debit") and not t.get("punya_struk"))
    mismatch = sum(1 for t in DAFTAR_TRANSAKSI if t.get("nominal_struk"))

    print("✅ Data demo LedgerLens siap!")
    print(f"   Folder struk : {FOLDER_STRUK}")
    print(f"   CSV bank     : {path_csv}")
    print(f"   Struk        : {jumlah_struk} file JPG")
    print(f"   Transaksi    : {len(DAFTAR_TRANSAKSI)} baris")
    print(f"   Tanpa struk  : {tanpa_struk} (SHELL SPBU, ATM TUNAI)")
    print(f"   Mismatch     : {mismatch} (TOKOPEDIA, RESTO PADANG — nominal beda)")


if __name__ == "__main__":
    main()

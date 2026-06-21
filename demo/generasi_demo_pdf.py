#!/usr/bin/env python3
"""
Generator dataset demo PDF-teks untuk LedgerLens.

Demo utama hackathon pivot ke struk PDF ber-teks karena `anna.llm.complete`
bersifat text-only (tidak ada vision) — hanya struk dengan text-layer yang
benar-benar diekstrak AI. Skrip ini membuat struk PDF (text-layer, terbaca
pdfplumber → memicu jalur llm.complete) + CSV mutasi bank yang menghasilkan
cerita rekonsiliasi lengkap: cocok / mismatch / tanpa_struk.

Jalankan: python3 demo/generasi_demo_pdf.py
"""

from pathlib import Path

try:
    from fpdf import FPDF
except ImportError:
    raise SystemExit("Install fpdf2 dulu: pip install fpdf2")

DIR = Path(__file__).resolve().parent
FOLDER_PDF = DIR / "struk_pdf"
FILE_CSV = FOLDER_PDF / "mutasi.csv"

# Struk yang dibuat ulang sebagai PDF text-layer. Tiga pertama sudah ada di
# repo (dibuat tangan); didefinisikan ulang di sini agar dataset reproducible.
STRUK = [
    {
        "file": "indomaret.pdf",
        "judul": "INDOMARET 12345",
        "alamat": "Jl. Mangga Dua Raya, Jakarta",
        "tanggal": "05/01/2024 09:15",
        "item": [
            ("Aqua 600ml x2", "7.000"),
            ("Indomie Goreng x5", "15.000"),
            ("Beras 5kg", "65.000"),
            ("Minyak Goreng 2L", "38.000"),
            ("Telur 1kg", "31.000"),
        ],
        "total": "156.000",
        "footer": ["Tunai Rp 200.000", "Kembali Rp 44.000", "Terima kasih"],
    },
    {
        "file": "shell_spbu.pdf",
        "judul": "SHELL SPBU 34.201.05",
        "alamat": "Jl. Jenderal Sudirman, Jakarta Pusat",
        "tanggal": "10/01/2024 14:32",
        "item": [
            ("No. Struk: 0034-2201", ""),
            ("Pump 03 Shell Super", ""),
            ("Volume : 25,00 L @ 14.000", ""),
        ],
        "total": "350.000",
        "footer": ["Pembayaran : Tunai", "Terima kasih"],
    },
    {
        "file": "alfamart.pdf",
        "judul": "ALFAMART 9876",
        "alamat": "Jl. Gatot Subroto, Jakarta",
        "tanggal": "14/01/2024 17:42",
        "item": [
            ("Teh Botol x3", "12.000"),
            ("Roti Tawar", "18.000"),
            ("Sabun Mandi x2", "16.500"),
            ("Kopi Sachet x10", "21.000"),
        ],
        "total": "67.500",
        "footer": ["Tunai Rp 70.000", "Kembali Rp 2.500", "Terima kasih"],
    },
    {
        "file": "pln.pdf",
        "judul": "PLN PREPAID - TOKEN LISTRIK",
        "alamat": "ID Pelanggan: 532100456789",
        "tanggal": "18/01/2024 08:20",
        "item": [
            ("Token", "200.000"),
            ("Admin Bank", "included"),
            ("kWh", "138,9"),
        ],
        "total": "200.000",
        "footer": ["Metode : Mobile Banking", "Simpan struk ini"],
    },
    {
        "file": "tokopedia.pdf",
        "judul": "TOKOPEDIA - GADGET STORE",
        "alamat": "Invoice: INV/20240120/8842",
        "tanggal": "20/01/2024",
        "item": [
            ("Wireless Earbuds", "850.000"),
            ("Power Bank 20000mAh", "250.000"),
            ("Ongkos Kirim", "40.000"),
            ("Diskon Toko", "-40.000"),
        ],
        "total": "1.100.000",
        "footer": ["Metode : Transfer Bank", "Terima kasih"],
    },
    {
        "file": "gojek.pdf",
        "judul": "GOJEK - GOCAR",
        "alamat": "Order ID: GC-20240122-7781",
        "tanggal": "22/01/2024 19:05",
        "item": [
            ("Perjalanan Sudirman - Kemang", ""),
            ("Tarif Dasar", "40.000"),
            ("Biaya Layanan", "5.000"),
        ],
        "total": "45.000",
        "footer": ["Metode : GoPay", "Terima kasih"],
    },
]

# Mutasi bank: 5 cocok, 1 mismatch (Tokopedia 1.25jt vs struk 1.1jt),
# 3 tanpa_struk (ATM, Shopee, Grab Food) = Rp 1.650.000 tanpa bukti.
TRANSAKSI = [
    ("2024-01-05", "INDOMARET 12345 JAKARTA", 156_000),
    ("2024-01-10", "SHELL SPBU SUDIRMAN", 350_000),
    ("2024-01-14", "ALFAMART 9876", 67_500),
    ("2024-01-15", "ATM TARIK TUNAI", 1_000_000),     # tanpa_struk
    ("2024-01-18", "PLN PREPAID TOKEN", 200_000),
    ("2024-01-20", "TOKOPEDIA*GADGET", 1_250_000),    # mismatch vs struk 1.1jt
    ("2024-01-22", "GOJEK GOCAR", 45_000),
    ("2024-01-24", "SHOPEE*8842JKT", 420_000),        # tanpa_struk
    ("2024-01-27", "GRAB* FOOD", 230_000),            # tanpa_struk
]


def buat_pdf(s: dict) -> Path:
    # A4 portrait + Courier (monospace) → tampak seperti struk, text-layer rapi
    # dan terbaca pdfplumber tanpa risiko overflow lebar.
    pdf = FPDF(format="A4")
    pdf.add_page()
    pdf.set_margins(20, 20, 20)
    GARIS = "=" * 36
    SUB = "-" * 36

    pdf.set_font("Courier", "B", 14)
    pdf.cell(0, 8, s["judul"], align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Courier", "", 10)
    pdf.cell(0, 5, s["alamat"], align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5, GARIS, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Tanggal : {s['tanggal']}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5, SUB, new_x="LMARGIN", new_y="NEXT")

    for nama, harga in s["item"]:
        if harga:
            pdf.cell(120, 6, nama)
            pdf.cell(50, 6, harga, align="R", new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.cell(0, 6, nama, new_x="LMARGIN", new_y="NEXT")

    pdf.cell(0, 5, SUB, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Courier", "B", 12)
    pdf.cell(120, 7, "TOTAL")
    pdf.cell(50, 7, f"Rp {s['total']}", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Courier", "", 10)
    pdf.cell(0, 5, SUB, new_x="LMARGIN", new_y="NEXT")

    for baris in s["footer"]:
        pdf.cell(0, 5, baris, align="C", new_x="LMARGIN", new_y="NEXT")

    path = FOLDER_PDF / s["file"]
    pdf.output(str(path))
    return path


def buat_csv() -> Path:
    saldo = 5_000_000
    baris = ["Tanggal,Keterangan,Debit,Kredit,Saldo"]
    for tgl, ket, debit in TRANSAKSI:
        saldo -= debit
        baris.append(f"{tgl},{ket},{debit},,{saldo}")
    FILE_CSV.write_text("\n".join(baris) + "\n", encoding="utf-8")
    return FILE_CSV


def main():
    FOLDER_PDF.mkdir(parents=True, exist_ok=True)
    for s in STRUK:
        buat_pdf(s)
    buat_csv()

    cocok = ["INDOMARET", "SHELL", "ALFAMART", "PLN", "GOJEK"]
    tanpa = [("ATM TARIK TUNAI", 1_000_000), ("SHOPEE", 420_000), ("GRAB FOOD", 230_000)]
    print("✅ Dataset demo PDF siap!")
    print(f"   Folder PDF : {FOLDER_PDF}")
    print(f"   Struk PDF  : {len(STRUK)} file (text-layer → AI nyata)")
    print(f"   Transaksi  : {len(TRANSAKSI)} baris")
    print(f"   Cocok      : {len(cocok)} ({', '.join(cocok)})")
    print(f"   Mismatch   : 1 (TOKOPEDIA — bank 1.250.000 vs struk 1.100.000)")
    total_tanpa = sum(n for _, n in tanpa)
    print(f"   Tanpa struk: {len(tanpa)} senilai Rp {total_tanpa:,.0f}".replace(",", "."))


if __name__ == "__main__":
    main()

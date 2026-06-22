<p align="center">
  <img src="assets/logo.png" width="120" alt="LedgerLens logo" />
</p>

<h1 align="center">LedgerLens</h1>

<p align="center">
  <b>Reconcile receipts &amp; bank statements — audit-ready in seconds, fully on your machine.</b>
</p>

---

## What it is

LedgerLens is an [Anna](https://anna.partners) App that reconciles purchase
receipts against a bank statement — the tedious monthly chore behind every tax
filing. Point it at a local folder of receipts and a bank statement CSV, click
once, and the AI reads each receipt, matches it to the right bank transaction,
flags amount mismatches and transactions with **no receipt at all**, and gives
you the bottom line:

> **"3 transactions worth Rp 1,650,000 have no proof = tax audit risk."**

Everything runs locally through Anna's Executa — your financial data never leaves
your computer. A persistent vendor memory makes categorization smarter every month.

## Who it's for

Freelancers, small-shop owners, and online sellers who keep their own books and
need a clean, audit-ready summary — without uploading sensitive data to the cloud
or paying for heavyweight accounting software.

## How it works

```
You enter a receipt folder path + a bank CSV path
        │
        ▼
[Executa]  scan folder · parse bank CSV · load vendor memory
        │
        ▼
[AI]  read each receipt (llm.complete) → extract vendor / date / amount
[AI]  match receipt ↔ bank transaction (vendor fuzzy · amount ±5% · date ±2d)
[AI]  label: matched / no-receipt / ambiguous / mismatch
        │
        ▼
[App UI]  summary dashboard + exception-based review queue
        │
        ▼
You confirm a category → vendor memory learns it for next month
```

The UI button triggers the AI directly (UI → Executa reads files → LLM → results) —
no copy-pasting anything into a chat.

## Try it in one click

New here? Open the app and hit **"Try with sample data"** on the empty dashboard
to see a full reconciliation (5 matched / 1 mismatch / 3 missing receipts)
instantly — no folder setup required.

## Why it needs Anna

A web chatbot can't read a folder on your disk. LedgerLens couldn't exist without
Anna's primitives:

| Anna primitive | Used for |
|---|---|
| **Executa** (Python tool) | Local filesystem access — read a folder of receipts, parse the bank CSV |
| **`llm.complete`** | The extraction brain (vendor / date / amount from receipt text) |
| **`storage`** | Persistent vendor → category memory across sessions |
| **App UI** | Summary-first dashboard with a human-review queue |

## Install

LedgerLens ships as a downloadable **binary** Executa (macOS ARM64 + Linux x86_64),
so anyone can install it onto their Anna agent — no local dev setup needed. Install
it from the Anna App Store; the agent auto-downloads the right binary for your platform.

## Privacy

100% local processing. No financial data is sent to external servers.

## Roadmap

- **Gmail receipt auto-import** — most receipts/invoices live in your inbox; pull
  them in automatically instead of asking users to download files first.
- **Recurring-subscription detection** — flag the silent monthly charges (SaaS,
  streaming) people forget to cancel.
- **Vision OCR** for photographed/scanned receipts (today: text-layer PDFs, since
  `llm.complete` is text-only).
- Export to Excel/CSV; more bank formats; per-period filters.

## Build the binary from source

```bash
cd executas/ledgerlens
./package_binary.sh          # PyInstaller one-file build for the current platform
```

CI (`.github/workflows/build-binary.yml`) builds darwin-arm64 + linux-x86_64 and
attaches them to a GitHub Release on manual dispatch.

## Project layout

```
ledgerlens/
├── executas/ledgerlens/
│   ├── ledgerlens_plugin.py   # Executa: stdio JSON-RPC tool (file access, CSV, memory)
│   ├── executa.json           # Executa identity + Binary distribution config
│   └── package_binary.sh      # PyInstaller packaging
├── ui/                        # App UI (source) — index.html · app.js · styles.css
├── bundle/                    # App UI (shipped bundle; synced from ui/)
├── demo/struk_pdf/            # 6 text-layer PDF receipts + mutasi.csv (the 5/1/3 demo)
├── assets/logo.svg|png        # Brand logo
├── docs/SUBMISSION.md         # Hackathon submission write-up
├── manifest.json              # Anna App manifest (schema 2, declares host_api.llm)
└── .github/workflows/         # Multi-platform binary build
```

## License

MIT — free to use and modify.

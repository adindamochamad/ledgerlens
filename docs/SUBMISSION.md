# LedgerLens — Hackathon Submission

> Copy-paste ready. All public-facing text in English.

**App:** LedgerLens — Receipt & Bank Statement Reconciliation
**Platform:** Anna ("Build AI Apps for the Rest of Us")
**Repo:** https://github.com/adindamochamad/ledgerlens
**Tool ID:** `tool-adindamochamad-ledgerlens-r2zhgf93` (Binary distribution: macOS ARM64 + Linux x86_64)

---

## One-liner

Reconcile receipts & bank statements — audit-ready in seconds, fully on your machine.

## What I built

LedgerLens is an Anna App that reconciles purchase receipts against a bank
statement — the tedious monthly chore behind every tax filing. You point it at
a local folder of receipts (text-layer PDFs) and a bank statement CSV. With one
click, the AI reads each receipt, extracts vendor/date/amount, matches it to the
right bank transaction, flags amount mismatches and transactions with no receipt
at all, and surfaces the bottom line: **"3 transactions worth Rp 1,650,000 have
no proof = tax audit risk."**

Everything runs locally through Anna's Executa — receipts never leave the
machine. A persistent vendor memory means categorization gets smarter every month.

## Who it is for

Freelancers, small-shop owners, and online sellers who manage their own books and
need a clean, audit-ready summary — without uploading sensitive financial data to
a cloud service or paying for heavyweight accounting software.

## How AI is used (meaningfully)

1. **Extraction** — `anna.llm.complete` reads each receipt's text layer and pulls
   structured fields (vendor, date, amount). A deterministic fallback keeps results
   stable even when the model is flaky.
2. **Categorization** — vendor names are mapped to spending categories, learned and
   persisted across sessions.
3. **Matching** — each bank transaction is reconciled to a receipt via fuzzy vendor
   match + amount (±5%) + date (±2 days).
4. **Anomaly detection** — flags amount mismatches, and transactions with no receipt
   (the audit-risk headline).
5. **Human-in-the-loop** — ambiguous/mismatched items go to a review queue; one
   confirmation teaches the vendor memory for next month.

## How it connects to Anna (couldn't exist without it)

- **Executa (Python tool):** local filesystem access — reading a folder of receipts
  is something a web chatbot simply cannot do.
- **App UI:** a summary-first dashboard with an exception-based review queue.
- **`llm.complete`:** the extraction brain.
- **`storage`:** persistent vendor memory across sessions.
- The UI button triggers the AI directly (UI → Executa reads files → LLM → results) —
  no copy-pasting into a chat.

## Try it in one click

First-time users can hit **"Try with sample data"** on the empty dashboard to see a
full reconciliation (5 matched / 1 mismatch / 3 missing receipts) instantly — no
folder setup required.

## Roadmap

- **Gmail receipt auto-import** — most receipts/invoices live in your inbox; pull
  them in automatically instead of asking users to download files.
- **Recurring-subscription detection** — flag the silent monthly charges (SaaS,
  streaming) people forget to cancel.
- **Vision OCR** for photographed/scanned receipts (currently text-layer PDFs).

## Privacy

100% local processing. No financial data is sent to external servers.

---

## Demo video script (2 min)

See [demo/DEMO.md](../demo/DEMO.md). Fastest path for recording: open the app via
`anna-app dev`, click **"Try with sample data"**, walk through the dashboard →
Needs Review → Vendor Memory, and close on the local-first privacy point.

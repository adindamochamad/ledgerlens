# Demo Day — LedgerLens

**Status:** ✅ Selected Demo Day Finalist
**When:** Thursday, June 25, 2026 · 11:59 AM ET (New York)
**Format:** Live showcase + guest judges, ~1 hour shared across projects → **keep the live demo to 2–3 minutes.**

---

## 1. The live demo — bulletproof path

Slots are short and the live network/harness has been flaky (session 500s). Lead
with the path that **cannot fail**: a local static server + the one-click sample data.

```bash
cd /Users/mac/Development/ledgerlens/bundle
python3 -m http.server 5180     # then open http://localhost:5180
```

- No network, no Anna session, no LLM call → it always renders.
- **Always have the video queued as backup:** https://youtu.be/ZyvRNoM7QXU
  (if anything breaks live, play it and keep talking.)

> Honesty note: "Try with sample data" is a canned dataset for instant onboarding.
> If a judge asks to see the *real* AI, be ready to run a live PDF reconciliation
> (`anna-app dev` on `demo/struk_pdf/`) — say plainly that the sample button is for
> speed, and the real pipeline uses `anna.llm.complete` on the receipt text.

### Run of show (~2.5 min)
1. **(0:10) Hook** — "Every freelancer dreads tax season: a folder of receipts, a bank statement, hours of matching by hand."
2. **(0:15) One click** — hit **Try with sample data** → dashboard fills: 5 matched, 1 mismatch, 3 with no receipt.
3. **(0:15) The headline** — point to the red banner: "Rp 1,650,000 of spending has no proof = tax audit risk, surfaced automatically."
4. **(0:25) Human + memory** — open **Needs Review**, confirm a category → open **Vendor Memory** ("it remembers this vendor next month").
5. **(0:15) Close** — "100% local, powered by Anna. A web chatbot can't read a folder on your machine — LedgerLens can. An app for the rest of us."

---

## 2. 30-second pitch (intro / if asked "what is it?")

> LedgerLens is a local-first Anna App that reconciles your receipts against your
> bank statement — the chore behind every tax filing. Point it at a folder and a
> bank CSV, click once, and the AI matches each transaction to its receipt and
> flags the ones with no proof. Your financial data never leaves your machine.

---

## 3. Anticipated judge questions (mapped to the 5 pillars)

- **Meaningful AI?** "Real AI — `anna.llm.complete` extracts vendor, date and amount
  from each receipt's text; fuzzy matching reconciles them; a deterministic fallback
  keeps it stable when the model is flaky."
- **Working demo / Fit with Anna?** "It needs local file access — only possible
  through Anna's Executa. It ships as a downloadable binary so anyone can install it."
- **User value / market?** "Freelancers and small businesses, starting with Indonesian
  UMKM — millions who do their own books and dread audit season."
- **Scanned/photo receipts?** "Today it reads text-layer PDFs (`llm.complete` is
  text-only). Vision OCR for photos is on the roadmap."
- **Privacy?** "100% local processing — nothing is sent to external servers."
- **Roadmap / why you'll keep going?** "Gmail receipt auto-import and recurring-
  subscription detection — the silent charges people forget to cancel."

---

## 4. Pre-stream checklist

- [ ] Prep Form submitted
- [ ] `python3 -m http.server 5180` running, **Try with sample data** verified
- [ ] Vendor Memory seeded (Indomaret, Gojek) so that tab isn't empty
- [ ] YouTube demo video open in a tab as backup
- [ ] `anna-app apps status ledgerlens` → still `published` (v0.7.0)
- [ ] Browser zoom up for stream readability; close notifications / noisy apps
- [ ] Rehearse the run-of-show once out loud (fits in ~2.5 min)

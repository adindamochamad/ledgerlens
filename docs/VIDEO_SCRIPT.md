# LedgerLens — Demo Video Voiceover Script

For AI text-to-speech (ElevenLabs). Written to be **spoken**: no symbols, no
markdown, numbers spelled out so the TTS reads them naturally. Target length
~90 seconds (comfortably under 2 minutes).

---

## 1. Paste-ready voiceover (copy this whole block into ElevenLabs)

> Every freelancer and small business owner knows this pain. A folder full of receipts, a bank statement, and hours of matching them by hand before tax season.
>
> LedgerLens does it in seconds.
>
> Watch. I'll click "Try with sample data" — no setup needed. Instantly, every transaction is reconciled. Five matched to their receipts, one amount mismatch, and three with no receipt at all.
>
> And here's the number that matters: one point six five million rupiah in spending has no proof behind it. That's a tax audit risk, surfaced automatically.
>
> Behind the scenes, the AI reads each receipt, pulls out the vendor, the date, and the amount, and matches it to the right bank transaction. When something doesn't add up, it doesn't guess. It sends it to a review queue.
>
> I confirm the category once... and LedgerLens remembers that vendor for next month. It gets smarter every time you use it.
>
> And the best part? Everything runs locally, through Anna. Your financial data never leaves your machine. A web chatbot can't open a folder on your computer. LedgerLens can.
>
> That's an app for the rest of us.

---

## 2. Scene-by-scene (match screen recording to the voiceover)

| # | On screen | Voiceover line | ~Time |
|---|-----------|----------------|-------|
| 1 | App open, empty dashboard | "Every freelancer… before tax season." | 0:00–0:12 |
| 2 | Cursor hovers the button | "LedgerLens does it in seconds." | 0:12–0:16 |
| 3 | Click **Try with sample data**, dashboard fills | "Watch. I'll click Try with sample data… three with no receipt at all." | 0:16–0:34 |
| 4 | Point to the red audit-risk banner | "And here's the number that matters… surfaced automatically." | 0:34–0:48 |
| 5 | Scroll the All Transactions table | "Behind the scenes, the AI reads each receipt… sends it to a review queue." | 0:48–1:08 |
| 6 | Open **Needs Review** tab, click a category | "I confirm the category once…" | 1:08–1:18 |
| 7 | Open **Vendor Memory** tab (shows saved vendor) | "…and LedgerLens remembers that vendor for next month. It gets smarter every time you use it." | 1:18–1:28 |
| 8 | Back to dashboard / Local-first chip in header | "And the best part? Everything runs locally, through Anna… LedgerLens can." | 1:28–1:42 |
| 9 | Logo / app name end card | "That's an app for the rest of us." | 1:42–1:46 |

---

## 3. ElevenLabs tips

- **Voice:** pick a warm, clear narrator (e.g. "Brian", "Adam", or "Rachel").
  Avoid overly dramatic voices — this is a product demo.
- **Settings:** Stability ~50, Similarity ~75, Style low. Keeps it natural and even.
- **Pauses:** the `...` in the script create natural beats — keep them.
- **Pronunciation:** if it mispronounces the app name, change "LedgerLens" to
  "Ledger Lens" (two words) in the input.
- **Pacing:** if the voice runs faster than the screen actions, add a line break
  between paragraphs (ElevenLabs treats it as a short pause) or record the VO first
  and edit the screen capture to match it.

## 4. Recording the screen (no narration needed live)

```bash
cd /Users/mac/Development/ledgerlens
anna-app dev   # open the printed localhost URL
```

Record silently with QuickTime (File → New Screen Recording) or `Cmd+Shift+5`,
then drop the ElevenLabs audio on top in iMovie / CapCut. Vendor memory is already
seeded (Indomaret, Gojek) so the Vendor Memory tab won't be empty.

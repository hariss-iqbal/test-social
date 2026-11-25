# On-screen text: calm, step-by-step reading (DEFAULT for every what-if video)

The owner's rule (Hiroshima what-if, Oct 2026): text must never feel rushed or hide the view.
The viewer reads ONE thing at a time, at a normal reading speed, and every line stays on screen
long enough to finish it. The renderer (`src/whatif/WhatIfVideo.tsx`) and the timeline builder
(`pipeline/whatif/timeline.py`) already implement this; writers and directors must plan beats that fit it.

## Reading order inside every beat
1. **HUD block first** (top-left, y ≈ 560): label fades in → value appears (+0.47 s) → sub line word by word (+1.1 s, ~0.27 s/word).
2. **Then the caption** (y ≈ 1170), word by word at ~0.47 s/word (≈ 2 words/s), each word softly fading up.
3. **Hold:** the finished caption stays fully visible for **2 s**, then fades out slowly (~0.7 s). Never cut it off right after the last word.
4. HUD and caption never change at the same time. A `continue: true` HUD keeps its block and only re-reveals its new sub line.

## Look
- Small type: caption 48 px Montserrat ExtraBold, HUD label 21 px / value 54 px / sub 22 px, HUD max width 620 px. The 3D view stays the star.
- **Captions: no background box and no white text** (owner's rule, Oct 2026). Multi-colour words with a thick dark outline + soft shadow, readable over bright sky, the white flash, fire or dust:
  - base words: warm yellow `#ffe45c`
  - any word with a digit (numbers, times, km, %): orange `#ff9a3c` (automatic)
  - `*emphasis*` words: cyan `#5ce1ff`. Mark them in `scenario.json` with asterisks: `a *bomb* drops`, `A *second sun.*` (spans may cover several words). Use 0–2 per caption, only on the word that carries the punch; the asterisks are not shown.
- The HUD block keeps its dark box (≈ 68 % opacity with blur).
- Title card 76 px; end card identical to the title (loop).

## Timing the beat (enforced: the build fails if a beat is too short)
```
beat ≥ hud_lead + (14 × caption_words + 12) / 30 + 2.0 + 0.7   seconds
hud_lead  = new HUD block:  (34 + 8 × sub_words + 12) / 30 + 0.4   (no sub: 1.4 s)
            continued HUD:  (10 + 8 × sub_words + 10) / 30 + 0.4   (same sub: 0.4 s)
```
Rule of thumb: a 6-word caption with a short HUD ≈ 6.5–7.5 s; with no HUD sub ≈ 6 s.
Compute durations from `pipeline.whatif.timeline.hud_lead` / `MIN_READ` rather than guessing.

## Writing for it
- Captions ≤ 9 words (usually 4–7). HUD subs are OPTIONAL and ≤ 5 words; drop a sub when it repeats the caption.
  Only keep subs that carry the twist or a number the caption doesn't say.
- One idea per beat. Fewer, longer beats beat many quick ones.
- Calm pace makes videos longer: `full` ≈ 75–110 s, `short` ≈ 35–50 s. If it runs long, cut whole beats
  (weakest first) instead of speeding the text up.
- Countdowns still must hit zero on the event: rate = start_s / (sum of the beat durations it spans),
  recomputed after the final durations are known. Label sped-up/slowed clocks in the HUD label
  ("BOMB FALLING · SPED UP", "BLAST ARRIVES IN · SLOWED") instead of a sub.

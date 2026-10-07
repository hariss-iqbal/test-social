# Gap plan: what we change after the faceless-channel research (2026-09-27)

Sources: `research/faceless-truecrime-channels.md` (14 true-crime/mystery channels), `research/faceless-shorts-top-channels.md` (10 biggest faceless Shorts channels, frame measurements), `research/reveal-signposts.md`.

| # | Gap (evidence) | Decision | Where |
|---|---|---|---|
| G1 | Loop endings: last line/frame flows into the first (Zack D. 21.9 M, Kurzgesagt 20 M, Mr Nightmare). Ours ends on ~3 s of silence. | Spine gets `loop_line`: the final line is a complete sentence (STYLE §2) that hands over into b01 on replay. Name card moves INTO the final line (portrait + name at the top), `end_hold_s` default 0.4. QC measures first/last frame similarity. | STYLE §2, script-writer, story-auditor, config END_HOLD_S, qc.py, timeline/renderer |
| G2 | First second: frame 1 shows a subject doing something; first words = subject + verb. Ours: 3 text layers on frame 1 and "For sixteen years," | Checker rejects an opening time/place phrase. Hook text ≤ 6 words. SOURCE line of the first shot waits until the hook ends. Director: first shot has motion (footage or a move). | checks.py, renderer, video-director |
| G3 | Pace: top channels 200–275 wpm; ours 140 wpm (and 0.38 s gaps after every sentence). | Target 2.8–3.2 words/s (~170–190 wpm; calmer than 260 because of real victims). BEAT_GAP_MS 380 → 240; ≤ 1 long pause (the pre-reveal). Edge stand-in rate +6 %. Voice stage warns below 2.8 w/s. Duration target 55–75 s. | config.py, voice.py, STYLE §4 |
| G4 | Reveal signposts (MrBallen, LEMMiNO, Casefile). | Done: `C.REVEAL_SIGNPOSTS`, start-of-climax check, hype phrases rejected. | checks.py, config.py |
| G5 | Cover = one focal image + 1–4 words, one red keyword, often a red circle. Title: short, withholds the answer. Ours: frame 1 with 3 layers; 12-word title that spoils. | `edl.cover` {material, focus, text ≤ 4 words, keyword, circle?} rendered by a Remotion `Cover` composition → out/vN/cover.jpg. `publish.titles`: 3 variants ≤ 8 words, no reveal; checker enforces. | renderer, run.py export, checks.py |
| G6 | Evidence callouts (Coffeehouse Crime's red circles/boxes). | Shot field `callout` {rect [x,y,w,h] normalized to the source, shape circle|box, at_s}: animated red ring/box drawn on the picture. | timeline.py, renderer, video-director |
| G7 | Series identity + comment loop (Nexpo [2], MSA, Mr Nightmare; Zack D. comment triggers). | `publish.series`, `publish.episode`, `publish.comment_prompt` (a question the facts leave genuinely open; never an insinuation), `publish.pinned_comment` → publish.md. `C.CHANNEL_MARK` (small top-left wordmark) exists but stays OFF until the owner picks a channel name. | config.py, run.py export, script-writer |
| G8 | Picture change rate (Zack D. 7–10 / 10 s; ours 4.4; slow 43–50 s stretch). | QC metric: picture changes per 10 s + warn on any 5 s window without a new picture. Director rule: explaining stretches change picture every ≤ 2.5 s. | qc.py, video-director |
| G9 | Caption style: documentary sentence-case captions everywhere among the biggest channels. | Add `caption_style: "doc"` preset for an A/B test; default stays (our captions research + four panels liked the current one). | renderer, captions-style.md |
| G10 | Real archival audio, a 45–60 s YouTube cut, foley, test-posting variants, cadence. | Not now: logged as next experiments (need rights/data). | ITERATIONS |

We keep what we already do better than most of these channels: sources on screen (just not on frame 1), victim dignity, no hype.

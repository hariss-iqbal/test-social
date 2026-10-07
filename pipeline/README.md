# Short-video pipeline

Agents make the creative decisions and code does the production. Every stage reads files, writes one file, and has a check, so any stage can be run, verified and re-run on its own.

```
research.json ─► catalog.json + materials/ ─► script.json ─► edl.json ─► build/ (voice, timeline, render) ─► out/vN/final.mp4
  researcher        visual-curator            script-writer   video-director     pipeline.run produce            video-critic
  check research    (+ material-generator)    + script-critic check edl +        (voice→timeline→render→         reads qc.json +
                    check catalog             check script    timeline dry-run   mix→qc→export)                  contact sheets
```

| File | Owner | Contract (enforced in `checks.py`) |
|---|---|---|
| `research.json` | researcher | ≥ 5 timeline entries, ≥ 8 key facts all with source URLs, ≥ 4 source domains |
| `catalog.json` | visual-curator / material-generator | every file exists, is readable and vision-verified, with rights/risk/burned-in-text fields |
| `script.json` | script-writer (+ critic) | 5–14 beats, 120–175 words, hook first and ≤ 22 words, on-screen hook ≤ 8 words |
| `edl.json` | video-director | beats match the script, materials in the catalog, cue words actually spoken in order, valid enums/crops |
| `build/alignment.json` | code (`voice`) | word timings from the TTS engine itself |
| `build/timeline.json` | code (`timeline`) | frame-exact shots/captions/overlays; errors on shots that are too long, over-upscaled, or out of footage |
| `out/vN/qc.json` | code (`qc`) | duration, loudness (-14 LUFS), black/frozen/letterboxed frames, caption coverage, sharpness |
| `out/vN/video_review.json` | video-critic | PUBLISH / REVISE + fixes addressed to file + id |

Commands: `python3 -m pipeline.run` (no args prints help). Creative rules: `STYLE.md`. Numbers: `config.py`.

Key design choices (why the old pipeline failed):
- **Timing comes from the voice.** Each beat is synthesized separately, and the engine's own word timestamps drive cuts (`cue` words) and captions. No word-count estimates, no Whisper drift, no cut-off endings.
- **One render, one encode.** Remotion renders the silent picture once (CRF 15). Audio is mixed in numpy (sample-exact ducking and SFX) and loudness-normalized in two passes, then muxed with a stream copy.
- **Landscape and low-res never letterbox.** `contain_blur` puts the picture on a blurred fill, and baked-in black borders are auto-cropped.
- **Caches:** TTS per beat (text + voice hash), render per timeline hash. Re-running after a small change is cheap.
- **Voice:** ElevenLabs `/with-timestamps` when `ELEVENLABS_API_KEY` is a real `sk_` key, else edge-tts with WordBoundary events. `audition` casts an edge voice by clarity/pitch/pace.
- **Music:** CC-BY tracks in `assets/music` with mood tags and energy maps. Attribution is written into `publish.md` automatically.

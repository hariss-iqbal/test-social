# Faceless short-video pipelines

Two pipelines share this repo. Pick by the request:

| Request | Pipeline | Entry |
|---|---|---|
| A real story / case / history told with narration ("make a story video about X") | **story** (voiceover + archival visuals, Remotion `src/short/`) | follow `.claude/agents/orchestrator.md` (stages: researcher → visual-curator → material-generator → script-writer → script-critic → story-auditor → voice → video-director → `python3 -m pipeline.run produce` → compliance-auditor → video-critic → doomscroll-viewer) |
| "What if …?" hypotheticals (no voiceover, one continuous 3D world) | **whatif** (three.js city/cosmic engine, `src/whatif/`) | whatif-researcher → whatif-writer (`scenario.json`) → world-director (`world.json`) → `python3 -m pipeline.whatif.run produce topics/<slug>` |

## Defaults that are owner rules (apply without being asked)
- **What-if on-screen text is calm and step by step:** HUD block first, then the caption word by word (~2 words/s), 2 s hold, slow fade; small type; captions have NO box and NO white: multi-colour outlined words (yellow base, numbers orange, `*emphasis*` cyan). Rules and timing formula: `pipeline/whatif/TEXT.md` (implemented in `src/whatif/WhatIfVideo.tsx` + `pipeline/whatif/timeline.py`). Never speed text up to shorten a video; cut beats instead.
- **Real disasters / real victims:** truthful human impact without gore; no myths; death tolls as ranges or "about".
- Long-form story videos (> 78 s) put per-topic limit overrides in `topics/<slug>/limits.json` (read by `pipeline/util.py`), never by editing `pipeline/config.py`.

## Practical notes
- Voice: ElevenLabs "Roger" when `.env` has `ELEVENLABS_API_KEY=sk_…`, otherwise edge-tts (keep `edge-tts` up to date; old versions get HTTP 403).
- Renders call `npx tsx`; if `~/.npm` has root-owned files, run with `npm_config_cache=<scratch dir>` or fix once with `sudo chown -R 501:20 ~/.npm`.

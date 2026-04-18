# MoneyPrinterTurbo — TTS Audio Engine

## Role in Pipeline

MoneyPrinterTurbo runs in Docker but its `/api/v1/audio` endpoint has a **known bug** (`AttributeError: 'AudioRequest' object has no attribute 'video_concat_mode'`) that causes tasks to get stuck at 5%.

**Primary TTS method: ElevenLabs API** (if `ELEVENLABS_API_KEY` is set) — production-quality natural voices:
```bash
curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "{narration}",
    "model_id": "eleven_multilingual_v2",
    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.3}
  }' --output audio.mp3
```

**Recommended ElevenLabs voices for true crime/documentary:**
- **Adam** (`pNInz6obpgDQGcFmaJgB`) — deep, authoritative
- **Antoni** (`ErXwobaYiN019PkySvjV`) — warm, storyteller
- **Josh** (`TxGEqnHWrfWFTfGW9XjX`) — contemplative, mystery

Cost: ~$0.01-0.03 per video. Starter plan ($5/mo) covers ~100+ videos.

**Fallback TTS method: `edge-tts` CLI** — use when no ElevenLabs key is set:
```bash
edge-tts --voice "en-US-ChristopherNeural" --rate "+0%" --volume "+0%" \
  --file narration.txt --write-media audio.mp3 --write-subtitles subs.vtt
```
This is instant (no polling) and uses the same Azure edge-tts engine that MoneyPrinterTurbo wraps.

**What we don't use**: `POST /api/v1/videos` — its renderer has no concept of "show this image during this sentence."

Video composition is handled by the video-producer agent using FFmpeg for per-scene assembly with Whisper timestamps.

## Prerequisites

MoneyPrinterTurbo must be running before calling the API.

### Starting the Environment

```bash
cd /Users/haris/MoneyPrinterTurbo
docker-compose up -d
```

Verify it's running:
```bash
curl -s http://localhost:8080/api/v1/health || echo "NOT RUNNING"
```

### Default Configuration
- **API Base URL**: `http://localhost:8080`
- **Storage**: `/Users/haris/MoneyPrinterTurbo/storage/`

---

## API Reference

### Primary: ElevenLabs API (Best Quality)

Use ElevenLabs when `ELEVENLABS_API_KEY` is set in the environment:

```bash
# Generate audio via ElevenLabs
VOICE_ID="pNInz6obpgDQGcFmaJgB"  # Adam (deep, authoritative) — see voice list above
curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"$(cat narration.txt)\",
    \"model_id\": \"eleven_multilingual_v2\",
    \"voice_settings\": {\"stability\": 0.5, \"similarity_boost\": 0.75, \"style\": 0.3}
  }" --output audio.mp3
```

Output is immediate — `audio.mp3` is written directly. No subtitles generated (use Whisper for timestamps).

### Fallback: edge-tts CLI

Use `edge-tts` when no ElevenLabs key is available — no Docker needed, no polling, instant results:

```bash
# Install if needed
pip install edge-tts

# Generate audio + subtitles
edge-tts --voice "en-US-ChristopherNeural" --rate "+0%" --volume "+0%" \
  --file narration.txt \
  --write-media audio.mp3 \
  --write-subtitles subs.vtt
```

Output is immediate — `audio.mp3` and `subs.vtt` are written directly.

### Legacy: MoneyPrinterTurbo API (Currently Broken)

⚠ **Known bug**: `POST /api/v1/audio` throws `AttributeError: 'AudioRequest' object has no attribute 'video_concat_mode'`. Tasks get stuck at 5% (state: 4) indefinitely. Do NOT use this endpoint until the bug is fixed.

If the API bug is eventually fixed, the endpoint is:

**POST** `http://localhost:8080/api/v1/audio`
```json
{
  "video_script": "Plain narration text",
  "voice_name": "en-US-ChristopherNeural-Male",
  "voice_rate": 1.0,
  "voice_volume": 1.0,
  "bgm_type": "none",
  "bgm_volume": 0.0
}
```

**GET** `http://localhost:8080/api/v1/tasks/{task_id}` — states: `4` processing, `1` complete, `-1` failed.

---

## Payload Construction from Pipeline Output

### Extracting narration from script.md

The script contains visual tags that must be stripped to get plain narration for TTS:
- Remove lines matching `[VISUAL: ...]`
- Remove lines matching `[VISUAL GAP: ...]`
- Remove lines matching `[TEXT OVERLAY: ...]`
- Remove the `# Title` heading
- Join remaining non-empty lines with spaces as the `video_script`

**Important**: Keep sentences natural and flowing. Do NOT fragment into short phrases — TTS reads the script directly, so sentence structure = audio pacing.

---

## Voice Options

### ElevenLabs Voices (Primary — when API key available)
- **Adam** (`pNInz6obpgDQGcFmaJgB`) — deep, authoritative **← recommended for true crime**
- **Antoni** (`ErXwobaYiN019PkySvjV`) — warm, storyteller
- **Josh** (`TxGEqnHWrfWFTfGW9XjX`) — contemplative, mystery

### edge-tts Voices (Fallback — Azure edge-tts)
- `en-US-ChristopherNeural-Male` — deep, authoritative (good for true crime) **← default fallback**
- `en-US-GuyNeural-Male` — casual, warm
- `en-US-JennyNeural-Female` — clear, professional
- `en-US-AriaNeural-Female` — expressive, engaging

Rate (edge-tts only): `1.0` = normal, `0.8` = slower/dramatic, `1.2` = faster/energetic

---

## Video Length Constraint

**CRITICAL**: Target video length is **60-90 seconds**. Word count controls duration at ~150 words/minute:
- 150-225 words → 60-90 seconds ✓ (target range)
- 226-300 words → 90-120 seconds ⚠ (too long, but won't abort)
- 300+ words → ✗ video producer will abort (way too long)

---

## Troubleshooting

**Task stuck**: Check container:
```bash
docker exec moneyprinterturbo-api ps aux | grep ffmpeg
```

If dead, restart:
```bash
docker restart moneyprinterturbo-api
```

**edge-tts voice not found**: Check available voices — the voice name format is `{locale}-{Name}Neural-{Gender}`. If a voice is removed from Azure, fall back to `en-US-GuyNeural-Male`.

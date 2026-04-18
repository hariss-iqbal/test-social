# E2E Automated Storytelling Video Pipeline

## Vision

Build a fully automated pipeline that discovers compelling stories (unsolved mysteries, true crime, extraordinary people), researches them, writes scripts, gathers real visual materials, generates narrated videos with subtitles, and publishes across YouTube, TikTok, and Instagram.

The key differentiator from existing tools (Faceless.so, Videnly, Revid.ai) is **authenticity** — using real photos, real CCTV footage, real documents instead of generic stock footage or AI-generated images.

---

## How We Got Here

### The Idea (from Claude App discussion)

Started with the observation that YouTube/Instagram creators make documentary-style videos about unsolved cases with transcriptions, screenshots, and real footage. The question: **can we automate this with Claude agent teams, the same way we use them for coding?**

### Agent Pipeline Design

We designed a multi-agent pipeline where each agent specializes in a different part:

```
[Discovery Agent] — finds new cases from web/Reddit/news
      ↓
[Categorizer Agent] — assigns: unsolved | murder | extraordinary | unthinkable
      ↓
[Log Checker] — checks MD file, skips duplicates
      ↓
[Scoring Agent] — rates case 1-10 on producibility, only 7+ proceed
      ↓
[Research Agent] — web search, extracts verified facts with sources
      ↓
[Timeline Builder] — organizes chronologically, marks key chapters
      ↓
[Script Writer] — writes narration with [VISUAL CUE] tags per scene
      → Master script (8-15 min)
      → Short clip scripts (30-60 sec hooks)
      ↓
[Human Review] ← initially manual
      ↓
[Voiceover Agent] — ElevenLabs API
      ↓
[Visual Curator] — maps real images/footage to script timestamps
      ↓
[Video Assembly Agent] — Shotstack API or MoneyPrinterTurbo
      → YouTube 16:9 master
      → TikTok/Reels/Shorts 9:16 cuts
      ↓
[Caption Burner] — auto subtitles via Whisper
      ↓
[MD Log Updater] — writes new entry to covered cases file
      ↓
[Output: Platform-ready videos]
```

### Content Categories

One codebase, multiple "verticals" — each with different tone/style prompts:

| Category | Examples | Tone | Audience |
|---|---|---|---|
| Unsolved Mysteries | Disappearances, cold cases | Suspenseful, curious | Mystery lovers |
| True Crime / Murders | Serial killers, famous cases | Dark, investigative | True crime community |
| Extraordinary People | Someone who did something unusual | Surprising, human | General audience |
| The Unthinkable | Extreme acts, shocking stories | Intense, disturbing | Mature audiences |

Strategy: Start with ONE category (Unsolved Mysteries), get the pipeline working, then expand.

### Platform Strategy — "Core + Clips"

Produce one master video and cut platform-specific versions:

| Platform | Format | Ideal Length | Purpose |
|---|---|---|---|
| YouTube | Long form 16:9 | 8-15 mins | Full story, ad revenue |
| YouTube Shorts | Vertical 9:16 | 60 sec | Hook into full video |
| TikTok | Vertical 9:16 | 3-5 mins | Storytelling sweet spot |
| Instagram Reels | Vertical 9:16 | 30-60 sec | Discovery, reach |

### Cost Estimate

~$0.70-$1.50 per video at scale:
- Claude API (Sonnet): ~$0.10-$0.30
- ElevenLabs voiceover: ~$0.50-$1.00
- Image search: ~$0.05-$0.10
- Video assembly (self-hosted FFmpeg): ~$0
- Storage: ~$0.05

At 50 videos/month: ~$40-$80/month in API costs.

### Key Design Decisions

1. **Manual trigger initially**, add scheduling later
2. **Human review step** before publishing
3. **MD log file** for tracking covered cases (lightweight, git-controllable)
4. **Hybrid visual approach**: real scraped images + Ken Burns effect on stills + real CCTV footage + text overlays as fallback
5. **MoneyPrinterTurbo as video assembly backend**, Claude as the intelligence layer on top

### Orchestration: Claude as Orchestrator (Option B)

Claude acts as the orchestrator — spawns agents, evaluates intermediate results, makes judgment calls, and decides what to run next.

**Why Option B over Python orchestrator:**
- Adaptive — can evaluate results quality and pivot (e.g., "only 3 images found, adjust script to be shorter")
- Handles edge cases without pre-coding every branch
- Natural language control — "focus on the hotel's history" just works
- Error recovery — recognizes bad results and retries with different strategy

**Execution flow:**
```
[Claude Orchestrator] receives topic
        │
        ├── spawns in parallel ──┐──────────────────┐
        │                        │                   │
   [Research Agent]    [Visual Curator Agent]  [Reference Agent]
        │                        │                   │
        └── collects all ────────┴───────────────────┘
        │
        ├── evaluates: enough materials? research quality?
        │   └── if not → spawns targeted follow-up searches
        │
        ├── [Script Writer Agent] ← gets research + materials catalog
        │
        ├── spawns in parallel ──┐
        │                        │
   [Gap Filler Agent]    [TTS/Voiceover Agent]
        │                        │
        └── collects both ───────┘
        │
        ├── [MoviePy Assembly] ← per-scene timed video
        │
        └── Output: platform-ready video
```

**Cost tradeoff:** ~$0.10-0.30 extra per video for orchestration decisions. Acceptable at POC/early scale. Can optimize later by hardcoding proven-stable decision paths.

### Scaling Path

```
POC          → Manual topic, one video
Phase 2      → Visual Curator + Script Writer agents, per-scene FFmpeg assembly (WE ARE HERE)
Phase 3      → Claude orchestrator, full pipeline E2E
Phase 4      → Add Discovery Agent, automated topic finding
Phase 5      → Add MD log, duplicate detection, Scoring Agent
Phase 6      → Multi-platform export (9:16 cuts)
Phase 7      → Add scheduling, fully automated
```

---

## POC Results

### POC 1: Mary Celeste (historical topic)

**Result**: Video generated but exposed two problems:
- Pexels stock footage is completely irrelevant for specific historical topics (shows generic ocean waves for "ghost ship")
- Whisper `large-v3` too slow on CPU, `tiny` had bad timestamps

**Lesson**: Stock footage doesn't work for storytelling. Need real images.

### POC 2: Mary Celeste with real images

**What we did**: Downloaded real historical images (ship painting, captain portraits) from allthatsinteresting.com and Wikimedia. Applied Ken Burns zoom effect to convert stills to video clips. Used `video_source: "local"` mode.

**Result**: Dramatically more relevant. Proved the hybrid approach works.

**Lesson**: Real images + Ken Burns > generic stock footage. Whisper `base` model is the sweet spot for speed/quality.

### POC 3: Elisa Lam (modern case with real CCTV)

**What we did**: Full E2E test.
- Searched web for case materials
- Downloaded: Elisa's portrait, Cecil Hotel exterior, water tank rescue photo, rooftop photo from allthatsinteresting.com
- Downloaded actual elevator CCTV surveillance video from Internet Archive
- Extracted 3 key moments from CCTV as video clips
- Converted still images to Ken Burns clips
- Generated narration audio with gTTS
- Assembled via MoneyPrinterTurbo API with local materials + Whisper subtitles

**Result**: 47-second video with real CCTV footage mixed with real photos, fully subtitled. Much more engaging than Mary Celeste.

**Issues found**:
- gTTS voice is robotic (need ElevenLabs for production)
- Video clips have slight instability/shaking — needs stabilization
- When audio is longer than materials, pipeline loops clips causing narrative-visual mismatch (e.g., shows water tank photo during "strange gestures" narration)
- No text overlays for names/dates
- Background music is random, not mood-matched

### POC 4: Elisa Lam — stabilized clips + freeze-frame fix

**What changed**:
- Fixed Ken Burns jitter: scale source image to 2880x1620 first (1.5x overscale), then zoompan down to 1920x1080. This eliminates sub-pixel interpolation artifacts. Used smoother zoom curve (`1.0+on*0.0003` instead of aggressive `min(zoom+0.0015,1.3)`).
- Fixed CCTV upscaling: used `lanczos` scaling algorithm + `unsharp` filter for cleaner 176x144 → 1920x1080 upscale.
- Fixed looping: replaced clip-looping with freeze-frame extension. When audio is longer than total clip duration, the **last clip's final frame is frozen** to fill remaining time instead of looping from the beginning. This prevents narrative-visual mismatch.

**Result**: Last clip extended from 5s to 16.7s (freeze on Cecil Hotel rooftop) while narrating "The question that haunts investigators... How did she get inside?" — much more appropriate than looping back to Elisa's portrait.

### Bugs Fixed in MoneyPrinterTurbo

1. **`video_transition_mode` None crash** (`app/services/video.py:197`) — When no transition mode is specified, `video_transition_mode.value` crashes because it's `None`. Added guard: `if video_transition_mode is None or ...`

2. **Subtitles disabled with custom audio** (`app/services/task.py:133`) — When `custom_audio_file` is used, `sub_maker` is `None`, causing subtitle generation to be skipped entirely. Fixed to fall through to Whisper transcription when `sub_maker is None` but `subtitle_enabled` is `True`.

3. **Clip looping causes narrative mismatch** (`app/services/video.py:232`) — When audio > video duration, clips looped from the start showing wrong visuals for later narration. Replaced with freeze-frame: extends last clip by holding its final frame for the remaining duration.

4. **Ken Burns jitter** (ffmpeg filter) — Zoompan on source-resolution images caused sub-pixel jitter. Fixed by overscaling source to 1.5x target resolution before applying zoompan, and using smoother zoom curve.

---

## Video Assembly Approach: MoviePy + Timestamps (Option 3)

### The Problem

MoneyPrinterTurbo treats visuals and narration as independent tracks — it assigns fixed 5-second clips sequentially regardless of what the narration is saying at that moment. This causes visual-narration mismatch (e.g., showing water tank photo while narrating "strange gestures in the elevator").

### Why MoviePy + Timestamps

We evaluated three approaches:

| Approach | Pros | Cons |
|---|---|---|
| Cloud APIs (Shotstack, JSON2Video) | Timeline JSON, hosted rendering | $25-50/mo, vendor lock-in, latency |
| Code-first (Remotion, Editly) | Programmatic control | Node.js dependency, Remotion needs React |
| **MoviePy + Whisper timestamps** | Pure Python, free, full control, already in our stack | Must build timeline logic ourselves |

**Decision: Option 3 (MoviePy)** — it's already a dependency in MoneyPrinterTurbo, gives us full programmatic control, and keeps everything in Python.

### How It Works

#### Phase A: Materials-First Gathering
1. Visual Curator agent searches for real images/footage for the topic
2. Each material is cataloged: `{file, description, duration, type (still/video), quality}`
3. This catalog becomes the input for script writing

#### Phase B: Script Writing Against Available Materials
1. Script Writer sees the materials catalog
2. Writes narration that matches available visuals — doesn't describe scenes we can't show
3. Marks gaps: `[VISUAL GAP: need image of X]`
4. Each script segment tagged with its intended visual: `[VISUAL: 03_cecil_hotel.jpg] The Cecil Hotel had a dark history...`

#### Phase C: Gap-Fill Search
1. For each `[VISUAL GAP]`, attempt a targeted search for that specific image
2. If found → add to catalog, update script tag
3. If not found → rewrite that narration segment to work with available visuals (e.g., use text overlay instead)

#### Phase D: Per-Scene Assembly with MoviePy
```python
# Pseudocode for the assembly logic
scenes = parse_script_with_visuals(script)  # [{text, visual_file, start_time, end_time}, ...]

# Generate narration audio
audio = generate_tts(full_script_text)

# Get per-sentence timestamps from Whisper
timestamps = whisper_transcribe(audio)  # [{text, start, end}, ...]

# Match timestamps to scenes
for scene in scenes:
    scene.start = timestamps[scene.sentence_index].start
    scene.end = timestamps[scene.sentence_index].end

# Build MoviePy timeline
clips = []
for scene in scenes:
    duration = scene.end - scene.start
    if scene.visual_type == "still":
        clip = ken_burns(scene.visual_file, duration)
    elif scene.visual_type == "video":
        clip = extract_segment(scene.visual_file, duration)
    else:  # text overlay fallback
        clip = text_overlay(scene.text_summary, duration)
    clips.append(clip.with_start(scene.start))

final = CompositeVideoClip(clips)
final = final.with_audio(AudioFileClip(audio))
# Add subtitles, background music, etc.
final.write_videofile("output.mp4")
```

#### Key Design Points
- **Whisper timestamps are the source of truth** for when each visual appears
- **Visuals stretch/compress** to match narration duration, not the other way around
- **Ken Burns on stills** fills any duration naturally (just adjust zoom speed)
- **Video clips** can be sped up/slowed down slightly or trimmed to fit
- **Text overlays** are the fallback when no visual exists for a scene
- **Background music** runs as a separate audio track, ducked under narration

### What This Replaces

This approach replaces MoneyPrinterTurbo's built-in video assembly for our pipeline. We'll still use MoneyPrinterTurbo for:
- Whisper subtitle generation
- LLM script generation (via its OpenAI-compatible Claude integration)
- Possibly its Ken Burns implementation

But the core assembly — placing visuals at specific timestamps — will be our own MoviePy code.

---

## Current Issues & Next Steps

### Remaining improvements
- Replace gTTS with ElevenLabs for natural voiceover
- Add text overlays (names, dates, locations) at key moments
- Mood-matched background music selection (suspenseful for mystery, etc.)
- Automate image/video sourcing (Visual Curator agent)
- Multi-platform export (9:16 vertical cuts)
- Investigate longer freeze-frame alternative: slow zoom on frozen frame, or crossfade to black
- Build per-scene MoviePy assembly (Option 3) to replace sequential clip placement

---

## Tech Stack

| Layer | Tool | Status |
|---|---|---|
| Video Assembly | MoviePy + Whisper timestamps (custom) | Planned — replaces MTP's sequential assembly |
| LLM | Claude via OpenAI-compatible API | Working |
| TTS | gTTS (POC) → ElevenLabs (production) | POC only |
| Subtitles | Whisper (base model, CPU) | Working |
| Stock Footage | Pexels API | Rejected — too generic |
| Real Images | Web scraping (allthatsinteresting, Wikimedia, Archive.org) | Manual POC done |
| Image → Video | FFmpeg Ken Burns zoom effect | Working |
| Agent Orchestration | Claude API + custom code | Not started |
| Workflow Orchestration | n8n (planned) | Not started |

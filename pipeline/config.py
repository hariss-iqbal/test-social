"""Pipeline-wide constants. Every stage and checker reads limits from here so
agents, checkers, and the renderer can never disagree about a number."""

WIDTH = 1080
HEIGHT = 1920
FPS = 30

# Script length. edge-tts / ElevenLabs narrate at ~2.6-2.9 words/s at the rates we use.
WORDS_MIN = 150
WORDS_MAX = 195
BEATS_MIN = 5
BEATS_MAX = 14
HOOK_MAX_WORDS = 22

# Final video length (seconds). Target 61-75s. All three platforms allow 3 min.
DURATION_MIN = 55   # G3: tighter pace (2.8-3.3 w/s) puts 150-195 words at ~55-70 s
DURATION_MAX = 78

# G3 pace: top faceless channels run 200-275 wpm; we target ~170-195 wpm (calmer: real victims).
PACE_MIN_WPS = 2.8
PACE_MAX_WPS = 3.3
PAUSE_LONG_MS = 700        # at most ONE beat pauses this long (the pre-reveal beat)
PAUSE_MAX_MS = 450         # every other beat's pause_after_ms stays at or below this
HOOK_TEXT_MAX_WORDS = 6    # G2: on-screen hook text

# Shot pacing (seconds).
SHOT_MIN_S = 0.5
SHOT_MAX_IMAGE_S = 3.8
SHOT_MAX_VIDEO_S = 6.0
FIRST_CUT_MAX_S = 2.2      # first visual change must happen this early
CUT_LEAD_S = 0.08          # cut this long before the cue word starts
END_HOLD_S = 0.4           # G1: short hold after the last word so the loop cuts straight back into frame 1
END_HOLD_MAX_S = 1.0       # G1: loop endings, edl.end_hold_s must not exceed this

# Source quality. Effective upscale above this is flagged as soft.
MAX_UPSCALE_WARN = 2.6
MAX_UPSCALE_ERR = 4.5

# Audio targets.
TARGET_LUFS = -14.0
TARGET_TP = -1.0
LUFS_TOLERANCE = 1.0
MUSIC_UNDER_VOICE = 0.24  # linear gain of music while narration plays
MUSIC_OPEN = 0.30         # linear gain of music in gaps
VOICE_TAIL_PAD_S = 0.12
BEAT_GAP_MS = 240           # G3: default silence between beats (was 380; top channels barely pause)
MUSIC_SMOOTH_S = 0.9
MUSIC_DROP_FACTOR = 0.45   # "drop" beats dip the bed to 45%, never to silence
MUSIC_FLOOR = 0.10         # music never goes below this gain while the video plays
SFX_UNDER_VOICE = 0.3      # sound effects are ducked to 30% under spoken words       # slow ducking so the bed never "pumps" between lines (v7 feedback)

# Video encode (platform master spec: H.264 1080x1920 30fps, 10-16 Mbps, AAC 48k).
CRF = 15
VIDEO_BITRATE = "12M"

# Platform UI safe zones in px (1080x1920 canvas). Captions/text must stay inside.
SAFE_TOP = 220
SAFE_BOTTOM = 1920 - 480
SAFE_LEFT = 64
SAFE_RIGHT = 1080 - 150

# QC thresholds.
BLACK_MAX_S = 0.35
FREEZE_MAX_S = 2.5

ENUMS = {
    "role": {"hook", "setup", "context", "tension", "turn", "reveal", "aftermath", "closing"},
    "move": {"push_in", "push_in_fast", "pull_out", "pan_left", "pan_right", "drift_up", "drift_down", "static"},
    "layout": {"cover", "contain_blur"},
    "transition": {"cut", "punch", "flash", "dip"},
    "treatment": {"doc", "cctv", "archival", "card"},
    "sfx": {"whoosh", "impact", "riser", "tick", "sub_drop", "shutter"},
    "overlay_style": {"location", "date", "name", "label", "pull"},
    "music_cue": {"normal", "drop", "swell"},
    "scene": {"judge", "stamp", "hatch", "faucet", "counter", "route", "pills", "tanklevel", "pinmap", "dnaprofile", "wanted", "swab", "evidence"},
    "v3_tag": {"whispers", "quietly", "somber", "slowly"},
    "rights": {"public_record", "news_media", "wikimedia_cc", "stock_licensed", "generated", "unknown"},
}

VOICE_DEFAULT = {
    "engine": "auto",                      # auto = ElevenLabs if valid key, else edge-tts
    "edge_voice": "en-US-AndrewMultilingualNeural",
    "edge_rate": "+6%",                    # G3: edge stand-in reads a touch faster
    "edge_pitch": "-4Hz",
    "elevenlabs_voice_id": "CwhRBWXzGAHq8TQ4Fs17",   # Roger - audition #2; Brian (#1) is recognised as the stock faceless-channel voice (viewer test v4)
    "elevenlabs_model": "eleven_v3",
    "tempo": 1.10,                         # pitch-preserving atempo (v3 ignores API speed); Roger reads ~2.4 w/s raw
    "single_take": True,                   # one TTS request for the whole script (consistent tone)
}

# G7: small top-left wordmark; OFF until the owner picks a channel name.
CHANNEL_MARK = None

# G2: the first words are subject + verb, never a time/place/prepositional opener ("For sixteen years, ...").
OPENING_BANNED_STARTS = ["for", "in", "on", "at", "during", "after", "before", "when", "since", "back",
                         "years", "one day", "it was"]

# G5: publish titles.
TITLE_VARIANTS = 3
TITLE_MAX_WORDS = 8
PINNED_COMMENT_MAX_CHARS = 500
CAPTION_STYLES = {"bold", "doc"}

# STYLE §2 "Signpost the reveal": the climax beat STARTS with one of these (optionally after But/And/So).
# From research/reveal-signposts.md (MrBallen, Mr. Nightmare, LEMMiNO, Casefile, Doughty transcripts).
REVEAL_SIGNPOSTS = [
    "the truth was", "in reality", "what really happened", "what actually happened", "it turned out",
    "as it turned out", "it later emerged", "it was only later", "it wasn't until", "sure enough",
    "and that's when", "so what happened",
]
HYPE_PHRASES = ["plot twist", "you won't believe", "shocking", "mind-blowing", "wait for it", "insane"]

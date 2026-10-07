"""Own SFX library generated with ElevenLabs sound-generation (works on the free plan).

  python3 -m pipeline.run sfx-gen x        # (re)generate missing entries -> assets/sfx/*.mp3 + library.json

Director uses them in edl.json as {"type": "lib:<name>"}. Synthesized types (whoosh, impact, ...)
remain available as a fallback when no key is present."""
import json
import os
import urllib.request

from .util import ROOT, load_env, log, save_json

SFX_DIR = ROOT / "assets" / "sfx"
LIB = SFX_DIR / "library.json"

# name: (prompt, seconds). Keep prompts concrete, dry and realistic - no music.
SPECS = {
    "elevator_ding": ("single old hotel elevator arrival chime, slightly detuned bell, small reverberant hallway, no music", 2.0),
    "elevator_doors": ("old elevator doors sliding open with mechanical rumble and clunk, hotel, close mic", 3.0),
    "elevator_hum": ("low mechanical hum of an idle old elevator car, fluorescent buzz, room tone", 6.0),
    "water_drip": ("slow single water drips into a metal tank echoing, dark, sparse", 4.0),
    "water_tank_slosh": ("water sloshing inside a large metal rooftop water tank, hollow resonance", 4.0),
    "tap_trickle": ("bathroom faucet turned on, water only trickles and sputters, pipes knock", 3.0),
    "hatch_clank": ("heavy metal hatch lid dragged and dropped on a steel water tank, loud clank", 2.0),
    "ladder_climb": ("footsteps climbing a metal ladder, slow, rooftop wind", 3.0),
    "roof_wind": ("rooftop wind at night in downtown city, distant traffic and siren, bleak", 6.0),
    "door_alarm_silent": ("heavy metal fire door push bar clack then silence, stairwell reverb", 2.0),
    "heartbeat": ("slow deep human heartbeat, cinematic, low thumps", 4.0),
    "camera_shutter": ("single vintage film camera shutter click", 1.0),
    "typewriter_stamp": ("rubber stamp slammed on paper document, single hit", 1.0),
    "cinematic_boom": ("deep cinematic trailer boom hit with long tail, dark", 3.0),
    "gavel_strike": ("single wooden judge gavel strike on sound block, courtroom reverb", 2.0),
    "paper_slide": ("sheet of paper slid across a wooden desk", 1.5),
    "clock_tick": ("slow old wall clock ticking, sparse, close", 4.0),
    "reverse_swell": ("reverse cymbal swell rising into a hit, dark, cinematic riser", 2.5),
    "lab_beep": ("forensic lab computer analysis complete beep, two soft electronic tones, quiet lab room tone", 1.5),
    "pin_drop": ("single push pin pressed into a cork map board, small tick", 0.8),
    "poster_slap": ("paper poster slapped onto a wall and smoothed, single", 1.2),
    "police_radio": ("short german police radio static burst and squelch, no voice", 2.0),
    "tube_seal": ("plastic sample tube cap snapped shut, crisp click", 0.8),
    "glitch_hit": ("short digital data glitch stutter hit, dark, cinematic", 1.2),
}


def generate(force=False):
    load_env()
    key = os.environ.get("ELEVENLABS_API_KEY", "")
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    lib = {}
    for name, (prompt, secs) in SPECS.items():
        out = SFX_DIR / f"{name}.mp3"
        if force or not out.exists():
            body = json.dumps({"text": prompt, "duration_seconds": secs, "prompt_influence": 0.6}).encode()
            req = urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation", data=body,
                                         headers={"xi-api-key": key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                out.write_bytes(r.read())
            log("sfx", f"generated {name} ({secs}s)")
        lib[name] = {"file": f"assets/sfx/{name}.mp3", "prompt": prompt, "seconds": secs,
                     "source": "ElevenLabs sound-generation (own asset)"}
    save_json(LIB, lib)
    return lib


def library():
    return json.loads(LIB.read_text()) if LIB.exists() else {}

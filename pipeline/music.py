"""Music library: assets/music/*.mp3 + library.json (mood tags, license, energy map).

`scan` measures each track's energy in 5-second windows so the director can pick
an offset where the music's intensity fits the video (e.g. skip a silent intro)."""
import subprocess

import numpy as np

from .util import ROOT, log, save_json

LIB = ROOT / "assets" / "music" / "library.json"

# Hand-written catalog notes. Only tracks listed here are offered to the director.
KNOWN = {
    "Long_Note_Four.mp3": {"title": "Long Note Four", "moods": ["dark_ambient", "unease", "slow"],
                           "notes": "Sparse, cold sustained tones. Sits well under narration; good for mystery setups."},
    "Long_Note_Two.mp3": {"title": "Long Note Two", "moods": ["dark_ambient", "melancholic", "slow"],
                          "notes": "Low drones with slow swells. Somber; fits death/aftermath beats."},
    "Unseen_Horrors.mp3": {"title": "Unseen Horrors", "moods": ["horror", "tension", "pulse"],
                           "notes": "Tense horror bed with movement. Strongest suspense option; keep ducked under voice."},
    "Gathering_Darkness.mp3": {"title": "Gathering Darkness", "moods": ["suspense", "building", "cinematic"],
                               "notes": "Builds steadily. Good when the video escalates toward a reveal."},
    "Darkness_Speaks.mp3": {"title": "Darkness Speaks", "moods": ["sting", "short"],
                            "notes": "25s piece. Too short for a full bed (will loop); use only if nothing else fits."},
    "Lightless_Dawn.mp3": {"title": "Lightless Dawn", "moods": ["dark", "melancholic", "ambient"],
                           "notes": "Brooding, slow. Alternative somber bed."},
}


def scan():
    tracks = []
    for f in sorted((ROOT / "assets" / "music").glob("*.mp3")):
        meta = KNOWN.get(f.name)
        if not meta:
            continue
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
                             capture_output=True).stdout
        x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
        win = 8000 * 5
        energy = [round(float(20 * np.log10(np.sqrt((x[i:i + win] ** 2).mean()) + 1e-6)), 1)
                  for i in range(0, len(x) - win, win)]
        dur = len(x) / 8000
        tracks.append({
            "file": f.name, "src": f"assets/music/{f.name}", **meta, "duration_s": round(dur, 1),
            "energy_db_per_5s": energy,
            "license": "CC BY 4.0",
            "attribution": f"Music: \"{meta['title']}\" by Kevin MacLeod (incompetech.com). "
                           "Licensed under Creative Commons: By Attribution 4.0 License "
                           "http://creativecommons.org/licenses/by/4.0/",
        })
        log("music", f"{f.name}: {dur:.0f}s, energy range {min(energy):.0f}..{max(energy):.0f} dB")
    save_json(LIB, {"tracks": tracks})
    return tracks

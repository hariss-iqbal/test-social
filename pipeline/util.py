import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class StageError(Exception):
    """Raised when a stage cannot produce valid output."""


def log(stage, msg):
    print(f"\033[1;36m[{stage}]\033[0m {msg}", flush=True)


def warn(stage, msg):
    print(f"\033[1;33m[{stage}] WARN\033[0m {msg}", flush=True)


def run(cmd, capture=True, check=True):
    r = subprocess.run(cmd, capture_output=capture, text=True)
    if check and r.returncode != 0:
        raise StageError(f"command failed ({r.returncode}): {' '.join(map(str, cmd))[:300]}\n{(r.stderr or '')[-1500:]}")
    return r


def load_json(path):
    with open(path) as f:
        return json.load(f)


def save_json(path, data):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def load_env():
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            m = re.match(r"\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$", line)
            if m and m.group(1) not in os.environ:
                os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")


def probe(path):
    """Return dict(width, height, duration, kind) for an image or video."""
    r = run(["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height,codec_name,nb_frames:format=duration,format_name",
             "-of", "json", str(path)])
    d = json.loads(r.stdout)
    st = (d.get("streams") or [{}])[0]
    fmt = d.get("format", {})
    dur = float(fmt.get("duration") or 0)
    image_codecs = {"mjpeg", "png", "webp", "bmp", "tiff", "gif"}
    kind = "image" if st.get("codec_name") in image_codecs and dur < 0.5 else "video"
    if Path(path).suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
        kind = "image"
    return {"width": int(st.get("width", 0)), "height": int(st.get("height", 0)),
            "duration": dur if kind == "video" else 0.0, "kind": kind}


def audio_duration(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    return float(r.stdout.strip())


def norm_word(w):
    return re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))


def strip_markup(text):
    """Narration may mark emphasis with *word*. Remove it for TTS."""
    return text.replace("*", "")


def word_count(text):
    return len([w for w in re.split(r"\s+", strip_markup(text).strip()) if norm_word(w)])


def topic_path(arg):
    p = Path(arg)
    if not p.is_absolute():
        p = (ROOT / p) if (ROOT / p).exists() or str(p).startswith("topics") else ROOT / "topics" / p
    if not p.exists():
        raise StageError(f"topic dir not found: {p}")
    return p


def die(msg):
    print(f"\033[1;31m[ERROR]\033[0m {msg}", file=sys.stderr)
    sys.exit(1)

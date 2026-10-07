"""Stage: enhance. Restores old/low-quality photos in materials/ -> materials/enhanced/, recorded in catalog.json.

  python3 -m pipeline.run enhance <topic> [--force]

Policy (see STYLE.md "Image enhancement"):
- places / evidence / atmosphere: Real-ESRGAN x4plus + mild colour/contrast restore
- people: 55% Real-ESRGAN blended with 45% denoised Lanczos + fine grain. Never face-restoration
  models (GFPGAN/CodeFormer): they invent facial detail on a real person.
- documents / scans: Lanczos + unsharp only (GAN upscalers can invent letters)
- video / CCTV: never GAN-upscaled (it hallucinates a face into evidence footage). The timeline stage
  already applies temporal denoise + Lanczos.
- generated cards: skipped
The timeline stage uses `enhanced` automatically when present."""
import cv2
import numpy as np

from .util import ROOT, load_json, log, run, save_json, warn

ESRGAN = ROOT / "tools" / "realesrgan" / "realesrgan-ncnn-vulkan"
MODELS = ROOT / "tools" / "realesrgan" / "models"
MAX_SIDE = 2400
PERSON_GAN_WEIGHT = 0.35   # v10 panel: 0.55 left "smeary eyes" on a colour portrait


def _restore_tone(img, is_gray):
    # gentle gray-world white balance (half strength) + CLAHE on luminance
    if not is_gray:
        f = img.astype(np.float32)
        means = f.reshape(-1, 3).mean(axis=0)
        gain = (means.mean() / np.maximum(means, 1)) ** 0.5
        img = np.clip(f * gain, 0, 255).astype(np.uint8)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(8, 8)).apply(l)
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)


def _fit(img):
    h, w = img.shape[:2]
    s = min(1.0, MAX_SIDE / max(h, w))
    return cv2.resize(img, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA) if s < 1 else img


def _esrgan(src, tmp):
    run([str(ESRGAN), "-m", str(MODELS), "-n", "realesrgan-x4plus", "-s", "4", "-i", str(src), "-o", str(tmp)])
    return cv2.imread(str(tmp))


def enhance_one(src, out, subject):
    img = cv2.imread(str(src))
    if img is None:
        raise RuntimeError(f"unreadable {src}")
    is_gray = float(np.abs(img[..., 0].astype(int) - img[..., 2].astype(int)).mean()) < 3
    h, w = img.shape[:2]
    tmp = out.with_suffix(".esr.png")
    if subject == "document":
        up = cv2.resize(img, (w * 2, h * 2), interpolation=cv2.INTER_LANCZOS4) if max(h, w) < 1600 else img
        blur = cv2.GaussianBlur(up, (0, 0), 1.2)
        res = cv2.addWeighted(up, 1.5, blur, -0.5, 0)
        method = "lanczos2x+unsharp (document: no GAN)"
    elif subject == "person":
        e = _esrgan(src, tmp)
        H, W = e.shape[:2]
        base = cv2.resize(cv2.fastNlMeansDenoisingColored(img, None, 3, 3, 7, 21), (W, H), interpolation=cv2.INTER_LANCZOS4)
        res = cv2.addWeighted(e, PERSON_GAN_WEIGHT, base, 1 - PERSON_GAN_WEIGHT, 0)
        res = _restore_tone(res, is_gray)
        grain = np.random.default_rng(1).normal(0, 3.0, res.shape[:2])[..., None]
        res = np.clip(res.astype(np.float32) + grain, 0, 255).astype(np.uint8)
        method = f"realesrgan-x4plus {int(PERSON_GAN_WEIGHT*100)}% + denoised lanczos + grain (person: no face model)"
    elif min(h, w) >= 1200:
        # already high-res: GAN upscaling adds nothing but time - restore tone only
        res = _restore_tone(cv2.fastNlMeansDenoisingColored(img, None, 2, 2, 7, 21), is_gray)
        method = "tone restore + light denoise (already high-res)"
    else:
        res = _restore_tone(_esrgan(src, tmp), is_gray)
        method = "realesrgan-x4plus + tone restore"
    if tmp.exists():
        tmp.unlink()
    if is_gray:
        res = cv2.cvtColor(cv2.cvtColor(res, cv2.COLOR_BGR2GRAY), cv2.COLOR_GRAY2BGR)
    res = _fit(res)
    cv2.imwrite(str(out), res, [cv2.IMWRITE_JPEG_QUALITY, 94])
    return method, res.shape[1], res.shape[0]


def stage_enhance(topic, force=False):
    if not ESRGAN.exists():
        raise RuntimeError("Real-ESRGAN missing: download realesrgan-ncnn-vulkan (macOS) into tools/realesrgan")
    cat_p = topic / "catalog.json"
    cat = load_json(cat_p)
    out_dir = topic / "materials" / "enhanced"
    out_dir.mkdir(exist_ok=True)
    n = 0
    for m in cat["materials"]:
        if m.get("type") != "image" or str(m.get("source", "")).startswith("generated") or m.get("excluded"):
            continue
        subject = m.get("subject") or "place"
        if m.get("rights") == "public_record" and "coroner" in m["filename"] or subject == "document":
            subject = "document"
        out = out_dir / (m["filename"].rsplit(".", 1)[0] + ".jpg")
        if out.exists() and not force:
            if not m.get("enhanced"):  # file exists from an interrupted run: record it
                im = cv2.imread(str(out))
                m.update(enhanced=f"enhanced/{out.name}", enhancement=m.get("enhancement") or "cached (interrupted run)",
                         enhanced_size=[im.shape[1], im.shape[0]])
            continue
        try:
            method, w, h = enhance_one(topic / "materials" / m["filename"], out, subject)
        except Exception as ex:  # noqa: BLE001
            warn("enhance", f"{m['filename']}: {ex}")
            continue
        m["enhanced"] = f"enhanced/{out.name}"
        m["enhancement"] = method
        m["enhanced_size"] = [w, h]
        n += 1
        log("enhance", f"{m['filename']} -> {w}x{h} ({method.split(' (')[0]})")
    save_json(cat_p, cat)
    log("enhance", f"{n} image(s) enhanced -> materials/enhanced/")

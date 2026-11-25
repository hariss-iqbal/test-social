#!/usr/bin/env python3
"""Sober documentary cards for topics/hiroshima_nagasaki_story.

Style: near-black background, off-white serif (Baskerville), one accent red.
All text inside the caption-safe box x 60-930, y 220-1080.
Usage: python3 hn_cards.py <materials_dir> <region_geojson> [only_name ...]
"""
import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
SAFE = (60, 220, 930, 1080)
BG = (14, 14, 16)
INK = (237, 230, 214)      # off-white
DIM = (150, 144, 134)      # secondary
FAINT = (70, 67, 63)
RED = (184, 44, 38)        # single accent
LAND = (34, 33, 32)
LAND_EDGE = (96, 92, 86)

BASK = "/System/Library/Fonts/Supplemental/Baskerville.ttc"
MINCHO = "/System/Library/Fonts/ヒラギノ明朝 ProN.ttc"
FACES = {"reg": 0, "bold": 1, "it": 2, "semi": 4, "semiit": 5}


def F(face, size):
    if face == "mincho":
        return ImageFont.truetype(MINCHO, size, index=2)
    return ImageFont.truetype(BASK, size, index=FACES[face])


# ── base ─────────────────────────────────────────────────────────────────────
def base():
    img = Image.new("RGB", (W, H), BG)
    # subtle radial lift centred in the safe zone
    glow = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(glow)
    cx, cy = W // 2, 650
    for r in range(900, 0, -12):
        v = int(22 * (1 - r / 900) ** 1.6)
        gd.ellipse([cx - r, cy - r * 1.25, cx + r, cy + r * 1.25], fill=v)
    glow = glow.filter(ImageFilter.GaussianBlur(40))
    img = Image.composite(Image.new("RGB", (W, H), (40, 38, 36)), img, glow)
    return img


def finish(img, path):
    # vignette
    vig = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vig)
    for i in range(0, 260, 4):
        vd.rectangle([i, i, W - i, H - i], outline=int(150 * (1 - i / 260) ** 2))
    vig = vig.filter(ImageFilter.GaussianBlur(60))
    img = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), img, vig)
    # film grain
    rnd = random.Random(hash(str(path)) & 0xFFFF)
    noise = Image.effect_noise((W // 2, H // 2), 28).resize((W, H))
    img = Image.blend(img, Image.merge("RGB", (noise, noise, noise)), 0.035)
    _ = rnd
    img.save(path, "PNG", optimize=True)
    print("wrote", path)


def tw(d, text, font, tracking=0):
    if not text:
        return 0
    return d.textlength(text, font=font) + tracking * (len(text) - 1)


def text(d, xy, s, font, fill=INK, tracking=0, anchor="la"):
    """Draw text; tracking in px. anchor: la (left), ma (centre), ra (right) on baseline-ish top."""
    x, y = xy
    width = tw(d, s, font, tracking)
    if anchor[0] == "m":
        x -= width / 2
    elif anchor[0] == "r":
        x -= width
    if not tracking:
        d.text((x, y), s, font=font, fill=fill)
        return width
    for ch in s:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tracking
    return width


def wrap(d, s, font, maxw):
    words, lines, cur = s.split(), [], ""
    for wd in words:
        t = (cur + " " + wd).strip()
        if d.textlength(t, font=font) <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = wd
    if cur:
        lines.append(cur)
    return lines


def para(d, xy, s, font, maxw, fill=INK, lh=1.3, anchor="la"):
    x, y = xy
    asc = font.size
    for ln in wrap(d, s, font, maxw):
        text(d, (x, y), ln, font, fill, anchor=anchor)
        y += int(asc * lh)
    return y


def fit(d, s, face, size, maxw, minsize=24, tracking=0):
    while size > minsize and tw(d, s, F(face, size), tracking) > maxw:
        size -= 2
    return F(face, size)


def label(d, xy, s, size=26, fill=DIM, anchor="la", tracking=5):
    return text(d, xy, s.upper(), F("semi", size), fill, tracking=tracking, anchor=anchor)


def rule(d, y, x0=SAFE[0] + 20, x1=SAFE[2] - 20, fill=FAINT, w=2):
    d.line([(x0, y), (x1, y)], fill=fill, width=w)


def source_line(d, s, y=1040):
    text(d, (W // 2 - 15, y), s, F("it", 24), DIM, anchor="ma")


# ── card types ───────────────────────────────────────────────────────────────
def hanko(img, cx, cy, size, chars="山口"):
    """Red square seal with vertical kanji, slightly worn."""
    seal = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(seal)
    sd.rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 14, fill=RED + (255,))
    inset = size // 12
    sd.rounded_rectangle([inset, inset, size - inset, size - inset], radius=size // 20,
                         outline=BG + (255,), width=max(3, size // 40))
    f = F("mincho", int(size * 0.27))
    n = len(chars)
    for i, ch in enumerate(chars):
        y = size * (0.30 + 0.40 * i / max(1, n - 1))
        sd.text((size / 2, y), ch, font=f, fill=BG + (255,), anchor="mm")
    # wear: punch tiny transparent specks
    rnd = random.Random(7)
    px = seal.load()
    for _ in range(size * 6):
        x, y = rnd.randrange(size), rnd.randrange(size)
        if px[x, y][3]:
            px[x, y] = (0, 0, 0, 0)
    seal = seal.rotate(-4, resample=Image.BICUBIC, expand=True)
    img.paste(seal, (cx - seal.width // 2, cy - seal.height // 2), seal)


def card_name(path, top_label, name_lines, dates, role, tagline, foot=None):
    img = base()
    d = ImageDraw.Draw(img)
    label(d, (W // 2 - 15, 250), top_label, 28, RED, anchor="ma", tracking=8)
    hanko(img, W // 2 - 15, 420, 200)
    d = ImageDraw.Draw(img)
    y = 560
    for ln in name_lines:
        f = fit(d, ln, "semi", 92, 820, tracking=6)
        text(d, (W // 2 - 15, y), ln, f, INK, tracking=6, anchor="ma")
        y += f.size + 14
    y += 6
    text(d, (W // 2 - 15, y), dates, F("reg", 44), DIM, anchor="ma")
    y += 78
    d.line([(W // 2 - 95, y), (W // 2 + 65, y)], fill=RED, width=3)
    y += 34
    text(d, (W // 2 - 15, y), role, F("it", 44), INK, anchor="ma")
    y += 70
    y = para(d, (W // 2 - 15, y), tagline, F("reg", 40), 760, INK, 1.3, anchor="ma")
    if foot:
        source_line(d, foot, max(1035, y + 20))
    finish(img, path)


def card_quote(path, quote, who, when, kicker=None, note=None, qsize=60, src=None):
    img = base()
    d = ImageDraw.Draw(img)
    x0 = 140
    maxw = 760
    f = F("it", qsize)
    lines = wrap(d, quote, f, maxw)
    lh = int(qsize * 1.28)
    block = len(lines) * lh
    extra = (80 if kicker else 0) + 150 + (90 if note else 0)
    y = max(260, int((SAFE[1] + SAFE[3]) / 2 - (block + extra) / 2))
    if kicker:
        label(d, (x0, y), kicker, 26, RED, tracking=7)
        y += 80
    text(d, (x0 - 82, y - 34), "“", F("bold", 140), RED)
    d.line([(x0 - 30, y + 20), (x0 - 30, y + block - 10)], fill=FAINT, width=2) if False else None
    for ln in lines:
        text(d, (x0, y), ln, f, INK)
        y += lh
    y += 36
    d.line([(x0, y), (x0 + 70, y)], fill=RED, width=3)
    y += 30
    text(d, (x0, y), who, F("semi", 38), INK)
    y += 54
    text(d, (x0, y), when, F("reg", 32), DIM)
    y += 50
    if note:
        y += 20
        para(d, (x0, y), note, F("it", 32), maxw, DIM, 1.3)
    if src:
        source_line(d, src)
    finish(img, path)


def card_stat(path, kicker, number, unit, line1, line2, src):
    img = base()
    d = ImageDraw.Draw(img)
    label(d, (W // 2 - 15, 300), kicker, 28, DIM, anchor="ma", tracking=6)
    rule(d, 370, W // 2 - 95, W // 2 + 65, RED, 3)
    nf = fit(d, number, "semi", 210, 780)
    text(d, (W // 2 - 15, 430), number, nf, INK, anchor="ma")
    y = 430 + nf.size + 40
    text(d, (W // 2 - 15, y), unit, F("it", 64), RED, anchor="ma")
    y += 120
    y = para(d, (W // 2 - 15, y), line1, F("reg", 42), 800, INK, 1.3, anchor="ma")
    y += 26
    para(d, (W // 2 - 15, y), line2, F("it", 34), 800, DIM, 1.3, anchor="ma")
    source_line(d, src)
    finish(img, path)


def card_timeline(path, title, entries, sub=None, highlight=()):
    img = base()
    d = ImageDraw.Draw(img)
    label(d, (SAFE[0] + 40, 245), title, 30, RED, tracking=8)
    if sub:
        text(d, (SAFE[0] + 40, 292), sub, F("it", 30), DIM)
    top, bottom = 380, 1040
    n = len(entries)
    step = (bottom - top) / n
    xl = 300  # spine
    d.line([(xl, top - 10), (xl, bottom - step + 40)], fill=FAINT, width=3)
    for i, (date, year, ev, det) in enumerate(entries):
        y = int(top + i * step)
        hot = i in highlight
        r = 13 if hot else 9
        d.ellipse([xl - r, y + 14 - r, xl + r, y + 14 + r], fill=RED if hot else INK)
        text(d, (xl - 36, y - 6), date, F("semi", 40), INK if hot else INK, anchor="ra")
        text(d, (xl - 36, y + 42), year, F("reg", 28), DIM, anchor="ra")
        ef = fit(d, ev, "semi", 44, 590)
        text(d, (xl + 40, y - 6), ev, ef, RED if hot else INK)
        if det:
            text(d, (xl + 40, y + 46), det, fit(d, det, "it", 30, 590), DIM)
    finish(img, path)


def card_targets(path):
    img = base()
    d = ImageDraw.Draw(img)
    label(d, (W // 2 - 15, 250), "Target list · summer 1945", 30, RED, anchor="ma", tracking=8)
    text(d, (W // 2 - 15, 305), "Large cities untouched by earlier raids", F("it", 34), DIM, anchor="ma")
    rows = [("KYOTO", "Removed by Secretary of War Henry L. Stimson", True),
            ("HIROSHIMA", "", False), ("KOKURA", "", False),
            ("NIIGATA", "", False), ("NAGASAKI", "Added in Kyoto’s place", False)]
    y = 400
    for name, note, struck in rows:
        f = F("semi", 72)
        wdt = text(d, (W // 2 - 15, y), name, f, DIM if struck else INK, tracking=10, anchor="ma")
        if struck:
            my = y + 44
            d.line([(W // 2 - 15 - wdt / 2 - 20, my), (W // 2 - 15 + wdt / 2 + 20, my - 6)], fill=RED, width=9)
        y += 90
        if note:
            text(d, (W // 2 - 15, y - 4), note, F("it", 30), RED if struck else DIM, anchor="ma")
            y += 50
        y += 12
    source_line(d, "Strike directive, 25 Jul 1945 · National Security Archive")
    finish(img, path)


def card_split(path, title, left_h, left, left_src, right_h, right, right_src, foot):
    """Two stacked sides, max two short claim lines each, small source under each side."""
    img = base()
    d = ImageDraw.Draw(img)
    label(d, (W // 2 - 15, 245), title, 30, RED, anchor="ma", tracking=8)
    text(d, (W // 2 - 15, 295), "Was the bomb necessary?", F("it", 48), INK, anchor="ma")
    x = SAFE[0] + 60
    y = 420
    for i, (head, items, src) in enumerate(((left_h, left, left_src), (right_h, right, right_src))):
        if i:
            rule(d, y - 34)
        text(d, (x, y), head, F("semi", 40), RED, tracking=6)
        y += 66
        for ln in items[:2]:
            text(d, (x, y), ln, fit(d, ln, "semi", 50, 790, minsize=40), INK)
            y += 66
        text(d, (x, y + 4), src, fit(d, src, "it", 28, 790, minsize=22), DIM)
        y += 100
    text(d, (W // 2 - 15, y + 6), foot, F("it", 46), INK, anchor="ma")
    finish(img, path)


def card_un(path):
    img = base()
    d = ImageDraw.Draw(img)
    label(d, (W // 2 - 15, 300), "United Nations \u00b7 2006", 34, RED, anchor="ma", tracking=10)
    rule(d, 380, W // 2 - 95, W // 2 + 65, RED, 3)
    text(d, (W // 2 - 15, 430), "Twice Survived", F("it", 84), INK, anchor="ma")
    text(d, (W // 2 - 15, 545), "documentary screening", F("reg", 36), DIM, anchor="ma")
    para(d, (W // 2 - 15, 660),
         "Tsutomu Yamaguchi spoke at the UN when the film was screened, and called for the abolition of nuclear weapons.",
         F("reg", 44), 780, INK, 1.32, anchor="ma")
    source_line(d, "Wikipedia, Tsutomu Yamaguchi", 1030)
    finish(img, path)


def card_record(path, state):
    """Yamaguchi's hibakusha recognition: '1957' or '2009'."""
    img = base()
    d = ImageDraw.Draw(img)
    label(d, (W // 2 - 15, 250), "Hibakusha recognition", 30, RED, anchor="ma", tracking=8)
    text(d, (W // 2 - 15, 300), "Tsutomu Yamaguchi · official record", F("it", 36), DIM, anchor="ma")
    # paper panel
    px0, py0, px1, py1 = 110, 400, 910, 900
    d.rectangle([px0, py0, px1, py1], fill=(30, 29, 28), outline=FAINT, width=2)
    rows = [("NAGASAKI", "9 Aug 1945", "RECOGNISED", "1957"),
            ("HIROSHIMA", "6 Aug 1945", "RECOGNISED" if state == "2009" else "NOT RECOGNISED",
             "24 Mar 2009" if state == "2009" else "")]
    y = py0 + 50
    for city, date, status, when in rows:
        text(d, (px0 + 50, y), city, F("semi", 56), INK, tracking=6)
        text(d, (px0 + 50, y + 74), date, F("reg", 32), DIM)
        ok = status == "RECOGNISED"
        col = INK if ok else RED
        text(d, (px0 + 50, y + 124), status, F("semi", 36), col, tracking=4)
        if when:
            text(d, (px1 - 50, y + 128), when, F("it", 32), DIM, anchor="ra")
        y += 230
        if city == "NAGASAKI":
            d.line([(px0 + 50, y - 22), (px1 - 50, y - 22)], fill=FAINT, width=2)
    if state == "2009":
        # stamp
        st = Image.new("RGBA", (700, 150), (0, 0, 0, 0))
        sd = ImageDraw.Draw(st)
        sd.rectangle([4, 4, 695, 145], outline=RED + (235,), width=8)
        sd.text((350, 77), "RECOGNISED · BOTH", font=F("bold", 54), fill=RED + (235,), anchor="mm")
        st = st.rotate(6, resample=Image.BICUBIC, expand=True)
        img.paste(st, (W // 2 - 15 - st.width // 2, 905), st)
        d = ImageDraw.Draw(img)
    else:
        para(d, (W // 2 - 15, 940), "His Hiroshima exposure stayed off the record until 2009.",
             F("it", 36), 760, DIM, 1.3, anchor="ma")
    finish(img, path)


def crane(img, cx, cy, s, color=INK, fill=None):
    """Simple origami crane in line art. s = scale."""
    d = ImageDraw.Draw(img)
    P = lambda x, y: (cx + x * s, cy + y * s)
    body = [P(-1.0, 0.25), P(0, 0.05), P(1.0, 0.25), P(0, 0.6)]
    wing_l = [P(-0.15, 0.1), P(-0.95, -1.05), P(0.1, 0.12)]
    wing_r = [P(0.15, 0.1), P(0.55, -0.85), P(0.0, 0.25)]
    neck = [P(-0.55, 0.32), P(-1.35, -0.55), P(-0.45, 0.2)]
    head = [P(-1.35, -0.55), P(-1.6, -0.35), P(-1.3, -0.45)]
    tail = [P(0.55, 0.32), P(1.45, -0.45), P(0.5, 0.2)]
    for poly, shade in ((wing_r, 0.55), (tail, 0.8), (body, 1.0), (neck, 0.85), (head, 0.85), (wing_l, 0.7)):
        f = fill or tuple(int(c * shade) for c in color)
        d.polygon(poly, fill=f, outline=BG)
    d.line([P(-0.15, 0.1), P(0.1, 0.12)], fill=BG, width=2)


def card_sadako(path):
    img = base()
    d = ImageDraw.Draw(img)
    label(d, (W // 2 - 15, 250), "Sadako Sasaki", 34, RED, anchor="ma", tracking=10)
    # a scatter of small cranes, one red
    rnd = random.Random(1955)
    pts = []
    tries = 0
    while len(pts) < 9 and tries < 5000:
        tries += 1
        x, y = rnd.randint(120, 870), rnd.randint(330, 640)
        if all((x - a) ** 2 + (y - b) ** 2 > 120 ** 2 for a, b in pts) and not (330 < x < 690 and 400 < y < 640):
            pts.append((x, y))
    for x, y in pts:
        crane(img, x, y, rnd.uniform(26, 38), color=(120, 115, 107))
    crane(img, W // 2 - 5, 520, 90, color=RED)
    d = ImageDraw.Draw(img)
    y = 700
    text(d, (W // 2 - 15, y), "Exposed in Hiroshima at age 2,", F("reg", 42), INK, anchor="ma")
    text(d, (W // 2 - 15, y + 58), "1.6 km from the hypocentre.", F("reg", 42), INK, anchor="ma")
    y += 140
    text(d, (W // 2 - 15, y), "Leukemia, February 1955.", F("it", 40), DIM, anchor="ma")
    text(d, (W // 2 - 15, y + 56), "She folded paper cranes in hospital", F("it", 40), DIM, anchor="ma")
    text(d, (W // 2 - 15, y + 112), "until she died on 25 Oct 1955, aged 12.", F("it", 40), DIM, anchor="ma")
    source_line(d, "Children’s Peace Monument (1958) · ~10 million cranes offered each year", 1030)
    finish(img, path)


def card_nobel(path):
    img = base()
    d = ImageDraw.Draw(img)
    label(d, (W // 2 - 15, 260), "11 October 2024", 30, RED, anchor="ma", tracking=8)
    text(d, (W // 2 - 15, 340), "Nobel Peace Prize", F("it", 64), INK, anchor="ma")
    rule(d, 450, W // 2 - 95, W // 2 + 65, RED, 3)
    text(d, (W // 2 - 15, 500), "NIHON HIDANKYO", fit(d, "NIHON HIDANKYO", "semi", 80, 780, tracking=8), INK, tracking=8, anchor="ma")
    para(d, (W // 2 - 15, 610), "Japan Confederation of A- and H-Bomb Sufferers Organizations · founded 1956",
         F("reg", 32), 760, DIM, 1.3, anchor="ma")
    para(d, (W // 2 - 15, 760),
         "“for demonstrating through witness testimony that nuclear weapons must never be used again”",
         F("it", 44), 800, INK, 1.32, anchor="ma")
    source_line(d, "Norwegian Nobel Committee citation, 2024")
    finish(img, path)


# ── map ──────────────────────────────────────────────────────────────────────
def card_map(path, region):
    img = base()
    d = ImageDraw.Draw(img, "RGBA")
    lon0, lon1, lat1 = 129.1, 140.6, 38.75
    k = math.cos(math.radians(35))
    sc = (SAFE[2] - SAFE[0] - 20) / ((lon1 - lon0) * k)
    ox, oy = SAFE[0] + 10, 330
    lat0 = lat1 - (H - oy) / sc - 1

    def P(lon, lat):
        return (ox + (lon - lon0) * k * sc, oy + (lat1 - lat) * sc)

    for feat in region:
        g = feat["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        jp = feat["name"] == "Japan"
        for poly in polys:
            ring = poly[0]
            if not any(lon0 - 3 < x < lon1 + 3 and lat0 - 3 < y < lat1 + 3 for x, y in ring):
                continue
            pts = [P(x, y) for x, y in ring]
            d.polygon(pts, fill=(LAND if jp else (24, 24, 24)),
                      outline=(LAND_EDGE if jp else (52, 50, 48)))
    # clear the title area
    d.rectangle([0, 0, W, 290], fill=BG + (255,))
    label(d, (SAFE[0] + 40, 230), "Japan · August 1945", 30, RED, tracking=8)

    cities = {
        "Tokyo": (139.69, 35.69), "Kyoto": (135.77, 35.01), "Niigata": (139.02, 37.90),
        "Hiroshima": (132.46, 34.39), "Kokura": (130.88, 33.88), "Nagasaki": (129.87, 32.75),
    }
    # route Hiroshima -> Nagasaki (train), dashed red along a gentle arc
    a, b = P(*cities["Hiroshima"]), P(*cities["Nagasaki"])
    ctrl = (a[0] + (b[0] - a[0]) * 0.5, a[1] + (b[1] - a[1]) * 0.5 - 60)
    curve = []
    for i in range(101):
        t = i / 100
        x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * ctrl[0] + t * t * b[0]
        y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * ctrl[1] + t * t * b[1]
        curve.append((x, y))
    for i in range(0, 100, 6):
        d.line(curve[i:i + 4], fill=RED, width=6)
    # arrow head near Nagasaki
    (x1, y1), (x2, y2) = curve[90], curve[97]
    ang = math.atan2(y2 - y1, x2 - x1)
    tip = curve[97]
    d.polygon([tip, (tip[0] - 26 * math.cos(ang - 0.45), tip[1] - 26 * math.sin(ang - 0.45)),
               (tip[0] - 26 * math.cos(ang + 0.45), tip[1] - 26 * math.sin(ang + 0.45))], fill=RED)

    def dot(name, r, col):
        x, y = P(*cities[name])
        d.ellipse([x - r, y - r, x + r, y + r], fill=col)
        return x, y

    # hit cities
    for name in ("Hiroshima", "Nagasaki"):
        x, y = P(*cities[name])
        d.ellipse([x - 30, y - 30, x + 30, y + 30], outline=RED + (140,), width=3)
        dot(name, 13, RED)
    dot("Kokura", 10, INK)
    for name in ("Tokyo", "Kyoto", "Niigata"):
        dot(name, 8, DIM)

    def lab(name, dx, dy, lines, col=INK, anchor="la", strike=False, size=40):
        x, y = P(*cities[name])
        x += dx
        y += dy
        f = F("semi", size)
        wdt = text(d, (x, y), name.upper(), f, col, tracking=4, anchor=anchor)
        if strike:
            xs = x - (wdt if anchor[0] == "r" else wdt / 2 if anchor[0] == "m" else 0)
            d.line([(xs - 8, y + size * 0.55), (xs + wdt + 8, y + size * 0.5)], fill=RED, width=6)
        yy = y + size + 8
        for ln, c in lines:
            text(d, (x, yy), ln, F("it", 30), c, anchor=anchor)
            yy += 38

    lab("Hiroshima", 10, -150, [("6 Aug · 8:15 a.m.", INK), ("Little Boy", DIM)])
    lab("Nagasaki", -50, 44, [("9 Aug · 11:02 a.m.", INK), ("Fat Man", DIM)], anchor="la")
    lab("Kokura", 30, -150, [("primary target 9 Aug", DIM), ("hidden by haze", DIM)], anchor="ra", size=36)
    lab("Kyoto", 0, 24, [("struck from the list", RED)], col=DIM, anchor="ma", strike=True, size=34)
    lab("Tokyo", 20, -112, [("firebombed 9–10 Mar", DIM)], col=DIM, anchor="ra", size=34)
    lab("Niigata", -24, -40, [("on the target list", DIM)], col=DIM, anchor="ra", size=34)
    # route label
    mxp, myp = curve[55]
    text(d, (mxp + 40, myp + 40), "by train", F("it", 34), RED)
    text(d, (mxp + 40, myp + 82), "7 or 8 Aug", F("it", 34), RED)
    finish(img, path)


# ── build ────────────────────────────────────────────────────────────────────
def build(mat, region, only):
    jobs = {
        "100_card_name_yamaguchi_hook.png": lambda p: card_name(
            p, "Hiroshima · 6 August 1945", ["TSUTOMU", "YAMAGUCHI"], "age 29",
            "Mitsubishi draftsman", "On a three-month business trip from Nagasaki."),
        "101_card_name_yamaguchi.png": lambda p: card_name(
            p, "Hiroshima · Nagasaki", ["TSUTOMU", "YAMAGUCHI"], "1916 – 2010",
            "Mitsubishi draftsman", "The only official survivor of both atomic bombs."),
        "102_card_map_japan_route.png": lambda p: card_map(p, region),
        "103_card_timeline_road_to_hiroshima.png": lambda p: card_timeline(
            p, "Timeline · I", [
                ("7 Dec", "1941", "Pearl Harbor", "2,403 Americans killed"),
                ("16 Jul", "1945", "Trinity test", "First nuclear explosion · 5:29 a.m."),
                ("26 Jul", "1945", "Potsdam Declaration", "‘prompt and utter destruction’"),
                ("6 Aug", "1945", "Hiroshima · 8:15 a.m.", "Little Boy"),
            ], sub="The road to Hiroshima", highlight=(3,)),
        "104_card_timeline_to_surrender.png": lambda p: card_timeline(
            p, "Timeline · II", [
                ("8–9 Aug", "1945", "Soviet Union enters war", "Manchurian offensive from 9 Aug"),
                ("9 Aug", "1945", "Nagasaki · 11:02 a.m.", "Fat Man"),
                ("15 Aug", "1945", "Jewel Voice broadcast", "Noon · Hirohito on the radio"),
                ("2 Sep", "1945", "Surrender signed", "Aboard USS Missouri, Tokyo Bay"),
            ], sub="Nine days to surrender", highlight=(1,)),
        "105_card_stat_tokyo_firebombing.png": lambda p: card_stat(
            p, "Tokyo · 9–10 March 1945", "~100,000", "dead in one night",
            "Operation Meetinghouse: 41 km² burned, 267,000 buildings destroyed.",
            "Conventional firebombing, five months before Hiroshima.",
            "Estimate · Wikipedia, Atomic bombings of Hiroshima and Nagasaki"),
        "106_card_stat_hiroshima_deaths.png": lambda p: card_stat(
            p, "Hiroshima · deaths by end of 1945", "~140,000", "estimate",
            "Of about 350,000 people in the city.",
            "Hiroshima City estimate · RERF range 90,000–166,000",
            "Hiroshima City · Radiation Effects Research Foundation"),
        "107_card_stat_nagasaki_deaths.png": lambda p: card_stat(
            p, "Nagasaki · deaths by end of 1945", "~74,000", "estimates",
            "Records burned with the city; there is no accurate count.",
            "RERF range 60,000–80,000",
            "Radiation Effects Research Foundation · atomicarchive.com"),
        "108_card_quote_potsdam.png": lambda p: card_quote(
            p, "prompt and utter destruction", "Potsdam Declaration", "26 July 1945",
            kicker="The final warning", qsize=84,
            note="It demanded unconditional surrender. It never mentioned the atomic bomb.",
            src="National Security Archive, EBB 162"),
        "109_card_quote_jewel_voice.png": lambda p: card_quote(
            p, "a new and most cruel bomb", "Emperor Hirohito", "Radio broadcast · noon, 15 Aug 1945",
            kicker="The Jewel Voice", qsize=84,
            note="About four minutes long. It never used the word ‘surrender’.",
            src="Atomic Heritage Foundation · Jewel Voice Broadcast"),
        "110_card_quote_yamaguchi_flash.png": lambda p: card_quote(
            p, "It was like a flash of magnesium, a great flash in the sky, and I was blown over.",
            "Tsutomu Yamaguchi", "on 6 August 1945 · interview, 2009",
            kicker="Hiroshima · 8:15 a.m.", qsize=64, src="The Times (2009), via secondary sources"),
        "111_card_quote_yamaguchi_cloud.png": lambda p: card_quote(
            p, "I thought the mushroom cloud had followed me from Hiroshima.",
            "Tsutomu Yamaguchi", "on 9 August 1945 · interview, 2009",
            kicker="Nagasaki · 11:02 a.m.", qsize=68, src="The Independent (2009), via secondary sources"),
        "112_card_record_1957.png": lambda p: card_record(p, "1957"),
        "113_card_record_2009.png": lambda p: card_record(p, "2009"),
        "114_card_quote_yamaguchi_record.png": lambda p: card_quote(
            p, "My double radiation exposure is now an official government record. It can tell the "
               "younger generation the horrifying history of the atomic bombings even after I die.",
            "Tsutomu Yamaguchi", "on his recognition · March 2009", kicker="24 March 2009", qsize=52,
            src="ABC News, 2010"),
        "115_card_debate.png": lambda p: card_split(
            p, "The debate",
            "DEFENDERS", ["Spared a costly invasion", "Tokyo was not near surrender"],
            "US invasion estimates (contested) \u00b7 Richard Frank",
            "CRITICS", ["Japan was near surrender", "Soviet entry mattered more"],
            "US Strategic Bombing Survey, 1946 \u00b7 Tsuyoshi Hasegawa",
            "Historians still argue."),
        "116_card_sadako_cranes.png": card_sadako,
        "117_card_nobel_hidankyo.png": card_nobel,
        "118_card_targets_kyoto.png": card_targets,
        "119_card_un_2006.png": card_un,
    }
    for name, fn in jobs.items():
        if only and not any(o in name for o in only):
            continue
        fn(str(Path(mat) / name))


if __name__ == "__main__":
    region = json.load(open(sys.argv[2]))
    build(sys.argv[1], region, sys.argv[3:])

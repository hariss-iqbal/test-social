#!/usr/bin/env python3
"""
generate_cards.py — Pillow-based card renderer for documentary video pipeline.

Generates 1080x1920 (9:16 vertical) PNG cards with dark cinematic styling.

Usage:
    python3 scripts/generate_cards.py --type timeline --config '{...}' --output path/to/output.png
    python3 scripts/generate_cards.py --type stat --config '{...}' --output path/to/output.png
    python3 scripts/generate_cards.py --type quote --config '{...}' --output path/to/output.png
    python3 scripts/generate_cards.py --type map --config '{...}' --output path/to/output.png
    python3 scripts/generate_cards.py --type document --config '{...}' --output path/to/output.png
    python3 scripts/generate_cards.py --type title --config '{...}' --output path/to/output.png
    python3 scripts/generate_cards.py --type person --config '{...}' --output path/to/output.png
    python3 scripts/generate_cards.py --type ruling --config '{...}' --output path/to/output.png

All cards share a consistent design system:
    - Background: near-black (#121218) with subtle radial gradient
    - Primary text: white (#FFFFFF)
    - Accent color: amber/gold (#D4A841)
    - Secondary text: light gray (#AAAAAA)
    - Film grain texture overlay for cinematic feel
"""

import argparse
import json
import math
import os
import random
import struct
import sys
import zlib
from io import BytesIO
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    print("Pillow not installed. Installing...", file=sys.stderr)
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ── Design System Constants ─────────────────────────────────────────────────

WIDTH = 1080
HEIGHT = 1920

# Colors
BG_COLOR = (18, 18, 24)           # #121218
PRIMARY_TEXT = (255, 255, 255)     # White
ACCENT_COLOR = (212, 168, 65)     # #D4A841 amber/gold
SECONDARY_TEXT = (170, 170, 170)  # #AAAAAA light gray
DOCUMENT_BG = (245, 240, 232)     # #F5F0E8 off-white for document cards
DOCUMENT_TEXT = (40, 40, 40)      # Dark text on documents
HIGHLIGHT_YELLOW = (255, 235, 59, 80)  # Semi-transparent yellow highlight
RED_STAMP = (200, 30, 30, 120)   # Semi-transparent red for stamps
VIGNETTE_COLOR = (0, 0, 0)       # Black for vignette edges

# Margins and spacing
MARGIN_X = 80
MARGIN_TOP = 200
MARGIN_BOTTOM = 200
CONTENT_WIDTH = WIDTH - 2 * MARGIN_X

# ── Font Loading ─────────────────────────────────────────────────────────────

def _try_load_font(path, size, index=0):
    """Try to load a font from a path, handling .ttc collections."""
    try:
        return ImageFont.truetype(path, size, index=index)
    except (OSError, IOError):
        return None


# Cache of discovered font paths: style -> (path, index)
_font_cache = {}


def _discover_fonts():
    """Discover available fonts once and cache the results."""
    if _font_cache:
        return

    # Direct path mappings — check these first (fast)
    direct_paths = {
        # macOS
        "bold": [
            ("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 0),
            ("/System/Library/Fonts/HelveticaNeue.ttc", 1),  # Bold face in collection
            ("/System/Library/Fonts/Helvetica.ttc", 1),
        ],
        "regular": [
            ("/System/Library/Fonts/Supplemental/Arial.ttf", 0),
            ("/System/Library/Fonts/HelveticaNeue.ttc", 0),
            ("/System/Library/Fonts/Helvetica.ttc", 0),
            ("/System/Library/Fonts/Geneva.ttf", 0),
        ],
        "italic": [
            ("/System/Library/Fonts/Supplemental/Arial Italic.ttf", 0),
            ("/System/Library/Fonts/HelveticaNeue.ttc", 2),  # Italic face
            ("/System/Library/Fonts/Helvetica.ttc", 2),
        ],
        "bold_italic": [
            ("/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf", 0),
            ("/System/Library/Fonts/HelveticaNeue.ttc", 3),  # Bold Italic
            ("/System/Library/Fonts/Helvetica.ttc", 3),
        ],
        "mono": [
            ("/System/Library/Fonts/Menlo.ttc", 0),
            ("/System/Library/Fonts/SFNSMono.ttf", 0),
        ],
        # Linux
        "bold_linux": [
            ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 0),
            ("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", 0),
            ("/usr/share/fonts/TTF/DejaVuSans-Bold.ttf", 0),
        ],
        "regular_linux": [
            ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 0),
            ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", 0),
            ("/usr/share/fonts/TTF/DejaVuSans.ttf", 0),
        ],
        "italic_linux": [
            ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf", 0),
            ("/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf", 0),
        ],
        "bold_italic_linux": [
            ("/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf", 0),
        ],
        "mono_linux": [
            ("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 0),
            ("/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf", 0),
        ],
    }

    for style in ["bold", "regular", "italic", "bold_italic", "mono"]:
        # Try platform-specific direct paths
        for paths_key in [style, f"{style}_linux"]:
            for path, index in direct_paths.get(paths_key, []):
                if os.path.exists(path):
                    _font_cache[style] = (path, index)
                    break
            if style in _font_cache:
                break

        # Fallback: if italic/bold_italic not found, use regular/bold
        if style == "italic" and "italic" not in _font_cache and "regular" in _font_cache:
            _font_cache["italic"] = _font_cache["regular"]
        if style == "bold_italic" and "bold_italic" not in _font_cache and "bold" in _font_cache:
            _font_cache["bold_italic"] = _font_cache["bold"]


def get_font(style="regular", size=36):
    """Get a font with the given style and size. Falls back gracefully."""
    _discover_fonts()

    if style in _font_cache:
        path, index = _font_cache[style]
        font = _try_load_font(path, size, index)
        if font:
            return font

    # Try direct truetype call (works on some systems)
    for name in ["Arial.ttf", "arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except (OSError, IOError):
            continue

    # Absolute last resort
    return ImageFont.load_default(size=size)


# ── Utility Functions ────────────────────────────────────────────────────────

def create_base_image():
    """Create a 1080x1920 image with dark radial gradient background."""
    img = Image.new("RGBA", (WIDTH, HEIGHT), BG_COLOR + (255,))
    draw = ImageDraw.Draw(img)

    # Radial gradient: slightly lighter center fading to edges
    center_x, center_y = WIDTH // 2, HEIGHT // 2
    max_dist = math.sqrt(center_x**2 + center_y**2)

    # Create gradient overlay
    gradient = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    grad_draw = ImageDraw.Draw(gradient)

    # Draw concentric ellipses for radial gradient effect
    for i in range(0, int(max_dist), 4):
        alpha = int(25 * (1 - i / max_dist))  # Subtle: max 25 alpha
        if alpha <= 0:
            continue
        x0 = center_x - i
        y0 = center_y - i
        x1 = center_x + i
        y1 = center_y + i
        grad_draw.ellipse([x0, y0, x1, y1], fill=(255, 255, 255, alpha))

    img = Image.alpha_composite(img, gradient)
    return img


def add_film_grain(img, intensity=15):
    """Add subtle film grain texture overlay for cinematic feel."""
    grain = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    pixels = grain.load()

    # Sparse grain for performance
    for _ in range(WIDTH * HEIGHT // 8):
        x = random.randint(0, WIDTH - 1)
        y = random.randint(0, HEIGHT - 1)
        v = random.randint(-intensity, intensity)
        a = random.randint(10, 40)
        if v > 0:
            pixels[x, y] = (255, 255, 255, a)
        else:
            pixels[x, y] = (0, 0, 0, a)

    return Image.alpha_composite(img, grain)


def add_vignette(img, strength=0.4):
    """Add subtle vignette (darkened edges) effect."""
    vignette = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(vignette)

    center_x, center_y = WIDTH // 2, HEIGHT // 2
    max_dist = math.sqrt(center_x**2 + center_y**2)

    # Draw darkening at edges
    for i in range(40):
        ratio = 1 - (i / 40.0)
        alpha = int(strength * 255 * ratio * ratio)
        margin = i * max(WIDTH, HEIGHT) // 200
        draw.rectangle(
            [margin, margin, WIDTH - margin, HEIGHT - margin],
            outline=(0, 0, 0, min(alpha, 255))
        )

    # Blur the vignette for smooth falloff
    vignette = vignette.filter(ImageFilter.GaussianBlur(radius=60))
    return Image.alpha_composite(img, vignette)


def wrap_text(draw, text, font, max_width):
    """Word-wrap text to fit within max_width. Returns list of lines."""
    words = text.split()
    lines = []
    current_line = ""

    for word in words:
        test_line = f"{current_line} {word}".strip()
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word

    if current_line:
        lines.append(current_line)

    return lines


def text_height(draw, text, font):
    """Get the height of rendered text."""
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[3] - bbox[1]


def draw_text_with_shadow(draw, xy, text, font, fill, shadow_color=(0, 0, 0, 128), offset=2):
    """Draw text with a drop shadow."""
    x, y = xy
    # Shadow
    draw.text((x + offset, y + offset), text, font=font, fill=shadow_color)
    # Main text
    draw.text((x, y), text, font=font, fill=fill)


def finalize(img):
    """Apply final effects (vignette + grain) and convert to RGB."""
    img = add_vignette(img, strength=0.3)
    img = add_film_grain(img, intensity=12)
    return img.convert("RGB")


# ── Card Generators ──────────────────────────────────────────────────────────

def generate_timeline(config, output_path):
    """
    Timeline card with vertical gold line and date entries.

    Config:
    {
        "title": "TIMELINE",
        "entries": [
            {"date": "Sept 8, 2017", "event": "Kenneka Jenkins attends party at Crowne Plaza"},
            {"date": "Sept 9, 2017", "event": "Found dead in walk-in freezer"},
            ...
        ]
    }
    """
    img = create_base_image()
    draw = ImageDraw.Draw(img)

    title = config.get("title", "TIMELINE")
    entries = config.get("entries", [])[:6]  # Max 6 entries

    # Title
    title_font = get_font("bold", 32)
    # Small caps effect: draw uppercase with letter spacing
    title_text = title.upper()
    draw.text((MARGIN_X + 60, MARGIN_TOP - 60), title_text, font=title_font, fill=ACCENT_COLOR)

    # Vertical timeline line
    line_x = MARGIN_X + 20
    line_top = MARGIN_TOP + 20
    line_bottom = HEIGHT - MARGIN_BOTTOM - 40

    draw.line([(line_x, line_top), (line_x, line_bottom)], fill=ACCENT_COLOR, width=3)

    # Entries
    date_font = get_font("bold", 30)
    event_font = get_font("regular", 28)

    available_height = line_bottom - line_top
    entry_spacing = available_height / max(len(entries), 1)

    for i, entry in enumerate(entries):
        y_pos = int(line_top + i * entry_spacing + entry_spacing * 0.15)

        # Dot on the timeline
        dot_radius = 8
        draw.ellipse(
            [line_x - dot_radius, y_pos - dot_radius,
             line_x + dot_radius, y_pos + dot_radius],
            fill=ACCENT_COLOR
        )

        # Horizontal connector line
        connector_end = line_x + 40
        draw.line([(line_x + dot_radius, y_pos), (connector_end, y_pos)],
                  fill=ACCENT_COLOR, width=2)

        # Date text (gold)
        text_x = connector_end + 15
        draw.text((text_x, y_pos - 18), entry["date"], font=date_font, fill=ACCENT_COLOR)

        # Event text (white, wrapped)
        date_bbox = draw.textbbox((0, 0), entry["date"], font=date_font)
        date_h = date_bbox[3] - date_bbox[1]
        event_y = y_pos - 18 + date_h + 12

        event_max_width = CONTENT_WIDTH - (text_x - MARGIN_X) - 20
        event_lines = wrap_text(draw, entry["event"], event_font, event_max_width)

        for line in event_lines[:3]:  # Max 3 lines per entry
            draw.text((text_x, event_y), line, font=event_font, fill=PRIMARY_TEXT)
            line_h = text_height(draw, line, event_font)
            event_y += line_h + 6

    img = finalize(img)
    img.save(output_path, "PNG")
    return output_path


def generate_stat(config, output_path):
    """
    Stat card with large centered number and label.

    Config:
    {
        "number": "47",
        "label": "Security Cameras",
        "subtitle": "Nobody stopped her"
    }
    """
    img = create_base_image()
    draw = ImageDraw.Draw(img)

    number = config.get("number", "0")
    label = config.get("label", "")
    subtitle = config.get("subtitle", "")

    # Large number (gold, centered)
    number_font = get_font("bold", 160)
    number_bbox = draw.textbbox((0, 0), number, font=number_font)
    number_w = number_bbox[2] - number_bbox[0]
    number_h = number_bbox[3] - number_bbox[1]
    number_x = (WIDTH - number_w) // 2
    number_y = (HEIGHT - number_h) // 2 - 120

    draw_text_with_shadow(draw, (number_x, number_y), number, number_font,
                          fill=ACCENT_COLOR, shadow_color=(0, 0, 0, 160), offset=4)

    # Label (white, centered below)
    label_font = get_font("bold", 48)
    label_lines = wrap_text(draw, label, label_font, CONTENT_WIDTH)
    label_y = number_y + number_h + 60

    for line in label_lines:
        label_bbox = draw.textbbox((0, 0), line, font=label_font)
        label_w = label_bbox[2] - label_bbox[0]
        label_x = (WIDTH - label_w) // 2
        draw.text((label_x, label_y), line, font=label_font, fill=PRIMARY_TEXT)
        label_y += label_bbox[3] - label_bbox[1] + 10

    # Subtitle (gray, centered below label)
    if subtitle:
        sub_font = get_font("regular", 32)
        sub_lines = wrap_text(draw, subtitle, sub_font, CONTENT_WIDTH)
        sub_y = label_y + 30

        for line in sub_lines:
            sub_bbox = draw.textbbox((0, 0), line, font=sub_font)
            sub_w = sub_bbox[2] - sub_bbox[0]
            sub_x = (WIDTH - sub_w) // 2
            draw.text((sub_x, sub_y), line, font=sub_font, fill=SECONDARY_TEXT)
            sub_y += sub_bbox[3] - sub_bbox[1] + 8

    img = finalize(img)
    img.save(output_path, "PNG")
    return output_path


def generate_quote(config, output_path):
    """
    Quote card with decorative quotation marks.

    Config:
    {
        "quote": "I just want to know what happened to my daughter.",
        "attribution": "Tereasa Martin, Mother",
        # optional (caption-safe layout):
        "lead": "Short non-quoted context line shown above the quote",
        "center_y": 960,        # vertical centre of the quote block
        "font_size": 42,        # quote font size
        "margin_x": 80,         # left/right text margin
        "highlight": "phrase",  # words of the quote drawn in gold
        "decor": true,          # false: no big decorative marks (put curly quotes in the text)
        "attribution_size": 28,
        "quote_width": 740      # wrap width of the quote lines (default content width - 40)
    }
    """
    img = create_base_image()
    draw = ImageDraw.Draw(img)

    quote_text = config.get("quote", "")
    attribution = config.get("attribution", "")
    lead = config.get("lead", "")
    center_y = int(config.get("center_y", HEIGHT // 2))
    font_size = int(config.get("font_size", 42))
    margin_x = int(config.get("margin_x", MARGIN_X))
    content_w = WIDTH - 2 * margin_x
    line_h = int(font_size * 1.3)      # fixed line pitch so spacing is even

    # Quote text (white, italic, centered)
    quote_font = get_font("italic", font_size)
    wrap_w = int(config.get("quote_width", content_w - 40))
    quote_lines = wrap_text(draw, quote_text, quote_font, wrap_w)
    # avoid a one-word orphan on the last line
    if len(quote_lines) > 1 and len(quote_lines[-1].split()) == 1:
        quote_lines = wrap_text(draw, quote_text, quote_font, wrap_w - 100)

    total_text_height = line_h * len(quote_lines)
    quote_y = center_y - total_text_height // 2
    top_y = quote_y
    mark_y = top_y - 170

    # Optional lead line (gray, non-quoted context) above the quote
    if lead:
        lead_font = get_font("regular", max(30, font_size // 2))
        lead_lines = wrap_text(draw, lead, lead_font, content_w)
        lh = [text_height(draw, l, lead_font) + 12 for l in lead_lines]
        ly = mark_y + 20 - sum(lh)
        for l, h in zip(lead_lines, lh):
            bb = draw.textbbox((0, 0), l, font=lead_font)
            draw.text(((WIDTH - (bb[2] - bb[0])) // 2, ly), l, font=lead_font, fill=SECONDARY_TEXT)
            ly += h

    # Large decorative opening quote mark (gold)
    decor = config.get("decor", True)   # False: quote marks are inline in the text
    if decor:
        quote_mark_font = get_font("bold", 200)
        draw.text((margin_x - 20, mark_y), "\u201C", font=quote_mark_font, fill=ACCENT_COLOR + (80,))

    # Optional gold highlight: a phrase inside the quote, coloured word by word
    hl = config.get("highlight", "")
    all_words = quote_text.split()
    hl_idx = set()
    if hl:
        hw = hl.split()
        norm = lambda w: w.strip("\u201c\u201d\"'.,;:!?\u2026()").lower()
        for i in range(len(all_words) - len(hw) + 1):
            if [norm(w) for w in all_words[i:i + len(hw)]] == [norm(w) for w in hw]:
                hl_idx = set(range(i, i + len(hw)))
                break
    space_w = draw.textlength(" ", font=quote_font)

    last_end, last_y = 0, quote_y
    wi = 0
    for line in quote_lines:
        line_bbox = draw.textbbox((0, 0), line, font=quote_font)
        line_w = line_bbox[2] - line_bbox[0]
        line_x = (WIDTH - line_w) // 2
        if hl_idx:
            x = line_x - line_bbox[0]
            for w in line.split():
                draw.text((x, quote_y), w, font=quote_font,
                          fill=ACCENT_COLOR if wi in hl_idx else PRIMARY_TEXT)
                x += draw.textlength(w, font=quote_font) + space_w
                wi += 1
        else:
            draw.text((line_x, quote_y), line, font=quote_font, fill=PRIMARY_TEXT)
        last_end, last_y = line_x + line_w, quote_y
        quote_y += line_h

    # Closing quote mark (subtle): after the last word, or below it if no room
    close_font = get_font("bold", 120)
    if last_end + 70 <= WIDTH - margin_x:
        close_xy = (last_end + 12, last_y - 20)
    else:
        close_xy = (WIDTH - margin_x - 60, last_y + line_h - 30)
        quote_y += 30

    # Gold separator line
    sep_y = quote_y + 40
    draw.line([(WIDTH // 2 - 100, sep_y), (WIDTH // 2 + 100, sep_y)],
              fill=ACCENT_COLOR, width=2)

    # Attribution (gray, right-aligned, wrapped)
    if attribution:
        attr_font = get_font("regular", int(config.get("attribution_size", 28)))
        attr_lines = wrap_text(draw, f"\u2014 {attribution}", attr_font, content_w)
        ay = sep_y + 30
        for l in attr_lines:
            bb = draw.textbbox((0, 0), l, font=attr_font)
            draw.text((WIDTH - margin_x - (bb[2] - bb[0]), ay), l, font=attr_font, fill=SECONDARY_TEXT)
            ay += bb[3] - bb[1] + 12

    if decor:
        draw.text(close_xy, "\u201D", font=close_font, fill=ACCENT_COLOR + (40,))

    img = finalize(img)
    img.save(output_path, "PNG")
    return output_path


def generate_split(config, output_path):
    """
    Side-by-side contradiction card (two claims, left vs right).

    Config:
    {
        "title": "THE HATCH",                  # optional kicker above
        "left":  {"word": "OPEN",   "byline": "Santiago Lopez, maintenance worker", "note": "sworn declaration"},
        "right": {"word": "CLOSED", "byline": "LAPD spokesperson", "note": "reportedly"},
        "center_y": 650,                       # vertical centre of the big words
        "footer": "optional question line below"
    }
    """
    img = create_base_image()
    draw = ImageDraw.Draw(img)
    center_y = int(config.get("center_y", 650))
    x0, x1 = 60, 930                 # caption/UI-safe horizontal band
    mid = (x0 + x1) // 2
    col_w = (x1 - x0) // 2 - 40

    title = config.get("title", "")
    if title:
        tf = get_font("bold", 40)
        bb = draw.textbbox((0, 0), title, font=tf)
        tx = mid - (bb[2] - bb[0]) // 2
        draw.text((tx, center_y - 260), title, font=tf, fill=ACCENT_COLOR)
        draw.line([(mid - 60, center_y - 195), (mid + 60, center_y - 195)], fill=ACCENT_COLOR, width=2)

    # Vertical divider
    draw.line([(mid, center_y - 150), (mid, center_y + 260)], fill=ACCENT_COLOR + (160,), width=3)

    def column(side, cx, color):
        word = side.get("word", "")
        wf_size = int(side.get("size", 96))
        wf = get_font("bold", wf_size)
        while draw.textbbox((0, 0), word, font=wf)[2] > col_w and wf_size > 40:
            wf_size -= 4
            wf = get_font("bold", wf_size)
        bb = draw.textbbox((0, 0), word, font=wf)
        wy = center_y - (bb[3] - bb[1]) // 2 - bb[1]
        draw_text_with_shadow(draw, (cx - (bb[2] - bb[0]) // 2, wy), word, wf, color, offset=3)
        y = center_y + (bb[3] - bb[1]) // 2 + 50
        bf = get_font("regular", 30)
        for l in wrap_text(draw, side.get("byline", ""), bf, col_w):
            lb = draw.textbbox((0, 0), l, font=bf)
            draw.text((cx - (lb[2] - lb[0]) // 2, y), l, font=bf, fill=PRIMARY_TEXT)
            y += lb[3] - lb[1] + 12
        note = side.get("note", "")
        if note:
            nf = get_font("italic", 28)
            y += 6
            for l in wrap_text(draw, note, nf, col_w):
                lb = draw.textbbox((0, 0), l, font=nf)
                draw.text((cx - (lb[2] - lb[0]) // 2, y), l, font=nf, fill=SECONDARY_TEXT)
                y += lb[3] - lb[1] + 10

    column(config.get("left", {}), (x0 + mid) // 2, PRIMARY_TEXT)
    column(config.get("right", {}), (mid + x1) // 2, ACCENT_COLOR)

    footer = config.get("footer", "")
    if footer:
        ff = get_font("italic", 34)
        y = center_y + 330
        for l in wrap_text(draw, footer, ff, x1 - x0):
            lb = draw.textbbox((0, 0), l, font=ff)
            draw.text((mid - (lb[2] - lb[0]) // 2, y), l, font=ff, fill=SECONDARY_TEXT)
            y += lb[3] - lb[1] + 12

    img = finalize(img)
    img.save(output_path, "PNG")
    return output_path


def generate_map(config, output_path):
    """
    Map card using OpenStreetMap tiles with dark tint and pin marker.

    Config:
    {
        "lat": 41.9845,
        "lon": -87.8676,
        "label": "Crowne Plaza Hotel, Rosemont IL",
        "zoom": 15
    }
    """
    import urllib.request

    img = create_base_image()

    lat = config.get("lat", 0)
    lon = config.get("lon", 0)
    label = config.get("label", "Location")
    zoom = config.get("zoom", 15)

    # Convert lat/lon to tile coordinates
    n = 2 ** zoom
    tile_x = int((lon + 180.0) / 360.0 * n)
    tile_y = int((1.0 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2.0 * n)

    # Download 3x5 grid of tiles (portrait orientation for 9:16)
    tile_size = 256
    grid_cols = 3
    grid_rows = 5
    map_img = Image.new("RGB", (grid_cols * tile_size, grid_rows * tile_size), (30, 30, 40))

    headers = {"User-Agent": "DocumentaryVideoPipeline/1.0 (educational project)"}
    tiles_downloaded = 0

    for dy in range(-(grid_rows // 2), grid_rows // 2 + 1):
        for dx in range(-(grid_cols // 2), grid_cols // 2 + 1):
            tx = tile_x + dx
            ty = tile_y + dy

            # Use CartoDB dark matter tiles for dark theme
            url = f"https://basemaps.cartocdn.com/dark_all/{zoom}/{tx}/{ty}.png"

            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=10) as resp:
                    tile_data = resp.read()
                    tile_img = Image.open(BytesIO(tile_data))
                    px = (dx + grid_cols // 2) * tile_size
                    py = (dy + grid_rows // 2) * tile_size
                    map_img.paste(tile_img, (px, py))
                    tiles_downloaded += 1
            except Exception as e:
                print(f"  Warning: Failed to download tile {tx},{ty}: {e}", file=sys.stderr)
                continue

    if tiles_downloaded == 0:
        # Fallback: draw a simple dark map placeholder
        draw = ImageDraw.Draw(map_img)
        draw.rectangle([0, 0, map_img.width, map_img.height], fill=(30, 30, 40))
        font = get_font("regular", 24)
        draw.text((map_img.width // 2 - 60, map_img.height // 2), "Map unavailable",
                  font=font, fill=SECONDARY_TEXT)

    # Resize map to fill card (crop to 9:16)
    map_aspect = map_img.width / map_img.height
    card_aspect = WIDTH / HEIGHT

    if map_aspect > card_aspect:
        # Wider than needed — crop sides
        new_width = int(map_img.height * card_aspect)
        left = (map_img.width - new_width) // 2
        map_img = map_img.crop((left, 0, left + new_width, map_img.height))
    else:
        # Taller than needed — crop top/bottom
        new_height = int(map_img.width / card_aspect)
        top = (map_img.height - new_height) // 2
        map_img = map_img.crop((0, top, map_img.width, top + new_height))

    map_img = map_img.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)

    # Apply dark tint overlay
    tint = Image.new("RGBA", (WIDTH, HEIGHT), (18, 18, 24, 140))
    img = Image.new("RGBA", (WIDTH, HEIGHT))
    img.paste(map_img, (0, 0))
    img = Image.alpha_composite(img, tint)

    draw = ImageDraw.Draw(img)

    # Pin marker at center
    pin_x, pin_y = WIDTH // 2, HEIGHT // 2 - 40

    # Pin shadow
    draw.ellipse([pin_x - 12, pin_y + 30, pin_x + 12, pin_y + 38],
                 fill=(0, 0, 0, 80))

    # Pin body (red teardrop shape)
    pin_color = (220, 50, 50)
    draw.ellipse([pin_x - 18, pin_y - 36, pin_x + 18, pin_y],
                 fill=pin_color, outline=(255, 255, 255))
    draw.polygon([(pin_x - 14, pin_y - 6), (pin_x, pin_y + 28), (pin_x + 14, pin_y - 6)],
                 fill=pin_color)
    # Pin inner dot
    draw.ellipse([pin_x - 7, pin_y - 25, pin_x + 7, pin_y - 11],
                 fill=(255, 255, 255))

    # Location label (white with shadow, below pin)
    label_font = get_font("bold", 36)
    label_lines = wrap_text(draw, label, label_font, CONTENT_WIDTH)
    label_y = pin_y + 60

    for line in label_lines:
        label_bbox = draw.textbbox((0, 0), line, font=label_font)
        label_w = label_bbox[2] - label_bbox[0]
        label_x = (WIDTH - label_w) // 2
        # Background box for readability
        draw.rectangle(
            [label_x - 12, label_y - 6,
             label_x + label_w + 12, label_y + label_bbox[3] - label_bbox[1] + 6],
            fill=(0, 0, 0, 160)
        )
        draw_text_with_shadow(draw, (label_x, label_y), line, label_font,
                              fill=PRIMARY_TEXT, offset=2)
        label_y += label_bbox[3] - label_bbox[1] + 12

    img = finalize(img)
    img.save(output_path, "PNG")
    return output_path


def generate_document(config, output_path):
    """
    Document card — fake official document page on dark background.

    Config:
    {
        "header": "COOK COUNTY MEDICAL EXAMINER",
        "title": "Autopsy Report",
        "body": "Cause of death: Hypothermia...",
        "highlights": ["Hypothermia", "manner of death: Undetermined"],
        "stamp": "OFFICIAL",
        "page_number": 1
    }
    """
    img = create_base_image()
    draw = ImageDraw.Draw(img)

    header = config.get("header", "OFFICIAL DOCUMENT")
    title = config.get("title", "")
    body = config.get("body", "")
    highlights = config.get("highlights", [])
    stamp = config.get("stamp", "")
    page_number = config.get("page_number", 1)

    # ── Pre-calculate content height to size the page correctly ──
    page_margin = 60
    page_left = page_margin
    page_right = WIDTH - page_margin
    page_width = page_right - page_left

    header_font = get_font("bold", 22)
    header_text = header.upper()
    title_font = get_font("bold", 30)
    body_font = get_font("mono", 22)
    page_font = get_font("regular", 18)
    body_max_width = page_width - 100

    body_lines = wrap_text(draw, body, body_font, body_max_width)

    # Calculate total content height
    content_h = 40  # top padding
    content_h += text_height(draw, header_text, header_font) + 20  # header + gap
    content_h += 2 + 20  # separator + gap
    if title:
        content_h += text_height(draw, title, title_font) + 30  # title + gap
    content_h += 30  # gap before body
    for line in body_lines:
        content_h += text_height(draw, line, body_font) + 10
    content_h += 50  # bottom padding + page number

    # Size the page to fit content, with minimum height, centered on card
    min_page_height = 500
    page_height = max(content_h, min_page_height)
    page_top = (HEIGHT - page_height) // 2
    page_bottom = page_top + page_height

    # Drop shadow
    shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rectangle(
        [page_left + 8, page_top + 8, page_right + 8, page_bottom + 8],
        fill=(0, 0, 0, 100)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=12))
    img = Image.alpha_composite(img, shadow)
    draw = ImageDraw.Draw(img)

    # Page background
    draw.rectangle([page_left, page_top, page_right, page_bottom], fill=DOCUMENT_BG + (255,))

    # Subtle aging effect: slight gradient on document
    for y in range(page_top, page_bottom, 2):
        age_alpha = int(10 * ((y - page_top) / (page_bottom - page_top)))
        draw.line([(page_left, y), (page_right, y)],
                  fill=(200, 190, 170, age_alpha))

    # Header (institution name, small caps)
    header_bbox = draw.textbbox((0, 0), header_text, font=header_font)
    header_w = header_bbox[2] - header_bbox[0]
    header_x = page_left + (page_width - header_w) // 2
    draw.text((header_x, page_top + 40), header_text, font=header_font, fill=(80, 80, 80, 255))

    # Separator line under header
    sep_y = page_top + 40 + (header_bbox[3] - header_bbox[1]) + 20
    draw.line([(page_left + 40, sep_y), (page_right - 40, sep_y)],
              fill=(150, 140, 130, 255), width=2)

    # Title
    title_bottom_y = sep_y + 20
    if title:
        title_bbox = draw.textbbox((0, 0), title, font=title_font)
        title_w = title_bbox[2] - title_bbox[0]
        title_x = page_left + (page_width - title_w) // 2
        draw.text((title_x, sep_y + 20), title, font=title_font, fill=DOCUMENT_TEXT + (255,))
        title_bottom_y = sep_y + 20 + (title_bbox[3] - title_bbox[1]) + 10

    # Body text (monospace)
    body_x = page_left + 50
    body_y = title_bottom_y + 30
    body_text_positions = []

    for line in body_lines:
        if body_y > page_bottom - 60:
            break
        body_text_positions.append((body_x, body_y, line))
        draw.text((body_x, body_y), line, font=body_font, fill=DOCUMENT_TEXT + (255,))
        line_h = text_height(draw, line, body_font)
        body_y += line_h + 10

    # Yellow highlights
    highlight_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    hl_draw = ImageDraw.Draw(highlight_overlay)

    for highlight_text in highlights:
        highlight_lower = highlight_text.lower()
        for bx, by, line_text in body_text_positions:
            line_lower = line_text.lower()
            idx = line_lower.find(highlight_lower)
            if idx >= 0:
                # Find the x-position of the highlight
                prefix = line_text[:idx]
                hl_portion = line_text[idx:idx + len(highlight_text)]
                prefix_bbox = draw.textbbox((0, 0), prefix, font=body_font) if prefix else (0, 0, 0, 0)
                hl_bbox = draw.textbbox((0, 0), hl_portion, font=body_font)
                hl_x = bx + (prefix_bbox[2] - prefix_bbox[0])
                hl_w = hl_bbox[2] - hl_bbox[0]
                hl_h = hl_bbox[3] - hl_bbox[1]
                hl_draw.rectangle(
                    [hl_x - 3, by - 3, hl_x + hl_w + 3, by + hl_h + 6],
                    fill=HIGHLIGHT_YELLOW
                )

    img = Image.alpha_composite(img, highlight_overlay)
    draw = ImageDraw.Draw(img)

    # Stamp overlay (rotated) — bold and visible
    if stamp:
        stamp_overlay = Image.new("RGBA", (500, 150), (0, 0, 0, 0))
        stamp_draw = ImageDraw.Draw(stamp_overlay)
        stamp_font = get_font("bold", 60)

        # More opaque red for visibility
        stamp_color = (200, 30, 30, 200)
        stamp_border = (200, 30, 30, 220)

        # Red border rectangle
        stamp_draw.rectangle([4, 4, 496, 146], outline=stamp_border, width=5)
        stamp_bbox = stamp_draw.textbbox((0, 0), stamp.upper(), font=stamp_font)
        stamp_w = stamp_bbox[2] - stamp_bbox[0]
        stamp_h = stamp_bbox[3] - stamp_bbox[1]
        stamp_x = (500 - stamp_w) // 2
        stamp_sy = (150 - stamp_h) // 2
        stamp_draw.text((stamp_x, stamp_sy), stamp.upper(), font=stamp_font, fill=stamp_color)

        # Rotate stamp
        stamp_overlay = stamp_overlay.rotate(-15, expand=True, resample=Image.Resampling.BICUBIC)

        # Center the stamp on the page
        stamp_cx = page_left + (page_width - stamp_overlay.width) // 2
        stamp_cy = page_top + (page_height - stamp_overlay.height) // 2 + 40
        img.paste(stamp_overlay, (stamp_cx, stamp_cy), stamp_overlay)
        draw = ImageDraw.Draw(img)

    # Page number
    page_text = f"Page {page_number}"
    page_bbox = draw.textbbox((0, 0), page_text, font=page_font)
    page_w = page_bbox[2] - page_bbox[0]
    draw.text(
        (page_left + (page_width - page_w) // 2, page_bottom - 35),
        page_text, font=page_font, fill=(130, 130, 130, 255)
    )

    img = finalize(img)
    img.save(output_path, "PNG")
    return output_path


def generate_title(config, output_path):
    """
    Title card with topic name, subtitle, and year.

    Config:
    {
        "title": "Kenneka Jenkins",
        "subtitle": "The Freezer Case",
        "year": "2017"
    }
    """
    img = create_base_image()
    draw = ImageDraw.Draw(img)

    title_text = config.get("title", "")
    subtitle_text = config.get("subtitle", "")
    year = config.get("year", "")

    # Title (large bold white, centered)
    title_font = get_font("bold", 72)
    title_lines = wrap_text(draw, title_text, title_font, CONTENT_WIDTH)

    total_height = sum(text_height(draw, l, title_font) + 16 for l in title_lines)
    title_y = (HEIGHT // 2) - total_height - 40

    for line in title_lines:
        line_bbox = draw.textbbox((0, 0), line, font=title_font)
        line_w = line_bbox[2] - line_bbox[0]
        line_x = (WIDTH - line_w) // 2
        draw_text_with_shadow(draw, (line_x, title_y), line, title_font,
                              fill=PRIMARY_TEXT, offset=3)
        title_y += line_bbox[3] - line_bbox[1] + 16

    # Gold separator line
    sep_y = title_y + 30
    draw.line([(WIDTH // 2 - 120, sep_y), (WIDTH // 2 + 120, sep_y)],
              fill=ACCENT_COLOR, width=3)

    # Subtitle
    if subtitle_text:
        sub_font = get_font("regular", 36)
        sub_lines = wrap_text(draw, subtitle_text, sub_font, CONTENT_WIDTH)
        sub_y = sep_y + 40

        for line in sub_lines:
            line_bbox = draw.textbbox((0, 0), line, font=sub_font)
            line_w = line_bbox[2] - line_bbox[0]
            line_x = (WIDTH - line_w) // 2
            draw.text((line_x, sub_y), line, font=sub_font, fill=SECONDARY_TEXT)
            sub_y += line_bbox[3] - line_bbox[1] + 10

    # Year at bottom
    if year:
        year_font = get_font("regular", 28)
        year_bbox = draw.textbbox((0, 0), year, font=year_font)
        year_w = year_bbox[2] - year_bbox[0]
        draw.text(((WIDTH - year_w) // 2, HEIGHT - MARGIN_BOTTOM),
                  year, font=year_font, fill=SECONDARY_TEXT)

    img = finalize(img)
    img.save(output_path, "PNG")
    return output_path


def generate_person(config, output_path):
    """
    Person identification card.

    Config:
    {
        "name": "Tereasa Martin",
        "role": "Mother of Kenneka Jenkins",
        "detail": "Led public campaign for accountability"
    }
    """
    img = create_base_image()
    draw = ImageDraw.Draw(img)

    name = config.get("name", "")
    role = config.get("role", "")
    detail = config.get("detail", "")

    # Vertical accent bar on the left
    bar_x = MARGIN_X - 20
    bar_top = HEIGHT // 2 - 120
    bar_bottom = HEIGHT // 2 + 120
    draw.rectangle([bar_x, bar_top, bar_x + 5, bar_bottom], fill=ACCENT_COLOR)

    # Name (large bold white)
    name_font = get_font("bold", 56)
    name_lines = wrap_text(draw, name, name_font, CONTENT_WIDTH - 40)
    name_y = HEIGHT // 2 - 80

    for line in name_lines:
        draw_text_with_shadow(draw, (MARGIN_X + 20, name_y), line, name_font,
                              fill=PRIMARY_TEXT, offset=2)
        name_y += text_height(draw, line, name_font) + 10

    # Gold accent line
    line_y = name_y + 15
    draw.line([(MARGIN_X + 20, line_y), (MARGIN_X + 200, line_y)],
              fill=ACCENT_COLOR, width=3)

    # Role (gray)
    if role:
        role_font = get_font("regular", 32)
        role_lines = wrap_text(draw, role, role_font, CONTENT_WIDTH - 40)
        role_y = line_y + 25

        for line in role_lines:
            draw.text((MARGIN_X + 20, role_y), line, font=role_font, fill=SECONDARY_TEXT)
            role_y += text_height(draw, line, role_font) + 8

    # Detail (smaller, lighter)
    if detail:
        detail_font = get_font("italic", 26)
        detail_y = (role_y if role else line_y) + 30
        detail_lines = wrap_text(draw, detail, detail_font, CONTENT_WIDTH - 40)

        for line in detail_lines:
            draw.text((MARGIN_X + 20, detail_y), line, font=detail_font,
                      fill=(140, 140, 140, 255))
            detail_y += text_height(draw, line, detail_font) + 6

    img = finalize(img)
    img.save(output_path, "PNG")
    return output_path


def generate_ruling(config, output_path):
    """
    Large-type official-finding card: an off-white paper panel with a header
    and a few LABEL / VALUE rows in big type (readable on a phone, unlike a
    scanned page). Everything stays inside the caption-safe box.

    Config:
    {
        "header": "L.A. COUNTY CORONER",
        "subheader": "AUTOPSY REPORT 2013-01364",
        "rows": [
            {"label": "CAUSE OF DEATH", "value": "DROWNING", "size": 100},
            {"label": "MANNER OF DEATH", "value": "ACCIDENT", "size": 110, "stamp": true}
        ],
        "box": [60, 230, 930, 1070]      # paper panel (x0, y0, x1, y1)
    }
    """
    img = create_base_image()
    draw = ImageDraw.Draw(img)
    x0, y0, x1, y1 = config.get("box", [60, 230, 930, 1070])
    pad = 44
    paper = (245, 240, 232, 255)
    ink = (26, 24, 22)
    label_ink = (110, 104, 96)
    red = (178, 34, 34)

    # paper panel with a soft shadow
    shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle([x0 + 8, y0 + 12, x1 + 8, y1 + 12], fill=(0, 0, 0, 150))
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(14)))
    draw = ImageDraw.Draw(img)
    draw.rectangle([x0, y0, x1, y1], fill=paper)
    inner_w = (x1 - x0) - 2 * pad

    def fit(text, style, size, min_size=40):
        f = get_font(style, size)
        while draw.textlength(text, font=f) > inner_w and size > min_size:
            size -= 2
            f = get_font(style, size)
        return f

    y = y0 + pad
    header = config.get("header", "")
    if header:
        hf = fit(header, "bold", int(config.get("header_size", 52)))
        draw.text((x0 + pad, y), header, font=hf, fill=ink)
        y += text_height(draw, header, hf) + 18
    sub = config.get("subheader", "")
    if sub:
        sf = fit(sub, "mono", int(config.get("subheader_size", 30)), 22)
        draw.text((x0 + pad, y), sub, font=sf, fill=label_ink)
        y += text_height(draw, sub, sf) + 22
    draw.line([(x0 + pad, y), (x1 - pad, y)], fill=ink, width=4)
    y += 34

    row_gap = int(config.get("row_gap", 34))
    for row in config.get("rows", []):
        label, value = row.get("label", ""), row.get("value", "")
        if label:
            lf = get_font("mono", int(row.get("label_size", 32)))
            draw.text((x0 + pad, y), label, font=lf, fill=label_ink)
            y += text_height(draw, label, lf) + 14
        vf = fit(value, "bold", int(row.get("size", 80)))
        bb = draw.textbbox((0, 0), value, font=vf)
        vx = x0 + pad
        if row.get("stamp"):
            sp = 16
            y += sp
            draw.rectangle([vx - bb[0], y - sp + 4, vx + bb[2] + 2 * sp, y + bb[3] + sp],
                           outline=red, width=7)
            draw.text((vx + sp, y), value, font=vf, fill=red)
            y += bb[3] + sp
        else:
            draw.text((vx, y), value, font=vf, fill=red if row.get("red") else ink)
            y += bb[3]
        y += row_gap
    if y > y1:
        print(f"  Warning: ruling content overflows the panel ({y} > {y1})", file=sys.stderr)

    img = finalize(img)
    img.save(output_path, "PNG")
    return output_path


# ── Main ─────────────────────────────────────────────────────────────────────

GENERATORS = {
    "timeline": generate_timeline,
    "stat": generate_stat,
    "quote": generate_quote,
    "map": generate_map,
    "document": generate_document,
    "title": generate_title,
    "person": generate_person,
    "split": generate_split,
    "ruling": generate_ruling,
}


def main():
    parser = argparse.ArgumentParser(
        description="Generate cinematic card visuals for documentary video pipeline."
    )
    parser.add_argument("--type", required=True, choices=GENERATORS.keys(),
                        help="Card type to generate")
    parser.add_argument("--config", required=True,
                        help="JSON string with card configuration")
    parser.add_argument("--output", required=True,
                        help="Output PNG file path")

    args = parser.parse_args()

    try:
        config = json.loads(args.config)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON config: {e}", file=sys.stderr)
        sys.exit(1)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)

    generator = GENERATORS[args.type]

    try:
        output_path = generator(config, args.output)
        print(f"Generated {args.type} card: {output_path}")
        # Verify output
        with Image.open(output_path) as verify:
            w, h = verify.size
            print(f"  Size: {w}x{h}, Format: {verify.format}")
            if w != WIDTH or h != HEIGHT:
                print(f"  Warning: Expected {WIDTH}x{HEIGHT}, got {w}x{h}", file=sys.stderr)
    except Exception as e:
        print(f"Error generating {args.type} card: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

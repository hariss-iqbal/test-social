"""Contract checks for every hand-off file. Each returns (errors, warnings).

Stages refuse to run on inputs with errors, and each agent is told to run the
matching `check-*` command before it reports done."""
import re
from urllib.parse import urlparse

from . import config as C
from .util import ROOT, load_json, norm_word, probe, strip_markup, word_count


def _enum(errors, where, field, value, enum_name, required=True):
    if value is None:
        if required:
            errors.append(f"{where}: missing '{field}'")
        return
    if value not in C.ENUMS[enum_name]:
        errors.append(f"{where}: {field}='{value}' not in {sorted(C.ENUMS[enum_name])}")


def check_research(topic):
    e, w = [], []
    p = topic / "research.json"
    if not p.exists():
        return [f"{p} missing"], w
    r = load_json(p)
    for k in ["topic", "summary", "timeline", "key_people", "key_facts", "case_status", "compelling_details", "sources"]:
        if k not in r:
            e.append(f"research.json: missing '{k}'")
    tl = r.get("timeline", [])
    if len(tl) < 5:
        e.append(f"timeline has {len(tl)} entries (need >= 5)")
    facts = r.get("key_facts", [])
    if len(facts) < 8:
        e.append(f"key_facts has {len(facts)} entries (need >= 8)")
    unsourced = [f.get("fact", "")[:60] for f in facts if not str(f.get("source", "")).startswith("http")]
    if unsourced:
        e.append(f"{len(unsourced)} key_facts without a source URL, e.g. '{unsourced[0]}'")
    disputed = [f for f in facts if f.get("verified") is False]
    if disputed:
        w.append(f"{len(disputed)} key_facts marked unverified - script must not state them as fact")
    domains = {urlparse(s if isinstance(s, str) else s.get("url", "")).netloc for s in r.get("sources", [])}
    domains.discard("")
    if len(domains) < 4:
        e.append(f"only {len(domains)} distinct source domains (need >= 4)")
    return e, w


def check_catalog(topic):
    e, w = [], []
    p = topic / "catalog.json"
    if not p.exists():
        return [f"{p} missing"], w
    cat = load_json(p)
    mats = cat.get("materials", [])
    if len(mats) < 10:
        w.append(f"only {len(mats)} materials (aim for 15+)")
    seen = set()
    for m in mats:
        fn = m.get("filename")
        where = f"catalog[{fn}]"
        if not fn:
            e.append("catalog entry without filename")
            continue
        if fn in seen:
            e.append(f"{where}: duplicate filename")
        seen.add(fn)
        f = topic / "materials" / fn
        if not f.exists():
            e.append(f"{where}: file missing on disk")
            continue
        if f.stat().st_size < 2048:
            e.append(f"{where}: file < 2KB (failed download?)")
            continue
        try:
            info = probe(f)
        except Exception as ex:  # noqa: BLE001
            e.append(f"{where}: unreadable ({str(ex)[:80]})")
            continue
        if m.get("type") not in ("image", "video"):
            e.append(f"{where}: type must be image|video")
        elif m["type"] != info["kind"]:
            e.append(f"{where}: type says {m['type']} but file is {info['kind']}")
        for k in ["description", "source_url"]:
            if not m.get(k) and not (k == "source_url" and str(m.get("source", "")).startswith("generated")):
                e.append(f"{where}: missing '{k}'")
        if m.get("enhanced") and not (topic / "materials" / m["enhanced"]).exists():
            e.append(f"{where}: enhanced file {m['enhanced']} missing (re-run `enhance`)")
        if not m.get("vision_verified"):
            e.append(f"{where}: not vision_verified - look at the file and describe what is actually in it")
        _enum(e, where, "rights", m.get("rights"), "rights")
        if m.get("risk") not in ("low", "medium", "high"):
            e.append(f"{where}: risk must be low|medium|high")
        if "burned_in_text" not in m:
            e.append(f"{where}: missing 'burned_in_text' (bool: chyrons, watermarks, logos)")
        short = min(info["width"], info["height"])
        if short and short < 360 and not m.get("low_res_ok"):
            w.append(f"{where}: low resolution {info['width']}x{info['height']} - look for a better copy or set low_res_ok with reason")
        if m.get("type") == "video" and info["duration"] > 20 and not m.get("segments"):
            w.append(f"{where}: {info['duration']:.0f}s video without 'segments' - director will guess in-points")
    return e, w


def check_script(topic):
    e, w = [], []
    p = topic / "script.json"
    if not p.exists():
        return [f"{p} missing"], w
    s = load_json(p)
    beats = s.get("beats", [])
    if not (C.BEATS_MIN <= len(beats) <= C.BEATS_MAX):
        e.append(f"{len(beats)} beats (need {C.BEATS_MIN}-{C.BEATS_MAX})")
    ids = [b.get("id") for b in beats]
    if len(set(ids)) != len(ids) or None in ids:
        e.append("beat ids must be present and unique")
    total = 0
    for i, b in enumerate(beats):
        where = f"beat[{b.get('id', i)}]"
        n = b.get("narration", "")
        if not n.strip():
            e.append(f"{where}: empty narration")
        if re.search(r"[\[\]{}<>#]", n):
            e.append(f"{where}: narration contains tags/markup other than *emphasis*")
        if n.count("*") % 2:
            e.append(f"{where}: unbalanced *emphasis* markers")
        _enum(e, where, "role", b.get("role"), "role")
        _enum(e, where, "music", b.get("music", "normal"), "music_cue")
        if b.get("v3_tag") is not None:
            _enum(e, where, "v3_tag", b.get("v3_tag"), "v3_tag")
        pa = b.get("pause_after_ms", 0)
        if not isinstance(pa, int) or not (0 <= pa <= 1500):
            e.append(f"{where}: pause_after_ms must be int 0-1500")
        total += word_count(n)
    cues = [b.get("music", "normal") for b in beats]
    if cues.count("drop") > 1 or cues.count("swell") > 1:
        e.append("at most one music 'drop' and one 'swell' (STYLE.md 5)")
    if cues.count("drop") == 0:
        w.append("no music 'drop' - a silence before the reveal is the strongest audio cue")
    if sum(1 for b in beats if b.get("v3_tag")) > 2:
        e.append("v3_tag on more than 2 beats")
    if sum(1 for b in beats if b.get("pause_after_ms", 0) >= 800) > 3:
        e.append("more than 3 long pauses (>= 800 ms)")
    # G3 pace: one long pause (the pre-reveal), every other beat moves on quickly
    pas = [(b.get("id"), b.get("pause_after_ms", C.BEAT_GAP_MS)) for b in beats]
    pas = [(i, v) for i, v in pas if isinstance(v, int)]
    long_ = [i for i, v in pas if v >= C.PAUSE_LONG_MS]
    mid = [f"{i}={v}" for i, v in pas if C.PAUSE_MAX_MS < v < C.PAUSE_LONG_MS]
    if len(long_) > 1:
        e.append(f"{len(long_)} beats pause >= {C.PAUSE_LONG_MS} ms {long_} - only ONE long pause (the pre-reveal); "
                 f"others <= {C.PAUSE_MAX_MS} ms (G3 pace)")
    if mid:
        e.append(f"pause_after_ms above {C.PAUSE_MAX_MS} ms on {mid} - keep <= {C.PAUSE_MAX_MS} "
                 f"(only the one pre-reveal pause may be >= {C.PAUSE_LONG_MS})")
    if beats and beats[0].get("role") != "hook":
        e.append("first beat must have role 'hook'")
    if beats and word_count(beats[0].get("narration", "")) > C.HOOK_MAX_WORDS:
        e.append(f"hook beat is {word_count(beats[0]['narration'])} words (max {C.HOOK_MAX_WORDS})")
    if beats:
        # G2: open on a subject doing something, not on a time/place phrase ("For sixteen years, ...")
        head = re.sub(r"[^\w' ]+", " ", strip_markup(beats[0].get("narration", "")).lower().replace("’", "'")).split()
        head_s = " ".join(head)
        bad = next((x for x in C.OPENING_BANNED_STARTS if head_s == x or head_s.startswith(x + " ")), None)
        if bad:
            e.append(f"{beats[0].get('id')}: opens on a time/place phrase ('{' '.join(head[:4])}...') - "
                     f"open on a subject doing something (subject + verb first, G2)")
    if not (C.WORDS_MIN <= total <= C.WORDS_MAX):
        e.append(f"narration is {total} words (need {C.WORDS_MIN}-{C.WORDS_MAX})")
    # --- story mode (STYLE §2): catch the "case summary" shape mechanically ---
    sp = s.get("story_spine") or {}
    for k in ("thesis", "character", "question", "driving_question", "cold_open", "scenes", "climax_beat", "payoff"):
        if not sp.get(k):
            e.append(f"story_spine.{k} missing (write the spine before the narration, STYLE §2)")
    if sp.get("scenes") and not (4 <= len(sp["scenes"]) <= 8):
        w.append(f"story_spine has {len(sp['scenes'])} scenes (aim 5-7)")
    cb = sp.get("climax_beat")
    ids_ = [b.get("id") for b in beats]
    if cb in ids_:
        wc = [word_count(b.get("narration", "")) for b in beats]
        k = ids_.index(cb)
        pos = sum(wc[:k + 1]) / max(1, sum(wc))
        if not (0.6 <= pos <= 0.92):
            e.append(f"climax {cb} ends at {pos:.0%} of the narration - the answer/turn must land late (~65-85%)")
        if len(beats) - 1 - k > 1:
            e.append(f"{len(beats) - 1 - k} beats after the climax - exactly ONE ending line is allowed")
        # the reveal is signposted in its first words so the viewer knows this is the answer (v4 user)
        def _head(b):
            h = strip_markup(b.get("narration", "")).lower().replace("’", "'").lstrip(" \"'")
            return re.sub(r"^(but|and|so)\s*,?\s+(?!that's when|what happened)", "", h)
        if not any(_head(beats[k]).startswith(sg) for sg in C.REVEAL_SIGNPOSTS):
            e.append(f"climax {cb} doesn't START with a reveal signpost (research/reveal-signposts.md); "
                     f"allowed: {', '.join(C.REVEAL_SIGNPOSTS)}")
        early = [b.get("id") for b in beats[:k] if any(sg in strip_markup(b.get("narration", "")).lower() for sg in C.REVEAL_SIGNPOSTS)]
        if early:
            w.append(f"reveal signpost phrase used before the climax in {early} - it only works once")
    elif cb:
        e.append(f"story_spine.climax_beat '{cb}' is not a beat id")
    narr = " ".join(strip_markup(b.get("narration", "")) for b in beats)
    colon_heads = re.findall(r"(?:^|[.!?]\s+)([A-Z][^.!?:]{0,40}):\s", narr)
    if colon_heads:
        e.append(f"colon headers read like a briefing, rewrite as speech: {colon_heads[:3]}")
    sents = [x.strip() for x in re.split(r"(?<=[.!?])\s+", narr) if x.strip()]
    verbs = re.compile(r"\b(is|are|was|were|be|been|has|had|have|do|did|does|can|could|would|will|\w+ed|\w+s|shot|held|got|went|came|saw|found|left|took|made|kept|lost|said|told|knew|put|set|ran|fell|stood|sat|brought|caught|felt|gave|hid|hit|led|lay|met|paid|sent|slept|spent|swore|thought|won|wrote|dug|drove|rose|became|began|broke|chose|drew|grew|threw|woke|climbed)\b", re.I)
    frags = [x for x in sents if len(x.split()) <= 9 and not verbs.search(x)]
    # the last line must mean something on its own: its final clause needs a verb
    # (v4: "..., found dead in a burned camper, her pistol inside." ended on a verbless tag the viewer couldn't read)
    hype = [h for h in C.HYPE_PHRASES if h in narr.lower()]
    if hype:
        e.append(f"hype phrases in the narration {hype} - no reference creator uses them (research/reveal-signposts.md)")
    if sents:
        tail = re.split(r"[,;:—–]\s*", sents[-1].rstrip(".!?"))[-1]
        if not verbs.search(tail) or len(tail.split()) < 3:
            e.append(f"the final line ends on a verbless fragment ('{tail.strip()}') - end on a complete clause that states its meaning")
    if len(frags) > 2:
        w.append(f"{len(frags)} verbless fragments read like captions, not narration: {frags[:3]}")
    hedges = len(re.findall(r"\b(reportedly|believed|believes|in (his|her|their) view|he thought|allegedly|may have|might have)\b", narr, re.I))
    if hedges > 3:
        w.append(f"{hedges} hedge/attribution markers in the voice (aim <= 2; move nuance on screen)")
    if len(s.get("claims", [])) > 9:
        w.append(f"{len(s['claims'])} narrated claims - fact budget is ~7; move the rest on screen")
    # the character is whoever the spine names (names = capitalised words of spine.character, or spine.character_names)
    spine_ = s.get("story_spine") or {}
    names = spine_.get("character_names") or re.findall(r"\b[A-ZÀ-Ý][\wÀ-ÿ'-]{2,}", str(spine_.get("character", "")))[:4]
    who = "|".join(["she", "her", "he", "him", "his"] + [re.escape(n) for n in names])
    subj = sum(1 for x in sents if re.search(rf"\b({who})\b", x, re.I))
    if sents and subj / len(sents) < 0.4:
        w.append(f"the character ({', '.join(names) or 'she/he'}) appears in only {subj}/{len(sents)} sentences - keep the character present")
    # opinions must be attributed IN the beat that says them (twice a theory slipped into a bare beat)
    attrib = re.compile(r"\b(believ\w*|thought|thinks?|said|says|reportedly|according|theory|suspect\w*|in (his|her|their) (view|words)|he|she) (thought|believed|said)?", re.I)
    beat_text = {b.get("id"): strip_markup(b.get("narration", "")) for b in beats}
    for c in s.get("claims", []):
        if c.get("type") == "opinion":
            bid = c.get("beat")
            if bid not in beat_text:
                e.append(f"opinion claim '{c.get('text', '')[:40]}' needs a valid 'beat' id")
            elif not re.search(r"\b(believ\w*|thought|thinks?|said|says|reportedly|according to|theory|suspect\w*|blamed|attributed|concluded|in (his|her|their) view)\b", beat_text[bid], re.I):
                e.append(f"{bid}: states an opinion ('{c.get('text', '')[:40]}') without attribution in that beat")
    # G1 loop: the final line hands over into b01 when the video replays
    if not sp.get("loop_line"):
        w.append("story_spine.loop_line missing - write the final line so it hands over into b01 on replay (G1 loop)")
    hook = s.get("on_screen_hook", "")
    if not hook or len(hook.split()) > C.HOOK_TEXT_MAX_WORDS:
        e.append(f"on_screen_hook must be 1-{C.HOOK_TEXT_MAX_WORDS} words (is {len(hook.split())})")
    pub = s.get("publish") or {}
    titles = pub.get("titles")
    if not titles and not s.get("title"):
        e.append("missing 'title' (or publish.titles)")
    if not titles:
        w.append(f"publish.titles missing - write {C.TITLE_VARIANTS} short title variants that withhold the answer (G5)")
    elif not isinstance(titles, list) or len(titles) != C.TITLE_VARIANTS:
        e.append(f"publish.titles must be a list of {C.TITLE_VARIANTS} variants")
    spoilers = pub.get("spoilers") or []
    if titles and not spoilers:
        w.append("publish.spoilers missing - list the answer words so titles can be checked for spoilers")
    for t in (titles if isinstance(titles, list) else []):
        t = str(t)
        if len(t.split()) > C.TITLE_MAX_WORDS:
            e.append(f"title '{t}' is {len(t.split())} words (max {C.TITLE_MAX_WORDS})")
        hit = [sw for sw in spoilers if re.search(rf"(?<!\w){re.escape(str(sw).lower())}(?!\w)", t.lower())]
        if hit:
            e.append(f"title '{t}' gives away the answer {hit} - titles withhold the reveal (G5)")
    cp = pub.get("comment_prompt")
    if cp is not None and not str(cp).strip().endswith("?"):
        e.append("publish.comment_prompt must be a question (end with '?')")
    pc = pub.get("pinned_comment")
    if pc is not None and len(str(pc)) > C.PINNED_COMMENT_MAX_CHARS:
        e.append(f"publish.pinned_comment is {len(str(pc))} chars (max {C.PINNED_COMMENT_MAX_CHARS})")
    tags = pub.get("hashtags", [])
    if len(tags) > 5:
        e.append(f"{len(tags)} hashtags (Instagram allows max 5)")
    return e, w


def _sfx_ok(e, where, t):
    if isinstance(t, str) and t.startswith("lib:"):
        from .sfxlib import library
        if t[4:] not in library():
            e.append(f"{where}: sfx '{t}' not in assets/sfx/library.json")
    else:
        _enum(e, where, "sfx.type", t, "sfx")


def _beat_tokens(narration):
    return [norm_word(t) for t in strip_markup(narration).split() if norm_word(t)]


def check_edl(topic):
    e, w = [], []
    p = topic / "edl.json"
    if not p.exists():
        return [f"{p} missing"], w
    edl = load_json(p)
    script = load_json(topic / "script.json")
    cat = {m["filename"]: m for m in load_json(topic / "catalog.json").get("materials", [])}
    sbeats = [b["id"] for b in script["beats"]]
    ebeats = [b.get("beat_id") for b in edl.get("beats", [])]
    if sbeats != ebeats:
        e.append(f"edl beats {ebeats} must match script beats {sbeats} in order")
    narr = {b["id"]: b["narration"] for b in script["beats"]}
    ht = edl.get("hook_text") or {}
    if not ht.get("text") or len(ht["text"].split()) > C.HOOK_TEXT_MAX_WORDS:
        e.append(f"hook_text.text must be 1-{C.HOOK_TEXT_MAX_WORDS} words (G2)")
    # G1 loop endings
    eh = edl.get("end_hold_s")
    if eh is not None and (not isinstance(eh, (int, float)) or eh > C.END_HOLD_MAX_S):
        e.append(f"end_hold_s={eh}: loop endings, <= {C.END_HOLD_MAX_S} s (the name card lives inside the final line)")
    if "loop" in edl and not isinstance(edl["loop"], bool):
        e.append("loop must be true/false")
    if edl.get("caption_style") is not None and edl["caption_style"] not in C.CAPTION_STYLES:
        e.append(f"caption_style='{edl['caption_style']}' not in {sorted(C.CAPTION_STYLES)}")
    # G5 cover: one focal picture + <= 4 words, one red keyword
    cv = edl.get("cover")
    if cv is not None:
        if not isinstance(cv, dict):
            e.append("cover must be an object")
        else:
            cm = cv.get("material")
            if cm is not None:
                if cm not in cat:
                    e.append(f"cover.material '{cm}' not in catalog")
                elif cat[cm].get("excluded"):
                    e.append(f"cover.material '{cm}' is excluded: {cat[cm]['excluded']}")
            elif not cv.get("shot"):
                e.append("cover needs 'material' (or legacy 'shot')")
            ctext = cv.get("text")
            if ctext is not None:
                cw = str(ctext).split()
                if not cw or len(cw) > 4:
                    e.append(f"cover.text must be 1-4 words (is {len(cw)})")
                kw = cv.get("keyword")
                if kw is not None and norm_word(kw) not in [norm_word(x) for x in cw]:
                    e.append(f"cover.keyword '{kw}' is not one of the cover.text words")
            elif cv.get("keyword"):
                e.append("cover.keyword without cover.text")
            f_ = cv.get("focus")
            if f_ is not None and not (isinstance(f_, list) and len(f_) == 2 and all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in f_)):
                e.append("cover.focus must be [x,y] in 0..1")
    mus = edl.get("music") or {}
    if mus.get("src") and not ((ROOT / mus["src"]).exists() or (topic / mus["src"]).exists()):
        e.append(f"music.src '{mus['src']}' not found (relative to repo root, e.g. assets/music/x.mp3)")
    shot_ids, uses, prev = set(), {}, None
    for b in edl.get("beats", []):
        toks = _beat_tokens(narr.get(b.get("beat_id"), ""))
        shots = b.get("shots", [])
        if not shots:
            e.append(f"beat {b.get('beat_id')}: no shots")
        cursor = 0
        for j, s in enumerate(shots):
            where = f"shot[{s.get('id', '?')}]"
            if not s.get("id") or s["id"] in shot_ids:
                e.append(f"{where}: id missing or duplicate")
            shot_ids.add(s.get("id"))
            if s.get("graphic"):
                g = s["graphic"]
                if not (s.get("source_tag") or (g.get("props") or {}).get("source")):
                    e.append(f"{where}: animated scene needs a source (graphic.props.source or source_tag) - every on-screen fact is credited")
                if s.get("overlay") and (s["overlay"].get("pos") != "low"):
                    # scenes draw their own title at y~232-240, exactly where top labels/pulls go (text-on-text)
                    e.append(f"{where}: overlay on an animated scene collides with the scene's own title - put the text in the scene props")
                if g.get("scene") not in C.ENUMS["scene"]:
                    e.append(f"{where}: graphic.scene must be one of {sorted(C.ENUMS['scene'])}")
                if j > 0 and s.get("cue"):
                    cw = norm_word(s["cue"])
                    try:
                        cursor = toks.index(cw, cursor) + 1
                    except ValueError:
                        e.append(f"{where}: cue '{s['cue']}' not found (in order) in beat {b.get('beat_id')} narration")
                _enum(e, where, "transition", s.get("transition", "cut"), "transition")
                for x in s.get("sfx", []) or []:
                    _sfx_ok(e, where, x.get("type"))
                prev = None
                continue
            mat = s.get("material")
            if mat not in cat:
                e.append(f"{where}: material '{mat}' not in catalog")
                continue
            if not (topic / "materials" / mat).exists():
                e.append(f"{where}: material file missing")
            st, lab = s.get("source_tag"), cat[mat].get("source_label")
            core = re.sub(r"^(photo|image)\s*:\s*", "", (lab or ""), flags=re.I).strip().lower()
            if st and core and core not in st.lower() and cat[mat].get("subject") in ("person", "place", "location", "evidence", "atmosphere"):
                e.append(f"{where}: SOURCE line '{st}' doesn't credit this picture ('{lab}'). The SOURCE line credits the "
                         f"PICTURE; fact sources go in an overlay/pull or publish.md (stale tag after a photo swap?)")
            if not (s.get("source_tag") or cat[mat].get("source_label")) and cat[mat].get("rights") != "generated":
                # press photos (dpa/BBC/local TV) must always carry their credit on screen
                (e if cat[mat].get("rights") == "news_media" else w).append(f"{where}: no source credit (catalog source_label or shot source_tag)")
            if cat[mat].get("excluded"):
                e.append(f"{where}: material '{mat}' is excluded: {cat[mat]['excluded']}")
            uses[mat] = uses.get(mat, 0) + 1
            if mat == prev:
                w.append(f"{where}: same material as previous shot")
            prev = mat
            cue = s.get("cue")
            if j == 0 and cue:
                w.append(f"{where}: cue on first shot of a beat is ignored (beat start is the cue)")
            if j > 0:
                if not cue:
                    w.append(f"{where}: no cue word - cut time will be interpolated")
                else:
                    cw = norm_word(cue)
                    try:
                        cursor = toks.index(cw, cursor) + 1
                    except ValueError:
                        e.append(f"{where}: cue '{cue}' not found (in order) in beat {b.get('beat_id')} narration")
            _enum(e, where, "layout", s.get("layout"), "layout")
            _enum(e, where, "move", s.get("move"), "move")
            _enum(e, where, "treatment", s.get("treatment", "doc"), "treatment")
            _enum(e, where, "transition", s.get("transition", "cut"), "transition")
            f = s.get("focus")
            if f is not None and not (isinstance(f, list) and len(f) == 2 and all(0 <= v <= 1 for v in f)):
                e.append(f"{where}: focus must be [x,y] in 0..1")
            co = s.get("callout")
            if co is not None:
                r_ = co.get("rect") if isinstance(co, dict) else None
                if not (isinstance(r_, list) and len(r_) == 4 and all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in r_)):
                    e.append(f"{where}: callout.rect must be [x,y,w,h] normalized (source coords)")
                if not isinstance(co, dict) or co.get("shape", "circle") not in ("circle", "box"):
                    e.append(f"{where}: callout.shape must be circle|box")
                at = co.get("at_s", 0) if isinstance(co, dict) else 0
                if not isinstance(at, (int, float)) or at < 0:
                    e.append(f"{where}: callout.at_s must be a number >= 0")
            hl = s.get("highlight")
            if hl is not None and not (isinstance(hl, list) and len(hl) == 4 and all(0 <= v <= 1 for v in hl)):
                e.append(f"{where}: highlight must be [x,y,w,h] normalized (source image coords)")
            c = s.get("crop")
            if c is not None:
                if not (isinstance(c, list) and len(c) == 4 and all(0 <= v <= 1 for v in c)
                        and c[0] + c[2] <= 1.001 and c[1] + c[3] <= 1.001 and c[2] > 0.05 and c[3] > 0.05):
                    e.append(f"{where}: crop must be [x,y,w,h] normalized, inside the frame")
            if cat[mat].get("burned_in_text") and not c:
                w.append(f"{where}: material has burned-in text/chyron but no crop")
            if cat[mat].get("type") == "video":
                si = s.get("src_in")
                if si is None:
                    e.append(f"{where}: video shot needs src_in (seconds)")
                else:
                    try:
                        dur = probe(topic / "materials" / mat)["duration"]
                        if not (0 <= si < dur - 0.3):
                            e.append(f"{where}: src_in {si} outside video duration {dur:.1f}s")
                    except Exception:  # noqa: BLE001
                        pass
            ov = s.get("overlay")
            if ov:
                _enum(e, where, "overlay.style", ov.get("style"), "overlay_style")
                if len(ov.get("text", "")) > (72 if ov.get("style") == "pull" else 34):
                    e.append(f"{where}: overlay text too long")
                if ov.get("style") == "pull" and ov.get("text", "").lstrip().startswith(("“", "\"")) and "—" not in ov.get("text", ""):
                    e.append(f"{where}: pull quote must name its speaker (… — WHO)")
            for x in s.get("sfx", []) or []:
                _sfx_ok(e, where, x.get("type"))
    cecil = sum(n for m, n in uses.items() if cat.get(m, {}).get("subject") in ("place", "location") and "rooftop" not in m and "tank" not in m)
    if cecil > 4:
        w.append(f"hotel exterior/interior shots used {cecil} times - viewers call it filler (aim for <= 4, prefer case documents)")
    # G2: frame 1 needs motion
    fb = (edl.get("beats") or [{}])[0].get("shots") or []
    if fb and not fb[0].get("graphic"):
        m0 = cat.get(fb[0].get("material"), {})
        if m0.get("type") == "image" and fb[0].get("move") == "static":
            w.append(f"shot[{fb[0].get('id')}]: first shot is a still with move 'static' - frame 1 needs motion (G2)")
    n_sfx = sum(len(sh.get("sfx", []) or []) for b in edl.get("beats", []) for sh in b.get("shots", []))
    if n_sfx > 9:
        e.append(f"{n_sfx} sound effects (max 9, STYLE.md 6)")
    for m, n in uses.items():
        if n > 3:
            w.append(f"material {m} used {n} times - viewers notice repeats")
    return e, w


def narration_sha(script):
    import hashlib
    return hashlib.sha1("\n".join(b.get("narration", "") for b in script.get("beats", [])).encode()).hexdigest()[:12]


def check_story(topic):
    """Gate for the story-auditor (stage 3a): story_map.json exists, PASSes, and matches the current narration."""
    e, w = [], []
    sp, mp = topic / "script.json", topic / "story_map.json"
    if not sp.exists():
        return ["script.json missing"], w
    sha = narration_sha(load_json(sp))
    if not mp.exists():
        return [f"story_map.json missing - run the story-auditor agent (narration_sha {sha})"], w
    m = load_json(mp)
    if m.get("narration_sha") != sha:
        e.append(f"story_map.json is stale (map {m.get('narration_sha')} vs narration {sha}) - re-audit after every narration change")
    if m.get("verdict") != "PASS" or not m.get("complete"):
        e.append(f"story audit verdict {m.get('verdict')}: " + "; ".join(f"{x.get('beat')}: {x.get('problem')}" for x in m.get("fixes", [])[:4]))
    acts = m.get("acts", {})
    for part in ("beginning", "middle", "climax", "ending"):
        if not acts.get(part):
            e.append(f"story_map has no '{part}' act")
    for sp_ in m.get("setups_payoffs", []):
        if not sp_.get("link_stated"):
            e.append(f"setup '{sp_.get('setup')}' -> payoff '{sp_.get('payoff')}': the link is only implied")
    if m.get("cold_listener", {}).get("lines_without_meaning"):
        e.append(f"lines without meaning: {m['cold_listener']['lines_without_meaning'][:3]}")
    return e, w


CHECKS = {
    "research": check_research,
    "catalog": check_catalog,
    "script": check_script,
    "story": check_story,
    "edl": check_edl,
}

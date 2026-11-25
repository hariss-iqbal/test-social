#!/usr/bin/env python3
"""Cards for topics/ronaldo_saudi_journey, on the design primitives of scripts/generate_cards.py.

The stock layouts run past the caption-safe zone, so this lays out inside it and refuses to
save a card with ink outside x 60-930, y 220-1030 (a SOURCE overlay may sit at y 1040).
All data comes from research.json; computed numbers are recomputed and asserted here.
Usage: python3 make_cards.py [card_name ...]
"""
import json
import random
import sys
from datetime import date
from pathlib import Path

from PIL import ImageChops, ImageDraw

TOPIC = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOPIC.parents[1] / "scripts"))
import generate_cards as G  # noqa: E402

X0, X1, Y0, Y1 = 62, 928, 222, 1030
W_SAFE = X1 - X0
AMBER, WHITE, GRAY = G.ACCENT_COLOR, G.PRIMARY_TEXT, (190, 190, 190)
INK = (18, 18, 24)
BLUE = (127, 163, 209)   # "our division" tag and off-field bars
RED = (232, 92, 78)
RULE = (74, 74, 84)
BAR_ON, BAR_OFF = (0xB9, 0x8A, 0x1F), (0x5B, 0x8B, 0xD0)   # validated: dataviz validate_palette, dark surface
BASE = G.create_base_image()


class Card:
    def __init__(self, tags, source, flex=0):
        self.img = BASE.copy()
        self.d = ImageDraw.Draw(self.img)
        self.y = Y0
        self.flex, self.nflex = flex, 0
        f = G.get_font("regular", 26)
        lines = G.wrap_text(self.d, "SOURCE: " + source, f, W_SAFE)
        self.foot_top = Y1 - len(lines) * 33 - 16
        self.d.line([(X0, self.foot_top), (X1, self.foot_top)], fill=RULE, width=2)
        for i, l in enumerate(lines):
            self.d.text((X0, self.foot_top + 14 + i * 33), l, font=f, fill=GRAY)
        self._tags(tags)

    def _tags(self, tags):
        f = G.get_font("bold", 27)
        x, h = X0, 46
        for t in tags:
            col = BLUE if t.startswith("OUR DIVISION") else AMBER
            w = int(self.d.textlength(t, font=f)) + 28
            if x + w > X1:
                x = X0
                self.y += h + 8
            self.d.rounded_rectangle([x, self.y, x + w, self.y + h], 6, fill=col)
            self.d.text((x + 14, self.y + 8), t, font=f, fill=INK)
            x += w + 10
        self.y += h + 22

    def sp(self, n=20):
        """Flexible gap: stretched so the content fills down to the footer."""
        self.y += n + self.flex
        self.nflex += 1

    def text(self, s, size=32, style="regular", color=WHITE, x=X0, width=None, gap=6, lh=1.24):
        f = G.get_font(style, size)
        for l in G.wrap_text(self.d, s, f, width or (X1 - x)):
            self.d.text((x, self.y), l, font=f, fill=color)
            self.y += int(size * lh)
        self.y += gap

    def rule(self):
        self.d.line([(X0, self.y), (X1, self.y)], fill=RULE, width=2)
        self.y += 2

    def row(self, left, right, sub=None, lw=250, lsize=36, rsize=36, subsize=28, lcolor=AMBER):
        """Label column + value column; value may have a smaller line under it."""
        top = self.y
        self.text(left, lsize, "bold", lcolor, width=lw - 16, gap=0)
        lb = self.y
        self.y = top
        self.text(right, rsize, "bold", WHITE, x=X0 + lw, gap=2)
        if sub:
            self.text(sub, subsize, "regular", GRAY, x=X0 + lw, gap=0)
        self.y = max(self.y, lb)

    def stamp(self, word, color):
        f = G.get_font("bold", 92)
        bb = self.d.textbbox((0, 0), word, font=f)
        pad = 20
        self.d.rectangle([X0 + 3, self.y, X0 + 3 + bb[2] + 2 * pad, self.y + bb[3] + 2 * pad - bb[1] + 4],
                         outline=color, width=7)
        self.d.text((X0 + 3 + pad, self.y + pad - bb[1] + 2), word, font=f, fill=color)
        self.y += bb[3] - bb[1] + 2 * pad + 22

    def claim(self, verdict, color, claim, size=42):
        self.stamp(verdict, color)
        self.text("THE CLAIM", 27, "bold", GRAY, gap=4)
        self.text(claim, size, "italic", GRAY, gap=0)

    def bullets(self, items, size=32, sub=28):
        for head, rest in items:
            self.sp(14)
            self.text(head, size, "bold", WHITE, gap=2)
            if rest:
                self.text(rest, sub, "regular", GRAY, gap=0)

    def timeline(self, entries):
        dots = []
        for date, event, note in entries:
            self.sp(18)
            dots.append(self.y + 22)
            self.text(date, 38, "bold", AMBER, x=X0 + 46, gap=2)
            self.text(event, 33, "regular", WHITE, x=X0 + 46, gap=2)
            if note:
                self.text(note, 28, "italic", GRAY, x=X0 + 46, gap=0)
        lx = X0 + 11
        self.d.line([(lx, dots[0]), (lx, dots[-1])], fill=AMBER, width=3)
        for y in dots:
            self.d.ellipse([lx - 10, y - 10, lx + 10, y + 10], fill=AMBER)


CARDS = {}


def card(name, tags, source):
    def wrap(fn):
        CARDS[name] = (tags, source, fn)
        return fn
    return wrap


def build(name):
    tags, source, fn = CARDS[name]
    c = Card(tags, source)
    fn(c)
    room = c.foot_top - 14 - c.y
    if room < 0:
        print(f"OVERFLOW {name}: {-room}px"); return
    flex = min(room // c.nflex, 40) if c.nflex else 0
    c = Card(tags, source, flex)
    fn(c)
    bb = ImageChops.difference(c.img.convert("RGB"), BASE.convert("RGB")).getbbox()
    if bb[0] < 60 or bb[2] > 930 or bb[1] < 220 or bb[3] > Y1 + 2:
        print(f"UNSAFE {name}: {bb}"); return
    random.seed(name)
    G.finalize(c.img).save(TOPIC / "materials" / name, "PNG")
    print(f"{name}: ink {bb}, slack {room - flex * c.nflex}px")


R = json.loads((TOPIC / "research.json").read_text())
PB = R["pay_breakdown"]
APPS = PB["per_match"]["appearances_all_competitions"]
FORBES = {f["year"]: f for f in R["forbes_rankings"]}
# Recompute every derived number against research.json before printing it.
for div, want in [(12, "19,583,333"), (52, "4,519,231"), (365, "643,836"), (8760, "26,826")]:
    assert f"{235_000_000 / div:,.0f}" == want
    assert any(want in v for v in PB["our_division_usd_from_forbes"].values())
assert sum(v for k, v in APPS.items() if k != "total") == APPS["total"] == 160
PER_GAME = {"2022/23": 75e6 / 2 / APPS["2022/23"], "2023/24": 200e6 / APPS["2023/24"],
            "2024/25": 225e6 / APPS["2024/25"], "2025/26": 235e6 / APPS["2025/26"]}
for k, v in PER_GAME.items():
    assert any(f"{v:,.0f}" in s for s in PB["per_match"]["our_division"].values()), k
for f in FORBES.values():
    assert f["on_field_usd_m"] + f["off_field_usd_m"] == f["total_usd_m"] and f["rank"] == 1
assert 14 + 50 + 35 + 30 + 9 == 138
# Facts printed on cards 72, 88 and 89, verbatim in research.json.
RAW = json.dumps(R, ensure_ascii=False)
for want in ["a source told AFP the deal was worth 'more than EUR 200m'",
             "Reports including Romano's put the commercial-inclusive package near EUR 200m a year",
             "Debut: 22 January 2023, as captain, 1-0 win over Al-Ettifaq",
             "First goal: 3 February 2023, stoppage-time penalty",
             "all four goals, 4-0 over Al-Wehda, 9 February 2023",
             "on 16 May 2026, Al-Nassr lost the AFC Champions League Two final 1-0 at home to Gamba Osaka",
             "ESPN counted four finals lost at Al-Nassr"]:
    assert want in RAW, want
assert (date(2023, 2, 9) - date(2023, 1, 22)).days < 21  # card 88's "less than 3 weeks in"


@card("71_card_table_pay_by_season.png", ["REPORTED", "ESTIMATE", "CONTRACT NEVER PUBLISHED"],
      "CBS, AFP source, Romano, Forbes, The Sun. Forbes windows do not match seasons exactly.")
def _(c):
    c.text("Pay by season", 58, "bold", gap=0)
    rows = [("2022/23", "half season", "~$75m a year basic (CBS)", "Package about EUR 200m (AFP source: \"more than\"; Romano: \"near\"). All press estimates"),
            ("2023/24", None, "$200m on field", "Forbes estimate, window to ~May 2024"),
            ("2024/25", None, "$225m on field", "Forbes estimate, window to ~May 2025"),
            ("2025/26", None, "$235m on field", "Forbes estimate. The Sun: £178m base. NBC's $468m: unattributed, excluded"),
            ("2026/27", "current", "£178m base + £38m bonus", "The Sun only, unconfirmed. No Forbes estimate yet")]
    for s, note, val, basis in rows:
        c.sp(10)
        c.rule()
        c.sp(10)
        top = c.y
        c.text(s, 32, "bold", AMBER, gap=0)
        if note:
            c.text(note, 25, "regular", GRAY, gap=0)
        lb = c.y
        c.y = top
        c.text(val, 34, "bold", x=X0 + 170, gap=0)
        c.text(basis, 27, "regular", GRAY, x=X0 + 170, gap=0)
        c.y = max(c.y, lb)


@card("72_card_compare_original_deal_2022.png", ["REPORTED", "CONTRACT NEVER PUBLISHED"],
      "CBS Sports, 23 Dec 2022; unnamed AFP source; Fabrizio Romano. All press estimates.")
def _(c):
    c.text("The original deal, Dec 2022", 54, "bold", gap=0)
    c.sp(24)
    c.text("~$75m", 100, "bold", AMBER, gap=0, lh=1.12)
    c.text("a year in basic salary", 40, "bold", gap=2)
    c.text("CBS Sports. Image rights extra, not quantified", 30, "regular", GRAY, gap=0)
    c.sp(12)
    c.text("VERSUS", 28, "bold", GRAY, gap=0)
    c.sp(12)
    c.text("about EUR 200m", 84, "bold", AMBER, gap=0, lh=1.15)
    c.text("total package, with commercial deals", 40, "bold", gap=2)
    c.text("AFP source: \"more than EUR 200m\". Romano: near EUR 200m a year", 30, "regular", GRAY, gap=0)
    c.sp(24)
    c.text("The split between the two was never published.", 32, "italic", WHITE, gap=0)


@card("73_card_list_extension_the_sun.png", ["REPORTED", "ONE TABLOID, UNCONFIRMED"],
      "The Sun, 26 June 2025, relayed by GOAL and SI (not independent). End date: ESPN, UPI.")
def _(c):
    c.text("The 2025 extension, per The Sun", 52, "bold", gap=0)
    for num, lab in [("£178m", "base, a year"), ("£24.5m", "signing bonus"), ("£38m", "year-2 bonus, if triggered")]:
        c.sp(14)
        top = c.y
        c.text(num, 66, "bold", AMBER, gap=0, lh=1.12)
        b = c.y
        c.y = top + 22
        c.text(lab, 34, "bold", x=X0 + 270, gap=0)
        c.y = b
    c.sp(10)
    c.text("Contract ends June 2027 (ESPN, UPI)", 34, "bold", gap=0)
    c.sp(14)
    c.rule()
    c.sp(10)
    c.text("OTHER REPORTED EXTRAS: SINGLE SOURCE, THE SUN", 27, "bold", AMBER, gap=6)
    c.text("£8m title bonus. £4m Golden Boot bonus. $110,000 a goal. £4m private jet allowance. 16 household staff.", 30, "regular", WHITE, gap=0)


@card("74_card_breakdown_forbes_division.png", ["ESTIMATE", "OUR DIVISION, NOT REPORTED FEES"],
      "Forbes 2026 on-field estimate, 1 May 2025 to 1 May 2026, pre-tax. Divisions are ours.")
def _(c):
    c.text("REPORTED BY FORBES (ESTIMATE)", 28, "bold", AMBER, gap=0)
    c.text("$235m", 130, "bold", AMBER, gap=0, lh=1.14)
    c.text("on field, one year", 38, "bold", gap=0)
    c.sp(18)
    c.rule()
    c.sp(14)
    c.text("OUR DIVISION", 28, "bold", BLUE, gap=0)
    for lab, val in [("A month", "$19.58m"), ("A week", "$4.52m"), ("A day", "$643,836"), ("An hour", "$26,826")]:
        c.sp(8)
        top = c.y
        c.text(lab, 38, "regular", GRAY, gap=0)
        c.y = top - 8
        c.text(val, 58, "bold", WHITE, x=X0 + 300, gap=0, lh=1.16)


@card("75_card_table_per_match.png", ["OUR DIVISION", "NO APPEARANCE FEE HAS BEEN REPORTED"],
      "Apps: RonaldoStats, all competitions. Pay: Forbes, CBS estimates. Windows differ from seasons.")
def _(c):
    c.text("Per game, if you divide", 56, "bold", gap=0)
    c.sp(10)
    top = c.y
    c.text("SEASON", 26, "bold", GRAY, gap=0)
    c.y = top
    c.text("APPS", 26, "bold", GRAY, x=X0 + 240, gap=0)
    c.y = top
    c.text("$ A GAME: OUR DIVISION", 26, "bold", BLUE, x=X0 + 400, gap=0)
    for s, val in [("2022/23", f"${PER_GAME['2022/23'] / 1e6:.2f}m*"), ("2023/24", f"${PER_GAME['2023/24'] / 1e6:.2f}m"),
                   ("2024/25", f"${PER_GAME['2024/25'] / 1e6:.2f}m"), ("2025/26", f"${PER_GAME['2025/26'] / 1e6:.2f}m"),
                   ("2026/27", "no estimate")]:
        c.sp(6)
        c.rule()
        c.sp(6)
        apps = APPS.get(s, APPS["2026/27_to_30_Oct"])
        top = c.y
        c.text(s, 38, "bold", AMBER, gap=0)
        c.y = top
        c.text(str(apps), 38, "bold", x=X0 + 240, gap=0)
        c.y = top - 5
        c.text(val, 46 if val[0] == "$" else 34, "bold", WHITE if val[0] == "$" else GRAY, x=X0 + 400, gap=0, lh=1.1)
    c.sp(12)
    c.text("*CBS base $75m, assuming half the annual. 2026/27 apps to 30 Oct. Annual estimate divided by games, nothing more.",
           28, "regular", GRAY, gap=0)


@card("76_card_chart_forbes_on_off_field.png", ["ESTIMATE", "FORBES, NOT CONTRACT DATA"],
      "Forbes, via Wikipedia's table. Estimates, pre-tax. 2023 window ended ~May 2023: only months of Saudi pay.")
def _(c):
    c.text("No. 1 on Forbes, 2023 to 2026", 54, "bold", gap=0)
    c.sp(10)
    # legend
    f = G.get_font("regular", 30)
    y = c.y
    c.d.rounded_rectangle([X0, y + 6, X0 + 26, y + 32], 4, fill=BAR_ON)
    c.d.text((X0 + 36, y), "On field", font=f, fill=WHITE)
    c.d.rounded_rectangle([X0 + 210, y + 6, X0 + 236, y + 32], 4, fill=BAR_OFF)
    c.d.text((X0 + 246, y), "Off field", font=f, fill=WHITE)
    c.y += 40
    scale = (W_SAFE - 4) / 300
    lf = G.get_font("bold", 30)
    for yr in sorted(FORBES):
        r = FORBES[yr]
        c.sp(10)
        top = c.y
        c.text(str(yr), 34, "bold", AMBER, gap=0)
        c.y = top
        total = f"${r['total_usd_m']}m total"
        c.d.text((X1 - c.d.textlength(total, font=G.get_font("bold", 34)), top), total, font=G.get_font("bold", 34), fill=WHITE)
        c.y = top + 46
        on, off = r["on_field_usd_m"], r["off_field_usd_m"]
        w1 = round(on * scale)
        c.d.rounded_rectangle([X0, c.y, X0 + w1, c.y + 62], 4, fill=BAR_ON)
        c.d.rounded_rectangle([X0 + w1 + 3, c.y, X0 + w1 + 3 + round(off * scale), c.y + 62], 4, fill=BAR_OFF)
        c.d.text((X0 + 12, c.y + 14), f"${on}m", font=lf, fill=INK)
        c.d.text((X0 + w1 + 15, c.y + 14), f"${off}m", font=lf, fill=INK)
        c.y += 62


@card("77_card_timeline_joining.png", ["TIMELINE: HOW HE JOINED"],
      "Al-Muammar via Al Arabiya (summaries); AP; Al-Nassr; The National.")
def _(c):
    c.text("From Manchester to Riyadh", 52, "bold", gap=0)
    c.timeline([
        ("July 2022", "The idea, from Prince Khalid bin Fahd", "Al-Muammar's account only, not confirmed by Ronaldo"),
        ("Nov 2022", "Man United contract ended by mutual agreement", "After the Piers Morgan interview. Exact day not established"),
        ("30 Dec 2022", "Al-Nassr announces the signing, until 2025", "Free agent: no transfer fee to United reported"),
        ("3 Jan 2023", "Unveiled at Mrsool Park, Riyadh", "Sold out, 25,000 capacity, per The National"),
    ])


@card("78_card_timeline_football.png", ["TIMELINE: ON THE PITCH"],
      "Wikipedia, ESPN, Guinness World Records, AP.")
def _(c):
    c.text("Four moments on the pitch", 54, "bold", gap=0)
    c.timeline([
        ("12 Aug 2023", "Arab Club Champions Cup won, both goals in the final", "ESPN calls the trophy 'unofficial'"),
        ("27 May 2024", "35 league goals, the Saudi Pro League season record", "Beat Hamdallah's 34, per Guinness"),
        ("31 May 2024", "King's Cup final lost on penalties to Al-Hilal", "1-1, then 5-4 in the shootout. Tears in the dugout"),
        ("21 May 2026", "Saudi Pro League title, two goals v Damac", "4-1. The club's first league title since 2018/19"),
    ])


@card("79_card_claim_law_changed.png", ["CLAIM CHECK"],
      "Al Jazeera (2019); UK FCDO; EFE, 4 Jan 2023, via Bio Bio Chile.")
def _(c):
    c.claim("NO EVIDENCE", AMBER, "\"Saudi law changed for him\"")
    c.sp(10)
    c.text("WHAT IS DOCUMENTED", 27, "bold", AMBER, gap=0)
    c.bullets([
        ("No decree, regulation or official statement found", "UK advice today: sex outside marriage illegal, tourists included"),
        ("2019: foreign couples no longer need to prove a relationship to share a hotel room", "General rule, over 3 years before he arrived"),
        ("Jan 2023: two anonymous lawyers to EFE", "Authorities \"turn a blind eye\" for foreigners generally, \"but the law continues to prohibit cohabitation outside of marriage\""),
    ])


@card("80_card_claim_beach.png", ["CLAIM CHECK"],
      "Mundo Deportivo via DNA India; Ronaldo's Instagram via Lokmarg.")
def _(c):
    c.claim("UNVERIFIED", AMBER, "\"A Saudi beach was closed for a full day for his family\"", 38)
    c.sp(10)
    c.text("WHAT WE FOUND", 27, "bold", AMBER, gap=0)
    c.bullets([
        ("No report at all, in English or Arabic", "Could not be disproved either"),
        ("Nearest: a Riyadh park reportedly closed about 2 hours, Jan 2023", "Mundo Deportivo, unconfirmed. Venue names conflict"),
        ("Documented: family posts, Ummahat Island, July 2024", "No report mentions a closure"),
    ])


@card("81_card_claim_99_lashes.png", ["CLAIM CHECK"],
      "Iranian embassy in Spain, via Factly; BOOM; Africa Check.")
def _(c):
    c.claim("FALSE", RED, "\"Iran sentenced him to 99 lashes\"")
    c.sp(20)
    c.text("ON THE RECORD", 27, "bold", AMBER, gap=0)
    c.bullets([
        ("Iranian embassy in Spain, 13 Oct 2023", "Denied \"the issuance of any court ruling against any international athlete\""),
        ("The painter he met in Tehran", "Denied filing a complaint"),
        ("Fact-checkers agree", "Factly, BOOM and Africa Check. They trace the story to Iranian sites"),
    ], size=36, sub=32)


@card("82_card_claim_conversion.png", ["CLAIM CHECK"],
      "PRNigeria; Lead Stories; New Arab.")
def _(c):
    c.claim("FALSE", RED, "\"He converted to Islam before King Salman\"")
    c.sp(20)
    c.text("ON THE RECORD", 27, "bold", AMBER, gap=0)
    c.bullets([
        ("The images were altered", "PRNigeria fact-check"),
        ("No statement or record supports it", "Lead Stories fact-check"),
        ("One second-hand comment is unverified", "Attributed to former Al-Nassr goalkeeper Waleed Abdullah"),
        ("The May 2023 sujood was real and filmed", "He has not explained it, in what we read"),
    ], size=34, sub=30)


@card("83_card_claim_stake.png", ["CLAIM CHECK", "REPORTED, NOT CONFIRMED"],
      "GOAL; The Sun; Daily Mail; Asharq Business; A Bola; World Soccer Talk.")
def _(c):
    c.claim("UNVERIFIED", AMBER, "\"He was given a 15% stake in Al-Nassr\"")
    c.sp(8)
    c.text("THE REPORTS CONFLICT", 27, "bold", AMBER, gap=0)
    for when, what, who in [("Jan 2025", "5% offered", "GOAL's retelling"),
                            ("Jun 2025", "15%, worth £33m", "The Sun's sources, Daily Mail"),
                            ("Sep 2026", "Priority on 20%, if club opens up", "Asharq Business, A Bola"),
                            ("Oct 2026", "PIF 100%. Not a confirmed shareholder", "Saudi journalist Al-Rasheed, via World Soccer Talk")]:
        c.sp(10)
        c.row(when, what, who, lw=170, lsize=30, rsize=33, subsize=27)


@card("84_card_list_where_he_lives.png", ["REPORTED", "NO PRICE CONFIRMED"],
      "Gulf News; Daily Mail; The Mirror via GOAL; Saudi Gazette; The Sun; Robb Report.")
def _(c):
    c.text("Where he lives", 58, "bold", gap=0)
    c.sp(14)
    c.text("JAN 2023: FOUR SEASONS, KINGDOM TOWER, RIYADH", 28, "bold", AMBER, gap=2)
    c.text("$250k to $300k", 76, "bold", AMBER, gap=0, lh=1.14)
    c.text("a month, reported", 38, "bold", gap=2)
    c.text("Gulf News $300k, unsourced. Others $250k. The Mirror: £250k total bill. No hotel price published.", 29, "regular", GRAY, gap=0)
    c.sp(16)
    c.rule()
    c.sp(14)
    c.text("DEC 2025: NUJUMA, RED SEA", 28, "bold", AMBER, gap=2)
    c.text("Two villas bought", 56, "bold", gap=2)
    c.text("About 26 km offshore. Purchase quoted via Saudi Gazette; about £7m total is The Sun's price, unconfirmed. No gift reported.", 29, "regular", GRAY, gap=0)
    c.sp(16)
    c.rule()
    c.sp(14)
    c.text("Exact current home unknown. Robb Report: a villa in Al-Muhammadiyah.", 30, "italic", WHITE, gap=0)


@card("85_card_quote_no_world_cup_clause.png", ["CLUB STATEMENT, 11 JAN 2023", "DENIED BY THE CLUB"],
      "Al-Nassr statement via Al Jazeera, ESPN. Marca reported the clause.")
def _(c):
    c.text("Marca reported a contract clause making him a 2030 World Cup bid ambassador. The club's answer:", 34, "regular", GRAY, gap=0)
    c.sp(30)
    c.text("“Cristiano Ronaldo's contract with Al Nassr does not entail commitments to any World Cup bids.”", 60, "italic", WHITE, gap=0, lh=1.28)
    c.sp(20)
    c.text("Al-Nassr", 38, "bold", AMBER, gap=0)
    c.sp(30)
    c.rule()
    c.sp(16)
    c.text("A club denial. We found no personal denial from Ronaldo, and the contract was never published.", 32, "regular", WHITE, gap=0)


@card("86_card_stat_goals_985.png", ["REPORTED TALLY", "ONE GOAL DISPUTED"],
      "ESPN; Yahoo; RonaldoStats. Tally as of 30 Oct 2026.")
def _(c):
    c.text("about", 48, "bold", gap=0)
    c.text("985", 220, "bold", AMBER, gap=0, lh=1.1)
    c.text("career goals. 1,000 not reached.", 42, "bold", gap=0)
    c.sp(20)
    c.rule()
    c.sp(16)
    c.text("THE DISPUTED ONE", 27, "bold", AMBER, gap=2)
    c.text("Goal 982, 23 Oct 2026 v Al-Faisaly", 36, "bold", gap=2)
    c.text("Opta rules it an own goal by Girotto. The league credits Ronaldo.", 30, "regular", GRAY, gap=0)
    c.sp(20)
    c.rule()
    c.sp(16)
    c.text("138 for Al-Nassr, in 160 matches", 36, "bold", gap=2)
    c.text("14, 50, 35, 30, then 9 so far, season by season", 30, "regular", GRAY, gap=0)


@card("87_card_list_what_saudi_got.png", ["REPORTED", "ONLY SOURCED NUMBERS"],
      "Gulf News, 10 Jan 2023; Football Benchmark, Mar 2025; Deloitte.")
def _(c):
    c.text("What Saudi Arabia got", 50, "bold", gap=0)
    for num, size, head, sub in [
        ("1,072%", 58, "Al-Nassr Instagram, up to about 11m", "By 10 Jan 2023. Gulf News"),
        ("over 57.5m", 58, "Al-Nassr following, all platforms", "From under 5.2m. Football Benchmark"),
        ("$957m", 58, "Saudi clubs' record spend, summer 2023", "Spent, not earned. His role unproven. Deloitte"),
    ]:
        c.sp(10)
        c.text(num, size, "bold", AMBER, gap=0, lh=1.14)
        c.text(head, 34, "bold", gap=0)
        c.text(sub, 28, "regular", GRAY, gap=0)
    c.sp(14)
    c.rule()
    c.sp(10)
    c.text("NO CREDIBLE FIGURE FOUND", 28, "bold", AMBER, gap=2)
    c.text("Shirt sales. Tourism. Broadcast audience.", 34, "bold", gap=0)


@card("88_card_stat_four_goals_wehda.png", ["9 FEB 2023", "LESS THAN 3 WEEKS IN"],
      "TNT Sports; Gulf News; The National; Wikipedia.")
def _(c):
    c.text("All four goals", 66, "bold", gap=0)
    c.text("4-0", 220, "bold", AMBER, gap=0, lh=1.1)
    c.text("v Al-Wehda", 62, "bold", gap=0)
    c.sp(24)
    c.rule()
    for when, what in [("22 Jan", "Debut, as captain"), ("3 Feb", "First goal, a late penalty"), ("9 Feb", "All four v Al-Wehda")]:
        c.sp(14)
        c.row(when, what, lw=170, lsize=36, rsize=36)


@card("89_card_stat_final_gamba_osaka.png", ["16 MAY 2026", "AFC CHAMPIONS LEAGUE TWO FINAL"],
      "ESPN; Arab News.")
def _(c):
    c.text("Lost at home", 66, "bold", gap=0)
    c.text("0-1", 220, "bold", AMBER, gap=0, lh=1.1)
    c.text("v Gamba Osaka", 62, "bold", gap=0)
    c.sp(24)
    c.rule()
    c.sp(14)
    c.text("Finals lost at Al-Nassr: four, by ESPN's count", 36, "bold", gap=0)


if __name__ == "__main__":
    names = sys.argv[1:] or list(CARDS)
    for n in names:
        build(next(k for k in CARDS if n in k))

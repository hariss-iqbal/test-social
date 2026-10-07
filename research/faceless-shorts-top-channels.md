# What the biggest faceless short-form channels do that we don't

Researched 2026-09-27. Scope: YouTube Shorts / TikTok / Reels, faceless story and explainer formats. Baseline: our Phantom of Heilbronn v4 (`topics/phantom-of-heilbronn/out/v4`).

Legend:
- **[M]** is measured by us in this research. Channel and video numbers come from `yt-dlp` on 2026-09-27. Frame data comes from YouTube storyboards (about 1 frame/s at 101×180).
- **[S]** has a cited source (link given).
- **[I]** is an inference or recommendation that no source states.

Quotes are kept under 15 words.

**Method and limits.**
- For each channel we listed up to 200 Shorts from its Shorts tab. We then fetched full metadata (views, likes, comments, duration, upload date) for the 8 most-viewed Shorts in that list and the 12 most recent. "Top" therefore means the top of the last ≤ 200 Shorts, not all-time.
- For 29 top Shorts we pulled the storyboard frames and measured three things on 1-fps frames: the visual change rate, how much frame 0 differs from frame 1, and how similar the first and last frames are. We measured our `final.mp4` with the same code (see §2.3).
- After about 40 requests YouTube bot-blocked the transcript and audio downloads, so **speech rate and exact first and last lines were not measured**. The spoken words come from the caption text burned into the storyboard frames.
- TikTok follower counts could not be pulled (yt-dlp user extraction failed), so this report is YouTube-centred.
- Scratch data (not committed): `$SCRATCH/ch/*.json`, `$SCRATCH/sb/*.jpg|json`.

---

## 1. Channel table

| Channel | YouTube subs [M] | Niche / format | Faceless? | Typical Short length [M] | Upload rate [M] |
|---|---|---|---|---|---|
| 5-Minute Crafts | 80.5 M | DIY/hacks; actors, no host, no dialogue | No host. Actors' faces are shown | top 38–44 s | daily+ |
| skibidi (ex DaFuq!?Boom!) | ~47 M [S: [piunikaweb](https://piunikaweb.com/2026/03/17/dafuqboom-youtube-channel-renamed-bringboomback/)] | 3D-animated serial story (Skibidi Toilet) | Yes | n/a (handle changed, not profiled) | episodic |
| Bright Side | 44.5 M | Fact/story explainers, motion graphics + VO | Yes | 44–59 s (median 52) | Shorts tab has none after mid-2024 |
| Zack D. Films | 28.6 M | 3D-animated micro-stories and "how it works" | Yes | top median 34 s, recent 41.5 s (28–53) | **~4/day** (12 in 3 days) |
| MSA (My Story Animated) | 27.5 M | Animated first-person life stories | Yes (cartoon) | top 8–60 s (median 30) | ~2–3/week |
| Kurzgesagt | 25.6 M | Animated science explainers | Yes | 2023–24: 52–60 s. **2026: 68–78 s** (median 71) | ~1.5/week |
| Daily Dose of Internet | 20.7 M | Curated viral clips + narrator | Yes (voice only) | top median 21.5 s (13–33) | ~2.5/week |
| The Infographics Show | 15.5 M | Animated explainers (war, body, "what if") | Yes | top 52–60 s, recent 13–39 s | irregular in 2025–26 |
| Explore With Us | 7.6 M | True crime: interrogation/bodycam clips + VO | Yes | 31–60 s (median 45) | Shorts mostly 2023 |
| Mr. Nightmare | 7.1 M | True scary stories + true crime | Yes (voice only) | 26–60 s (median 58) | Shorts 2023–24, feeds long-form |
| *Visual Venture* (ref.) | 1.98 M | Animated true-crime/Reddit horror | Yes | – | – |
| *History Matters* (ref.) | 1.92 M | Animated history Q&A | Yes | – | – |

Top-Short views in the last 200 Shorts [M]:
- Zack D.: 19–42 M
- Kurzgesagt: 12–20 M
- MSA: 4–24 M
- Daily Dose of Internet: 3.9–15 M
- Infographics: 1.8–6.7 M
- Explore With Us: 1.3–4.7 M
- Mr. Nightmare: 0.2–1.4 M

Zack D. Films reached 1 M subscribers in about 14 months and now has about 65 B total views [S: [ivideonow](https://ivideonow.com/blog/why-zack-d-films-dominates-youtube-shorts-with-unsettling-3d-animation-content-en)]. The closest format to ours is **Mr. Nightmare's true-crime Shorts** (Rodney Alcala, 58 s). **Explore With Us** is also close.

---

## 2. Findings per dimension

### 2.1 Length
- [M] Explainer and story channels land at **30–60 s**. Clip channels land at 13–33 s. Kurzgesagt has moved *up* to 68–78 s in 2026 and still gets 0.3–3.6 M views per Short.
- [S] Paddy Galloway's study of 5,400 Shorts (3.3 B views): most creators make 20–40 s. Shorts with **average view duration > 50 s averaged 4.1 M views**, so longer only wins *if retention holds* ([thread](https://threadreaderapp.com/thread/1646898356419981315.html)).
- Us: 83.4 s (v4). That is above every top channel's typical length. It is still inside our 61–90 s TikTok-rewards window.
- [I] 75–85 s is defensible only if retention holds. We have no view-duration data yet.

### 2.2 Hook: first second and first frame
- [M] **Zack D. starts mid-action, with a subject and verb in the first words.** The wasp Short opens on "A wasp flew into a parked…" with the wasp already in front of the plane. The car Short opens on "Two kids chase a ball into the road". The eagle Short opens with a boy throwing a rock at the eagle. The frame 0 → frame 1 change is 45–77 (ours: 30).
- [M] **Kurzgesagt** opens on a big title card inside the scene ("A BLACK HOLE appears!") over its recurring bird character. Frames 0–2 show the premise as an event.
- [M] **Daily Dose of Internet** opens on one spoken question, captioned mid-frame ("Why does this… really fun?"). After that the narration stops and the footage pays it off.
- [M] **Mr. Nightmare (Alcala)** opens on the twist: "It's crazy to think how Cheryl Bradshaw's gut instincts… probably saved…". It plays over archival footage of the woman smiling on the dating show.
- [S] YouTube shows creators a "Viewed vs swiped away" metric for Shorts ([YouTube Help](https://support.google.com/youtube/answer/12942217?hl=en&co=YOUTUBE._YTVideoType%3Dshorts)). In Galloway's data, Shorts under 60 % viewed "rarely performed well" and top performers sat at 70–90 %. His advice is to treat the intro "like a thumbnail" ([thread](https://threadreaderapp.com/thread/1646898356419981315.html)).
- Us: frame 1 is a **still** photo carrying three text layers: the hook card, the SOURCE line, and the caption "FOR SIXTEEN YEARS,". The first spoken words are a time adverbial, not a subject doing something. The first cut is at 1.73 s (good).

### 2.3 Visual change rate
Measured [M] as frames per 10 s whose 1-fps difference from the previous frame is above 25. This counts cuts **and** big camera or animation moves.

| Channel | Changes / 10 s |
|---|---|
| Zack D. Films (6 Shorts) | **7.4–9.8** |
| Daily Dose of Internet (4) | 5.7–9.4 |
| Bright Side (2) | 3.9–9.1 |
| 5-Minute Crafts (2) | 5.0–6.6 |
| Infographics (2 long) | 5.3–6.3 |
| Mr. Nightmare (4) | 0.7 (AI-image audio story) to 6.9 (Alcala) |
| Kurzgesagt (5) | **4.2–5.2** |
| MSA (2) | 4.3–5.0 |
| Explore With Us (3) | 2.5–4.6 |
| **Us, Phantom v4** | **4.4** (33 shots, average 2.53 s) |

Our rate matches Kurzgesagt, MSA and Explore With Us, but it is **half of Zack D.'s**. Pace is not a universal requirement, because slow channels hold attention with the story or the footage. [I] For a still-photo documentary our weak spot is the stretches where the picture barely moves while the voice explains (for example the fingerprint-file logic, 43–50 s).

### 2.4 Motion on stills
- [M] The large channels are nearly all native motion: 3D animation, 2D animation or real footage.
- [M] Mr. Nightmare's AI-image story ("Girl Home Alone", 831 K views) holds single stills for 5–12 s. Because it is an audio-first story, stillness works there.
- [I] Our Ken Burns approach is fine. The gap is not the moves themselves but the *number of different pictures per idea* (see §2.3).

### 2.5 Sound design
- The evidence here is weak because audio could not be downloaded.
  - [S] Zack D.'s effect libraries are catalogued by fans ([Soundeffects Wiki](https://soundeffects.fandom.com/wiki/Zack_D._Films)).
  - [S] Mr. Nightmare adds "eerie sound effects and scary music" ([Wikitubia summary](https://youtube.fandom.com/wiki/Mr._Nightmare)).
  - [S] Kurzgesagt uses a score composed for each video (Epic Mountain).
- [I] In 3D and animated Shorts every on-screen action has a sound. We deliberately cap sound effects at 9 per video. This is unverified as a retention factor, so it is not ranked high.

### 2.6 Voice
- [S] **Daily Dose of Internet**: a human narrator with a fixed catchphrase. Every description starts "Hello everyone, this is YOUR Daily Dose of Internet" [M].
- [S] **Mr. Nightmare**: a human narrator, "calm, slightly hushed, confiding" ([fluxnote](https://fluxnote.io/guides/scary-story-videos-guide)).
- [S] **Zack D.**: sources disagree. One says "distinct, human narration" at "high-velocity" ([ivideonow](https://ivideonow.com/blog/why-zack-d-films-dominates-youtube-shorts-with-unsettling-3d-animation-content-en)). Voice-clone vendors call it AI. Treat it as unknown.
- [S] A peer-reviewed study found human-voiced narratives produced more "narrative transportation" than AI-voiced ones ([ScienceDirect 2026](https://www.sciencedirect.com/science/article/abs/pii/S0363811126000196)).
- [M] Mr. Nightmare's true-crime Short cuts in **the real people's own audio** (the survivor's interview, "I'm not comfortable").
- Us: ElevenLabs Roger at 1.10 tempo, 195 words over 83.4 s = 140 wpm including pauses. Competitor wpm is unmeasured (transcripts blocked). We use no real archival audio.

### 2.7 Captions
All observed on cover frames and storyboards [M]:

| Channel | Caption style |
|---|---|
| Zack D. Films | **Small white sentence case, 1–3 words, lower third (~75 % height)**, no karaoke, no colour |
| Kurzgesagt | Tiny sentence case, low |
| The Infographics Show | Sentence case, white on a dark box, lower third, full clause |
| Mr. Nightmare / true crime | Sentence case, white on a **dark red box**, lower middle. The same box on every Short is a brand element |
| Explore With Us | Sentence case on a dark pill |
| Daily Dose of Internet | Captions only while speaking, then none |

- **None of the 9 channels uses our style**: ALL CAPS Montserrat 900, huge, mid-frame, word-by-word yellow highlight plus red emphasis.
- Our own `research/captions-style.md` already found that documentary content uses "minimal/no highlight" ([Recapo](https://recapo.ai/blog/best-caption-styles-for-shorts/)). The big story and explainer channels confirm it.

### 2.8 Colour and brand consistency
- [M] **Zack D.** puts its watermark *inside the 3D world*: "ZACK D FILMS" on the car, the cup and the cutting mat. It keeps one saturated palette and a recurring character model.
- [M] **Kurzgesagt** uses the same bird character and palette in every Short.
- [M] **Mr. Nightmare** shows a 0.5 s "MN" logo sting at about 6 s (not at 0 s), uses the same red caption box, and has a grain/vintage grade.
- [M] **Daily Dose of Internet** relies on a verbal catchphrase as its brand.
- Us: STYLE §1 bans logos and stings. Grade and captions are consistent. There is no recurring device a viewer would recognise within 1 s. [I] That device is what makes a returning viewer stop on the next video, and it also answers the YouTube "inauthentic content" concern about identity ([platform-standards §4b](platform-standards.md)).

### 2.9 Loop endings and rewatch
- [M] **Zack D. "A Wasp Built A Nest Inside A Plane"** (21.9 M views): the last line is "the leading theory is pretty strange". It plays over **the same wasp-and-plane shot as frame 1** (first/last frame difference 7.8). On replay, "…is pretty strange" flows straight into "A wasp flew into a parked…", so the loop is both narrative and visual.
- [M] **Zack D. "Self-Driving Car Dilemma"** asks at 13 s "So what should it be programmed to do?". It ends on the same question with a "?" graphic, a debate prompt that pulls comments and rewatches.
- [M] **Kurzgesagt "Coin-Sized Black Hole"** (20 M views): the last frame is the same bird-and-coin scene as frame 0 (difference 4.3). "Your Skeleton Is Electric" (difference 13.2) does the same.
- [M] **Mr. Nightmare (Alcala)** ends on a question ("…to be a problem?") over the opening footage (difference 8.0).
- **Us: first/last difference 60.1.** We end on a *silent* name card hold (`end_hold_s`, up to 4 s) after the last line, which closes the loop on purpose.
- [S] Since 2025-03-31 YouTube counts a Shorts view "whenever a Short starts to play or replay". Engaged views stay as the monetization metric ([Sprout summary](https://support.sproutsocial.com/hc/en-us/articles/35874991211533-YouTube-Shorts-View-Count-Update-March-2025)).
- [S] Instagram ranks on watch time, likes per reach and sends per reach (Mosseri, Jan 2025, via [dataslayer](https://www.dataslayer.ai/blog/instagram-algorithm-2025-complete-guide-for-marketers)).
- [S] TikTok: finishing a video is a "strong indicator of interest" ([TikTok Newsroom](https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you)).
- [M] Other rewatch triggers: Bright Side puzzle Shorts ("Find The Third Hidden Face…", "Only Creative Thinkers Can Solve This Riddle") and Zack D.'s dense visual detail.

### 2.10 CTAs, series, and feeding long-form
- [M] **Mr. Nightmare** ends a Short on a **5 s "Subscribe for More True Scary Stories" card** (831 K views). Descriptions say "Subscribe for more stories in short & long form". Clipped Shorts carry "Full video: <link>", so they feed the long-form channel.
- [S] YouTube's guidance for Shorts related-video links: use "verbal and visual cues during the final 5 seconds". The long video's first 5–10 s must deliver what the Short promised ([YouTube Blog](https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/)).
- [M] Zack D., Kurzgesagt and Daily Dose of Internet use **no spoken CTA**. They rely on format recognition and volume.
- [M] Series formats:
  - MSA: numbered recurring formats ("Rich Kid Problems V.1", spy-series episodes, "Recap").
  - Kurzgesagt: a running bit in descriptions ("We're back answering questions that no one asked").
  - Zack D.: repeatable title templates ("How X Works", "(Patent Pending)").
  - skibidi: its whole channel is one serialized story.
- [S] Galloway measured about 16.9 subscribers per 10 K Shorts views on average. Channels above 1 M subscribers converted better on Shorts than on long-form ([thread](https://threadreaderapp.com/thread/1646898356419981315.html)).
- [S] TikTok playlists keep series in order, and TikTok says playlists help followers find series ([TikTok creators](https://www.tiktok.com/@tiktokcreators/video/7468815107083095339?lang=en)). A claim that TikTok suppresses explicit follow-begging is unverified (vendor blogs).
- Us: no CTA, no series, no related-video link, no pinned-comment plan beyond sources.

### 2.11 Titles and covers
Title patterns over each channel's ~38 listed Shorts [M]:

| Channel | Titles with an emoji | Median words | Notes |
|---|---|---|---|
| Zack D. Films | **100 %** | 7 | Emoji last, e.g. "🥲 😨 🤨" |
| 5-Minute Crafts | 89 % | 8 | |
| Mr. Nightmare | 56 % | 10 | Tag "(TRUE STORY)" |
| Kurzgesagt | 0 % | 5 | 24 % are questions |
| Daily Dose of Internet | 16 % | 6 | Plain sentence-case teaser, "He Wanted No Part of It" |
| Us | 0 % | 12 | "The only clue in her murder was a woman who never existed" |

- [M] **Covers** (auto frames and chosen frames): one large, expressive face or character, usually mid-reaction, with little or no text. Examples: Zack D.'s pilot, Kurzgesagt's screaming Kirby-like star, the MSA character, Infographics' "WHEN YOU'RE SHOT" with a gun.
- Our cover is frame 1: a crime-scene still with hook text, a SOURCE line and a caption fragment ("FOR SIXTEEN YEARS,"). That is three text layers and no human focal point.
- [S] Custom Shorts thumbnails exist for YPP channels from 2026-07-24 ([platform-standards §1e](platform-standards.md)).

### 2.12 Posting frequency and testing
- [M] Zack D. posts about 4 a day. Daily Dose of Internet posts about 2.5 a week. Kurzgesagt about 1.5 a week. MSA 2–3 a week.
- [S] TheSoul (5-Minute Crafts / Bright Side) treats every upload as a test: "get almost instant feedback" before investing ([Engadget](https://www.engadget.com/the-soul-publishing-five-minute-crafts-slick-slime-sam-viral-content-victor-potrel-interview-143059122.html)). They run a lot of ideas and follow the formula that hits ([Vice](https://www.vice.com/en/article/viral-russian-youtube-channel-5-minute-crafts-not-a-psyop-just-good-at-making-videos/)).
- [S2] Instagram Trial Reels show a Reel to non-followers first, a cheap test of a hook ([dataslayer](https://www.dataslayer.ai/blog/instagram-algorithm-2025-complete-guide-for-marketers)).
- Us: one video, many internal review rounds, no audience test before publishing.

### 2.13 What the platforms say drives distribution
| Platform | Signals |
|---|---|
| YouTube Shorts | **Viewed vs swiped away** (first-second gate) [S]. Replays count as views [S]. Engaged views for money [S]. In Galloway's data likes, comments and shares showed "no strong relationships" with performance [S]. |
| TikTok | Completion of longer videos weighted strongly. Likes, shares, comments and follows count. Follower count is "not a direct factor" [S]. |
| Instagram | Watch time (including replays), likes per reach (followers), **sends per reach** (non-followers) [S2]. Originality enforced [S2]. |

---

## 3. GAP LIST: techniques the top channels use that our pipeline lacks

Ranked by likely impact on retention and follows. Evidence: **Strong** = observed across several top channels *and* matches a stated platform signal. **Moderate** = observed on several channels, or one plus a platform signal. **Weak** = vendor claims or a single case.

| # | Gap | Evidence | What to change (stage / file) |
|---|---|---|---|
| 1 | **Loop ending**: the last line flows into the first line, and the last frame matches frame 1. No silent hold at the end. | **Strong.** Zack D. wasp (21.9 M), Kurzgesagt black hole (20 M) and skeleton, Mr. Nightmare Alcala (§2.9). Replays count as views (YouTube), watch time and replays (IG), completion (TikTok). Ours: difference 60, silent name card. | `pipeline/STYLE.md` §2: replace "exactly one ending → silent name card" with "one ending line written to run into b01's first words". Show the name card *as an overlay during* the last line. `script-writer.md`: new `loop_line` field. `story-auditor` checks that reading last → first makes a sentence. `video-director.md`: the final shot reuses b01's first material and crop. `pipeline/timeline.py`: default `end_hold_s` ≤ 0.3. `pipeline/qc.py`: warn when the first/last-frame difference is > 20 (same 101×180 metric as here). [I] Dignity check: the name card still appears; it just isn't a dead-air hold. |
| 2 | **Frame 1 = an action or subject, not a text-covered still**; the first spoken words are subject + verb. | **Strong** for the swipe gate. Zack D. (6/6), Kurzgesagt, Daily Dose of Internet and Mr. Nightmare all open on an event or twist. YouTube VVSA; below 60 % viewed rarely performs (Galloway). | `script-writer.md` + `pipeline/checks.py` (script): b01 must not start with a time or place adverbial ("For sixteen years,"). Its first 4 words need a concrete subject + verb, e.g. "One woman's DNA turned up at forty crime scenes…". `video-director.md`: the first shot is footage or a moving card with motion in its first 10 frames, and at most **one** text layer on frame 1 (hook OR caption, not both plus SOURCE). Delay the SOURCE line to ≥ 1.5 s. `qc.py`: report the frame 0→1 change and the number of text layers on frame 1. |
| 3 | **Documentary caption style**: sentence case, smaller, lower, no karaoke colours. | **Moderate–strong.** 9/9 top story and explainer channels (§2.7). Our own captions research already said so. | `src/short/` caption component + `pipeline/config.py`: implement the "Documentary Subtitle" preset from `captions-style.md` §3. Suggested: sentence case, ~64–70 px, dark translucent box (brand colour, see #6), centre at y≈1300–1400, 3–6 words, no yellow active word; keep red for ≤ 1 word per video. Run one video in each style (see #9). |
| 4 | **Named series + end-of-video path** (related-video link, "part 2", playlist, CTA in the last 5 s). | **Moderate.** Mr. Nightmare's subscribe card and "Full video" links; MSA's numbered series; YouTube's own related-video guidance; TikTok playlists. Zack D. and Kurzgesagt get follows from format recognition instead. | `orchestrator.md` + `pipeline/run.py` (publish): add `series` (e.g. "Cases solved by accident"), `episode`, `related_video_id`, `playlist`, `pinned_comment` to `publish.md`. `script-writer.md`: an optional ≤ 4-word spoken tag inside the loop line ("…case file forty-one"). No "smash subscribe". [I] Test a 2-part split on one story (part 1 ends on the driving question) on TikTok only first. |
| 5 | **Comment/debate trigger**: end on a genuine, fact-supported open question or dilemma. | **Moderate.** Zack D. dilemma (53 s, 3 K comments on 0.6 M views in 1 day), Mr. Nightmare question ending, Kurzgesagt's question titles (24 %). TikTok counts comments; IG counts sends. | `script-writer.md`: `comment_prompt`, a question the record leaves open (Phantom: "Should the swab factory have been blamed?"). Keep STYLE's rule against rhetorical questions that contradict the record. `publish.md` pinned comment asks it. `doomscroll-viewer` output already has `comment_you_would_post`: score it. |
| 6 | **Recurring brand device recognisable in 1 s** (in-world watermark, fixed caption box colour, signature opener or sting at ~5 s, not at 0 s). | **Moderate.** Zack D. watermark on props, Mr. Nightmare MN sting at 6 s and red box, Daily Dose of Internet catchphrase, Kurzgesagt bird. It also supports YouTube's "inauthentic content" identity test. | `pipeline/STYLE.md` §1: allow a ≤ 0.6 s audio or visual signature at a scene change after 4 s (never frame 1). Put the channel mark on generated cards (`scripts/generate_cards.py`, e.g. an evidence-bag label "CASE FILE · <channel>"). Use one caption-box colour across videos. |
| 7 | **More pictures per idea in "explaining" stretches** (change rate). | **Moderate / mixed.** Zack D. 7–10 changes/10 s; Kurzgesagt, MSA and Explore With Us succeed at 4–5 like us. | `video-director.md`: in any beat longer than 4 s with no new noun on screen, add a punch-in, overlay or second material. Target ≥ 6 changes/10 s in 0–10 s and in the turn beat. `pipeline/qc.py`: add this report's 1-fps change metric per 10 s window (ours is 4.4 overall; 43–50 s is the slowest). |
| 8 | **Cover and title packaging**: one expressive human or character focal point, ≤ 8-word title, optional trailing emoji. | **Moderate** for titles (Zack D. 100 % emoji, median 5–8 words across channels). **Weak** for emoji as the cause. | `pipeline/run.py` (cover + publish): export a separate cover (not frame 1) with one subject and ≤ 4 words, no SOURCE or caption text. Title ≤ 60 chars / ≤ 8 words. For a victim: no emoji, and no expressive face of the victim; use an investigator, object or place instead [I]. Generate 3 title variants in `publish.md`. |
| 9 | **Audience testing at volume** (hook variants, Trial Reels, several posts per story). | **Moderate.** TheSoul's test-and-scale model, Zack D. at 4/day, Instagram Trial Reels. | `orchestrator.md`: after PUBLISH, render 2–3 **hook variants** (different b01 + first shot, same body) through `src/renderShort.ts`. Post one as a Trial Reel or TikTok first and keep the winner. Log viewed-vs-swiped and APV per variant in `ITERATIONS.md`. |
| 10 | **Real archival audio bites** (the real person's voice, ≤ 3 s). | **Weak–moderate.** Mr. Nightmare Alcala Short (survivor interview audio); Explore With Us is built on real audio. | `visual-curator.md`: catalog `audio_quote` segments (source, rights, `risk`). `video-director.md`: ≤ 2 bites, music ducked, with a caption. Rights: news or interview audio is `risk: medium`; keep it short and commented on (platform-standards §4d). |
| 11 | **Length**: a tighter 45–60 s Shorts cut alongside the ≥ 61 s TikTok master. | **Weak / mixed.** Most top Shorts run 30–60 s, but Kurzgesagt now runs 70 s and Galloway finds longer is better *when* view duration holds. | `pipeline/STYLE.md` §1: keep 61–75 s as the target (v4 ran 83 s, over it). Optional `short_cut` beat list in `script.json` that drops 1–2 escalation beats for a YouTube-only render. Decide from APV data, not now. |
| 12 | **Denser, action-synced sound** (foley on every on-screen action). | **Weak** (no audio measured; 3D channels only). | Test only: `pipeline/sfxlib.py` "soft foley" class exempt from the 9-effect budget at −8 dB (paper, bag, camera shutter), and A/B it once. |

**Already in line with the leaders** (no gap):
- The first cut arrives by 2 s.
- The overall change rate is at Kurzgesagt level.
- The loudness master is fine.
- Real sources are shown on screen, which none of the entertainment channels do. [I] This is a trust differentiator worth keeping, but move it off frame 1.
- Story structure (premise → question → escalate → signposted answer) matches Mr. Nightmare's and Zack D.'s narrative Shorts.

---

## Sources
- Channel and video stats, storyboards, titles, descriptions: YouTube via `yt-dlp` 2026-09-27 [M].
- Paddy Galloway, 3.3 B-view Shorts study: https://threadreaderapp.com/thread/1646898356419981315.html
- YouTube Help, Shorts content analytics: https://support.google.com/youtube/answer/12942217
- YouTube Blog, related videos from Shorts: https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/
- Shorts view counting change (2025-03-31): https://support.sproutsocial.com/hc/en-us/articles/35874991211533-YouTube-Shorts-View-Count-Update-March-2025
- TikTok, How TikTok recommends videos: https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you
- Instagram signals (Mosseri, secondary): https://www.dataslayer.ai/blog/instagram-algorithm-2025-complete-guide-for-marketers
- Zack D. Films format analysis: https://ivideonow.com/blog/why-zack-d-films-dominates-youtube-shorts-with-unsettling-3d-animation-content-en
- TheSoul Publishing: https://www.engadget.com/the-soul-publishing-five-minute-crafts-slick-slime-sam-viral-content-victor-potrel-interview-143059122.html ; https://www.vice.com/en/article/viral-russian-youtube-channel-5-minute-crafts-not-a-psyop-just-good-at-making-videos/
- DaFuq!?Boom! rebrand / subs: https://piunikaweb.com/2026/03/17/dafuqboom-youtube-channel-renamed-bringboomback/
- Mr. Nightmare delivery: https://fluxnote.io/guides/scary-story-videos-guide
- Human vs AI narration (narrative transportation): https://www.sciencedirect.com/science/article/abs/pii/S0363811126000196
- Caption consensus: https://recapo.ai/blog/best-caption-styles-for-shorts/
- Faceless channel list (Bright Side 44.5 M etc.): https://vidpros.com/top-faceless-youtube-channels/

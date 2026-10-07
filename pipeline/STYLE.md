# Short-form documentary style rules

These rules apply to every true-crime / mystery short made by this pipeline.
Numbers that code enforces live in `pipeline/config.py`; this file is the *why*
and the creative rules that agents apply. When a rule and a checker disagree,
the checker wins. Fix the rule.

## 1. Format
- 9:16, 1080x1920, 30 fps. One file serves YouTube Shorts, TikTok and Reels.
- Target **55–75 s (150–195 words at 2.8–3.3 words/s)**. Top faceless channels narrate at 200–275 wpm; we were at 140 (Phantom v4) (research/gap-plan.md G3). TikTok Creator Rewards only pays for videos of 60 s or more, while Shorts and Reels retention drops past ~90 s. Hard limits 58–90 s. Master spec and safe zones: `research/platform-standards.md`.
- No title card, logo sting, or "subscribe" beat. Frame 1 is already story. A small channel wordmark (`C.CHANNEL_MARK`, from 4 s on, never frame 1) is allowed once the owner names the channel.
- **Loop ending (G1).** The video ends on its final spoken line and cuts straight back to frame 1 (edl `loop: true`, `end_hold_s` ≤ 0.5). The final line is a complete sentence that also hands over into b01 on replay (`story_spine.loop_line`); the victim's name card runs as a label DURING that line, not as a silent hold. (Zack D. Films, Kurzgesagt and Mr Nightmare all loop; our 3 s silent tail was where viewers swiped.)
- **Series identity (G7).** `publish.series` + `publish.episode`, a `comment_prompt` (a question the facts genuinely leave open; never an insinuation) and a ready `pinned_comment` (sources + that question).

## 2. Story mode (the narration is a STORY, not a case summary)
The v12 narration read like a briefing: 11 beats, each reporting one fact, told in the order of an argument (evidence → theory → counter-evidence → ruling). The owner said it sounded "like I'm summarizing to AI". Linking words won't fix that; the shape has to change. Rules:
- **Story spine first.** Before any sentence is written, decide: the *character* (who we follow), the *question* that pulls the viewer forward, 5–7 *scenes in time order* (a place, a moment, something happening), and the *payoff* that answers or reframes the opening.
- **Chronology with dramatic irony.** The cold open may show the end (the viewer knows something the characters don't); after that, time moves forward. Every scene is anchored in time or place ("That night…", "On February nineteenth…", "Upstairs…").
- **Scenes, not topics.** At least 3 beats are told as moments (present tense is good): someone does something, somewhere. "Her last known video:" is a topic label; "She steps into the elevator. Peers out…" is a scene.
- **The character stays present.** She (or the people around her) is the subject of most sentences. Officials appear inside her story, not as the story.
- **Narration tells, the screen proves.** Evidence (court quotes, document names, exact counts, "reportedly/under oath" nuances, sources) goes ON SCREEN as documents, highlights, pull-quotes and source lines. The voice carries only what the story needs. Budget: ≤ 7 distinct facts in the narration.
- **Talk like a person telling a friend.** No colon headers ("The detective's theory:"), no caption fragments as sentences ("Elisa Lam, twenty-one, from Vancouver."). Vary sentence length. One or two questions to the viewer are fine.
- **Hedges are placed once, where they matter.** Attribute a theory once, at its start ("The lead detective came to believe…"), then TELL it plainly as his account. Don't re-attribute every clause; the checker accepts one attribution per opinion beat. Precise legal nuance (reportedly / under oath) goes on screen.
- **One tense per telling.** Keep the storytelling tense (present or past) consistent; don't slide into reported speech after the climax.
- **One thesis.** Write the story's point in ONE sentence first (e.g. "The water everyone kept drinking is what finally led someone to her"). Every beat serves it or is cut.
- **Premise → question → escalate → answer** (from `research/elisa-reference-analysis.md`: BuzzFeed Unsolved 30M views, Caitlin Doughty 1.6M, Draw My Life 2.8M).
  - **Premise first:** if the hook text reveals the central fact, the voice states it within ~10 s. Never withhold in the voice what the screen already told.
  - **Say the driving question out loud, once,** right after the premise.
  - **Escalate before you explain:** ≥ 2 beats make the mystery harder, each removing an easy explanation.
  - **The climax is the ANSWER/turn,** landing at ≈ 65–85 % of runtime.
  - v12–v22 held the discovery back to 58 % (the hook had already given it away), then explained with nothing escalating. That's why the flow felt wrong.
  - v23 (discovery at 7 s → flashback → question → escalate → answer) won on flow (critic 9), but the audio-first listener missed v22's forward motion and two viewers missed an ending that lingers.
  - Proven hybrid (v24): cold open with on-screen dramatic irony → forward in time → the discovery as MIDPOINT (~45–55 %) → the driving question → escalate as one moment + the correction → the ANSWER as the climax → one ending line that carries the honest open question and her.
- **No rhetorical questions that imply what the record contradicts** (e.g. "who closed it?" when both sworn accounts say it was open). Viewers took it as "somebody closed that lid".
- **Link every beat with an implicit "but / so / until".** If two neighbouring beats would join with "and then / also", merge or cut one.
- **Disputed facts use the correction pattern and serve the arc:** "At first X was said; then the person who was there said Y." The dispute raises the stakes before the answer; it is never a standalone gotcha after it.
- **Max two hedge/attribution markers in the whole script;** the rest goes on screen.
- **Exactly ONE ending.** After the climax: at most one short line, then the silent name card. No stacked closers (v22 had four: theory → dispute → ruling/open question → callback + fragment). Returning to the cold open is allowed only if it IS that one line, never in addition to it.
- **Signpost the reveal.** The climax beat's first words tell the viewer "this is the answer": "The truth was…", "In reality…", "What actually happened…", "As it turned out…", "It wasn't until…" (allow-list: `C.REVEAL_SIGNPOSTS`, research: `research/reveal-signposts.md`). Once per video, as the beat's first words, followed in the same sentence by the concrete answer; correction phrases ("it later emerged") only if the wrong belief was stated earlier. Never hype ("you won't believe", "plot twist", "shocking" are rejected by the checker). Sound-off: the same moment gets a matching on-screen card or stamp. (Phantom v4: "The woman without a face had never existed" landed without the viewer knowing it was the answer.)
- **The last line must mean something on its own.** Its final clause has a verb, and any callback states its link: not "…, her pistol inside." but a sentence that says what the pistol proves. A cold listener must be able to say in plain words what the last line means (Phantom v4).
- **Complete story, audited.** Before voice, the `story-auditor` maps beginning (who/where/when/status quo) → middle (driving question + escalation) → climax (signposted answer to that question) → ending (resolution + the person closed), and every setup to its stated payoff. `check story` must pass.
- **Redraft, don't patch.** Each revision round rewrites the whole narration top to bottom from the reviews. Line-level patches from many reviewers produce a patchwork (v22).

## 2b. Hook (first 3 seconds)
- The cold open drops the viewer into a sensory moment tied to the payoff (e.g. a guest turning on a tap), with the on-screen hook text adding the stakes ("SHE WAS IN THE WATER THEY DRANK").
- The first visual change happens at ≤ 2.2 s. The first frame is the strongest image, and it MOVES (footage or a camera move; G2).
- **The first words are a subject doing something** ("One woman left her DNA at forty crime scenes…"), not a time/place phrase ("For sixteen years,…"); the checker rejects the latter.
- **Frame 1 carries one text layer:** the hook text (≤ 6 words). The first shot's SOURCE line waits until the hook ends.
- **Cover and title (G5).** A dedicated cover (`edl.cover`: one focal picture, ≤ 4 words, one red keyword, optional red circle), not frame 1. Three title options ≤ 8 words that withhold the answer (`publish.titles`; words in `publish.spoilers` may not appear).

## 3. Ethics and accuracy
- She was a real person with a family. No mocking, no supernatural claims, no gore beyond the record. Mental illness is stated factually and with care.
- Every narrated fact must be supported by research.json, and the critic verifies it. The critic checks the story; it does not turn it back into a list.

## 4. Voice (FIXED SPEAKER, do not re-cast per video)
- **Speaker: ElevenLabs "Roger" (voice id `CwhRBWXzGAHq8TQ4Fs17`) on `eleven_v3`, tempo 1.10.** This is the channel voice. The owner approved it after the v7 audience test, so keep it for every video. (Brian won the pitch audition but was recognised as the stock "faceless channel" voice.)
- **Single take:** the whole script is synthesized in ONE request and split on the engine's word timings (`voice.single_take`, default on). Per-beat requests drift in tone and pitch: v7 per-beat F0 spread was 19 Hz, the v8 single take 11 Hz. Never turn this off to "fix one line"; edit the script and re-run the take.
- Delivery tags (v3): at most 2 beats, from `whispers | quietly | somber | slowly`, via the beat's `v3_tag`, never inside the narration.
- Write for the ear: numbers as words, no abbreviations or parentheses, short clauses. `pause_after_ms`: default gap 240 ms; ≤ 450 elsewhere; ONE long pause (700–1200) before the reveal. Pace 2.8–3.3 words/s (voice stage warns when slower). `*emphasis*` ≤ 1 word per beat (red caption).
- Only if Roger is unavailable (no valid `sk_` key): run `python3 -m pipeline.run audition <topic>` and cast an edge-tts voice for that video, and say so in ITERATIONS.md.
- Licensing: commercial use of ElevenLabs audio needs a paid plan. Voice Design, Music and library voices are paid-only via the API.

## 5. Music
- Pick from `assets/music/library.json` by mood. Mystery setup: `dark_ambient`/`unease`. Escalating case: `suspense`/`building`. Tragic ending: `melancholic`.
- Choose `offset_s` so the energy map (`energy_db_per_5s`) is present but not peaking at the start. Avoid long silent intros (values below -45 dB).
- The music is a **steady bed**: it sits ~12 dB under the narration and opens only slightly in gaps (0.24 → 0.30 gain, 0.9 s smoothing). It must never "pump" between lines; that read as inconsistent in the v7 test. This is automatic.
- One track per video, never switched mid-video.
- `"music": "drop"` on at most one beat DIPS the bed to 45% (it never goes silent; the owner heard the old full silence as the music cutting out). The bed never goes below a floor. `"swell"` at most once.
- Always credit the track (the export writes the CC-BY attribution into `publish.md`).

## 6. Sound effects
- Sound effects mark changes, never decorate. They are ducked to 30% under spoken words automatically; still, place them in gaps, never on a key phrase (the v12 water-drip sat on "onto that roof" and the words sounded mixed). **Budget: at most 9 per video** (v8 had 14 and felt busy). No two within 1.5 s of each other unless they are one action (e.g. whoosh + ding).
- `impact`/`sub_drop`: on the hook's first frame and on the reveal image. Nowhere else.
- `whoosh`: on a hard change of place or time (e.g. into the CCTV). Max 2.
- `riser`: ends exactly where the reveal cut lands (put it on the reveal shot; it's pre-rolled).
- `tick`/`shutter`: on text labels or evidence photos appearing. Optional.

## 7. Visual rules
- Every shot moves (`static` only for ≤ 1.5 s punctuation). Alternate move directions between neighbouring shots.
- Images: 1.2–3.5 s. Video: up to 6 s. Cut on the word the picture illustrates (`cue`).
- Landscape footage and low-res material use `contain_blur` (full-width panel over a blurred fill). Never black bars. For video, the fill is the same footage live-blurred, so the whole frame moves.
- **Never full-frame (`cover`) a sub-480p video to "make it bigger".** v11 tried it on the 352 px CCTV and she became an unrecognisable red blob. The largest sharp panel (≤ 1080×810) with a live fill is the ceiling.
- Portraits and faces use `cover` with `focus` on the eyes (roughly the upper third of the face box).
- Crop out burned-in chyrons, news logos and watermarks with `crop`. Never show another channel's branding.
- The same material appears at most twice, and never back-to-back unless it's a deliberate punch-in (different crop and focus).
- `treatment: cctv` for surveillance, `archival` for old or news photos, `doc` for everything else, `card` for generated cards.
- Transitions: default `cut`. `punch` for emphasis (max 4), `flash` for the reveal and CCTV entry (max 3), `dip` for a time jump (max 2).
- Text labels (`overlay`): place, date, or name, ≤ 34 chars, max 4 per video. They show after the hook text is gone.

## 7b. Image enhancement (run `python3 -m pipeline.run enhance <topic>` after curation)
- Places, rooftops and evidence photos: Real-ESRGAN x4plus + gentle white balance/CLAHE.
- **Photos of real people:** 35% Real-ESRGAN blended with 65% denoised Lanczos + fine grain (55% read as "smeary eyes" in the v10 test). **Never** use face-restoration models (GFPGAN/CodeFormer) or full-strength GAN on a victim's face: they invent facial detail.
- **CCTV / evidence video: never GAN-upscaled.** In testing it hallucinated eyes and a mouth onto her face. Only temporal denoise + Lanczos (done in `timeline`).
- Documents and scans: Lanczos + unsharp only (GANs invent letters).
- The enhanced file is used automatically. The original stays in `materials/` for provenance.

## 7a. Tone of official findings
- Don't use the `stamp` scene (a rubber stamp slamming "ACCIDENT") for a real person's death ruling. Three panel rounds said it makes her death feel like paperwork or a movie prop. Say the ruling over a quiet image, or show the real document with a highlight.

## 7c. Sources on screen
- Every shot shows a small `SOURCE · …` credit (from the catalog `source_label` or the shot's `source_tag`). Animated scenes MUST carry `props.source`. Expert viewers trust (and share) facts they can trace.
- **Evidence callouts (G6):** circle or box the detail the voice names (`callout` on the shot) — a stamp, a label, a face in a crowd, a car. One per ~10 s at most.
- **Picture changes (G8):** explaining stretches change picture every ≤ 2.5 s; QC warns on any 5 s window without a new shot.
- Filler: hotel exterior/interior shots ≤ 4 per video, and never the Cecil sign over an unrelated line. Prefer case documents (LAPD release, court filings, coroner pages).

## 8. Captions
- Burned in, 2–4 words per page (1–2 big words during the hook), sentences split into even pages so there are no one-word leftovers, uppercase Montserrat 900, white with a thick black stroke. The spoken word turns yellow and `*emphasis*` words turn red.
- Page centre at y 1250 (65 % of height). An optional documentary preset (`caption_style: "doc"`: sentence case on a dark box) exists for A/B tests; the bold style stays default until a test says otherwise.
- They sit at 60–70 % of frame height, clear of the TikTok/Reels bottom UI (bottom 480 px) and the right-side buttons (right 150 px).
- They come from the TTS engine's own timestamps, so there is no drift and no misspelled names.

## 9. Rights & honesty
- **Platform policy gates (all three platforms):** no bodies, blood, autopsy or death-scene imagery, even blurred. No first-person AI voice "as" the victim. No AI reconstruction of real people. Say the documentary context out loud in the video, not only in the title. No other creator's watermark. At most 5 hashtags. Keep the cover text inside y 240–1680 (Instagram's 3:4 grid crop).
- Kevin MacLeod tracks are CC BY (credit is in `publish.md`), but they are registered with claim systems, so expect claims you may need to dispute. A licensed or self-generated bed avoids this.
- Prefer public-record material (police releases, court docs), Wikimedia CC, and our own generated cards. News footage is `news_media`/`risk: medium`: use it briefly, cropped, under commentary.
- Never fabricate evidence, fake documents, fake timestamps or AI images of the real victim. Generated visuals may only be abstract or atmospheric (e.g. a map, a timeline card).
- Every factual sentence in the script must trace to a `key_facts` entry with a source.
- **The SOURCE line credits the PICTURE, never the narrated fact.** (Found in v25–v27: family photos credited "LAPD NR13034rf", a Flickr photo credited "AP via Fox News", and stale credits surviving a photo swap.) Fact sources go in an overlay/pull or in publish.md. `check edl` enforces that an explicit `source_tag` contains the picture's catalog credit.

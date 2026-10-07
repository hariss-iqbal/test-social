# Reveal signposts: how storytellers say "this is the answer"

**Question:** what spoken phrases do successful true-crime and mystery narrators use to mark the climax, the point where the reveal or answer arrives? How should our 60–90 s Shorts use them, and what should `C.REVEAL_SIGNPOSTS` (pipeline/config.py) allow?

**Method (Sept 2026).** Phrases were mined from real transcripts with regex plus manual reading of the context around each hit:

| Corpus | Source | Size |
|---|---|---|
| MrBallen YouTube Shorts (15) | YouTube auto-captions via `youtube-transcript-api` | ~5.5k words |
| Mr. Nightmare Shorts (9) | YouTube auto-captions | ~1.4k words |
| LEMMiNO long-form mysteries (9: D.B. Cooper, Dyatlov, MH370, Jack the Ripper, Roanoke, Bermuda Triangle, Battle of LA, Cicada 3301, UFO cases) | English caption files in the Internet Archive item [lemmino-archive-2022](https://archive.org/details/lemmino-archive-2022) | ~37k words |
| Casefile, cases 342 (Julia Wallace), 343 (John Zera), 344 (Amerithrax) | [podscripts.co](https://podscripts.co/podcasts/casefile-true-crime) transcripts | ~42k words |
| Morbid, "Killer in the Walls: Daniel LaPlante" | [podscripts.co](https://podscripts.co/podcasts/morbid/killer-in-the-walls-the-crimes-of-daniel-laplante) | ~11k words |
| MrBallen Podcast, "The Black Sheep" | [podscripts.co](https://podscripts.co/podcasts/mrballen-podcast-strange-dark-mysterious-stories/the-black-sheep) | ~7k words |
| BuzzFeed Unsolved, "The Bizarre Death of Elisa Lam" | [pickscribe transcript](https://pickscribe.com/v/48jBi86ih5Q), fetched through a summariser, so treat the quotes as near-verbatim | 1 video |
| Caitlin Doughty, Elisa Lam | our earlier analysis, `research/elisa-reference-analysis.md` ([video](https://www.youtube.com/watch?v=B_if47gEn0w)) | 1 video |

**Limits.** YouTube IP-blocked the caption requests after the first 24 videos. As a result, the BuzzFeed Unsolved Shorts, That Chapter, Kendall Rae and Bailey Sarian transcripts could **not** be fetched, and they are not quoted here. Craft claims come from the cited sources. Anything I inferred is marked **[I]**.

---

## 1. Observed reveal signposts, ranked

The ranking weighs four things: (1) how clearly the phrase says "the answer is coming" on its own, (2) whether it appears across several creators, (3) whether it works in 1–2 seconds of narration, and (4) whether it sounds natural rather than hype. The ranking itself is [I]. Every quote is from the corpus above. Positions (%) are the share of transcript words where they occur.

### (a) Truth-reveal: "here is what was really going on"

| # | Phrase | Observed use | Source |
|---|---|---|---|
| 1 | **"In reality, …"** | Casefile: *"Doctors initially suspected … an allergic reaction to acne medication … **In reality**, she had contracted cutaneous anthrax."* LEMMiNO (Bermuda Triangle): *"**In reality**, turning west would've saved their lives."* LEMMiNO (Dyatlov): *"…while **in reality** it's a rather minor detail."* MrBallen Podcast: *"…he believed it was just a typical Monday morning … when **in reality**, he had a gaping head wound."* | [Casefile 344](https://podscripts.co/podcasts/casefile-true-crime/case-344-amerithrax) · [LEMMiNO Bermuda](https://www.youtube.com/watch?v=AgMcqNnqatw) · [LEMMiNO Dyatlov](https://www.youtube.com/watch?v=Y8RigxxiilI) · [MrBallen Black Sheep](https://podscripts.co/podcasts/mrballen-podcast-strange-dark-mysterious-stories/the-black-sheep) |
| 2 | **"As it (later) turned out, …" / "It turned out …"** | LEMMiNO (Cicada 3301, 29 %): *"What happens when you reach the end? However, **as it later turned out**, this was only the beginning."* MrBallen Podcast: *"**As it turns out** Chris was failing at school and taking out huge loans in his father's name."* Morbid: *"**It turned out** that brief period of freedom was all the time LaPlante needed."* LEMMiNO (Roanoke): *"they all **turned out** to be fake."* BuzzFeed Unsolved: *"**It turns out** the last time she was seen was actually on surveillance footage from the hotel elevator."* | [LEMMiNO Cicada](https://www.youtube.com/watch?v=I2O7blSSzpI) · [MrBallen Black Sheep](https://podscripts.co/podcasts/mrballen-podcast-strange-dark-mysterious-stories/the-black-sheep) · [Morbid](https://podscripts.co/podcasts/morbid/killer-in-the-walls-the-crimes-of-daniel-laplante) · [LEMMiNO Roanoke](https://www.youtube.com/watch?v=iTOKRWgjOlg) · [BuzzFeed Unsolved](https://www.youtube.com/watch?v=48jBi86ih5Q) |
| 3 | **"So, what happened? … This is what [I believe / we now know] …"** (spoken question, then the answer) | LEMMiNO (Dyatlov, at ~72 %, the start of his explanation): *"**So, what happened?** Why did they leave the tent? Why was it slashed open from the inside? … **this is what I believe to be the most credible explanation.**"* | [LEMMiNO Dyatlov](https://www.youtube.com/watch?v=Y8RigxxiilI) |
| 4 | **"There is a very simple explanation."** | LEMMiNO (Roanoke, ~86 %): *"Tempting as it may be to envision some elaborate conspiracy, **there is a very simple explanation.** Remember how, in 1608, John Smith sent this rough map…? Well, …"* | [LEMMiNO Roanoke](https://www.youtube.com/watch?v=iTOKRWgjOlg) |
| 5 | **"The truth is / The truth was …"** | MrBallen (Short, non-crime): *"**So, the truth is** I was briefly ranked in the top 30. Here's the story."* LEMMiNO (Ripper, closing line): *"…one can never be certain where the lies end and **the truth** begins."* The phrase is common in titles and framing (Bailey Sarian Short title: *"**The truth is** more unsettling with these Dark Conspiracies"*), but it was rare as an in-narration climax opener in this corpus. | [MrBallen Short](https://www.youtube.com/shorts/GkXaewOQ9Xw) · [LEMMiNO Ripper](https://www.youtube.com/watch?v=lADBHDg-JtA) · [Bailey Sarian Short](https://www.youtube.com/shorts/W7zYrrT0Ffo) |
| 6 | **"What really happened …"** | Used as the *question* the story promises to answer (for example, *"…leaving us to wonder, decades later, **what really happened** to Dorothy Jane Scott"*, a promo read inside MrBallen Podcast). It did not appear as a climax opener in the corpus, but it is the natural declarative form: "What really happened was…". [I] | [MrBallen Black Sheep](https://podscripts.co/podcasts/mrballen-podcast-strange-dark-mysterious-stories/the-black-sheep) |

### (b) Turn / realisation: "the moment it clicked"

| # | Phrase | Observed use | Source |
|---|---|---|---|
| 7 | **"And that's when …"** | Mr. Nightmare Short (the turn beat): *"…when Sabrina's father picked up sounding completely fine, **that's when she knew**. … there was no accident."* MrBallen Podcast (~75 %, the climax of the story): *"**And that's when** Art's wife winds up and blasts him across the face."* LEMMiNO (Ripper): *"**That's when** he saw the severely mutilated body…"* | [Mr. Nightmare](https://www.youtube.com/shorts/EoX7zBE9yNs) · [MrBallen Black Sheep](https://podscripts.co/podcasts/mrballen-podcast-strange-dark-mysterious-stories/the-black-sheep) · [LEMMiNO Ripper](https://www.youtube.com/watch?v=lADBHDg-JtA) |
| 8 | **"… sure enough, …"** (the suspicion is confirmed) | MrBallen Short (cold-case climax): *"They ultimately did DNA … but they discovered that **sure enough**, the John Doe … was David Lewis, **which means** …"* LEMMiNO (D.B. Cooper): *"The notes were promptly inspected, and **sure enough**, the serial numbers matched."* MrBallen Podcast: *"They go inside and **sure enough**, Peter is dead."* | [MrBallen Short](https://www.youtube.com/shorts/uXLJaEDvtHU) · [LEMMiNO Cooper](https://www.youtube.com/watch?v=CbUjuwhQPKs) · [MrBallen Black Sheep](https://podscripts.co/podcasts/mrballen-podcast-strange-dark-mysterious-stories/the-black-sheep) |
| 9 | **"… realized …" / "came to the horrible realization"** | Mr. Nightmare Short: *"Marissa **came to the horrible realization** that somebody else was in the house with her."* Mr. Nightmare Short: *"it took me at least a second before I could **realize** he was choking me."* LEMMiNO (Dyatlov reconstruction, 91 %): *"they make it outside and quickly **realize** what a terrible situation they're in."* | [Mr. Nightmare](https://www.youtube.com/shorts/8mJHovmv-ao) · [Mr. Nightmare](https://www.youtube.com/shorts/z2fip3y1Op4) · [LEMMiNO Dyatlov](https://www.youtube.com/watch?v=Y8RigxxiilI) |
| 10 | **"It wasn't until … that …"** | Casefile: *"**It wasn't until** the guilty verdict was handed down that public perception of William Wallace began to shift."* LEMMiNO (Roanoke): *"**It was not until** the spring of 1590 … that White finally managed to…"* | [Casefile 342](https://podscripts.co/podcasts/casefile-true-crime/case-342-julia-wallace) · [LEMMiNO Roanoke](https://www.youtube.com/watch?v=iTOKRWgjOlg) |

### (c) Correction: "it was thought X; it later emerged Y"

| # | Phrase | Observed use | Source |
|---|---|---|---|
| 11 | **"Initially / originally … → later revealed / has since emerged … → meaning …"** | Caitlin Doughty (Elisa Lam, 81–85 %): *"it was **originally thought** the lid was closed … a much **later interview revealed** it was open, **meaning** she could have got in herself."* Casefile: *"Doctors **initially** suspected a spider bite…"*, then *"tests **later revealed** the substance was merely a harmless vaccine strain."* ("initially" appears 14× in 3 Casefile episodes. It is Casefile's main correction device.) | `research/elisa-reference-analysis.md` ([video](https://www.youtube.com/watch?v=B_if47gEn0w)) · [Casefile 344](https://podscripts.co/podcasts/casefile-true-crime/case-344-amerithrax) |
| 12 | **"It was later found out …"** | Mr. Nightmare Short: *"**it was later found out** she was allegedly diverted by Emma's half-sister Alyssa."* | [Mr. Nightmare](https://www.youtube.com/shorts/p5N-VKdECtQ) |
| 13 | **"… No. Actually, …"** (fake-out correction) | MrBallen Podcast: *"As you can tell, Chris is extremely emotional… **No. Actually**, he sounds as calm as if he's ordering a pizza because Chris Porco was **actually** a psychopath."* The narrator deliberately states the wrong reading, then corrects it. | [MrBallen Black Sheep](https://podscripts.co/podcasts/mrballen-podcast-strange-dark-mysterious-stories/the-black-sheep) |
| 14 | **"In fact, …"** | Casefile (9× in one episode): *"**In fact**, William hadn't been seen at the club since before Christmas."* LEMMiNO (16× total). This is a **weak** signpost: both creators use it for ordinary emphasis all the time, not only for the reveal. | [Casefile 342](https://podscripts.co/podcasts/casefile-true-crime/case-342-julia-wallace) |

### (d) Payoff callback: "remember that detail? here is why it mattered"

| # | Phrase | Observed use | Source |
|---|---|---|---|
| 15 | **"Remember …?" / "Remember how …? Well, …"** | LEMMiNO (Roanoke, the answer beat): *"**Remember how**, in 1608, John Smith sent this rough map of Virginia back to England? **Well**, this is not the original map…"* MrBallen Short (setup for the payoff): *"abandoned near the courthouse. **Remember**, he's a lawyer."* | [LEMMiNO Roanoke](https://www.youtube.com/watch?v=iTOKRWgjOlg) · [MrBallen Short](https://www.youtube.com/shorts/uXLJaEDvtHU) |
| 16 | **"(If) you (may) recall, …"** | LEMMiNO (Ripper, 95 %): *"Then there's the matter of the rings. **You may recall** that two brass rings were stolen…"* LEMMiNO (Cooper, 90 %): *"**If you recall**, eight cigarette butts were collected from the scene…"* LEMMiNO uses it 6× across 9 videos, almost always in the last 15 %. | [LEMMiNO Ripper](https://www.youtube.com/watch?v=lADBHDg-JtA) · [LEMMiNO Cooper](https://www.youtube.com/watch?v=CbUjuwhQPKs) |
| 17 | **"So, if we follow what's happened here, …" / "…which means …"** (recap that makes the implication explicit) | MrBallen Short, immediately after the reveal: *"…was David Lewis, **which means** when he was hit and killed was 24 hours after… **So, if we follow what's happened here**, David Lewis starts watching the game. Within 24 hours … he winds up 1,600 mi away…"* followed by the single ending line *"And to this day, no one has any idea of what happened to David Lewis or why."* | [MrBallen Short](https://www.youtube.com/shorts/uXLJaEDvtHU) |

---

## 2. Guidance

### Where it goes
- **The first words of the climax beat.** Ira Glass's model has two parts. First, keep raising questions: *"Always raise questions, and answer them."* Second, deliver a moment where *"somebody's gotta say, here's why the hell you're listening to this story"* ([visakanv transcript of Glass](https://www.visakanv.com/archives/2013/03/19/building-blocks-of-storytelling-ira-glass/)). The signpost is the audible hinge between the two.
- **Late.** Short-form guides put the payoff in the final ~10–25 % of runtime ([Socialync](https://www.socialync.io/blog/short-form-video-structure-guide-2026): "Final 10-20% of the Video"; [faceless.so / roundup](https://faceless.so/blog/short-form-video-script-the-retention-guide): "Payoff (last 15–25%)"). In the corpus, LEMMiNO's explanations start at ~72 % (Dyatlov) and ~86 % (Roanoke). MrBallen's cold-case Short reveals at ~80 %. This matches our checker's 60–92 % window.
- **Answer the spoken question.** The strongest pattern in the corpus is *question → signpost → answer*. LEMMiNO says "So, what happened? Why did they…? … this is what I believe…". Doughty poses four questions at 15 % and answers them later (`elisa-reference-analysis.md`). A truth-reveal signpost only lands if the driving question has been said out loud earlier. [I]
- **A correction frame needs its setup.** "In reality…" and "it later emerged…" work only if the wrong belief ("initially / it was originally thought / police assumed…") was stated earlier, ideally as the thing that made the case look impossible (Doughty's lid, Casefile's "spider bite"). If the script uses a correction signpost with no earlier wrong belief, rewrite it. [I]
- **Follow it with the concrete answer in the same sentence.** "Vague payoffs feel like wasted time" ([Socialync](https://www.socialync.io/blog/short-form-video-structure-guide-2026)). MrBallen's "sure enough, the John Doe … was David Lewis, which means…" gives the fact and then its implication.

### How often
- **Once.** The climax signpost should occur once per script. Signposting over-used "will kill the magic" ([Dolezal, on podcast signposting](https://joshuadolezal.substack.com/p/the-podcast-trick-every-memoirist)). Forward-reference devices grab attention, but "excessive use … may lead to perceptions of clickbait" ([ERP study on forward reference](https://www.tandfonline.com/doi/abs/10.1080/10447318.2022.2158262); [Blom & Hansen, forward reference in headlines](https://www.researchgate.net/publication/270222863_Click_bait_Forward-reference_as_lure_in_online_news_headlines)).
- **Earlier "in fact" / "actually" is fine as ordinary speech.** It just doesn't count as the signpost. Avoid using "the truth", "in reality" or "turned out" before the climax, or they lose their force. [I]
- A payoff callback ("Remember…?") can appear once more in the ending line. That is a different function. [I]

### What to avoid
- **Hype and forward-reference clickbait:** "you won't believe", "plot twist", "shocking", "insane", "what happened next will…", "but what happened next would change everything…". Clickbait headlines measurably reduce credibility ([Clickbait: trust and credibility of digital news](https://www.researchgate.net/publication/350912220_Clickbait-Trust_and_Credibility_of_Digital_News)). They also clash with the measured true-crime tone in `.claude/skills/storytelling.md` ("Suspenseful, measured"). MrBallen is noted for never adopting a "dark and scary voice" ([Sherises Studios](https://www.sherisesstudios.com/post/from-youtuber-to-podcast-star-why-mrballen-s-storytelling-sets-the-gold-standard-for-the-genre)). None of the phrases "plot twist", "you won't believe" or "shocking" appeared in the narration of any creator in our corpus. The hype framing lives in titles, not in the storytelling voice.
- **"But here's the thing"** is a digression or argument marker, not a reveal marker. The only corpus hit was Morbid's host using it to start a tangent about cake. It signals "opinion incoming", not "answer incoming". **Drop it from the allow-list.** [I from corpus]
- **Bare "actually" / "in fact"** are too generic to tell the viewer that this is *the* answer (see §1 #14).
- **Vague non-answers after the signpost** ("The truth was… nobody knows"). If the case is unsolved, use the honest version: "What we do know is…" or MrBallen's "And to this day, no one has any idea…" as the *ending line*, not as the climax opener. [I]
- **Spoiling it on screen first.** If the hook text already gives away the answer, the spoken reveal cannot land (`elisa-reference-analysis.md`, v22 diagnosis).

### Sound-off viewers
- 69 % of consumers watch video with sound off in public places ([Verizon Media / Publicis Media, via Forbes](https://www.forbes.com/sites/tjmccue/2019/07/31/verizon-media-says-69-percent-of-consumers-watching-video-with-sound-off/)). Burned-in captions carry the phrase, but at word-by-word speed they may not mark it as the climax. [I]
- **On-screen equivalent [I]:** at the first word of the climax beat, show a short, still title card or caption treatment. Examples: **THE TRUTH**, **WHAT REALLY HAPPENED**, **IN REALITY** or **IT LATER EMERGED**. Match the spoken phrase so voice and screen agree. Hold it ~0.8–1.2 s over a darkened frame or the key evidence image. No bounce, no emoji; use the serif / restrained-accent style in `research/captions-style.md`. Pair it with the audio cue the checker already asks for: a silence or music drop before the reveal (`pipeline/checks.py`).
- Put the card after the silence, not before, so the sound-off viewer sees it at the same moment the sound-on viewer hears the phrase. [I]
- Only one such card per video, for the same reason there is only one spoken signpost.

---

## 3. Recommended allow-list for the climax-beat checker

The climax beat must *start* with one of these (case-insensitive, straight/curly apostrophes normalised). The phrases are listed roughly by strength:

1. the truth was
2. in reality
3. what really happened
4. what actually happened
5. it turned out
6. as it turned out
7. it later emerged
8. it was only later
9. it wasn't until
10. sure enough
11. and that's when
12. so what happened

**Notes for `pipeline/config.py` / `checks.py` [I]:**
- **Remove** `"but here's the thing"`, `"actually"`, `"in fact"`, `"the answer"` and `"the truth"` (bare) from `C.REVEAL_SIGNPOSTS`. The first is a digression marker. `actually` / `in fact` are everyday emphasis and will pass almost any sentence. Bare `the truth` also matches "…was telling the truth". Use "the truth was" / "the truth is" instead.
- **Match at the start**, allowing a leading "But" / "And" / "So", rather than anywhere in the first 60 characters. Otherwise "Police said she was actually…" passes.
- If the beat opens with "in reality", "it later emerged" or "it was only later", optionally require an earlier beat to contain a wrong-belief setup word (`initially`, `originally`, `at first`, `was thought`, `assumed`, `believed`).
- Warn if any allow-listed phrase appears in a beat *before* the climax, since the phrase should be used once.
- Reject the hype list anywhere in the narration: `you won't believe`, `plot twist`, `shocking`, `what happened next`, `insane`, `mind-blowing`.

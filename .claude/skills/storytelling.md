> Channel voice: **ElevenLabs Roger (`CwhRBWXzGAHq8TQ4Fs17`) on eleven_v3, tempo 1.10, single take.** See `pipeline/STYLE.md` §4. Proven beat order: STYLE §2.
>
> Research-backed musts (research/gap-plan.md, research/reveal-signposts.md): open on a subject doing something; ask the driving question aloud; the climax STARTS with a reveal signpost ("The truth was…", "In reality…", "It turned out…"); the final line is a complete sentence that states its meaning AND hands over into the first line on replay (loop); 2.8–3.3 words/s with one long pause before the reveal; no hype words.
>
> Note: this file covers narrative craft only. Where it talks about `[VISUAL:]` tags, scenes, or seconds per image, `pipeline/STYLE.md` and the agent contracts replace it.

# Storytelling & Narration Writing

## Purpose
Write compelling voiceover narration for documentary-style short-form video content. The narration must work as spoken word — it will be read aloud by a text-to-speech engine. Each paragraph is one **scene** with a `[VISUAL: ...]` tag that lists what the viewer sees during that narration.

## Script Format

The script MUST use this exact format — each paragraph is one scene:

```
[VISUAL: file1.jpg | file2.jpg | file3.jpg]
Narration text for this scene. Write in natural, flowing sentences that sound good spoken aloud.

[VISUAL: file4.mp4 | file5.jpg]
More narration text. Keep the pacing conversational and continuous.
```

### Multi-visual scenes (the key rule)

**Never hold a single image for more than 3-4 seconds.** If a scene's narration is 8 seconds long, you need 2-3 visuals for that scene. The video-producer splits the scene duration evenly across the listed materials.

Use the `|` separator to list multiple materials per scene:

```
[VISUAL: 02_cecil_hotel_exterior.jpg | 03_hotel_cecil_facade.jpg | 04_hotel_cecil_street_scene.jpg]
The Cecil Hotel had a dark reputation. Built in 1927, it had been linked to multiple deaths, and was once home to two serial killers.
```

This shows each photo for ~3 seconds instead of one photo for 9 seconds.

### How many visuals per scene?

| Scene duration | Visuals needed |
|---|---|
| 3-4 seconds | 1 visual (fine to hold) |
| 5-7 seconds | 2 visuals |
| 8-12 seconds | 2-3 visuals |

**Read `catalog.json` carefully.** Use every available material. If you have 9 materials and 5 scenes, spread them across scenes — don't leave materials unused while holding single images for 8 seconds.

### Visual tag rules

- `[VISUAL: filename.ext]` — single visual, filename must exist in catalog.json
- `[VISUAL: file1.ext | file2.ext | file3.ext]` — multiple visuals, split evenly across scene duration
- `[VISUAL GAP: description]` — needed visual that doesn't exist in catalog (fallback: black + text)
- **NEVER reference a file that isn't in catalog.json**
- The `[VISUAL:]` tag goes BEFORE its narration paragraph

## Curiosity Mining — The Most Important Step

Before writing a single word, **mine `research.json` for the most unsettling, surprising, or unexplained details.** These are what make viewers comment, share, and rewatch. A script without curiosity spikes is just a Wikipedia summary.

### What to look for:
- **Unexplained physical evidence** — specific forensic details that contradict the official story or raise questions
- **Sensory/visceral details** — anything that makes the audience physically react (what would you see, smell, feel?)
- **Failed systems** — searches that missed, investigations that went wrong, alarms that didn't trigger
- **Eerie coincidences** — details that sound fictional but are documented as real
- **Missing or contradictory evidence** — things that don't add up between official conclusions and physical facts
- **Human moments** — a last message, a personal detail, something that makes the subject a real person rather than a case file

### How to use them:
- **Don't just state facts — frame them as questions or contradictions.** Pair an official conclusion with the evidence that undermines it. A flat ruling is boring; the same ruling next to the detail that makes it suspicious is gripping.
- **Spread curiosity spikes across the script.** Every scene should have at least one detail that makes the viewer think "wait, what?"
- **Prioritize specific over generic.** A precise forensic detail always beats a vague summary of the same event.
- **The `compelling_details` array in research.json is your goldmine** — these were specifically flagged as the most interesting facts. Use them.

### The test:
Read each scene and ask: "Would this make someone stop scrolling?" If the answer is no, the scene needs a stronger detail from the research.

## Narrative Structure

The structure should emerge from the story, not a fixed template. Different topics call for different openings and arcs. Use your judgement based on what's available in `research.json` and `catalog.json`.

**General principles:**
- **Hook early** — the first 3-5 seconds must grab attention. This could be a person, a shocking fact, a question, or a dramatic moment — whatever is strongest for THIS story.
- **Build tension** — each scene should raise the stakes or deepen the mystery. Move chronologically unless a non-linear structure serves the story better.
- **End with impact** — close with an unanswered question, a haunting detail, or an emotional beat that lingers. When possible, end on a line that connects back to or contrasts with the opening — this encourages replays (which count as views on all platforms).
- **Match visuals to narration** — show what you're talking about. If mentioning a person, show them. If describing a place, show it. Let the content drive the visuals, not a fixed sequence.
- **Every scene needs a curiosity spike** — a detail, contradiction, or question that makes the viewer lean in. If a scene is just "stating what happened," it needs rewriting.

## Writing Rules — Natural Flowing Narration

**The TTS engine reads the script directly.** Sentence structure = audio pacing.

### Do:
- Write natural, flowing sentences — the kind a narrator would speak
- Use full sentences that connect smoothly when read aloud
- Vary sentence length for rhythm (mix short punchy lines with longer descriptive ones)
- Ask rhetorical questions to engage the viewer
- Name specific details: "Room 506" not "a hotel room"
- Use present tense for key moments to create immediacy

### Don't:
- Fragment sentences into choppy 5-6 word phrases (this creates choppy audio!)
- Use line breaks within a scene's narration (the whole paragraph = one audio segment)
- Use clichés: "little did she know", "what happened next will shock you"
- Write sentences longer than ~25 words
- Use academic or formal language

## Tone Guidelines by Category

| Category | Tone | Pacing | Language |
|---|---|---|---|
| True Crime | Suspenseful, measured | Slow build, fast reveals | Precise, clinical details mixed with emotional weight |
| Mystery | Investigative, curious | Steady with punctuated surprises | Questions, hypotheticals, "what if" |
| Disappearance | Haunting, empathetic | Slow, deliberate | Focus on the person, not just the case |
| Historical | Authoritative, vivid | Measured, cinematic | Period-appropriate references, sensory details |

## Pacing & Word Count

Our voices run at ~2.7–3.0 words/s. The target is **120–175 words (45–65 s), 6–10 beats**, enforced by `pipeline/checks.py`.
Format, visuals, voice, music and captions are covered in `pipeline/STYLE.md`. The script format is in `.claude/agents/script-writer.md` (`script.json`, no `[VISUAL:]` tags).

# Visual Tagging Rules

## Purpose
Map narration text to specific visual materials so that each moment in the script has corresponding images or video. The `[VISUAL:]` tag is what the video-producer uses to sync visuals to narration.

## Tag Format

### `[VISUAL: file1.ext | file2.ext | file3.ext]`
References specific files from `catalog.json`. Use `|` to list multiple visuals — the video-producer splits the scene duration evenly across them.

**Tag goes BEFORE the narration paragraph it belongs to.**

```
[VISUAL: 01_elisa_lam_portrait.jpg | 05_elisa_lam_graduation.jpg]
In January 2013, Elisa Lam, a 21-year-old university student from Vancouver, checked into the Cecil Hotel.
```

### `[VISUAL GAP: description]`
Marks a point where a visual is needed but no matching material exists in the catalog. The video-producer renders a black frame with text as fallback.

```
[VISUAL GAP: Missing person flyer or parents at press conference]
Her parents reported her missing on February 1st.
```

## Core Rules

### Rule 1: Tag goes BEFORE narration
The `[VISUAL:]` tag is always the first line, narration follows below it. Never put the tag after the narration.

### Rule 2: Use multiple visuals per scene
Never hold a single image for more than 3-4 seconds. If a scene is 8 seconds, use 2-3 visuals:

```
[VISUAL: 03_cecil_hotel_exterior.jpg | 07_cecil_hotel_los_angeles.jpg | 10_cecil_hotel_building.jpg]
The Cecil Hotel had a dark reputation. Built in 1927, it had been linked to multiple deaths.
```

| Scene duration | Visuals needed |
|---|---|
| 3-4 seconds | 1 visual |
| 5-7 seconds | 2 visuals |
| 8-12 seconds | 2-3 visuals |

### Rule 3: Use at least 60% of materials from catalog
Count the materials in `catalog.json`. Use at least 60% of available materials, **prioritizing real over stock**. With 20-30 materials, selectivity beats forced inclusion — choose the visuals that best match each narration moment rather than shoehorning every image in.

### Rule 4: Match visual to narration content
The visuals must correspond to what's being discussed:
- Talking about a person → show their photos
- Talking about a place → show location photos
- Talking about evidence → show evidence photos/video
- Talking about abstract concepts (theories, questions) → reuse a relevant photo

### Rule 5: Never reference files that aren't in catalog
Every filename in a `[VISUAL:]` tag must exactly match an entry in `catalog.json`. If you're unsure of the exact filename, check the catalog.

### Rule 6: Visual matches narration context
Show what the narration is talking about at that moment. If the sentence mentions a person, show them. If it describes a place, show that place. If it discusses evidence, show the evidence. Let the narration content drive the visual choices — don't follow a fixed template.

### Rule 7: Reuse sparingly
A material can appear in at most 2 scenes. Reusing a key image at the end for emotional resonance is fine — but never more than twice.

### Rule 8: Video clips get breathing room
Video clips (mp4) have natural motion, so they don't need to be split with other visuals. Give them their own scene or pair with at most 1 other visual.

### Rule 9: Visual variety
Avoid showing the same type of visual in consecutive scenes (e.g., two location-only scenes back to back). Mix content types — people, places, evidence, documents — based on what the narration naturally calls for.

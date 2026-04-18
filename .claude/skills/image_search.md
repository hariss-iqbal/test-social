# Image & Footage Search

## Purpose
Find and download REAL images and footage related to a case. Never use stock photos. Every image must be an actual photo from or related to the real events.

## Source Priority

Search these sources in order of preference:

1. **Wikimedia Commons** — public domain, high quality, easy to download
2. **News sites** — AP Images, Reuters, Getty (embedded in articles), major outlets
3. **Internet Archive** (archive.org) — historical photos, archived news pages
4. **Government/official sources** — court records, police releases, municipal archives
5. **Reputable media** — BBC, CNN, NYT, local newspapers of record
6. **Documentary stills** — screenshots from known documentaries (with attribution)

**NEVER use**: Stock photo sites, AI-generated images, unrelated images, social media reposts without verification.

## Search Strategy by Content Type

### Portraits / People Photos
- Search: `"{person name}" photo` or `"{person name}" portrait`
- Try: yearbook, graduation, social media profile (from news articles republishing them)
- For suspects: `"{name}" mugshot` or `"{name}" court appearance`
- Check Wikipedia/Wikimedia first

### Locations
- Search: `"{location name}" exterior photo` or `"{location name}" {city}`
- For buildings: try Google Maps street view mentions, architecture sites
- For crime scenes: `"{location}" crime scene` (news articles often have these)

### Evidence / Documents
- Search: `"{case name}" evidence photo`
- Court exhibits sometimes published by news outlets
- Police press conference photos often show evidence

### CCTV / Surveillance
- Search: `"{case name}" CCTV footage` or `"{case name}" surveillance video`
- News sites often host clips or stills from surveillance footage
- Check YouTube for news segments containing footage

### Court / Legal
- Search: `"{case name}" trial photo` or `"{person name}" courtroom`
- Wire services (AP, Reuters) cover major trials

## How to Extract Downloadable URLs

When you find an image on a web page:
1. Look for direct image URLs in the page content (ending in .jpg, .png, .webp)
2. Check `<img>` tags, `<meta property="og:image">` tags
3. For Wikimedia: use the direct file URL from the file description page
4. For news sites: the `og:image` meta tag usually has a high-res version

## Download Instructions

Use `curl` via Bash tool to download files:

```bash
curl -L -o "output_filename.jpg" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  "IMAGE_URL"
```

- Always use `-L` to follow redirects
- Always set a browser User-Agent header
- If a download fails (403/404), try alternate sources before giving up

## File Naming Convention

```
NN_descriptive_name.ext
```

- `NN` = two-digit sequence number (01, 02, 03...)
- `descriptive_name` = snake_case description of content
- `ext` = original file extension

Examples:
- `01_victim_portrait.jpg`
- `02_crime_scene_exterior.jpg`
- `03_surveillance_footage_still.png`
- `04_suspect_mugshot.jpg`
- `05_hotel_lobby.jpg`

## Catalog Entry Format

Write `catalog.json` with this structure:

```json
{
  "topic": "Case name",
  "materials": [
    {
      "filename": "01_victim_portrait.jpg",
      "source_url": "https://example.com/image.jpg",
      "description": "Portrait photo of [person] from [context]",
      "visual_type": "photo",
      "content_type": "person",
      "quality": "high"
    }
  ]
}
```

Fields:
- `visual_type`: `photo` | `video` | `document` | `screenshot`
- `content_type`: `person` | `location` | `evidence` | `event` | `court` | `surveillance`
- `quality`: `high` | `medium` | `low` (based on resolution and clarity)

## Quality Targets

Aim for at minimum:
- 2-4 photos of the victim/main subject
- 2-3 location photos
- 2+ evidence or event photos
- Any available surveillance footage stills
- 1-2 real video clips (surveillance, news reel, court footage)
- Total: at least 15 materials per case

More is better — **20-30 materials** gives the script writer maximum flexibility for precise visual-narration matching.

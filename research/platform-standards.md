# Vertical short-video platform standards (YouTube Shorts, Instagram Reels, TikTok)

Researched 2026-09-25. Legend used throughout:

- **[S]** Sourced from an official platform page (URL cited).
- **[S2]** Sourced from reputable secondary coverage (trade press, tool vendors) because the official page is JS-only or does not publish the number.
- **[I]** Inference or recommendation by the author. Not stated by the platform.

Platforms change these numbers often. Re-check the rows marked [S2] and [I] before relying on them.

---

## 1. Per-platform spec tables

### 1a. Duration

| | YouTube Shorts | Instagram Reels | TikTok |
|---|---|---|---|
| Hard max | **3:00** for square or vertical uploads made on or after 2024-10-15 [S][^yt3] | **3:00** since Jan 2025 (Mosseri) [S2][^ig3]. Longer uploads (up to about 20 min) are reported [S2][^iglong]. Graph API accepts up to **15 min** [S][^igapi] | **10 min** recorded in-app. **60 min** uploaded [S2][^ttlen]. Content Posting API accepts **10 min**, and most accounts get 3 min [S][^ttapi] |
| Min | none stated | **3 s** (API) [S][^igapi] | none stated |
| Where reach or eligibility changes | Before **2026-09-24**, a Short longer than 1:00 with an active Content ID claim was **blocked worldwide**. From 2026-09-24, new 1–3 min Shorts with a claim are **no longer auto-blocked** and can stay playable, but they are not monetizable until the claim is resolved [S][^yt3]. Most Shorts audio-library songs can be used for at most **90 s** (some tracks allow only 60 s or 30 s) [S][^yt3]. Google Ads says only the first 60 s of an ad plays in the Shorts feed [S][^gads] | Reels over **3 min are not recommended to non-followers** [S2][^iglong]. Before the 3-min change, Instagram told businesses to keep Reels **≤ 90 s** for recommendation to unconnected audiences [S2][^ig3] | **Creator Rewards Program pays only for videos ≥ 1:00** [S2][^ttcrp]. Shorter videos can reach the FYF but earn nothing from that program |
| Sweet spot for this genre [I] | 45–75 s | 45–75 s | 61–90 s if you are chasing Creator Rewards, otherwise 45–75 s |

### 1b. Encoding

| | YouTube Shorts | Instagram Reels | TikTok |
|---|---|---|---|
| Aspect / resolution | Must be square or vertical to count as a Short [S][^yt3]. 1080×1920 is the norm [I] | 9:16 recommended. Max width 1920 px. Accepted ratios 0.01:1 to 10:1 (API) [S][^igapi]. Minimum 720p [S2][^igspec] | 9:16 recommended. Minimum 540×960 (ads) [S][^ttads]. Each side must be 360–4096 px (API) [S][^ttapi]. Viewers get at most 1080p [S2][^ttbit] |
| Frame rate | Upload at the frame rate you recorded (24/25/30/48/50/60) [S][^ytenc] | 23–60 fps [S][^igapi] | 23–60 fps [S][^ttapi] |
| Video codec | H.264 High Profile, progressive, 2 consecutive B-frames, closed GOP of half the frame rate, CABAC, 4:2:0 [S][^ytenc] | H.264 or HEVC, progressive, closed GOP, 4:2:0 [S][^igapi] | H.264 recommended. H.265, VP8 and VP9 also accepted [S][^ttapi] |
| Container | MP4, moov atom at the front (faststart) [S][^ytenc] | MP4/MOV, moov atom at the front, **no edit lists** [S][^igapi] | MP4 recommended (MOV and WebM accepted) [S][^ttapi] |
| Video bitrate | 1080p SDR: **8 Mbps** at 24–30 fps, **12 Mbps** at 48–60 fps [S][^ytenc] | **≤ 25 Mbps VBR** max [S][^igapi] | Ads require ≥ 516 kbps [S][^ttads]. Creators report 8–15 Mbps as the useful range at 1080p30 [S2][^ttbit] |
| Colour | BT.709 SDR [S][^ytenc] | sRGB for the cover image [S][^igapi]. Video BT.709 [I] | BT.709 [I] |
| Audio | AAC-LC (or Opus), 48 kHz, stereo [S][^ytenc] | AAC, **≤ 48 kHz**, mono or stereo, **128 kbps** (API spec) [S][^igapi] | AAC. Vendors cite 44.1/48 kHz and 128–256 kbps [S2][^ttbit] |
| Max file size | no Shorts-specific cap (YouTube's general limit is 256 GB) [I] | **300 MB** via the Graph API [S][^igapi]. 4 GB is the ads figure [S2][^igspec] | **4 GB** via API or web [S][^ttapi]. Ads ≤ 500 MB [S][^ttads]. Mobile app limits are lower [S2][^ttlen] |

### 1c. Loudness

| | YouTube | Instagram | TikTok |
|---|---|---|---|
| Normalization target | About **−14 LUFS** integrated. YouTube does not publish this number. It comes from measurement ("Stats for nerds: content loudness") [S2][^lufs] | Not published. Measured at about −14 LUFS [S2][^lufs] | Not published. Measured at about −14 LUFS [S2][^lufs] |
| True peak | Not published. Industry practice is **−1 dBTP** [S2][^lufs] | same | same |
| Note | Platforms only turn loud masters down. They do not turn quiet ones up, so going above −14 gains nothing [S2][^lufs] | | |

The pipeline already masters to −14 LUFS / −1 dBTP (`pipeline/config.py`, `pipeline/audio.py`), which fits all three.

### 1d. Captions, titles and hashtags

| | YouTube Shorts | Instagram Reels | TikTok |
|---|---|---|---|
| Title | 100 chars. About 40–60 are visible on the Shorts player [S2][^ythash] | none (the caption acts as the title) | none |
| Caption / description | 5,000 chars [S2][^ythash] | **2,200 chars** [S][^igapi] | **4,000 chars**. About 100–150 are visible before "more" [S2][^ttcap] |
| Hashtags | Up to 3 are shown above the title. **More than 60 hashtags means all are ignored** [S][^ythash2]. 3–5 is common practice [I] | **Max 5 per post or Reel** (rolled out Dec 2025, replacing the old 30) [S2][^ig5]. The Graph API docs still say 30 [S][^igapi], so assume 5 applies | No hard number published. Hashtags count toward the caption limit. 3–5 is practice [I] |
| Mentions | — | 20 @tags (API) [S][^igapi] | — |

### 1e. Cover / thumbnail

| | YouTube Shorts | Instagram Reels | TikTok |
|---|---|---|---|
| How it is chosen | In the mobile app, pick any frame. On desktop, choose from 3 suggested frames. **Custom image upload for Shorts started 2026-07-24 for YPP members only**, with a gradual rollout [S][^ytthumb] | Upload a custom cover (1080×1920 JPEG, ≤ 8 MB, sRGB; `cover_url` in the API) or pick a frame (`thumb_offset`) [S][^igapi] | Pick a frame in the editor or upload an image (web/Studio). Add title text in-app [S2] |
| Crops | Shorts shelf and search show about 9:16 with rounded corners. Channel Shorts tab shows 9:16 [I] | The profile grid has been **3:4 (1080×1440 centre crop)** since Jan 2025 [S2][^iggrid]. The Reels tab shows full 9:16 | The profile grid shows about 3:4 (centre crop) [S2] |
| Text-safe area on cover [I] | centre 1080×1440, inset about 60 px | **y 240–1680** (the centre 3:4 band), inset 60 px on each side. Keep the title inside y ≈ 400–1300 | same as Reels |

---

## 2. UI safe zones on a 1080×1920 canvas (px)

No platform publishes an organic safe zone for Shorts, Reels or TikTok. The published numbers come from their **ads** specs, and the ads UI covers more of the screen than the organic UI.

| Platform | Top | Bottom | Left | Right | Clear window | Source |
|---|---|---|---|---|---|---|
| Instagram Reels (Meta unified 9:16 ads safe zone, Mar 2026) | 270 (14%) | 670 (35%) | 65 (6%) | 65 (6%) | 950×980 | [S2][^metasafe]. The Meta help page is JS-only |
| TikTok (ads spec, also matches the organic UI) | 130 | 484 | 44 | 140 | 896×1306 | [S2][^ttsafe]. TikTok says the zone shrinks as the caption gets longer [S][^ttads] |
| YouTube Shorts (community-measured) | about 120–240 | about 300–380 | about 48–60 | about 96–120 | about 900×1300 | [S2][^ytsafe]. Google publishes no pixels [S][^gads] |

Organic Reels place the like/comment/share column on the right, about 120 px wide, just as TikTok does. Meta's symmetric 6% ignores this, so Reels also need about 140 px on the right [I].

### Combined "safe for all three" rectangle [I]

| Profile | Top | Bottom | Left | Right | Rectangle (x, y, w, h) |
|---|---|---|---|---|---|
| **Organic (recommended for captions and burned-in text)** | 220 | 480 | 64 | 150 | **x 64→930, y 220→1440 → 866 × 1220** |
| **Strict (also safe with ad-style CTAs or a long 3-line caption)** | 270 | 670 | 65 | 150 | **x 65→930, y 270→1250 → 865 × 980** |

- Burned-in captions: keep the caption **baseline above y ≈ 1400** and the caption block's centre at y ≈ 1100–1250.
- Hook text: y ≈ 300–700.
- Faces and key evidence: keep them in the band y 270–1250, away from the right edge.
- The project's current values in `pipeline/config.py` (top 220, bottom 480, left 60, right 150) nearly match the **organic** profile. Only the left edge differs (60 vs 64), so they are fine.

---

## 3. One master file for all three [I, built from the sourced limits above]

| Parameter | Value | Why |
|---|---|---|
| Resolution | **1080×1920**, 9:16, full-bleed (no letterbox) | Native on all three. Meta caps width at 1920 |
| Frame rate | **30 fps constant** (29.97 is fine). 60 fps only for fast motion | Within 23–60 on IG and TikTok. YouTube wants the source rate |
| Video codec | **H.264 High Profile**, level 4.1/4.2, yuv420p, progressive, closed GOP (keyframe every 15 frames at 30 fps, per YouTube's "half the frame rate"), 2 B-frames, CABAC | Meets YouTube's exact recommendation. Safe for Meta and TikTok |
| Colour | BT.709, tagged (`-colorspace bt709 -color_primaries bt709 -color_trc bt709`), limited range | Avoids washed-out or shifted gamma after transcoding |
| Bitrate | **10–16 Mbps VBR** (maxrate about 20 Mbps). Never above 25 Mbps | ≥ YouTube's 8 Mbps. Well under Meta's 25 Mbps cap. Extra headroom helps survive re-encoding |
| Container | **MP4, `-movflags +faststart`, no edit lists** | YouTube and Meta both require the moov atom at the front. Meta rejects edit lists |
| Audio | **AAC-LC, 48 kHz, stereo, 128–192 kbps** | Meta's API spec says 48 kHz and 128 kbps. Use 128 kbps if you publish through the IG Graph API, 192 kbps elsewhere |
| Loudness | **−14 LUFS integrated, −1 dBTP**, LRA ≤ 9 | Matches the measured targets on all three |
| Duration | **61–90 s** (a TikTok-rewards-eligible length) or **45–60 s**. Hard ceiling **≤ 180 s** | Under Reels' 3-min non-follower cutoff and Shorts' 3-min max. Over 60 s on TikTok qualifies for Creator Rewards |
| File size | **≤ 300 MB** (about 90 s at 16 Mbps ≈ 180 MB) | The IG Graph API cap is the tightest limit |
| Metadata | Strip other apps' metadata. Keep or add C2PA only if you intend to disclose AI | Platforms read C2PA and auto-label AI content |

Reference ffmpeg re-mux/encode:

```
ffmpeg -i in.mov -c:v libx264 -profile:v high -level 4.2 -pix_fmt yuv420p -r 30 \
  -g 15 -keyint_min 15 -sc_threshold 0 -bf 2 -b:v 12M -maxrate 20M -bufsize 24M \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 128k -ar 48000 -ac 2 -movflags +faststart -map_metadata -1 out.mp4
```

---

## 4. Policies relevant to an automated faceless true-crime channel

### 4a. AI and synthetic content disclosure

| Platform | Rule |
|---|---|
| **YouTube** | Disclose when AI "meaningfully alters or generates **photorealistic** content": real people saying or doing things they did not, altered footage of real events or places, realistic scenes that never happened. No disclosure is needed for clearly unrealistic or animated content, colour or beauty edits, captions, upscaling, script help, or **cloning your own voice**. The label appears in the player for sensitive or realistic content and in the description otherwise. Repeatedly failing to disclose can lead to a forced label, removal, or YPP suspension. YouTube also auto-labels content that carries C2PA [S][^ytai]. [I] A generic TTS narrator reading a script does not trigger disclosure. An AI-generated "reconstruction" image of the victim, the scene or a suspect **does**. |
| **YouTube (harassment policy, since 2024-01-16)** | Content that **realistically simulates deceased minors or victims of deadly or well-documented violent events describing their own death or the violence they experienced** is removed and earns a strike [S2][^ytvictim]. **Never give a victim an AI "first-person" voice.** |
| **TikTok** | You must label AI-generated or significantly edited content that shows **realistic-looking people or scenes**, using the AIGC toggle or a clear caption, sticker or watermark. Disclosure is **not** needed for "generic text-to-speech (TTS) narration, when the TTS isn't a recognizable voice of a known individual". **Not allowed:** using the likeness of private figures without consent, "victimizing depictions", and AIGC made to look like a real news source. Realistic content presenting matters of public importance in a misleading way, or that could harm private figures, is FYF-ineligible. C2PA content is auto-labeled [S][^ttcg]. |
| **Meta (IG)** | You must use the "AI info" disclosure for **photorealistic video or realistic-sounding audio** that was digitally created or altered. Penalties can apply if you do not. Meta auto-labels content with C2PA or IPTC signals [S][^metaai][S2][^metaai2]. |

### 4b. Monetization authenticity (YouTube)

- On **2025-07-15**, YouTube renamed the "repetitious content" policy to **"inauthentic content"**. It covers "repetitive or mass-produced" content. Named examples: "**image slideshows, templated storylines, or scrolling text with minimal or no narrative**" and "**AI-generated content made with generic or unoriginal templates**" [S][^ytmon].
- **Reused content** means material "downloaded or copied from another online source without substantive modifications", content that "exclusively features readings of other materials", and clip compilations with minimal commentary. It applies **even with permission** [S][^ytmon].
- [I] For this pipeline, every video needs original narrative, original analysis (contradictions, timeline), and different visual treatment. Avoid identical hook, template and music across uploads. News footage must sit under commentary, not stand alone.
- TikTok treats "reused or unoriginal content posted without creative edits, such as clips that show someone else's **watermark or logo**" and "low-quality or minimally edited content" as **FYF-ineligible** [S][^ttcg].
- Instagram (Apr 2024, extended Apr 2026) drops accounts that repeatedly repost others' content from recommendations. Adding a watermark or changing speed does not count as a meaningful edit [S2][^igorig].

### 4c. Violent and graphic content, victim dignity

| Platform | Key lines |
|---|---|
| YouTube Community Guidelines | Footage of corpses with massive injuries, or violence intended to shock, is removed. Under the EDSA exception, **the context must be in the video's images or audio**, not just the title or description. Graphic news or documentary material may be age-restricted [S][^ytviol] |
| YouTube ad-friendliness | **Full ads**: coverage of tragedies with deaths, "with limited or no display of violent acts" (mass shootings and terrorism excluded). **Limited ads**: dead bodies with obvious injury in documentary context, or descriptions of graphic tragedy details. **No ads**: graphic bodies without educational context [S][^ytads] |
| TikTok | **Not allowed**: real-world dead bodies, the moment of death, torture, dismembered or burned bodies. **FYF-ineligible and 18+**: significant bleeding, graphic public-interest footage. **FYF-ineligible**: peaceful deaths or bodies in memorial contexts, and the "build-up to a serious injury". **Not allowed**: "degrading or revictimizing people who have experienced a tragedy" [S][^ttcg] |
| Instagram | Graphic violence is removed. Violent but allowed content (e.g., fights) is **not recommended**, and the Sensitive Content Control limits it further [S2][^igrec] |

[I] Practical rules: never show bodies, crime-scene blood or autopsy imagery, even blurred, on TikTok. Use evidence photos of places and objects, maps, documents and timelines instead. Keep thumbnails and hooks non-graphic. Put the "why this matters / what happened" context in the narration.

### 4d. Copyright

- **News footage**: broadcasters register their clips in Content ID. On Shorts longer than 60 s, a claim used to block the video. Since **2026-09-24** it no longer auto-blocks, but the video is not monetizable until the claim is resolved [S][^yt3]. Fair use gives no protection against automated claims. [I] Prefer public-record material (police releases, court documents, public-domain government photos), and keep any news clip short, transformed and commented on.
- **Music**: the Shorts audio library allows 30–90 s of a track per Short [S][^yt3]. TikTok and IG commercial libraries are licensed for in-app use only. [I] Music burned into an off-platform render is **not** covered by that license, so use royalty-free or original tracks.
- **Kevin MacLeod (CC-BY 4.0)**: free to use with attribution: `"Title" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0`. MacLeod has **pre-registered his catalogue** to stop false claims, so **claims can still appear**. Add the credit to the description first, then dispute. Claims are released within about 72 h, and incompetech offers a bulk-release form [S][^kmac]. [I] This is safe but not claim-free. On YouTube, an open claim temporarily withholds monetization. On TikTok and IG, put the credit in the caption. Because his tracks are heavily overused, they add nothing to originality signals.

### 4e. What commonly hurts reach in this genre [mix, marked]

1. Another app's watermark or logo (TikTok FYF-ineligible [S]; IG demotes it [S2]; YouTube: reused content [S]).
2. Letterboxing or pillarboxing a 16:9 source inside 9:16. [I] It looks like a low-effort repost. The pipeline QC already checks for it.
3. Low resolution or heavy compression. Upload 1080p or higher. Mobile-app uploads are recompressed harder than web/Studio uploads [S2].
4. Static image slideshows with no narrative. Named in YouTube's inauthentic policy [S]. [I] Keep motion (camera moves, cuts every 1.5–3 s).
5. Near-identical templates across uploads (same hook card, same music) [S][^ytmon].
6. Graphic imagery. Makes the video FYF-ineligible, age-restricted or limited-ads [S].
7. Unlabeled photorealistic AI reconstructions (removal or forced label) [S].
8. Text or faces under the UI (see safe zones), too many hashtags (IG > 5), and uncleared music claims [S/I].
9. Unverified claims about living people. TikTok makes unverified crisis content and AIGC linking public figures to crime FYF-ineligible or removes it [S]. [I] This is also a defamation risk.

---

## 5. Policy checklist before publishing

- [ ] **No realistic AI depiction of real people**, especially victims, minors or suspects. Never give a victim a first-person voice. Any photorealistic AI reconstruction gets the platform AI label (YouTube "altered or synthetic", TikTok AIGC, Meta "AI info") and an on-screen "AI reconstruction" tag.
- [ ] **No graphic imagery**: no bodies (blurred or not), blood, moment-of-death footage, or autopsy/crime-scene gore. The thumbnail and first frame are non-graphic.
- [ ] **Victim dignity**: no blaming, mocking or sensationalising the victim. The title does not exploit the death ("shocking", gore words). Context is spoken in the narration (YouTube EDSA).
- [ ] **Original value**: unique script and analysis, varied visual treatment, no other creator's watermark or logo, no untransformed news clips. The video does not look like the last N uploads.
- [ ] **Rights**: every image, clip and track is logged with its source and license. CC-BY credits are in the caption/description. No in-app-licensed music burned into the render. News clips are short and commented on. Expect a Content ID claim on anything from broadcasters.
- [ ] **Facts**: claims about living people are sourced. Allegations use "alleged" or "police said". No real news-outlet branding faked.
- [ ] **Tech**: 1080×1920, 30 fps, H.264 High, faststart, AAC 48 kHz, −14 LUFS / −1 dBTP, file ≤ 300 MB, length ≤ 180 s (TikTok rewards need ≥ 60 s). Text inside x 64–930, y 220–1440.
- [ ] **Metadata**: YouTube title ≤ 100 chars (key words in the first 40). IG ≤ 5 hashtags. 3–5 hashtags on YouTube and TikTok. Cover text inside the 3:4 centre band (y 240–1680).
- [ ] **Disclosures**: branded or paid content toggle if it applies. AI toggle if it applies. No toggle is needed for plain generic TTS narration (TikTok says so explicitly [S]; YouTube and Meta implicitly [I]).

---

## Sources

[^yt3]: YouTube Help – Understand three-minute YouTube Shorts: https://support.google.com/youtube/answer/15424877?hl=en
[^ytenc]: YouTube Help – Recommended upload encoding settings: https://support.google.com/youtube/answer/1722171?hl=en
[^ytmon]: YouTube Help – Channel monetization policies (inauthentic / reused content): https://support.google.com/youtube/answer/1311392?hl=en ; rename coverage: https://www.socialmediatoday.com/news/youtube-clarifies-monetization-update-inauthentic-repeated-content/752892/
[^ytai]: YouTube Help – Disclosing altered or synthetic content: https://support.google.com/youtube/answer/14328491?hl=en
[^ytvictim]: TechCrunch, 2024-01-08 – YouTube cracks down on AI content that realistically simulates deceased children or crime victims: https://techcrunch.com/2024/01/08/youtube-cracks-down-ai-generated-content-realistically-simulates-deceased-children-or-victims-of-crimes
[^ytviol]: YouTube Help – Violent or graphic content policies: https://support.google.com/youtube/answer/2802008?hl=en
[^ytads]: YouTube Help – Advertiser-friendly content guidelines: https://support.google.com/youtube/answer/6162278?hl=en
[^ythash2]: YouTube Help – Hashtags: https://support.google.com/youtube/answer/6390658?hl=en
[^ythash]: Character-limit summaries: https://howmanywords.app/blog/youtube-character-limits , https://hashtagtools.io/blog/youtube-shorts-character-limits-title-description-hashtags-2026
[^ytthumb]: YouTube Blog, 2026-07-24 – Thumbnail updates (custom Shorts thumbnails for YPP): https://blog.youtube/news-and-events/youtube-studio-custom-thumbnail-updates/
[^ytsafe]: Community-measured Shorts safe zones: https://youtubetoolkit.com/blog/youtube-shorts-dimensions , https://www.poster.ly/tools/youtube-shorts-safe-zone-checker
[^gads]: Google Ads Help – YouTube Shorts ads asset specs: https://support.google.com/google-ads/answer/16041697?hl=en
[^igapi]: Meta for Developers – IG User Media (Reels specs, caption limits, cover_url): https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
[^ig3]: Mosseri on Threads (3-min Reels): https://www.threads.com/@mosseri/post/DE-efFqyStv ; coverage: https://www.medianama.com/2025/01/223-instagram-reels-3-minutes-us-tiktok-ban/
[^iglong]: https://instantdm.com/blog/instagram-reels-reach-20-minutes-the-2026-limit-explained , https://metricool.com/instagram-reels-length/
[^igspec]: Instagram Help – Reel size & aspect ratios (JS-only): https://help.instagram.com/1038071743007909/ ; summary: https://blog.hootsuite.com/instagram-video-sizes/
[^iggrid]: https://www.netinfluencer.com/instagram-announces-3-minute-reels-and-vertical-grids/ , https://postfa.st/blog/instagram-reel-cover-size-safe-zones
[^ig5]: https://www.socialmediatoday.com/news/instagram-implements-new-limits-on-hashtag-use/808309/ , https://www.socialsamosa.com/news-2/instagram-hashtags-five-per-post-10923075
[^igorig]: TechCrunch 2026-04-30 – Instagram restricts reach of content aggregators: https://techcrunch.com/2026/04/30/instagram-restricts-reach-of-content-aggregators-in-new-crackdown/ ; 2024 change: https://www.socialmediatoday.com/news/instagram-updates-algorithm-to-benefit-original-creators/819016/
[^igrec]: Instagram Help – Recommendations / Sensitive Content Control: https://help.instagram.com/313829416281232/ , https://help.instagram.com/1055538028699165/
[^metasafe]: Meta 9:16 safe zone (14/35/6%) summaries: https://behaviour.digital/post/meta-reels-safe-zone-14-top-35-bottom-6-sides-the-2026-official-guide , https://blog.adnabu.com/meta-ads/meta-safe-zones/ ; official (JS-only): https://www.facebook.com/business/help/980593475366490
[^metaai]: Meta – Our approach to labeling AI-generated content: https://about.fb.com/news/2024/04/metas-approach-to-labeling-ai-generated-content-and-manipulated-media/ ; Transparency Center: https://transparency.meta.com/governance/tracking-impact/labeling-ai-content/
[^metaai2]: https://influencermarketinghub.com/ai-disclosure-rules/
[^ttcg]: TikTok Community Guidelines (2025H2 version, archived text via Open Terms Archive): https://github.com/OpenTermsArchive/contrib-versions/blob/main/TikTok/Community%20Guidelines.md ; live: https://www.tiktok.com/community-guidelines/en/integrity-authenticity , https://www.tiktok.com/community-guidelines/en/sensitive-mature-themes , https://www.tiktok.com/community-guidelines/en/fyf-standards
[^ttapi]: TikTok for Developers – Content Posting API media transfer guide: https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide
[^ttads]: TikTok Ads – Video ads specifications: https://ads.tiktok.com/help/article/video-ads-specifications
[^ttsafe]: https://cadenus.io/resources/blog/tiktok-safe-zone/ , https://tikadsuite.com/blog/tiktok-ad-safe-zones/
[^ttlen]: https://metricool.com/tiktok-video-length/ , https://filesize.org/limits/tiktok/
[^ttbit]: https://www.puritano.com/post/tiktok-video-specs , https://stackinfluence.com/blog/tiktok-video-sizes-the-ultimate-guide
[^ttcap]: https://recurpost.com/tiktok-scheduler/tiktok-character-limits-and-hashtags/
[^ttcrp]: https://postlinkapp.com/blog/tiktok-creator-rewards-program , https://creatorsagency.co/blog/tiktok-creator-rewards-program-2026
[^lufs]: https://trackgleam.com/learn/master-for-tiktok-reels-shorts , https://apu.software/tiktok-instagram-reels-loudness/ , https://clickyapps.com/creator/video/guides/lufs-targets-2025
[^kmac]: incompetech – YouTube Content ID: https://incompetech.com/music/royalty-free/youtube-contentid.html ; FAQ: https://incompetech.com/music/royalty-free/faq.html

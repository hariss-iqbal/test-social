# Iterations: ronaldo_saudi_journey

## v1 compliance fixes

### C04 waiver (owner ruling)
The limit of 4 labels predates long-form. 16 labels in 294 s has the same density as 4 in 74 s, so the
rule is waived for this topic. Labels now number 13 (plus the hook).

- Cut as redundant: s027 (25,000 capacity is on card 77), s095 (the KAFD aerial is not TOURISE, and the
  voice never raises an ambassador title).
- Moved to cards: s053 (card 88), s104 (card 89).
- Added: s105, so the 2024 photo isn't read as the May 2026 final.
- Kept: s054 (75% and date appear nowhere else), s058 (identifies trophy footage the voice doesn't
  mention), s103 (the league's reply is on screen only).

## v2 → v3 (orchestrator rulings on compliance v2)
- C14 waived for long-form: video materials at 3 uses (32, 14, 46, 67) in distinct segments, and recap cards (74, 79). The 2–3-use limit predates 5-minute videos with 131 shots. Photo 28's third use replaced with 54.
- C23: s118 now a real place shot (26) to break the 19 s run of card 79; remaining row reveals count as change.
- s081 now card 76 with the 2026 row highlighted; s082 cue moved to "dollars".
- s039 overlay names the speaker rather than repeating the captions. s072 crop tightened to remove the creator-box sliver.
- Render bitrate 7.5M so the file clears Instagram's 300 MB limit (QC warning accepted).

## v3 → v4
- C27: s118 credit set to the short tag used by s035/s045.
- C14 waived for photo 26 at 3 uses (place shot; no better unused Riyadh picture in the catalog).

## v5 → v6 (edl.json only; narration locked; limits.json unchanged)
Fixes compliance v5. Backup of the v5 EDL: scratchpad `edl_v5.json`. Framing was checked with PIL/ffmpeg crops that mirror `coverRect`/`moveAt`, at the start and end of each move. No Remotion stills, so nothing here has been seen composited; audit v6 from the render.

**Children (BRIEF-no-child, C11)**
- s017: 33 now cropped to the banner and teammates (x ≥ 0.60), so the mascots are out.
- s051: crop top raised to y 0.136, bottom stays 0.75; the rail child's face is out, and the bottom still excludes the hand-hold.
- s030: cropped to x ≥ 0.41, which removes the young men at left and in front. Remaining foreground faces read as adults.
- s082: src_in 6.6, speed 0.75 (source 6.6–8.47). Starts after the people on the platform at top left have panned out of frame, and ends before the close-up of the person in the KNIGHT RONALDO shirt at about 8.7 s.
- s032/s040 crop not loosened. s109 not extended.

**Clipped cards:** s042, s046, s079, s087, s089, s075, s117, s119 widened, each ending in a gap between rows. Same check also adjusted s043, s073, s086, s113, s116 (s043, s075, s086, s116 use intensity 0.1 because the row gap is narrower than a 2% push). s079 now also shows the £24.5m row, because the voice names the signing bonus in that shot.

**C10:** s021 is now 16 (Al-Muammar), label "AL-MUAMMAR'S ACCOUNT ONLY", no place name. Clears the third use of 08.

**C06/C09:** s006 and s007 read "THE CLAIM: …", no quotation marks. s007 moved off beach film to 53 (daqlah portrait, not a place).

**C13/C01/C02/C12/C17**
- s106: src_in 496.6, speed 0.72, crop bottom 0.82. Full-time panel and score bar are out of the crop.
- s058: crop x ≤ 0.8, loses the SSC live bug.
- s008, s044: contain_blur, so the source line sits on the suit.
- s091: moved to AlUla in the same campaign film (src_in 47.6), so no face is under the source line.
- s016: src_in 9.65.
- Stamps: s036 and s099 moved into the gaps before the word. s060 stamp dropped: the gap before "sentencing" is only 0.12 s. This partly undoes the v4 critic's s060 stamp, on compliance's authority (C17).

**C14:** s129 now 53 (second use, different crop). s029 now 66 (Infantino, 2034 announcement) under the Amnesty pull. Photos 08, 09, 27 back to two uses each. Photo 26 stays at 3 under the v3→v4 waiver.

**Labels: 23 → 20.** Removed because they repeated the caption: s018, s023, s044. s066 trimmed to "SEASON RECORD, PER GUINNESS" (Guinness is the part the voice doesn't say). Kept: money tags and claim labels, plus labels covered by earlier rulings. The C04 waiver text (16 as density ceiling) is still exceeded; owner to rule.

**Critic v4 fixes kept:** s004, s005, s006 picture, s040, s080, s083, s088, s095, s109, hook text. Partly changed for compliance: s007 picture (C09), s060 stamp (C17).

**Open for the owner**
- s029: the Jan 2023 Amnesty quote now sits on a Dec 2024 FIFA picture of Infantino, with no label. It matches s030 (same event) but could read as Amnesty speaking about the bid or him.
- s106: the source line brushes the shirt's RONALDO lettering for a moment mid-shot.
- s017: the blurred camera foreground from the original photo remains in the right of the panel.

### v6 ruling: s029 (owner of the run, not the director)
s029 stays on the skyline crop of photo 27. The January 2023 Amnesty quote must not sit on a December 2024 picture of Infantino: it could read as Amnesty talking about him or the 2034 bid. Waiver: C14, photo 27 at three uses (s006, s029, s047).

## v7 (from out/v6/compliance.json, 10 FAIL rows)
Direct edl.json fixes: s106 moved to the trophy segment of film 46, because a figure who appears to be a child stands at the rail in the earlier segment. s051 crop top raised to y 0.152 (child's hand and sleeve at the panel edge). s088 now the free-kick wide shot, s090 the running shot (credit crossed a chin on both). s007/s129 credit shortened so the year is not truncated. s131 src_in 9.65 (flash tail). s120 cut rather than punch. s021/s054 labels reworded for wrapping. Labels on s131, s068, s039, s076 removed, bringing the count to the 16 ceiling of the C04 waiver.
Process: temp bundles from each render are deleted after it; never use parallel stills.

## v8 (from out/v7/video_review.json, critic 7.8 REVISE; final review round)
Applied in edl.json: s112 and s113 now real title footage instead of recap cards (s113 cropped to the sky and stands to keep the crowd out); s090 seated close-up (speed 0.48 to end before the boxing cut at about 5.3 s); new s001a cut at 1.64 s; s111 sfx offset -0.08; s109 speed 0.5; ticks on s054 and s104.
Declined: critic fix 5 (third use of photo 12 and a tighter crop of Georgina under "instead of just marrying her"): the photo's infant margin is thin, and the wording is too close to the rule against her picture under the law wording. Fix 7 (caption split_phrase) touches shared code used by other topics, so it goes to the owner. Fix 9 (music +3 dB) can't be judged without hearing it, so it goes to the owner.
v8 changes after the first attempt: s001a dropped, because a cut before about 3.7 s would hide s001's credit (timeline rule: a credited shot must show its credit at least 1 s after the hook); the first cut stays at 3.80 s as an accepted warning. s113 uses contain_blur rather than cover (cover upscaled the phone clip 3.5x).

## v9 (from out/v8/compliance.json FAIL; audit stopped at a time limit)
s049 moved to the "Welcome CR7" microphone shot and s056 to a player close-up (each previously showed a stand spectator who appears to be a child); s055 moved to the team huddle (younger-looking spectator). The auditor left 40 shots unseen and 10 partly seen; the coordinator then scanned those 50 at three frames per shot, about 330 px wide, from out/v8/final.mp4. No child seen, but dense-crowd faces (s062, s069 and similar) can't be judged at that size. The rest of the v8 checklist (17 items) stays NOT CHECKED on v9.

v9 result: QC PASS (accepted warnings: bitrate 7472 kbps, first cut 3.80 s). Coordinator checked s049, s055, s056, s090, s051, s109, s112, s113 at three frames each on the render: no child seen, s090 on the seated close-up. Not done on v9: full compliance rerun, critic and viewer re-test (review-round limit reached). Status: not cleared for posting until the owner has reviewed it; open owner decisions are crowds, voice, music, caption splits and a short cut.

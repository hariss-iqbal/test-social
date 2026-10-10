"""'whatif' profile: research -> scenario -> world -> one continuous 3D shot (src/whatif), no voiceover.

Stage contracts (topic dir):
  research.json   science-researcher   consequence chain with sourced numbers
  scenario.json   whatif-writer        beats: caption, HUD, story role (+ publish block)
  world.json      world-director       per beat: duration, world params, camera preset, sfx/bed
  build/timeline.json                  code (timeline.py) -> Remotion "WhatIf" composition
  build/audio.wav                      code (sound.py): beds + event SFX synthesized from world.json
  out/vN/final.mp4                     render + mix + qc + publish.md
"""

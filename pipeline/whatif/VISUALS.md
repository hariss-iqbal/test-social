# What the whatif engine can show

Writers should keep `what_we_see` inside this list. Directors use the param names (`src/whatif/world/params.ts`) and camera presets (`pipeline/whatif/presets.py`).

## Local world: `city` kit
The kit is a big downtown park with open sky and a skyline around it. The POV stands on the lawn.

**Sky**
- day/night, sunset colouring
- Sun disc (`sky_sun`) and drifting clouds; with a high `timescale` the clouds give a time-lapse
- stars and the Milky Way, a quarter Moon (can go dark), planet dots for Venus, Jupiter and Saturn
- aurora curtains (`aurora`)
- sky darkening (`sky_dim`), harsh glaring UV light with a white-violet cast (`uv`)

**Life**
- people walking, sitting on blankets and leaving (`life` fades them out)
- cars on the avenue
- trees and grass that can die and turn grey (`plants`)
- a pond that can freeze (`frost`) or drain away (`pond_empty`)

**Weather and light**
- frost and ice on everything, falling snow or ice crystals (`snow`)
- city window lights and street lamps (`lights`), which can flicker (`flicker`)

**Disaster tools**
- buildings crumble into dust and collapse (`crumble`)
- a dust or debris haze (`dust`) and ground or camera shake (`shake`)
- friction loss (`slide`): people and cars glide without walking or rolling and drift away
- a tiny blinding speck (`speck`) falling to the lawn, and a hole or crater it punches (`hole`)

**Camera**
- ground POV looking at the skyline or the people
- looking up at the Sun, the sky, the Moon or the planets
- rising above the trees, high aerial views, rising out of the city into space, diving back down

## Cosmic layer
The solar system at diagram scale.

**Earth and Moon**
- Earth with clouds, night-side city lights and an atmosphere rim; it can whiten with ice
- aurora ovals at the poles, Earth's internal heat glowing through (`core_glow`), and the Moon

**Earth's shields and interior**
- magnetic field lines around Earth (`field`)
- solar-wind particles streaming in from the Sun side (`wind`); they deflect around the field when it's on and hit the atmosphere when it's off
- atmosphere being stripped away in a glowing tail (`atmo_loss`)
- the thin blue ozone shell (`ozone_layer`)
- see-through X-ray Earth showing layers and core (`xray`), with a glowing dot travelling through it (`probe_t`)

**The rest of the solar system**
- the Sun close up with a churning surface
- the 8 planets, the golden last-light shell (`shell`, `shell_r`)
- orbit ring and straight path line

## Text
- Title question with a coloured keyword, and a loop end card (solid, or over the scene)
- One italic caption line at a time
- HUD block: label, big value (countdown, counter, or text), and a sub line

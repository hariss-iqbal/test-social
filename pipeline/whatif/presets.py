"""Camera presets per kit. The director names a preset (or gives an explicit pose); the camera glides between
consecutive poses, so the video is one continuous move. Cross-space (local <-> cosmic) glides crossfade layers.

Local space: metres, y up, POV stands on the park lawn at about (0, 1.7, 10) facing the skyline (-z).
Cosmic space: diagram scale (Sun at origin, Earth orbit radius 60, Earth radius 1.6)."""
import math

SUN_DIR = (0.62, 0.68, -0.39)
_n = math.sqrt(sum(x * x for x in SUN_DIR))
SUN = tuple(x / _n for x in SUN_DIR)


def _toward(pos, d, dist=100, dx=0.0, dy=0.0):
    return [pos[0] + d[0] * dist + dx, pos[1] + d[1] * dist + dy, pos[2] + d[2] * dist]


EYE = [0, 1.7, 10]

LOCAL = {
    # ground-level POV
    "lawn_skyline": {"pos": EYE, "target": [0, 38, -400], "fov": 55},
    "lawn_skyline_low": {"pos": [0, 1.2, 14], "target": [0, 30, -400], "fov": 58},
    "lawn_walk": {"pos": [0, 1.7, -25], "target": [0, 36, -400], "fov": 55},
    "lawn_people": {"pos": [-6, 1.7, 30], "target": [6, 6, -60], "fov": 50},
    "look_up_sun": {"pos": EYE, "target": _toward(EYE, SUN, dx=-12, dy=-6), "fov": 62},
    "look_up_sky": {"pos": EYE, "target": [0, 300, -400], "fov": 64},
    "look_moon": {"pos": EYE, "target": _toward(EYE, (-0.35, 0.66, -0.66), dx=-2.5, dy=-7), "fov": 24},
    "look_planets": {"pos": EYE, "target": [60, 330, -380], "fov": 60},
    "lawn_push": {"pos": [0, 1.7, -2], "target": [0, 40, -400], "fov": 55},
    "look_up_zenith": {"pos": EYE, "target": [0, 400, -160], "fov": 70},
    "frozen_wide": {"pos": [8, 2.4, 25], "target": [0, 30, -400], "fov": 55},
    "tree_close": {"pos": [-1.5, 1.8, 13], "target": [-15, 4.2, -10], "fov": 48},
    "lamp_people": {"pos": [-4, 1.7, 26], "target": [4, 2.5, -40], "fov": 52},
    "pond": {"pos": [70, 2.0, -95], "target": [100, 0, -170], "fov": 55},
    # park disaster views
    "speck_watch": {"pos": [0, 1.7, 10], "target": [0, -2.5, -30], "fov": 55},
    "avenue_view": {"pos": [34, 2.6, -401], "target": [-30, 1.2, -414], "fov": 50},
    "avenue_wide": {"pos": [10, 26, -386], "target": [-25, 0, -414], "fov": 55},
    "lawn_low": {"pos": [4, 0.9, 18], "target": [-4, 1.2, -20], "fov": 55},
    "grills": {"pos": [1.5, 1.6, 4], "target": [-3, 0.6, -14], "fov": 52},
    "speck_up": {"pos": [0, 1.7, 10], "target": [0, 48, -30], "fov": 60},
    "hole_close": {"pos": [7, 5, -12], "target": [0, -1, -30], "fov": 55},
    "crowd_high": {"pos": [0, 16, 48], "target": [0, 0, -40], "fov": 52},
    # seaside harbour (real kit 'seaside')
    "harbour_wide": {"pos": [0, 1.8, 9], "target": [-2, 3, -40], "fov": 55},
    "chef_close": {"pos": [-3.0, 1.35, 7.9], "target": [-5.9, 0.7, 5.0], "fov": 40},
    "boats_view": {"pos": [2, 2.2, -5], "target": [-3, 0, -30], "fov": 50},
    "dogs_close": {"pos": [1.4, 0.75, 7.0], "target": [1.0, 0.3, 4.2], "fov": 40},
    "couple_close": {"pos": [-1.4, 1.35, 6.4], "target": [-1.55, 0.9, 3.2], "fov": 40},
    "quay_people": {"pos": [3.6, 1.7, 8.5], "target": [-1, 1.0, 2], "fov": 50},
    "houses_view": {"pos": [-1.5, 1.7, 8.5], "target": [-11, 5, -6], "fov": 55},
    "sea_view": {"pos": [0, 3.2, -6.5], "target": [0, -3, -40], "fov": 55},
    "harbour_high": {"pos": [0, 14, 16], "target": [-4, 0, -20], "fov": 55},
    # rising out of the park (use before a cross to cosmic)
    "rise_treetops": {"pos": [0, 30, 40], "target": [0, 40, -400], "fov": 55},
    "rise_high": {"pos": [0, 260, 180], "target": [0, 30, -300], "fov": 55},
    "aerial": {"pos": [0, 900, 500], "target": [0, 0, -300], "fov": 50},
}

COSMIC = {
    # follow = camera offsets are relative to the moving Earth
    "earth_close": {"pos": [-2.6, 1.2, 4.4], "target": [0, 0, 0], "fov": 45, "follow": "earth"},
    "earth_wide": {"pos": [-6, 3, 10], "target": [0, 0, 0], "fov": 45, "follow": "earth"},
    "earth_behind": {"pos": [-6, 3, 10], "target": [0, 0, -8], "fov": 50, "follow": "earth"},
    "earth_toward_sun": {"pos": [12, 3, 4], "target": [-60, -3, -8], "fov": 50, "follow": "earth"},
    "earth_arrival": {"pos": [-5.5, 1.4, 2.6], "target": [0, 0, 0], "fov": 48, "follow": "earth"},
    "earth_dive": {"pos": [-2.2, 0.9, 1.1], "target": [0, 0.2, 0], "fov": 46, "follow": "earth"},
    # the Sun (absolute; Sun radius 6 at the origin)
    "sun_far": {"pos": [42, 7, 14], "target": [0, 0, 0], "fov": 46},
    "sun_close": {"pos": [17, 3.0, 6], "target": [0, 0.6, 0], "fov": 48},
    "sun_closer": {"pos": [11.5, 1.6, 3.8], "target": [0, 1.2, 0], "fov": 50},
    "sun_gone_wide": {"pos": [26, 9, 16], "target": [4, 0, 0], "fov": 50},
    # riding the last light (offsets from the shell front on the Sun->Earth line)
    "shell_ride": {"pos": [-9, 5, 13], "target": [22, -1, -3], "fov": 52, "follow": "shell"},
    "shell_ride_close": {"pos": [-4, 2.5, 7], "target": [18, -0.5, -2], "fov": 55, "follow": "shell"},
    "shell_chase": {"pos": [5, 3.5, 11], "target": [-12, 0, 0], "fov": 52, "follow": "shell"},
    "shell_side": {"pos": [3, 2.2, 15], "target": [-7, 0, 0], "fov": 50, "follow": "shell"},
    "shell_top_close": {"pos": [14, 58, 46], "target": [14, 0, -4], "fov": 50},
    "neptune_view": {"pos": [340, 5, -30], "target": [250, -3, -45], "fov": 46},
    # close passes: the shell washes over a planet and it goes dark
    "mercury_pass": {"pos": [26.04, 2.2, 1.19], "target": [19.04, 0.2, -10.31], "fov": 44},
    "venus_pass": {"pos": [45.90, 1.6, 19.23], "target": [41.90, 0, 11.23], "fov": 40},
    "earth_poles": {"pos": [-3.2, 3.4, 3.0], "target": [0, 0.3, 0], "fov": 44, "follow": "earth"},
    "orbit_empty": {"pos": [70, 34, 40], "target": [30, 0, -6], "fov": 50},
    "earth_far": {"pos": [-22, 9, 34], "target": [0, 0, 0], "fov": 40, "follow": "earth"},
    # shields / interior views (follow Earth)
    "earth_field": {"pos": [0.5, 4.0, 14.5], "target": [1.8, 0, 0], "fov": 48, "follow": "earth"},
    "earth_wind": {"pos": [-3, 5.5, 14], "target": [-2, 0, 0], "fov": 48, "follow": "earth"},
    "earth_sats": {"pos": [-3.6, 2.0, 5.2], "target": [0.3, 0, 0], "fov": 46, "follow": "earth"},
    "earth_lit": {"pos": [-6.2, 2.4, 3.6], "target": [0, 0.1, 0], "fov": 38, "follow": "earth"},
    "earth_xray": {"pos": [-2.6, 1.6, 4.6], "target": [0, 0, 0], "fov": 46, "follow": "earth"},
    "escape_view": {"pos": [72, 12, 12], "target": [60, 0, -6], "fov": 46},
    "shell_top": {"pos": [30, 115, 80], "target": [30, 0, 0], "fov": 50},
    "system_wide": {"pos": [60, 380, 420], "target": [60, 0, -20], "fov": 50},
    "orbit_top": {"pos": [0, 150, 10], "target": [0, 0, 0], "fov": 50},
    "orbit_close": {"pos": [40, 14, 22], "target": [60, 0, -14], "fov": 50},
    "orbit_wide": {"pos": [40, 90, 120], "target": [0, 0, -10], "fov": 50},
    "deep_space": {"pos": [0, 400, 600], "target": [0, 0, 0], "fov": 50},
}


def pose(spec):
    """spec: preset name | {"preset": name, ...overrides} | explicit {"space","pos","target"}."""
    if isinstance(spec, str):
        spec = {"preset": spec}
    name = spec.get("preset")
    if name:
        if name in LOCAL:
            base = {"space": "local", **LOCAL[name]}
        elif name in COSMIC:
            base = {"space": "cosmic", **COSMIC[name]}
        else:
            raise KeyError(name)
    else:
        base = {}
    out = {**base, **{k: v for k, v in spec.items() if k not in ("preset", "move_s", "ease")}}
    out.setdefault("fov", 55)
    return out


def names():
    return sorted(LOCAL) + sorted(COSMIC)

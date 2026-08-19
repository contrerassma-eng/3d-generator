#!/usr/bin/env python3
"""Assemble PrusaSlicer config matching the user's CC2 PA-CF sample G-code."""
S = "/tmp/claude-0/-home-user/316fb065-df6d-5264-b06c-484bb72fe3e3/scratchpad"

def gcode_ini(path):
    return open(path).read().rstrip("\n").replace("\n", "\\n")

cfg = f"""
# --- printer: Elegoo Centauri Carbon 2 (from sample header) ---
gcode_flavor = klipper
bed_shape = 0x0,256x0,256x256,0x256
max_print_height = 256
nozzle_diameter = 0.4
use_relative_e_distances = 1
machine_limits_usage = ignore
retract_length = 2
retract_speed = 40
deretract_speed = 40
retract_lift = 0
wipe = 0
retract_before_travel = 2
start_gcode = {gcode_ini(S + "/start_gcode.txt")}
end_gcode = {gcode_ini(S + "/end_gcode.txt")}
before_layer_gcode =
layer_gcode =
thumbnails =

# --- filament: PA-CF @300/90, fan off except bridges 40% (from sample) ---
filament_diameter = 1.75
filament_type = PA
temperature = 300
first_layer_temperature = 300
bed_temperature = 90
first_layer_bed_temperature = 90
cooling = 1
fan_always_on = 0
min_fan_speed = 0
max_fan_speed = 0
bridge_fan_speed = 40
fan_below_layer_time = 0
slowdown_below_layer_time = 8
disable_fan_first_layers = 1
# --- print: 0.2 mm layers, 3 walls, widths/speeds/accels from sample ---
layer_height = 0.2
first_layer_height = 0.25
perimeters = 3
top_solid_layers = 5
bottom_solid_layers = 4
fill_density = 15%
fill_pattern = gyroid
extrusion_width = 0.45
first_layer_extrusion_width = 0.5
external_perimeter_extrusion_width = 0.45
perimeter_extrusion_width = 0.45
infill_extrusion_width = 0.45
solid_infill_extrusion_width = 0.45
top_infill_extrusion_width = 0.45
perimeter_speed = 80
external_perimeter_speed = 45
infill_speed = 100
solid_infill_speed = 55
top_solid_infill_speed = 55
bridge_speed = 25
gap_fill_speed = 40
first_layer_speed = 20
travel_speed = 250
default_acceleration = 4000
perimeter_acceleration = 2500
external_perimeter_acceleration = 2500
infill_acceleration = 4000
solid_infill_acceleration = 4000
top_solid_infill_acceleration = 4000
bridge_acceleration = 2500
first_layer_acceleration = 400
travel_acceleration = 4000

# --- user request: no supports, no adhesion helpers ---
support_material = 0
support_material_auto = 0
skirts = 0
brim_type = no_brim
brim_width = 0
raft_layers = 0
""".strip() + "\n"

open(S + "/cc2_pacf.ini", "w").write(cfg)
print("config written")

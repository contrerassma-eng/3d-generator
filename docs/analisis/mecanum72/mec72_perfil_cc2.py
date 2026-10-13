# Genera el .ini de PrusaSlicer que reproduce el perfil real del Elegoo
# Centauri Carbon 2 de Sergio, extraido del gcode que subio (ElegooSlicer
# "0.20mm Standard @Elegoo CC2 0.4 nozzle" + "Generic PA-CF @System"),
# pero con RELLENO 100 %, soporte arbol y borde de adherencia.
import os

OUT = os.path.dirname(os.path.abspath(__file__))

START = """;===== CC2_START_GCODE ================
;===== date: 2026-01-16-001 =====================

G90
M104 S140
M140 S100
M190 S100 A
M106 S0
BED_MESH_CALIBRATE mesh_min=19.4955,51.0861 mesh_max=221.273,240.162 ALGORITHM=bicubic PROBE_COUNT=11,10 ADAPTIVE=0 ADAPTIVE_MARGIN=0 FROM_SLICER=1
M204 S5000 ;Call exterior wall print acceleration
G28
M109 S280
M6211 A1 L200 T0 Q280 R280 S280
T0

G180 S7
G1 X127 Y-1.2 F20000
G1 Z0.5 F900
M109 S280
M83
G92 E0 ;Reset Extruder
G1 E6 F120
M106 S200
G1 X87 E20 F1200
G1 F6000
G1 X82 E0.8

M106 S0
G180 S8
G1 F20000
G92 E0 ;Reset Extruder
SET_PRINT_STATS_INFO TOTAL_LAYER=[total_layer_count] CURRENT_LAYER=0
;LAYER_COUNT:[total_layer_count]
;LAYER:0"""

END = """;===== CC2_END_GCODE ================
;===== date: 2026-01-16-001 =====================

M140 S0 ;Turn-off bed
M83
G92 E0 ; zero the extruder
G1 E-1.5 F1800
M106 S0
M106 P2 S0
G90
G1 Z{min(max_layer_z+5, max_print_height-0.5)} F20000 ; Move print head up
G180 S9
M104 S0
M84"""

LAYER = """;LAYER:[layer_num]
SET_PRINT_STATS_INFO TOTAL_LAYER=[total_layer_count] CURRENT_LAYER=[layer_num]"""

CFG = {
    # ---------- maquina ----------
    'printer_technology': 'FFF',
    'gcode_flavor': 'klipper',
    'bed_shape': '0x0,256x0,256x256,0x256',
    'max_print_height': 256,
    'nozzle_diameter': 0.4,
    'use_relative_e_distances': 1,
    'use_firmware_retraction': 0,
    'single_extruder_multi_material': 0,
    'machine_limits_usage': 'time_estimate_only',
    'machine_max_acceleration_x': '20000,20000',
    'machine_max_acceleration_y': '20000,20000',
    'machine_max_acceleration_z': '500,500',
    'machine_max_acceleration_e': '5000,5000',
    'machine_max_acceleration_extruding': '20000,20000',
    'machine_max_acceleration_retracting': '5000,5000',
    'machine_max_acceleration_travel': '20000,20000',
    'machine_max_feedrate_x': '500,200',
    'machine_max_feedrate_y': '500,200',
    'machine_max_feedrate_z': '20,20',
    'machine_max_feedrate_e': '30,30',
    'machine_max_jerk_x': '9,9', 'machine_max_jerk_y': '9,9',
    'machine_max_jerk_z': '3,3', 'machine_max_jerk_e': '1,1',
    'retract_length': 0.8, 'retract_speed': 30, 'deretract_speed': 30,
    'retract_lift': 0.4, 'retract_lift_above': 0,
    'retract_before_travel': 2, 'retract_before_wipe': '0%', 'wipe': 0,
    'start_gcode': START.replace('\n', '\\n'),
    'end_gcode': END.replace('\n', '\\n'),
    'layer_gcode': LAYER.replace('\n', '\\n'),
    'between_objects_gcode': '', 'toolchange_gcode': '',
    # ---------- filamento PA-CF ----------
    'filament_type': 'PA',
    'filament_diameter': 1.75,
    'filament_density': 1.04,
    'extrusion_multiplier': 1,
    'temperature': 280, 'first_layer_temperature': 280,
    'bed_temperature': 100, 'first_layer_bed_temperature': 100,
    'max_volumetric_speed': 8,
    'cooling': 1, 'fan_always_on': 0,
    'min_fan_speed': 0, 'max_fan_speed': 60, 'bridge_fan_speed': 30,
    'disable_fan_first_layers': 3, 'full_fan_speed_layer': 0,
    'fan_below_layer_time': 4, 'slowdown_below_layer_time': 2,
    'min_print_speed': 10,
    # ---------- impresion ----------
    'layer_height': 0.2, 'first_layer_height': 0.2,
    'perimeters': 2,
    'top_solid_layers': 5, 'bottom_solid_layers': 3,
    'top_solid_min_thickness': 1, 'bottom_solid_min_thickness': 0.6,
    'fill_density': '100%', 'fill_pattern': 'rectilinear',
    'top_fill_pattern': 'monotoniclines', 'bottom_fill_pattern': 'monotonic',
    'solid_infill_every_layers': 0, 'infill_every_layers': 1,
    'fill_angle': 45, 'solid_infill_below_area': 0,
    'extrusion_width': 0.42, 'first_layer_extrusion_width': 0.5,
    'perimeter_extrusion_width': 0.45, 'external_perimeter_extrusion_width': 0.42,
    'infill_extrusion_width': 0.45, 'solid_infill_extrusion_width': 0.42,
    'top_infill_extrusion_width': 0.42, 'support_material_extrusion_width': 0.42,
    'perimeter_speed': 200, 'external_perimeter_speed': 160,
    'infill_speed': 200, 'solid_infill_speed': 250, 'top_solid_infill_speed': 200,
    'gap_fill_speed': 250, 'bridge_speed': 50, 'support_material_speed': 150,
    'travel_speed': 500, 'travel_speed_z': 20,
    'first_layer_speed': 50, 'first_layer_speed_over_raft': 50,
    'default_acceleration': 10000, 'external_perimeter_acceleration': 5000,
    'perimeter_acceleration': 10000, 'infill_acceleration': 10000,
    'solid_infill_acceleration': 10000, 'top_solid_infill_acceleration': 5000,
    'travel_acceleration': 10000, 'first_layer_acceleration': 500,
    'bridge_acceleration': 3000,
    'seam_position': 'aligned',
    'elefant_foot_compensation': 0.1,
    'thin_walls': 0, 'thick_bridges': 0, 'gcode_comments': 0,
    'complete_objects': 0,
    # soporte arbol + borde de adherencia (lo que pidio Sergio)
    'support_material': 1, 'support_material_auto': 1,
    'support_material_style': 'organic',
    'support_material_threshold': 30,
    'support_material_contact_distance': 0.2,
    'support_material_bottom_contact_distance': 0.2,
    'support_material_xy_spacing': '0.35',
    'support_material_buildplate_only': 0,
    'support_material_spacing': 2.2,
    'support_material_angle': 0,
    'support_material_interface_layers': 2,
    'support_material_bottom_interface_layers': 2,
    'support_material_interface_spacing': 0.3,
    'support_material_with_sheath': 0,
    'brim_width': 5, 'brim_type': 'outer_only', 'brim_separation': 0.1,
    'skirts': 0,
}


def write_ini(path, extra=None):
    cfg = dict(CFG)
    if extra:
        cfg.update(extra)
    with open(path, 'w') as f:
        for k, v in cfg.items():
            f.write(f'{k} = {v}\n')
    return path


if __name__ == '__main__':
    write_ini(os.path.join(OUT, 'cc2_pacf_100.ini'))
    print('perfil cc2_pacf_100.ini escrito')

import bpy
import math
import os

# ---------- Limpiar escena ----------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# unidades mm
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 0.001  # 1 unit = 1 mm

# ---------- Materiales ----------
def mat(name, color, metallic=0.0, rough=0.5, emissive=None, emit_strength=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = rough
    if emissive:
        bsdf.inputs['Emission Color'].default_value = emissive
        bsdf.inputs['Emission Strength'].default_value = emit_strength
    return m

M_body   = mat('body_blue',   (0.10, 0.30, 0.62, 1.0), metallic=0.35, rough=0.25)
M_glass  = mat('glass',       (0.05, 0.08, 0.12, 1.0), metallic=0.1, rough=0.1)
M_tire   = mat('tire',        (0.02, 0.02, 0.02, 1.0), metallic=0.0, rough=0.9)
M_gold   = mat('wheel_gold',  (0.75, 0.52, 0.10, 1.0), metallic=1.0, rough=0.2)
M_red    = mat('tail_red',    (0.6, 0.05, 0.05, 1.0), emissive=(1.0,0.0,0.0,1.0), emit_strength=2.0)
M_white  = mat('head_white',  (0.9, 0.95, 1.0, 1.0), emissive=(1,1,1,1), emit_strength=2.5)
M_dark   = mat('grille',      (0.02, 0.02, 0.03, 1.0), rough=0.9)

def assign(obj, m):
    obj.data.materials.append(m)

def box(name, m, cx, cy, cz, sx, sy, sz):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx,cy,cz))
    o = bpy.context.object
    o.name = name
    o.scale = (sx/2, sy/2, sz/2)
    bpy.ops.object.shade_smooth()
    assign(o, m)
    return o

def sphere(name, m, cx, cy, cz, r, sx=1.0, sy=1.0, sz=1.0):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(cx,cy,cz), segments=24, ring_count=12)
    o = bpy.context.object
    o.name = name
    o.scale = (sx, sy, sz)
    bpy.ops.object.shade_smooth()
    assign(o, m)
    return o

def cyl(name, m, cx, cy, cz, r, h, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(cx,cy,cz), vertices=24)
    o = bpy.context.object
    o.name = name
    o.rotation_euler = rot
    bpy.ops.object.shade_smooth()
    assign(o, m)
    return o

# ---------- DIMENSIONES CHIBI (mm) ----------
# coche orientado: +X delante, -X detrás, Y ancho, Z arriba

# Cuerpo: bajo y redondeado
box('body', M_body, 0, 0, 11, 46, 26, 16)
# morro delantero más bajo (capó)
box('hood', M_body, 16, 0, 9, 20, 24, 9)
# parte trasera
box('rear', M_body, -15, 0, 10, 18, 26, 13)

# Cabina grande (sello chibi)
sphere('cabin', M_body, 1, 0, 21, 11, 1.0, 1.15, 0.9)  # cuerpo de la cabina
# ventanas (luna) - cristal
sphere('glass', M_glass, 1, 0, 22, 9.6, 1.0, 1.15, 0.9)

# Ruedas: 4
wheel_r = 8.5
tire_w = 7.0
ax = 16.0   # eje delantero
bx = -16.0  # eje trasero
wy = 12.5
for fx in (ax, bx):
    for fy in (wy, -wy):
        # neumático (cilindro rotado 90° en X para que ruede en Y)
        cyl(f'tire_{fx}_{fy}', M_tire, fx, fy, wheel_r, wheel_r, tire_w, rot=(math.radians(90),0,0))
        # llanta dorada
        cyl(f'rim_{fx}_{fy}', M_gold, fx, fy+3.5, wheel_r, wheel_r*0.55, 2.5, rot=(math.radians(90),0,0))

# Alerón trasero
post_h = 14
for py in (-9, 9):
    box(f'wingpost_{py}', M_body, -22, py, 22, 3, 3, post_h)
box('wing', M_body, -23, 0, 29, 5, 30, 2.5)

# Pilotos traseros: 4 redondos (2 por lado)
for py in (-8.5, 8.5):
    for pz in (12.5, 15.5):
        sphere('taillight', M_red, -24.2, py, pz, 1.8, 1.0, 0.5, 1.0)

# Faros delanteros
for py in (-7.5, 7.5):
    sphere('headlight', M_white, 24.3, py, 11, 2.6, 1.0, 0.55, 0.8)

# parrilla
box('grille', M_dark, 24.5, 0, 7.5, 1.0, 10, 4)

# matrícula (panel liso) - dejar sin texto
box('plate', M_dark, -24.5, 0, 8.5, 0.6, 8, 3)

# ---------- Escalar a longitud total 70mm ----------
# longitud actual aproximada ~48 (de -24.5 a +24.5)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.empty_add(location=(0,0,0))
root = bpy.context.object
root.name = 'R34_chibi'
for o in list(bpy.context.selected_objects):
    if o is root:
        continue
    o.parent = root

# medir y escalar
scale = 70.0 / 50.0  # ~48 de largo aprox -> 70
root.scale = (scale, scale, scale)

# ---------- Exportar GLB ----------
outdir = os.path.dirname(os.path.abspath(__file__))
glb = os.path.join(outdir, 'r34_chibi.glb')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True)
print('EXPORTADO', glb)

# ---------- Render 4 vistas ----------
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 64
scene.render.resolution_x = 800
scene.render.resolution_y = 800
scene.render.image_settings.file_format = 'PNG'
scene.view_layers[0].cycles.use_denoising = False

# fondo blanco
world = bpy.data.worlds['World']
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
bg.inputs[0].default_value = (1,1,1,1)

# luz
bpy.ops.object.light_add(type='SUN', location=(5,-8,20))
sun = bpy.context.object
sun.data.energy = 3
sun.data.angle = 0.1

cam = bpy.data.cameras.new('cam')
cam_obj = bpy.data.objects.new('cam', cam)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj

views = {
    'front': (0, -70, 20),
    'back':  (0, 70, 20),
    'left':  (-70, 0, 20),
    'right': (50, -50, 28),
}
look = (0, 0, 12)
for name, pos in views.items():
    cam_obj.location = pos
    d = bpy.data.objects.new('empty', None)
    d.location = look
    scene.collection.objects.link(d)
    cam_obj.constraints.clear()
    tr = cam_obj.constraints.new('TRACK_TO')
    tr.target = d
    tr.track_axis = 'TRACK_NEGATIVE_Z'
    tr.up_axis = 'UP_Y'
    scene.render.filepath = os.path.join(outdir, f'r34_{name}.png')
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(d, do_unlink=True)

print('RENDERS OK')

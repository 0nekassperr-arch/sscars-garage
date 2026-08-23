# preparar_figura.py
# -----------------------------------------------------------------------------
# Convierte un GLB/OBJ/STL (de TRELLIS, Tripo, Meshy o del script r34_chibi.py)
# en una pieza lista para imprimir, siguiendo el flujo de GUIA_3D_Y_PRODUCCION.md:
#
#   1. Importar  2. Escalar a N mm de largo  3. Unir mallas
#   4. Reparar (manifold, mejor esfuerzo)    5. Ahuecar (pared 2 mm)
#   6. Agujero de drenaje 4 mm en los bajos  7. Exportar STL + OBJ/MTL + 3MF
#
# USO (Blender 3.3 o superior, en consola):
#   blender --background --python preparar_figura.py -- entrada.glb salida 70
#       entrada.glb -> tu fichero GLB
#       salida      -> nombre base de salida (sin extension)
#       70          -> largo en mm (opcional, por defecto 70)
#
# Sin argumentos usa "modelo.glb" y "modelo" como ejemplo.
# -----------------------------------------------------------------------------

import bpy
import sys
import os
from mathutils import Vector

# ---------- Argumentos ----------
argv = sys.argv
args = argv[argv.index('--') + 1:] if '--' in argv else []

in_path  = args[0] if len(args) > 0 else 'modelo.glb'
out_name = args[1] if len(args) > 1 else os.path.splitext(os.path.basename(in_path))[0]
LENGTH_MM = float(args[2]) if len(args) > 2 else 70.0
WALL_MM = 2.0
DRAIN_DIA_MM = 4.0

in_path = os.path.abspath(in_path)
outdir = os.path.dirname(in_path) or '.'
base = os.path.join(outdir, out_name)

print(f'>> Entrada: {in_path}')
print(f'>> Salida : {base}.{{stl,obj,3mf}}  largo={LENGTH_MM}mm')

# ---------- Limpiar escena ----------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# unidades en mm
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 0.001  # 1 unidad = 1 mm

# ---------- Importar ----------
ext = os.path.splitext(in_path)[1].lower()
if ext in ('.glb', '.gltf'):
    bpy.ops.import_scene.gltf(filepath=in_path)
elif ext == '.obj':
    try:
        bpy.ops.wm.obj_import(filepath=in_path)
    except AttributeError:
        bpy.ops.import_scene.obj(filepath=in_path)
elif ext == '.stl':
    bpy.ops.wm.stl_import(filepath=in_path)
else:
    print('!! Extension no reconocida, intentando GLB...')
    bpy.ops.import_scene.gltf(filepath=in_path)

meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
if not meshes:
    raise SystemExit('!! No se encontró ninguna malla en ' + in_path)

# ---------- Unir en un solo objeto ----------
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active

# ---------- Escalar al largo deseado ----------
# (el eje del largo suele ser X; usamos la mayor dimension por robustez)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
dims = obj.dimensions
largo_actual = max(dims.x, dims.y, dims.z)
if largo_actual <= 0:
    raise SystemExit('!! Dimensiones inválidas')
factor = LENGTH_MM / largo_actual
obj.scale = (factor, factor, factor)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
print(f'>> Escalado: {largo_actual:.2f} -> {LENGTH_MM} mm')

# ---------- Reparar (mejor esfuerzo) ----------
# Requiere el addon "3D-Print Toolbox" activado; si no, se salta sin romper.
try:
    bpy.ops.mesh.print3d_clean_non_manifold()
    print('>> Reparacion manifold aplicada')
except Exception as e:
    print('>> (aviso) no se pudo reparar manifold:', e)

# ---------- Ahuecar (Solidify -2 mm) ----------
bpy.ops.object.modifier_add(type='SOLIDIFY')
solid = obj.modifiers[-1]
solid.name = 'Hueco'
solid.thickness = -WALL_MM
solid.offset = 1.0
solid.use_even_thickness = True
bpy.ops.object.modifier_apply(modifier=solid.name)

# ---------- Agujero de drenaje (4 mm) ----------
# Coloca un cilindro vertical en el centro de los bajos del modelo y lo resta.
# Calculamos el punto mas bajo de la caja envolvente.
def bbox_min_z(o):
    return min((o.matrix_world @ Vector(c)).z for c in o.bound_box)

z_bajo = bbox_min_z(obj)
cx = (obj.matrix_world @ Vector((0, 0, 0))).x
cy = (obj.matrix_world @ Vector((0, 0, 0))).y

bpy.ops.mesh.primitive_cylinder_add(
    radius=DRAIN_DIA_MM / 2.0,
    depth=20.0,
    location=(cx, cy, z_bajo + 2.0),
    vertices=32
)
drain = bpy.context.object
drain.name = 'drenaje'

bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
bpy.ops.object.modifier_add(type='BOOLEAN')
boolmod = obj.modifiers[-1]
boolmod.name = 'Drenaje'
boolmod.operation = 'DIFFERENCE'
boolmod.object = drain
bpy.ops.object.modifier_apply(modifier=boolmod.name)
bpy.data.objects.remove(drain, do_unlink=True)
print('>> Agujero de drenaje de 4 mm añadido')

# ---------- Exportar ----------
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
bpy.context.view_layer.objects.active = obj

# STL (geometria, sin color)
bpy.ops.export_mesh.stl(filepath=base + '.stl', use_selection=True)
print('>> STL  ->', base + '.stl')

# OBJ + MTL (con materiales/color, si el GLB traia textura)
bpy.ops.export_scene.obj(
    filepath=base + '.obj',
    use_selection=True,
    use_materials=True,
    path_mode='COPY'
)
print('>> OBJ  ->', base + '.obj (+ .mtl)')

# 3MF (si el addon esta activo)
try:
    bpy.ops.export_mesh.threemf(filepath=base + '.3mf', use_selection=True)
    print('>> 3MF  ->', base + '.3mf')
except Exception as e:
    print('>> (aviso) 3MF no disponible:', e)
    print('   Activa el addon "3MF Format" (Edit > Preferences > Add-ons) o usa el OBJ.')

print('HECHO. Verifica en PrusaSlicer: estanco + volumen en cm3.')

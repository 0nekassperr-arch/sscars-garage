# 🏎️ ÍNDICE GLOBAL DE REFERENCIAS VISUALES 3D — SSCARS GARAGE

> **Directorio Canónico:** `produccion/referencias/`  
> **Propósito:** Almacén maestro y canónico de referencias fotográficas calibradas para la reconstrucción 3D multivista (Tripo / Meshy) y modelado en Blender de las 15 leyendas JDM.  
> **Regla de almacenamiento:** Las referencias fotográficas en formato WebP optimizado residen en este repositorio. Los archivos binarios pesados (`.glb` RAW > 25 MB, `.blend` maestros y `.3mf`/`.stl` de corte) **permanecen exclusivamente en local** en el PC del usuario/taller.

---

## 📑 1. TABLA MAESTRA DE LOS 15 COCHES

| # | Slug | Nombre SSCARS | Modelo Real | Año | Primary Refs (3D) | Total Refs | Estado Calibración |
|---|---|---|---|---|---|---|---|
| **01** | **`r34`** | El Emperador Azul | Nissan Skyline GT-R R34 | 1999 | 4 (Front, Left, Back, Right) + Cenital | 7 | 🟢 Calibrado & Kit Tripo listo |
| **02** | **`r32`** | El Monstruo Púrpura | Nissan Skyline GT-R R32 | 1989 | 4 (Front, Left, Back, Right) | 6 | 🟢 6 Vistas completas |
| **03** | **`350z`** | Colmillo Azul | Nissan 350Z | 2002 | 4 (Front, Left, Back, Right) | 6 | 🟢 6 Vistas completas |
| **04** | **`supra`** | La Bestia Naranja | Toyota Supra MK4 | 1993 | 4 (Front, Left, Back, Right) | 6 | 🟢 6 Vistas completas |
| **05** | **`ae86`** | El Fantasma de la Montaña | Toyota AE86 Sprinter Trueno | 1983 | 4 (Front, Left, Back, Right) | 6 | 🟢 6 Vistas completas |
| **06** | **`mr2`** | El Exótico de Bolsillo | Toyota MR2 SW20 | 1989 | 4 (Front 3/4, Left, Back 3/4, Right) | 4 | 🟢 4 Vistas listas |
| **07** | **`rx7`** | El Aullido Rotativo | Mazda RX-7 FD3S | 1992 | 4 (Front 3/4, Left, Back 3/4, Right) | 4 | 🟢 4 Vistas listas |
| **08** | **`nsx`** | El Samurái Rojo | Honda NSX | 1990 | 4 (Front 3/4, Left, Back 3/4, Right) | 4 | 🟢 4 Vistas listas |
| **09** | **`civic`** | El Puño Blanco | Honda Civic EK9 Type R | 1997 | 4 (Front 3/4, Left, Back 3/4, Right) | 4 | 🟢 4 Vistas listas |
| **10** | **`s2000`** | El Grito Amarillo | Honda S2000 | 1999 | 4 (Front 3/4, Left, Back 3/4, Right) | 4 | 🟢 4 Vistas listas |
| **11** | **`evo`** | El Domador | Mitsubishi Lancer Evolution | 1992 | 4 (Front 3/4, Left, Back 3/4, Right) | 4 | 🟢 4 Vistas listas |
| **12** | **`eclipse`** | Verde Veneno | Mitsubishi Eclipse | 1995 | 4 (Front 3/4, Left, Back 3/4, Right) | 4 | 🟢 4 Vistas listas |
| **13** | **`3000gt`** | El Visionario | Mitsubishi 3000GT VR-4 | 1990 | 4 (Front 3/4, Left, Back 3/4, Right) | 4 | 🟢 4 Vistas listas |
| **14** | **`wrc`** | El Azul del Rally | Subaru Impreza WRX STI | 1998 | 4 (Front 3/4, Left, Back 3/4, Right) | 4 | 🟢 4 Vistas listas |
| **15** | **`lfa`** | La Voz del V10 | Lexus LFA | 2010 | 4 (Front 3/4, Left, Back 3/4, Right) | 4 | 🟢 4 Vistas listas |

---

## 🔄 2. FLUJO DE TRABAJO: REFERENCIAS ➔ MODELO 3D ➔ WEB / PRODUCCIÓN

```
produccion/referencias/{slug}/
        │
        ▼ 1. Ingesta en Tripo3D / Meshy (Multiview Image-to-Model)
   {slug}_raw.glb (Almacenado localmente en PC del usuario)
        │
        ▼ 2. Normalización y Saneamiento (tools/blender/sscars_asset_pipeline.py)
   {slug}_master.blend (Multi-cuerpo: Body, Wheels, Spoiler, Exhaust)
        │
        ├───────────────────────────────┬───────────────────────────────┐
        ▼                               ▼                               ▼
   {slug}_web.glb               build_snapshot render            {slug}_70mm.3mf
 (Draco comprimido < 1.5 MB)      (Car Card HD Phygital)      (SLA Resina / Bambu AMS)
```

---

## 🏷️ 3. CONVENCIÓN DE VISTAS Y CLASIFICACIÓN

- **Tipo A — 3D PRIMARY REFERENCE:** Vistas ortogonales o directas utilizadas para alimentar los 4 slots de reconstrucción multivista (`1-front`, `2-left`, `3-back`, `4-right`).
- **Tipo B — 3D SECONDARY REFERENCE:** Vistas en perspectiva de tres cuartos (`tresc-frontal`, `tresc-trasera`) o cenitales para verificar volúmenes y curvatura de aletas.
- **Tipo C — DETAIL REFERENCE:** Tomas de detalle de llantas, calandra, difusor o alerones.
- **Tipo D — CONTEXT/HISTORY:** Banners y fotografías de archivo situadas en `public/images/historia/` (no utilizadas para generar mallas 3D).
- **Tipo E — INSPECTION/QA:** Collages de auditoría y comparativas en `produccion/auditoria-fotos/`.

---

## 🔒 4. DECISIÓN DE CONVENCIÓN DE DIRECTORIOS

El repositorio utiliza la ruta en español **`produccion/referencias/{slug}/`** de forma canónica y consolidada, garantizando compatibilidad total con los scripts existentes (`normalizar_vistas.py`, `preparar_kit.py`, documentación y enlaces del catálogo).

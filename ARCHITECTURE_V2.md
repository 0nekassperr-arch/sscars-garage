# 🏛️ ARQUITECTURA DEL SISTEMA — SSCARS GARAGE 2.0 (V2)

> **Documento:** Especificación Técnica y Arquitectura del Sistema  
> **Versión:** 2.5.0-3D-ASSET-PIPELINE-BLENDER  
> **Fecha:** 2026-09-14  
> **Estado:** Fase 5.2B-1 (Pipeline de Assets 3D en Blender CLI + Configuraciones Modulares) Completada y Testeada

---

## 📑 ÍNDICE

1. [Resumen Ejecutivo y Estado de Fases](#1-resumen-ejecutivo-y-estado-de-fases)
2. [Diferenciación de Entidades Fundamentales](#2-diferenciación-de-entidades-fundamentales)
3. [Pipeline 3D de Procesamiento y Normalización (`tools/blender/`)](#3-pipeline-3d-de-procesamiento-y-normalización)
4. [Estrategia de Segmentación y Detección Geométrica](#4-estrategia-de-segmentación-y-detección-geométrica)
5. [Sistema de Configuración Modular (`configs/*.json`)](#5-sistema-de-configuración-modular)
6. [QA Automatizado y Filosofía Conservadora (`REVIEW_REQUIRED`)](#6-qa-automatizado-y-filosofía-conservadora)
7. [Storage, Renders y Aislamiento de Archivos Pesados](#7-storage-renders-y-aislamiento-de-archivos-pesados)
8. [Esquema de Base de Datos y Migraciones Versionadas](#8-esquema-de-base-de-datos-y-migraciones-versionadas)
9. [Funcionalidades Deliberadamente Pospuestas](#9-funcionalidades-deliberadamente-pospuestas)

---

## 1. RESUMEN EJECUTIVO Y ESTADO DE FASES

SSCARS Garage 2.0 une el coleccionismo físico y virtual mediante una arquitectura de datos sólida y un pipeline de procesamiento 3D determinista.

### Estado Actual de Fases:
- **✅ FASE 1 (Foundation):** Esquema relacional en Supabase PostgreSQL, Storage, catálogo base y Gold inventory (100 unidades).
- **✅ PARCHE HARDENING (R1–R5):** Protección de perfiles, permisos RPC y search_path seguro.
- **✅ FASE 2 & 2.1 (Auth + Garage + Colección):** GoTrue Auth, álbum digital de 15 cartas JDM y RLS estricto por usuario.
- **✅ FASE 3 (Daily Reward + Digital Cards + XP):** Motor atómico de Daily Drop en `Europe/Madrid`, política anti-duplicados y ledger de XP idempotente.
- **✅ FASE 4 (Tuning + Builds + Snapshots):** Catálogo de piezas de tuning en 5 categorías, ownership verificado, cálculo server-side y snapshots inmutables.
- **✅ FASE 5 (Build Render + Car Card HD):** Pipeline de renderizado desacoplado, `render_jobs` y `MockRenderer`.
- **✅ FASE 5.2B-0 (Organización de Referencias Visuales):** 15 vehículos organizados en `produccion/referencias/{slug}/` con READMEs individuales e índice global maestro.
- **✅ FASE 5.2B-1 (Pipeline de Assets 3D en Blender CLI):**
  - Implementación de `tools/blender/sscars_asset_pipeline.py`.
  - Sistema de configuración modular en `tools/blender/configs/` (`default.json`, `350z.json`, `r32.json`, `r34.json`).
  - Detección de ruedas basada en RANSAC cilíndrico y simetría bilateral sin depender de nombres de Tripo.
  - Saneamiento y detección de cierres artificiales en los bajos.
  - Generador de informes QA estructurados en JSON con cálculo de confianza.
  - Modo seguro `--dry-run`.

---

## 2. DIFERENCIACIÓN DE ENTIDADES FUNDAMENTALES

$$\text{BUILD} \neq \text{SNAPSHOT} \neq \text{RENDER} \neq \text{CAR CARD} \neq \text{3D MASTER}$$

1. **BUILD:** Configuración viva en el garaje (`public.builds`).
2. **BUILD SNAPSHOT:** Copia canónica inmutable (`public.build_snapshots`).
3. **RENDER:** Trabajo y resultado de imagen 2D/3D (`public.render_jobs`).
4. **CAR CARD HD:** Carta coleccionable Phygital para vitrina web.
5. **3D MASTER:** Escena de Blender (`.blend`) multi-cuerpo que alimenta tanto al render como a la fabricación aditiva.

---

## 3. PIPELINE 3D DE PROCESAMIENTO Y NORMALIZACIÓN

```
[ PC LOCAL DEL USUARIO / TALLER 3D ] (Fuera de Git)
  assets_raw/{slug}_raw.glb (Descarga de Tripo3D / Meshy)
        │
        ▼ tools/blender/sscars_asset_pipeline.py
  ┌─────────────────────────────────────────────────────────┐
  │ 1. Ingesta y Validación de Integridad                   │
  │ 2. Normalización de Orientación (+Y: Frontal, +Z: Arriba)│
  │ 3. Escalado Canónico a 70.0 mm                          │
  │ 4. Calibración de Suelo (Z = 0.000 mm)                  │
  │ 5. Detección Cilíndrica de Ruedas (FL, FR, RL, RR)      │
  │ 6. Aislamiento de Carrocería, Alerón y Escape           │
  │ 7. Saneamiento de Bajos y Generación de Chasis          │
  │ 8. Auditoría QA JSON (PASS / REVIEW_REQUIRED)           │
  └────────────────────────────┬────────────────────────────┘
                               │
                               ▼
  assets_master/{slug}_master.blend (Jerarquía Multi-cuerpo)
        ├───────────────────────────────┬───────────────────────────────┐
        ▼                               ▼                               ▼
  assets_web/{slug}_web.glb      Car Card HD Render           assets_print/{slug}_70mm.3mf
(Draco comprimido < 1.5 MB)      (Render Adapter)              (Ahuecado 2mm / Bambu AMS)
```

---

## 4. ESTRATEGIA DE SEGMENTACIÓN Y DETECCIÓN GEOMÉTRICA

El pipeline **no confía en los nombres de objeto de Tripo** (`tripo_part_0`, etc.):
1. **Ruedas:** Detección en 4 cuadrantes espaciales mediante ajuste cilíndrico (RANSAC) sobre normales en X ($|\vec{N}_x| > 0.75$) y verificación de simetría bilateral ($|Y_{FL}-Y_{RL}| \approx |Y_{FR}-Y_{RR}|$).
2. **Carrocería (`BODY`):** Identificación del cascarón central dominante y volumen exterior.
3. **Alerón (`SPOILER`):** Búsqueda de montantes elevados en el tercio trasero superior ($Y < -0.2 \cdot L, Z > 0.6 \cdot H$).
4. **Escape (`EXHAUST`):** Búsqueda de cavidades tubulares en los extremos traseros inferiores.
5. **Bajos (`UNDERCARRIAGE`):** Detección de fondos planos artificiales y cota mínima de suelo ($Z \ge 1.8\text{ mm}$).

---

## 5. SISTEMA DE CONFIGURACIÓN MODULAR

Las configuraciones se combinan mediante herencia recursiva (*deep merge*):
- **`default.json`:** Tolerancias generales, umbrales y orientación base.
- **`{slug}.json`:** Ajustes por modelo (p. ej. `350z.json` desactiva búsqueda de alerón alto; `r32.json` configura alerón GT tubular y escape simple a la izquierda).

---

## 6. QA AUTOMATIZADO Y FILOSOFÍA CONSERVADORA

| Estado QA | Criterio de Confianza | Acción |
|---|---|---|
| **`PASS`** | Puntuaciones $\ge 0.85$ | Procesa y exporta automáticamente. |
| **`WARNING`** | Media $\ge 0.85$, algún componente entre $0.60$ y $0.85$ | Exporta con advertencias. |
| **`REVIEW_REQUIRED`** | Componente $< 0.60$ o geometría fundida | Marca para revisión humana antes de cerrar el master. |
| **`FAIL`** | Puntuación $< 0.35$ o ruedas asimétricas/ausentes | Aborta el procesamiento. |

---

## 7. STORAGE, RENDERS Y AISLAMIENTO DE ARCHIVOS PESADOS

- **Archivos Binarios Pesados:** Permanecen exclusivamente en local en el PC del usuario (`assets_raw/`, `assets_master/`, `assets_print/`) y no se suben a GitHub.
- **Storage Privado:** El bucket `build-renders` en Supabase es privado y está protegido por RLS por `auth.uid()`.

---

## 8. ESQUEMA DE BASE DE DATOS Y MIGRACIONES

```
supabase/migrations/
├── 001_initial_schema.sql            (16 tablas base + Enums + Constraints)
├── 002_rls_policies.sql              (Políticas RLS base)
├── 003_storage_buckets.sql           (Buckets de Supabase Storage)
├── 004_seed_catalog.sql              (15 coches JDM + 100 Golds + Tuning + Productos)
├── 005_functions_and_triggers.sql    (Triggers y RPCs atómicas)
├── 006_security_hardening.sql        (Parche de hardening R1–R5)
├── 007_user_cards_private_rls.sql    (Aislamiento estricto de colección por usuario)
├── 008_driver_level_and_timezone.sql (Función inmutable XP->Level y timezone Europe/Madrid)
├── 009_seed_cards_and_daily_reward_engine.sql (Seed de 30 cartas + Motor Daily Drop y duplicados)
├── 010_tuning_builds_and_snapshots.sql (Catálogo 5 categorías, cálculo stats, builds y snapshots)
└── 011_render_jobs_and_storage_privacy.sql (Tabla render_jobs, RPC de render y storage privado)
```

---

## 9. FUNCIONALIDADES DELIBERADAMENTE POSPUESTAS

1. **Fase 5.2B-2:** Prueba y calibración del pipeline 3D con el primer asset real local (350Z).
2. **Fase 6:** Adaptador de Printful y despacho segregado de la **SSCARS Gift Box**.
3. **Fase 7:** Integración de compra física de builds en Stripe Checkout V2 con doble escritura.
4. **Fase 8:** Renderizador 3D/IA definitivo de producción en alta definición.

---
*Fin del documento ARCHITECTURE_V2.md (Versión 2.5.0)*

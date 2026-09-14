# 🏛️ ARQUITECTURA DEL SISTEMA — SSCARS GARAGE 2.0 (V2)

> **Documento:** Especificación Técnica y Arquitectura del Sistema  
> **Versión:** 2.4.0-BUILD-RENDER-CAR-CARD-HD  
> **Fecha:** 2026-09-14  
> **Estado:** Fase 5 (Build Render Pipeline + MockRenderer + Car Card HD) Completada y Testeada

---

## 📑 ÍNDICE

1. [Resumen Ejecutivo y Estado de Fases](#1-resumen-ejecutivo-y-estado-de-fases)
2. [Diferenciación de Entidades Fundamentales](#2-diferenciación-de-entidades-fundamentales)
3. [Pipeline de Renderizado Desacoplado](#3-pipeline-de-renderizado-desacoplado)
4. [Tabla render_jobs, Idempotencia y Concurrencia](#4-tabla-render_jobs-idempotencia-y-concurrencia)
5. [Adaptador RendererAdapter y MockRenderer Determinista](#5-adaptador-rendereradapter-y-mockrenderer)
6. [Seguridad y Privacidad de Storage (build-renders)](#6-seguridad-y-privacidad-de-storage)
7. [Car Card HD: Estructura y Vínculo con Snapshots](#7-car-card-hd-estructura-y-vínculo-con-snapshots)
8. [Futuro Renderer Real (Puntos de Conexión)](#8-futuro-renderer-real)
9. [Esquema de Base de Datos y Migraciones Versionadas](#9-esquema-de-base-de-datos-y-migraciones-versionadas)
10. [Funcionalidades Deliberadamente Pospuestas](#10-funcionalidades-deliberadamente-pospuestas)

---

## 1. RESUMEN EJECUTIVO Y ESTADO DE FASES

SSCARS Garage 2.0 establece un pipeline desacoplado para transformar configuraciones de garaje congeladas en activos visuales de alta definición (Car Card HD).

### Estado Actual de Fases:
- **✅ FASE 1 (Foundation):** Esquema relacional en Supabase PostgreSQL, Storage, catálogo base y Gold inventory (100 unidades).
- **✅ PARCHE HARDENING (R1–R5):** Protección de perfiles, permisos RPC y search_path seguro.
- **✅ FASE 2 & 2.1 (Auth + Garage + Colección):** GoTrue Auth, álbum digital de 15 cartas JDM y RLS estricto por usuario.
- **✅ FASE 3 (Daily Reward + Digital Cards + XP):** Motor atómico de Daily Drop en `Europe/Madrid`, política anti-duplicados y ledger de XP idempotente.
- **✅ FASE 4 (Tuning + Builds + Snapshots):** Catálogo de piezas de tuning en 5 categorías, ownership verificado, cálculo server-side y snapshots inmutables.
- **✅ FASE 5 (Build Render + Car Card HD):**
  - Pipeline de renderizado desacoplado basado en `build_snapshots` inmutables.
  - Tabla `public.render_jobs` con control de estados (`pending`, `processing`, `completed`, `failed`).
  - Generación de `render_key` determinista (hash MD5/SHA-256).
  - Storage bucket `build-renders` privado con aislamiento estricto por usuario (`build-renders/${userId}/${snapshotId}/${version}/render.png`).
  - Adaptador `RendererAdapter` y mock funcional `MockRenderer`.
  - Visualización de Car Card HD personalizada en `/garage.html`.

---

## 2. DIFERENCIACIÓN DE ENTIDADES FUNDAMENTALES

Para evitar confusiones en la arquitectura de datos:

$$\text{BUILD} \neq \text{SNAPSHOT} \neq \text{RENDER} \neq \text{CAR CARD}$$

```
┌───────────────────────────┐
│       1. BUILD            │ ──► Configuración viva y mutable en el garaje del usuario (public.builds).
└─────────────┬─────────────┘
              │ Congelación explícita
              ▼
┌───────────────────────────┐
│     2. BUILD SNAPSHOT     │ ──► Fotografía inmutable histórica (public.build_snapshots). No cambia jamás.
└─────────────┬─────────────┘
              │ Solicitud de render
              ▼
┌───────────────────────────┐
│       3. RENDER           │ ──► Trabajo y artefacto de imagen generado (public.render_jobs + Storage).
└─────────────┬─────────────┘
              │ Composición Phygital
              ▼
┌───────────────────────────┐
│     4. CAR CARD HD        │ ──► Carta coleccionable personalizada que une Coche + Snapshot + Render + Stats.
└───────────────────────────┘
```

---

## 3. PIPELINE DE RENDERIZADO DESACOPLADO

El renderer **nunca consulta la tabla `builds` actual**. Su única fuente de verdad es el **`build_snapshot`** inmutable:

```
[USUARIO / GARAGE]
       │
       ▼ RPC: request_build_render_atomic(snapshot_id, provider, version)
[POSTGRESQL]
       ├── 1. Valida ownership (snapshot.user_id = auth.uid())
       ├── 2. Calcula render_key determinista = hash(snapshot_id, version, build_data)
       ├── 3. Comprueba idempotencia en `render_jobs` (retorna caché si ya existe)
       └── 4. Crea registro de trabajo (`render_jobs`) con storage_path seguro
              │
              ▼
[RENDERER ADAPTER] (api/render/adapter.js)
       ├── MockRenderer (Fase 5 actual: determinista, 0 costes de API)
       └── Future Renderer (Fase posterior: 3D Canvas / Worker / AI)
              │
              ▼
[SUPABASE STORAGE] (build-renders/${user_id}/${snapshot_id}/${version}/render.png)
```

---

## 4. TABLA `render_jobs`, IDEMPOTENCIA Y CONCURRENCIA

Definida en la migración `011_render_jobs_and_storage_privacy.sql`:

```sql
CREATE TABLE public.render_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID REFERENCES public.build_snapshots(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(32) DEFAULT 'pending' NOT NULL,
    renderer_provider VARCHAR(64) DEFAULT 'mock' NOT NULL,
    renderer_version VARCHAR(32) DEFAULT '1.0.0' NOT NULL,
    render_key VARCHAR(128) NOT NULL,
    storage_path TEXT NOT NULL,
    width INTEGER DEFAULT 2048 NOT NULL,
    height INTEGER DEFAULT 2048 NOT NULL,
    mime_type VARCHAR(64) DEFAULT 'image/png' NOT NULL,
    render_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    error_code VARCHAR(64),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_render_job_idempotency UNIQUE (snapshot_id, renderer_provider, renderer_version, render_key)
);
```

- **Idempotencia:** La restricción `UNIQUE (snapshot_id, renderer_provider, renderer_version, render_key)` garantiza que dos solicitudes idénticas reutilicen el trabajo existente sin generar duplicados.
- **Concurrencia:** Dos llamadas simultáneas son serializadas en PostgreSQL, retornando el mismo job lógico.

---

## 5. ADAPTADOR `RendererAdapter` Y `MockRenderer`

- **`RendererAdapter` (Clase Base):** Define la interfaz estándar para generar claves de render, rutas de storage y procesar snapshots.
- **`MockRenderer`:** Implementación determinista que no consume llamadas externas de pago ni modelos 3D pesados. Produce metadatos canónicos de la Car Card HD para validar el flujo completo.

---

## 6. SEGURIDAD Y PRIVACIDAD DE STORAGE (`build-renders`)

- **Aislamiento por Usuario:** El bucket `build-renders` es privado (`public = false`).
- **Política RLS en Storage:**
  ```sql
  CREATE POLICY "User Read Own Build Renders" 
      ON storage.objects FOR SELECT 
      USING (bucket_id = 'build-renders' AND (auth.uid()::text = (storage.foldername(name))[1]));
  ```
- **Rutas Deterministas:** `build-renders/${userId}/${snapshotId}/${version}/render.png`. Las rutas no contienen texto libre del usuario ni caracteres de path traversal (`../`).

---

## 7. CAR CARD HD: ESTRUCTURA Y VÍNCULO CON SNAPSHOTS

La Car Card HD personalizada reúne:
1. **Identidad del Coche:** Nombre, modelo real y año (de `cars`).
2. **Identidad del Propietario:** `@username` (de `profiles`).
3. **Piezas Equipadas:** Llantas, Pintura, Alerón, Escape y Kit de carrocería (congeladas en `build_snapshots.build_data`).
4. **Estadísticas Congeladas:** Potencia, 0-100, Manejo y Estilo (de `build_snapshots.stats`).
5. **Artefacto de Render:** Imagen y render key verificable (de `render_jobs`).

---

## 8. FUTURO RENDERER REAL

> 💡 **Punto de Conexión Futuro:**  
> Cuando se integre el renderizador definitivo, la arquitectura solo requerirá conectar un nuevo adaptador que herede de `RendererAdapter` (p. ej. `ThreeJSRenderer` o `ServerlessCanvasRenderer`). El frontend, la base de datos y los snapshots **no requerirán ninguna modificación estructural**.

---

## 9. ESQUEMA DE BASE DE DATOS Y MIGRACIONES

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

## 10. FUNCIONALIDADES DELIBERADAMENTE POSPUESTAS

1. **Fase 6:** Adaptador de Printful y despacho segregado de la **SSCARS Gift Box**.
2. **Fase 7:** Integración de compra física de builds en Stripe Checkout V2 con doble escritura.
3. **Fase 8:** Renderizador 3D/IA definitivo de producción en alta definición.

---
*Fin del documento ARCHITECTURE_V2.md (Versión 2.4.0)*

# 🏛️ ARQUITECTURA DEL SISTEMA — SSCARS GARAGE 2.0 (V2)

> **Documento:** Especificación Técnica y Arquitectura del Sistema  
> **Versión:** 2.3.0-TUNING-BUILDS-SNAPSHOTS  
> **Fecha:** 2026-09-14  
> **Estado:** Fase 4 (Tuning + Builds + Snapshots Inmutables) Completada y Testeada

---

## 📑 ÍNDICE

1. [Resumen Ejecutivo y Estado de Fases](#1-resumen-ejecutivo-y-estado-de-fases)
2. [Arquitectura de Autenticación y Autoridad](#2-arquitectura-de-autenticación-y-autoridad)
3. [Modelo de Propiedad de Cartas y Restricción de Garaje](#3-modelo-de-propiedad-de-cartas)
4. [Módulo de Tuning y Catálogo de Piezas](#4-módulo-de-tuning-y-catálogo-de-piezas)
5. [Cálculo de Stats Server-Side y Reglas de XP](#5-cálculo-de-stats-server-side-y-reglas-de-xp)
6. [Ciclo de Vida de Builds (Un Coche ➔ Múltiples Configuraciones)](#6-ciclo-de-vida-de-builds)
7. [Snapshots Inmutables y Versionado](#7-snapshots-inmutables-y-versionado)
8. [Personalización Virtual vs Fabricación Física](#8-personalización-virtual-vs-fabricación-física)
9. [Seguridad, Aislamiento RLS y Permisos RPC](#9-seguridad-aislamiento-rls-y-permisos-rpc)
10. [Esquema de Base de Datos y Migraciones Versionadas](#10-esquema-de-base-de-datos-y-migraciones-versionadas)
11. [Funcionalidades Deliberadamente Pospuestas](#11-funcionalidades-deliberadamente-pospuestas)

---

## 1. RESUMEN EJECUTIVO Y ESTADO DE FASES

SSCARS Garage 2.0 une el coleccionismo físico con la personalización virtual profunda.

### Estado Actual de Fases:
- **✅ FASE 1 (Foundation):** Esquema relacional en Supabase PostgreSQL, Storage, catálogo base y Gold inventory (100 unidades).
- **✅ PARCHE HARDENING (R1–R5):** Protección de perfiles, revocación de RPCs públicas, recompensa diaria server-side y `search_path` seguro.
- **✅ FASE 2 & 2.1 (Auth + Garage + Colección):** GoTrue Auth, álbum digital de 15 cartas JDM y RLS estricto por usuario.
- **✅ FASE 3 (Daily Reward + Digital Cards + XP):** Motor atómico de Daily Drop en `Europe/Madrid`, política anti-duplicados y ledger de XP idempotente.
- **✅ FASE 4 (Tuning + Builds + Snapshots):**
  - Catálogo de piezas de tuning en 5 categorías (`wheels`, `paint`, `spoiler`, `exhaust`, `body_kit`).
  - Validación estricta de ownership: solo se pueden tunear coches poseídos en `user_cards`.
  - Requisitos de XP por pieza verificados en servidor.
  - Cálculo de estadísticas finales server-side (`hp`, `top_speed_kmh`, `acceleration_0_100`, `handling`, `style_points`).
  - Múltiples builds por coche (`public.builds`).
  - Snapshots históricos inmutables y versionados (`public.build_snapshots`), protegidos por trigger de base de datos contra `UPDATE` y `DELETE`.

---

## 2. ARQUITECTURA DE AUTENTICACIÓN Y AUTORIDAD

- **Única Fuente de Verdad:** Supabase GoTrue y PostgreSQL (`auth.uid()`).
- **Seguridad en Cliente:** `public/js/auth.js` utiliza exclusivamente `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Las peticiones se autorizan mediante `Bearer <JWT>`. Ante un error HTTP 401, la sesión local se purga de inmediato.
- `SUPABASE_SERVICE_ROLE_KEY` reside exclusivamente en el backend y jamás se expone al cliente.

---

## 3. MODELO DE PROPIEDAD DE CARTAS

$$\text{cars (catálogo 15)} \longrightarrow \text{cards (definición)} \longrightarrow \text{user\_cards (propiedad real)}$$

- **Principio Fundamental de Ownership:** Un usuario solo puede acceder al modo Tuning de un vehículo si existe al menos una fila en `public.user_cards` donde `user_id = auth.uid()` y `card.car_id = car_id`.
- Si el usuario no posee el vehículo, la interfaz bloquea el acceso (`🔒 Unlock this car in your Garage first`) y el procedimiento PostgreSQL `save_build_atomic()` rechaza la transacción a nivel de servidor.

---

## 4. MÓDULO DE TUNING Y CATÁLOGO DE PIEZAS

Las piezas se almacenan en la tabla `public.tuning_parts` (`010_tuning_builds_and_snapshots.sql`) estructuradas en 5 categorías estándar:

| Categoría | Pieza | Slug | Requisito XP | Modificadores |
|---|---|---|---|---|
| **Wheels** | Llantas de Serie | `wheels-stock` | 0 XP | 0 CV, 0 Manejo, 0 Estilo |
| **Wheels** | Llantas Street Rays TE37 | `wheels-street` | 100 XP | +2 Manejo, +4 Estilo |
| **Wheels** | Llantas Competición Magnesio | `wheels-racing` | 500 XP | +5 Manejo, +8 Estilo |
| **Paint** | Pintura de Serie | `paint-stock` | 0 XP | 0 CV, 0 Manejo, 0 Estilo |
| **Paint** | Midnight Purple III | `paint-midnight-purple` | 250 XP | +8 Estilo |
| **Paint** | Negro Carbón Satinado | `paint-carbon-black` | 150 XP | +5 Estilo |
| **Paint** | Blanco Campeonato Type R | `paint-championship-white` | 100 XP | +4 Estilo |
| **Paint** | Rojo Fórmula GT | `paint-formula-red` | 100 XP | +4 Estilo |
| **Spoiler** | Alerón de Serie | `spoiler-stock` | 0 XP | 0 CV, 0 Manejo, 0 Vel |
| **Spoiler** | Ducktail Callejero | `spoiler-ducktail` | 150 XP | +2 Manejo, +2 km/h, +5 Estilo |
| **Spoiler** | Alerón GT de Carbono Alto | `spoiler-gt-wing` | 400 XP | +6 Manejo, -2 km/h, +7 Estilo |
| **Exhaust** | Escape de Serie | `exhaust-stock` | 0 XP | 0 CV, 0.0s Acel, 0 Estilo |
| **Exhaust** | Escape Deportivo Inox | `exhaust-sport` | 150 XP | +5 CV, -0.1s Acel, +3 Estilo |
| **Exhaust** | Línea Completa de Titanio | `exhaust-titanium` | 600 XP | +12 CV, -0.2s Acel, +8 Estilo |
| **Body Kit** | Carrocería de Serie | `bodykit-stock` | 0 XP | 0 CV, 0 Manejo, 0 Estilo |
| **Body Kit** | Splitter y Taloneras Street | `bodykit-street` | 200 XP | +3 Manejo, +6 Estilo |
| **Body Kit** | Kit Ensanchado Widebody GT | `bodykit-widebody` | 750 XP | +7 Manejo, +12 Estilo |

---

## 5. CÁLCULO DE STATS SERVER-SIDE Y REGLAS DE XP

- **Función PostgreSQL Centralizada:** `public.calculate_build_stats(p_car_id, p_part_slugs)`
  - Obtiene los `base_stats` del vehículo desde `public.cars`.
  - Valida que no haya más de 1 pieza por categoría.
  - Suma los modificadores numéricos y aplica límites físicos:
    - $\text{Potencia (CV)} = \text{Base} + \sum \Delta \text{HP}$
    - $\text{0-100 km/h} = \max(2.0, \text{Base} + \sum \Delta \text{Accel})$
    - $\text{Manejo} = \min(100, \max(1, \text{Base} + \sum \Delta \text{Handling}))$
    - $\text{Puntos de Estilo} = \sum \Delta \text{Style}$
- **Validación de XP:** Al guardar una build, el procedimiento `save_build_atomic()` comprueba en `public.profiles` que el XP del usuario sea $\ge$ al `xp_required` de cada pieza seleccionada.

---

## 6. CICLO DE VIDA DE BUILDS (UN COCHE ➔ MÚLTIPLES CONFIGURACIONES)

- Un usuario puede crear y almacenar múltiples configuraciones para un mismo coche en `public.builds` (ejemplo: *"Midnight Beast"*, *"Track Day Setup"*, *"Touge Drift"*).
- Cada build almacena su nombre, coche (`car_id`), piezas equipadas en formato canónico JSONB y estadísticas calculadas.
- El usuario puede editar, renombrar y eliminar sus builds en cualquier momento.

---

## 7. SNAPSHOTS INMUTABLES Y VERSIONADO

Cuando un usuario decide congelar una build (para compra física futura o generación de Car Card):

```
BUILD ACTUAL (public.builds)
       │
       ▼ RPC: create_build_snapshot_atomic(build_id)
       │
SNAPSHOT INMUTABLE (public.build_snapshots)
       ├── build_id: UUID (ON DELETE SET NULL)
       ├── user_id: UUID
       ├── car_id: VARCHAR
       ├── build_data: JSONB (Copia canónica completa de piezas y metadatos)
       ├── stats: JSONB (Estadísticas finales congeladas)
       └── snapshot_version: 1 (Versionado formal)
```

### Garantías de Inmutabilidad Especial:
1. **Trigger de Base de Datos:** `trg_build_snapshots_immutable` (`BEFORE UPDATE OR DELETE`) dispara `RAISE EXCEPTION` ante cualquier intento de alteración o borrado.
2. **Independencia Histórica:** Modificar o eliminar la build original después de tomar el snapshot **deja el snapshot 100% idéntico e intacto**.
3. **Punto de Conexión para Render:** El snapshot proporciona los datos canónicos necesarios para que el futuro pipeline de renderizado genere la imagen HD correspondiente sin depender del estado actual del garaje.

---

## 8. PERSONALIZACIÓN VIRTUAL VS FABRICACIÓN FÍSICA

> 💡 **Nota de Arquitectura:**  
> **Personalización Virtual $\neq$ Variantes de Fabricación Física.**  
> El garaje digital ofrece amplias combinaciones visuales para la experiencia de juego y colección. La fabricación física bajo demanda utilizará posteriormente un conjunto controlado de variantes y adapters modulares, mapeados a partir de los snapshots congelados.

---

## 9. SEGURIDAD, AISLAMIENTO RLS Y PERMISOS RPC

| Objeto | Política RLS / Permiso | Acceso |
|---|---|---|
| `tuning_parts` | `tuning_parts_select_public` | SELECT público (`active = true`). Escritura exclusiva de backend. |
| `builds` | `builds_select_own`<br>`builds_insert_own`<br>`builds_update_own`<br>`builds_delete_own` | Gestión privada exclusiva para `auth.uid() = user_id`. |
| `build_snapshots` | `build_snapshots_select_own`<br>`build_snapshots_insert_own` | SELECT e INSERT para `auth.uid() = user_id`. UPDATE y DELETE bloqueados por trigger. |
| `save_build_atomic()` | RPC `SECURITY DEFINER` | `REVOKE FROM PUBLIC, anon; GRANT TO authenticated, service_role;` |
| `create_build_snapshot_atomic()` | RPC `SECURITY DEFINER` | `REVOKE FROM PUBLIC, anon; GRANT TO authenticated, service_role;` |
| `delete_build_atomic()` | RPC `SECURITY DEFINER` | `REVOKE FROM PUBLIC, anon; GRANT TO authenticated, service_role;` |

---

## 10. ESQUEMA DE BASE DE DATOS Y MIGRACIONES

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
└── 010_tuning_builds_and_snapshots.sql (Catálogo 5 categorías, cálculo stats, builds y snapshots versionados)
```

---

## 11. FUNCIONALIDADES DELIBERADAMENTE POSPUESTAS

Las siguientes funcionalidades quedan para fases posteriores:
1. **Fase 5:** Motor de renders HD de Car Cards y carga en Supabase Storage a partir de snapshots.
2. **Fase 6:** Adaptador de Printful y despacho de **SSCARS Gift Box**.
3. **Fase 7:** Integración de compra física de builds en Stripe Checkout V2 con doble escritura.

---
*Fin del documento ARCHITECTURE_V2.md (Versión 2.3.0)*

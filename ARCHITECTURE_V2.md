# 🏛️ ARQUITECTURA DEL SISTEMA — SSCARS GARAGE 2.0 (V2)

> **Documento:** Especificación Técnica y Arquitectura del Sistema  
> **Versión:** 2.1.0-AUTH-GARAGE-COLLECTION  
> **Fecha:** 2026-09-14  
> **Estado:** Fase 2 (Auth + Garage + Colección Digital) Implementada y Testeada

---

## 📑 ÍNDICE

1. [Resumen Ejecutivo y Estado de Fases](#1-resumen-ejecutivo-y-estado-de-fases)
2. [Arquitectura de Autenticación (Supabase Auth)](#2-arquitectura-de-autenticación-supabase-auth)
3. [Módulo de Garaje y Perfil de Conductor](#3-módulo-de-garaje-y-perfil-de-conductor)
4. [Colección Digital de Cartas JDM](#4-colección-digital-de-cartas-jdm)
5. [Seguridad y Políticas RLS Aplicadas](#5-seguridad-y-políticas-rls-aplicadas)
6. [Persistencia y Coexistencia V1 / V2](#6-persistencia-y-coexistencia-v1--v2)
7. [Esquema de Base de Datos y Migraciones](#7-esquema-de-base-de-datos-y-migraciones)
8. [Motor de Campañas y Gift Box (Planificado para Fase 3)](#8-motor-de-campañas-y-gift-box)
9. [Fulfillment Dual (Planificado para Fase 4)](#9-fulfillment-dual)
10. [Funcionalidades Deliberadamente Pospuestas](#10-funcionalidades-deliberadamente-pospuestas)
11. [Estrategia de Rollback y Contingencia](#11-estrategia-de-rollback-y-contingencia)

---

## 1. RESUMEN EJECUTIVO Y ESTADO DE FASES

SSCARS Garage 2.0 evoluciona el modelo de tienda estática hacia una plataforma **Phygital** (Físico + Digital).

### Estado Actual de Fases:
- **✅ FASE 1 (Foundation):** Esquema relacional en Supabase PostgreSQL, Storage buckets, catálogo de 15 coches, inventario atómico Gold (100 unidades) y suite de pruebas.
- **✅ PARCHE HARDENING (R1–R5):** Protección de campos de perfil, revocación de llamadas RPC públicas, recompensa diaria 100% server-side y `search_path` seguro.
- **✅ FASE 2 (Auth + Garage + Colección):**
  - Autenticación con Supabase Auth (Registro, Login, Logout, Recuperación de contraseña y Sesión persistente).
  - Vistas de Garaje (`/garage.html`) con progreso de XP, nivel y racha diaria.
  - Colección digital de 15 cartas conectada a `user_cards` en tiempo real.
  - Aislamiento de privacidad por usuario vía RLS (`007_user_cards_private_rls.sql`).
  - Carrito V1 y checkout intactos en `localStorage` (`sscars_cart_v1`).

---

## 2. ARQUITECTURA DE AUTENTICACIÓN (SUPABASE AUTH)

La autenticación utiliza el servicio nativo GoTrue de Supabase sin frameworks pesados ni dependencias externas:

```
[CLIENTE: public/js/auth.js]
       │
       ├── POST /auth/v1/signup ─────────► [Crea usuario en auth.users]
       │                                         │
       │                                         ▼ (Trigger: handle_new_user)
       │                                   [Crea perfil en public.profiles]
       │
       ├── POST /auth/v1/token (login) ──► [Devuelve JWT Bearer + Refresh Token]
       │                                         │
       │                                         ▼
       │                                   [Persiste en localStorage: sscars_auth_session_v2]
       │
       ├── POST /auth/v1/recover ────────► [Envía email de recuperación]
       │
       └── POST /auth/v1/logout ─────────► [Invalida sesión y limpia estado local]
```

### Reglas de Seguridad en Cliente:
- **Variables Públicas Utilizadas:** Únicamente `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
- **Aislamiento de Secretos:** `SUPABASE_SERVICE_ROLE_KEY` reside exclusivamente en el backend y jamás se expone al navegador ni a scripts públicos.
- **Manejo de Sesión:** Si el token JWT expira, `auth.js` ejecuta `refreshSession()` automáticamente mediante el `refresh_token`. Al cerrar sesión, el carrito de la tienda V1 **se preserva intacto** para no perjudicar la experiencia del visitante.

---

## 3. MÓDULO DE GARAJE Y PERFIL DE CONDUCTOR

Ubicado en `public/garage.html` (y accesible desde el botón "Mi Garaje" en el header de `public/index.html`):

1. **Datos de Conductor (Server Authority):**
   - **Nivel:** Calculado mediante la fórmula cuadrática $\text{Nivel} = \lfloor (\text{XP} / 100)^{1 / 1.8} \rfloor + 1$.
   - **Barra de XP:** Muestra el progreso actual hacia el siguiente nivel.
   - **Racha Diaria:** Días consecutivos de conexión (`daily_streak`).
   - *Nota:* XP, nivel, rol y racha son de solo lectura en cliente; cualquier intento de manipulación es bloqueado en la base de datos por el trigger `trg_protect_profile_system_fields`.
2. **Edición de Perfil:**
   - Permite modificar únicamente `username`, `display_name` y `avatar_url`.

---

## 4. COLECCIÓN DIGITAL DE CARTAS JDM

La colección se alimenta de la consulta relacional protegida:
```sql
SELECT * FROM public.user_cards
JOIN public.cards ON user_cards.card_id = cards.id
JOIN public.cars ON cards.car_id = cars.id
WHERE user_cards.user_id = auth.uid();
```

### Visualización y Estados:
- **Cartas Desbloqueadas (`owned`):** Muestra el arte en color, número de coche (`#01` a `#15`), estadísticas de potencia (CV), velocidad máxima, aceleración 0-100 km/h, manejo, rareza (*Common*, *Rare*, *Epic*, *Legendary*, *Gold Chrome*) y código serial de la carta.
- **Cartas Bloqueadas (`locked`):** Representadas con silueta oscura y candado ("No descubierta · Consigue una caja en la tienda").
- **Filtros Dinámicos:** [Todas (15)] [En Garaje] [Bloqueadas] [Gold Chase].

---

## 5. SEGURIDAD Y POLÍTICAS RLS APLICADAS

| Tabla | Política RLS | Acceso |
|---|---|---|
| `profiles` | `profiles_select_public`<br>`profiles_update_own` | SELECT público.<br>UPDATE limitado a `(username, display_name, avatar_url)` para `auth.uid() = id`. |
| `user_cards` | `user_cards_select_own` | SELECT exclusivo para `auth.uid() = user_id`.<br>INSERT/UPDATE/DELETE denegado a clientes (solo `service_role`). |
| `cars` / `cards` | `cars_select_public`<br>`cards_select_public` | SELECT público (`active = true`). Escritura denegada. |
| `daily_rewards` | `daily_rewards_select_own` | SELECT exclusivo para `auth.uid() = user_id`. |
| `xp_ledger` | `xp_ledger_select_own` | SELECT exclusivo para `auth.uid() = user_id`. |

---

## 6. PERSISTENCIA Y COEXISTENCIA V1 / V2

| Elemento | Fuente de Verdad | Estado en Fase 2 |
|---|---|---|
| **Carrito de Compras** | `localStorage` (`sscars_cart_v1`) | **V1 Intacto.** Funciona para usuarios anónimos y registrados. |
| **Checkout & Pagos** | Stripe Sessions (`api/checkout.js`) | **V1 Intacto.** No se ha modificado el flujo de cobro. |
| **Sorteo Anti-Repes** | `api/sorteo.js` (Fisher-Yates) | **V1 Intacto.** Muestreo ponderado para cajas físicas. |
| **Identidad & Perfil** | Supabase (`auth.users`, `public.profiles`) | **V2 Activo.** Autenticación real y persistente. |
| **Colección Digital** | Supabase (`public.user_cards`) | **V2 Activo.** Posesión digital real verificada server-side. |

---

## 7. ESQUEMA DE BASE DE DATOS Y MIGRACIONES

```
supabase/migrations/
├── 001_initial_schema.sql            (16 tablas base + Enums + Constraints)
├── 002_rls_policies.sql              (Políticas RLS base)
├── 003_storage_buckets.sql           (Buckets: car-card-renders, build-renders, user-assets)
├── 004_seed_catalog.sql              (15 coches JDM + 100 Golds + Tuning + Productos)
├── 005_functions_and_triggers.sql    (Triggers y RPCs atómicas)
├── 006_security_hardening.sql        (Parche de hardening R1–R5)
└── 007_user_cards_private_rls.sql    (Aislamiento estricto de colección por usuario)
```

---

## 8. FUNCIONALIDADES DELIBERADAMENTE POSPUESTAS

Para preservar la estabilidad y cumplir la metodología por fases, las siguientes funcionalidades **NO** han sido implementadas en esta fase y se abordarán en fases posteriores:
1. **Fase 3:** Webhook de Stripe V2 con auto-otorgamiento de `user_cards` tras compra y doble escritura.
2. **Fase 4:** Configurador de Tuning 3D y generación de `build_snapshots`.
3. **Fase 5:** Motor de renders HD de Car Cards y carga en Supabase Storage.
4. **Fase 6:** Adaptador de Printful y despacho segregado para la **SSCARS Gift Box**.
5. **Fase 7:** Gamificación interactiva en cliente (Daily Reward UI y subida de nivel visual).

---
*Fin del documento ARCHITECTURE_V2.md (Versión 2.1.0)*

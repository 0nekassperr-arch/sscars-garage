# 🏛️ ARQUITECTURA DEL SISTEMA — SSCARS GARAGE 2.0 (V2)

> **Documento:** Especificación Técnica y Arquitectura del Sistema  
> **Versión:** 2.2.0-GAMIFICATION-DAILY-REWARDS  
> **Fecha:** 2026-09-14  
> **Estado:** Fase 3 (Daily Reward + Cartas Digitales + Gamificación XP) Completada y Testeada

---

## 📑 ÍNDICE

1. [Resumen Ejecutivo y Estado de Fases](#1-resumen-ejecutivo-y-estado-de-fases)
2. [Ciclo de Gamificación y Flujo Daily Drop](#2-ciclo-de-gamificación-y-flujo-daily-drop)
3. [Motor de Recompensas Diarias (PostgreSQL Authority)](#3-motor-de-recompensas-diarias)
4. [Política Anti-Duplicados de Cartas](#4-política-anti-duplicados-de-cartas)
5. [Cálculo de Racha (Daily Streak) y Timezone Europe/Madrid](#5-cálculo-de-racha-y-timezone-europemadrid)
6. [Gestión de XP, Ledger Idempotente y Niveles](#6-gestión-de-xp-ledger-idempotente-y-niveles)
7. [Integración con Inventario Gold (100 unidades Físicas)](#7-integración-con-inventario-gold)
8. [Seguridad, Aislamiento RLS y Permisos RPC](#8-seguridad-aislamiento-rls-y-permisos-rpc)
9. [Persistencia y Coexistencia V1 / V2](#9-persistencia-y-coexistencia-v1--v2)
10. [Esquema de Base de Datos y Migraciones Versionadas](#10-esquema-de-base-de-datos-y-migraciones-versionadas)
11. [Funcionalidades Deliberadamente Pospuestas](#11-funcionalidades-deliberadamente-pospuestas)

---

## 1. RESUMEN EJECUTIVO Y ESTADO DE FASES

SSCARS Garage 2.0 une la colección física con un bucle de retención y gamificación digital diario.

### Estado Actual de Fases:
- **✅ FASE 1 (Foundation):** Tablas maestras, Storage, catálogo y Gold inventory en Supabase.
- **✅ HARDENING (R1–R5):** Protección de perfiles, permisos RPC y search_path seguro.
- **✅ FASE 2 & 2.1 (Auth + Garage + Colección):** Autenticación GoTrue, álbum de 15 cartas JDM y RLS estricto por usuario.
- **✅ FASE 3 (Daily Reward + Cartas Digitales + XP):**
  - Motor de Daily Drop server-side (`claim_daily_reward_atomic()`).
  - Asignación atómica de cartas digitales a `public.user_cards`.
  - Política de duplicados con conversión a **Bonus XP (+250 XP)** cuando el catálogo estándar está completo.
  - Sorteo de Gold Chase (1/500) sincronizado con el inventario físico de 100 unidades.
  - Timezone comercial de reinicio diario fijada en **`Europe/Madrid`**.
  - Interfaz interactiva de Daily Drop y modal de reveal en `/garage.html`.

---

## 2. CICLO DE GAMIFICACIÓN Y FLUJO DAILY DROP

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│  VISITANTE   │ ──► │    LOGIN     │ ──► │  MI GARAJE   │ ──► │ 🎁 ABRIR DAILY DROP  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────┬───────────┘
                                                                          │
                                                                          ▼
                                                       ┌──────────────────────────────────────┐
                                                       │ RPC: claim_daily_reward_atomic()     │
                                                       │ (Identidad segura: auth.uid())       │
                                                       └──────────────────┬───────────────────┘
                                                                          │
                                        ┌─────────────────────────────────┴─────────────────────────────────┐
                                        ▼                                                                   ▼
                         ┌─────────────────────────────┐                                     ┌─────────────────────────────┐
                         │      SI TOCA CARTA JDM      │                                     │       SI TOCA XP BOOST      │
                         │ 1. Busca carta no poseída   │                                     │ 1. Base 50 XP + 25 XP/racha │
                         │ 2. Asigna a `user_cards`    │                                     │ 2. Registra en `xp_ledger`  │
                         │ 3. Si ya las tiene todas:   │                                     │ 3. Recalcula nivel oficial  │
                         │    Convierte a +250 XP bonus│                                     │                             │
                         └─────────────────────────────┘                                     └─────────────────────────────┘
```

---

## 3. MOTOR DE RECOMPENSAS DIARIAS

Toda la lógica de probabilidades, asignación y validación se ejecuta en el procedimiento almacenado `claim_daily_reward_atomic()` (`009_seed_cards_and_daily_reward_engine.sql`):

### Matriz de Probabilidades Server-Side:
- **69.8% · Daily XP Boost:** $50\text{ XP} + (25\text{ XP} \times \text{racha})$ (hasta 500 XP máx).
- **25.0% · Digital Card Drop:** Asignación garantizada de una carta que el usuario **no posea**.
- **5.0% · Mega XP Boost:** $200\text{ XP} + (20\text{ XP} \times \text{racha})$.
- **0.2% (1/500) · Gold Chase Card:** Carta secreta dorada sujeta a stock físico en `gold_inventory`.

---

## 4. POLÍTICA ANTI-DUPLICADOS DE CARTAS

Para evitar cartas repetidas inservibles en la colección digital:
1. Al salir premio de carta, el motor busca una carta estándar que **no esté en `user_cards`** para ese usuario.
2. Si el usuario ya posee las 15 cartas de la colección estándar: el servidor **convierte automáticamente la recompensa en +250 XP Bonus** (`duplicate_xp_bonus`).
3. El cliente no interviene en la selección ni en la conversión.

---

## 5. CÁLCULO DE RACHA (DAILY STREAK) Y TIMEZONE `Europe/Madrid`

- **Día Comercial:** Evaluado con `(CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::date`. El día cambia a las 00:00:00 hora peninsular española independientemente del horario UTC o cambios de verano/invierno.
- **Racha Consecutiva:**
  - Si `last_daily_claim` fue ayer en horario de Madrid $\rightarrow$ `daily_streak := daily_streak + 1`.
  - Si no hubo reclamo ayer $\rightarrow$ `daily_streak := 1`.
  - Si ya reclamó hoy $\rightarrow$ Aborta devolviendo `{ alreadyClaimed: true }` sin alterar la racha ni duplicar puntos.

---

## 6. GESTIÓN DE XP, LEDGER IDEMPOTENTE Y NIVELES

- **Ledger Inmutable:** Cada ganancia de XP se registra en `public.xp_ledger` con clave única `daily_{user_id}_{date}`.
- **Fórmula Oficial Única:**
  $$\text{Level} = \left\lfloor \left( \frac{\text{XP}}{100} \right)^{1 / 1.8} \right\rfloor + 1$$
  Ejecutada de forma centralizada por `public.calculate_driver_level(p_xp)`.

---

## 7. INTEGRACIÓN CON INVENTARIO GOLD

- Si el sorteo diario concede la edición Gold Chase (1/500), se invoca internamente `public.allocate_gold_atomic(car_id)` con bloqueo `FOR UPDATE`.
- Si el cupo físico de ese coche está completo, se convierte a **Mega XP (+300 XP)**, garantizando que **jamás se sobrepasen las 100 unidades físicas de Gold**.

---

## 8. SEGURIDAD, AISLAMIENTO RLS Y PERMISOS RPC

- **`claim_daily_reward_atomic()`:** `REVOKE ALL FROM PUBLIC, anon; GRANT EXECUTE TO authenticated, service_role;`
- **Identidad:** Forzada desde `auth.uid()`. Un usuario no puede reclamar para otro.
- **Protección contra Concurrencia:** Bloqueo pesimista `SELECT ... FOR UPDATE` sobre la fila del perfil y restricción `UNIQUE(user_id, reward_date)` en `daily_rewards`.

---

## 9. PERSISTENCIA Y COEXISTENCIA V1 / V2

| Componente | Estado V1 | Estado V2 en Fase 3 |
|---|---|---|
| **Tienda y Carrito** | `localStorage` (`sscars_cart_v1`) intacto. | Coexiste sin interferencias. |
| **Checkout Stripe** | Sesiones clásicas directas. | Intacto. |
| **Gamificación Diaria** | No existía en V1. | Operativa en Supabase PostgreSQL. |
| **Colección Digital** | No existía en V1. | Operativa en Supabase (`user_cards`). |

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
└── 009_seed_cards_and_daily_reward_engine.sql (Seed de 30 cartas + Motor Daily Drop y duplicados)
```

---

## 11. FUNCIONALIDADES DELIBERADAMENTE POSPUESTAS

Las siguientes áreas quedan expresamente para fases posteriores:
1. **Fase 4:** Configurador de Tuning 3D y `build_snapshots`.
2. **Fase 5:** Motor de renders HD de Car Cards y carga en Supabase Storage.
3. **Fase 6:** Adaptador de Printful y despacho segregado de la **SSCARS Gift Box**.
4. **Fase 7:** Integración de compra de builds y doble escritura en webhook de Stripe.

---
*Fin del documento ARCHITECTURE_V2.md (Versión 2.2.0)*

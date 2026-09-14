# 🏛️ ARQUITECTURA DEL SISTEMA — SSCARS GARAGE 2.0 (V2)

> **Documento:** Especificación Técnica y Arquitectura del Sistema  
> **Versión:** 2.1.1-AUTH-GARAGE-AUDIT-FINAL  
> **Fecha:** 2026-09-14  
> **Estado:** Fase 2.1 (Auditoría y Corrección Final de Auth + Garage + Timezone) Completada y Testeada

---

## 📑 ÍNDICE

1. [Resumen Ejecutivo y Estado de Fases](#1-resumen-ejecutivo-y-estado-de-fases)
2. [Arquitectura de Autenticación: Fuente Única de Verdad](#2-arquitectura-de-autenticación-fuente-única-de-verdad)
3. [Modelo de Propiedad de Cartas: cars ➔ cards ➔ user_cards](#3-modelo-de-propiedad-de-cartas)
4. [Cálculo Centralizado XP ➔ Level (PostgreSQL Authority)](#4-cálculo-centralizado-xp--level)
5. [Día de Negocio y Timezone: Europe/Madrid](#5-día-de-negocio-y-timezone-europemadrid)
6. [Seguridad y Políticas RLS Aplicadas](#6-seguridad-y-políticas-rls-aplicadas)
7. [Persistencia y Coexistencia V1 / V2](#7-persistencia-y-coexistencia-v1--v2)
8. [Esquema de Base de Datos y Migraciones Versionadas](#8-esquema-de-base-de-datos-y-migraciones-versionadas)
9. [Funcionalidades Deliberadamente Pospuestas](#9-funcionalidades-deliberadamente-pospuestas)

---

## 1. RESUMEN EJECUTIVO Y ESTADO DE FASES

SSCARS Garage 2.0 evoluciona el modelo de tienda estática hacia una plataforma **Phygital** (Físico + Digital) con garantías criptográficas y relacionales.

### Estado Actual de Fases:
- **✅ FASE 1 (Foundation):** Esquema relacional en Supabase PostgreSQL, Storage buckets, catálogo de 15 coches e inventario atómico Gold (100 unidades).
- **✅ PARCHE HARDENING (R1–R5):** Protección de perfiles, revocación de RPCs públicas, recompensa diaria server-side y `search_path` seguro.
- **✅ FASE 2 & 2.1 (Auth + Garage + Colección + Auditoría):**
  - **Auth:** Supabase GoTrue como autoridad única. La cache local de sesión se purga automáticamente ante respuestas HTTP 401/403.
  - **Colección:** Modelo estricto `cars` ➔ `cards` ➔ `user_cards`. Los 15 slots de la UI no confieren propiedad; la propiedad real procede exclusivamente de `user_cards` filtrada por RLS (`auth.uid() = user_id`).
  - **XP ➔ Level:** Función inmutable `public.calculate_driver_level(p_xp)` como única fórmula oficial en PostgreSQL.
  - **Día de Negocio:** Timezone oficial fijada a `Europe/Madrid` en `claim_daily_reward_atomic()`.
  - **V1 Intacta:** Carrito en `localStorage` (`sscars_cart_v1`) y checkout de Stripe preservados al 100%.

---

## 2. ARQUITECTURA DE AUTENTICACIÓN: FUENTE ÚNICA DE VERDAD

La autenticación utiliza exclusivamente **Supabase Auth (GoTrue)**.

```
[CLIENTE: public/js/auth.js]
       │
       ├── POST /auth/v1/signup ─────────► [Crea usuario en auth.users]
       │                                         │
       │                                         ▼ (Trigger: handle_new_user)
       │                                   [Crea perfil en public.profiles]
       │
       ├── POST /auth/v1/token (login) ──► [Emite JWT firmado por Supabase]
       │                                         │
       │                                         ▼
       │                                   [Cache de sesión en localStorage: sscars_auth_session_v2]
       │
       └── Peticiones /rest/v1/... ──────► [Envía Authorization: Bearer <JWT>]
                                                 │
                                                 ├── Token Válido ──► PostgREST resuelve RLS (auth.uid())
                                                 └── Token Inválido (401) ──► Invalida cache local y emite Logout
```

### Respuestas a la Auditoría de Sesión:
1. **¿Supabase gestiona la persistencia?** Sí, Supabase valida la firma criptográfica del JWT y el tiempo de expiración en cada petición REST/PostgREST.
2. **¿Qué función cumple `sscars_auth_session_v2`?** Es estrictamente una **cache de transporte en cliente** para enviar el Bearer Token en las cabeceras HTTP. **No confiere autoridad ni permisos por sí misma**.
3. **¿Puede haber divergencia de estado?** No: si Supabase devuelve HTTP 401 (token expirado/revocado) y el refresco falla, `auth.js` elimina inmediatamente la entrada local y notifica a la UI el estado de visitante.

---

## 3. MODELO DE PROPIEDAD DE CARTAS

La propiedad digital sigue una jerarquía relacional inmutable:

```
┌────────────────────────────────┐
│           TABLA CARS           │ ──► Define las 15 Leyendas JDM (Catálogo maestro)
└───────────────┬────────────────┘
                │ 1:N
                ▼
┌────────────────────────────────┐
│           TABLA CARDS          │ ──► Define la carta y su código único (p. ej. CARD-R34-001)
└───────────────┬────────────────┘
                │ 1:N
                ▼
┌────────────────────────────────┐
│        TABLA USER_CARDS        │ ──► Propiedad REAL de un usuario (user_id = auth.uid())
└────────────────────────────────┘
```

- **Regla de Garaje:** Que la vista del Garaje dibuje 15 slots no significa que el usuario posea los coches. Los coches sin correspondencia en `user_cards` se renderizan como **`LOCKED`** ("No descubierta").
- **Aislamiento RLS:** Un usuario nunca puede leer ni consultar las filas de `user_cards` de otro usuario.

---

## 4. CÁLCULO CENTRALIZADO XP ➔ LEVEL

Para evitar duplicidad o discrepancias entre frontend y backend:

- **Fórmula Oficial Única:**
  $$\text{Level} = \left\lfloor \left( \frac{\text{XP}}{100} \right)^{1 / 1.8} \right\rfloor + 1$$
- **Implementación Centralizada en PostgreSQL (`008_driver_level_and_timezone.sql`):**
  ```sql
  CREATE OR REPLACE FUNCTION public.calculate_driver_level(p_xp BIGINT)
  RETURNS INTEGER AS $$
  BEGIN
      RETURN GREATEST(1, FLOOR(POWER(GREATEST(0, p_xp)::float / 100.0, 1.0 / 1.8))::integer + 1);
  END;
  $$ LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp;
  ```
- Todas las funciones que modifican experiencia (`award_xp_atomic`, `claim_daily_reward_atomic`) invocan `public.calculate_driver_level()` al actualizar `public.profiles`.

---

## 5. DÍA DE NEGOCIO Y TIMEZONE: Europe/Madrid

- **Definición de Día Comercial:** El reinicio diario de recompensas y rachas se calcula a las **00:00:00 hora peninsular española (`Europe/Madrid`)**.
- **Manejo de Horario de Verano/Invierno:** PostgreSQL gestiona nativamente la base de datos IANA (`CET` en invierno UTC+1, `CEST` en verano UTC+2), evitando que los usuarios experimenten cambios de día a las 01:00 o 02:00 AM UTC.
- **Implementación:**
  ```sql
  v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::date;
  ```

---

## 6. SEGURIDAD Y POLÍTICAS RLS APLICADAS

| Tabla | Política RLS | Acceso |
|---|---|---|
| `profiles` | `profiles_select_public`<br>`profiles_update_own` | SELECT público.<br>UPDATE restringido a `(username, display_name, avatar_url)` con trigger de bloqueo para `role`, `xp`, `level`, `daily_streak`. |
| `user_cards` | `user_cards_select_own` | SELECT exclusivo para `auth.uid() = user_id`.<br>Escritura exclusiva para `service_role`. |
| `cars` / `cards` | `cars_select_public`<br>`cards_select_public` | SELECT público (`active = true`). Escritura bloqueada. |
| `daily_rewards` | `daily_rewards_select_own` | SELECT exclusivo para `auth.uid() = user_id`. |
| `xp_ledger` | `xp_ledger_select_own` | SELECT exclusivo para `auth.uid() = user_id`. |
| `gold_inventory` | `gold_inventory_select_public` | SELECT público. Escritura exclusiva para `service_role`. |

---

## 7. ESQUEMA DE BASE DE DATOS Y MIGRACIONES VERSIONADAS

```
supabase/migrations/
├── 001_initial_schema.sql            (16 tablas base + Enums + Constraints)
├── 002_rls_policies.sql              (Políticas RLS base)
├── 003_storage_buckets.sql           (Buckets: car-card-renders, build-renders, user-assets)
├── 004_seed_catalog.sql              (15 coches JDM + 100 Golds + Tuning + Productos)
├── 005_functions_and_triggers.sql    (Triggers y RPCs atómicas)
├── 006_security_hardening.sql        (Parche de hardening R1–R5)
├── 007_user_cards_private_rls.sql    (Aislamiento estricto de colección por usuario)
└── 008_driver_level_and_timezone.sql (Función inmutable XP->Level y timezone Europe/Madrid)
```

---

## 8. FUNCIONALIDADES DELIBERADAMENTE POSPUESTAS

Las siguientes funcionalidades permanecen expresamente fuera de esta fase para garantizar estabilidad:
1. **Fase 3:** Webhook de Stripe V2 con asignación automática de `user_cards` y doble escritura.
2. **Fase 4:** Módulo interactivo de Tuning 3D y `build_snapshots`.
3. **Fase 5:** Pipeline de generación de Car Cards HD en Supabase Storage.
4. **Fase 6:** Adaptador de Printful y despacho de **SSCARS Gift Box**.
5. **Fase 7:** Interfaz interactiva de Daily Reward en cliente.

---
*Fin del documento ARCHITECTURE_V2.md (Versión 2.1.1)*

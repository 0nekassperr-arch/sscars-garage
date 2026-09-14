# 🏛️ ARQUITECTURA DEL SISTEMA — SSCARS GARAGE 2.0 (V2)

> **Documento:** Especificación Técnica y Arquitectura del Sistema  
> **Versión:** 2.0.0-FOUNDATION  
> **Fecha:** 2026-09-14  
> **Estado:** Foundation Aprobada y Migraciones Versionadas Listas

---

## 📑 ÍNDICE

1. [Resumen Ejecutivo y Objetivos de la V2](#1-resumen-ejecutivo-y-objetivos-de-la-v2)
2. [Aislamiento de Proveedores y Filosofía de Adapters](#2-aislamiento-de-proveedores-y-filosofía-de-adapters)
3. [Arquitectura General del Sistema V2](#3-arquitectura-general-del-sistema-v2)
4. [Esquema de Base de Datos Supabase (Migraciones Versionadas)](#4-esquema-de-base-de-datos-supabase)
5. [Políticas de Seguridad Row Level Security (RLS)](#5-políticas-de-seguridad-row-level-security-rls)
6. [Supabase Storage: Configuración y Políticas de Buckets](#6-supabase-storage-configuración-y-políticas)
7. [Motor de Productos de Temporada y Campañas (SSCARS Gift Box)](#7-motor-de-productos-de-temporada-y-campañas)
8. [Sistema de Builds, Tuning y Snapshots Inmutables](#8-sistema-de-builds-tuning-y-snapshots-inmutables)
9. [Sistema de Cartas Digitales y Car Cards HD](#9-sistema-de-cartas-digitales-y-car-cards-hd)
10. [Gamificación: XP Ledger Idempotente, Niveles y Recompensa Diaria](#10-gamificación-xp-ledger-idempotente-y-recompensa-diaria)
11. [Gestión Atómica de Inventario Gold y Concurrencia](#11-gestión-atómica-de-inventario-gold-y-concurrencia)
12. [Fulfillment Dual Polimórfico (Fábrica Genérica + Printful)](#12-fulfillment-dual-polimórfico)
13. [Estrategia de Migración V1 → V2 (Cero Downtime)](#13-estrategia-de-migración-v1--v2)
14. [Estrategia de Rollback y Contingencia](#14-estrategia-de-rollback-y-contingencia)

---

## 1. RESUMEN EJECUTIVO Y OBJETIVOS DE LA V2

SSCARS Garage V1 opera con una landing estática, carrito en `localStorage` y checkout en Stripe.

**SSCARS Garage 2.0 (V2)** establece a **Supabase (PostgreSQL, Auth y Storage)** como la fuente única de verdad para la identidad, progreso, catálogo y colecciones:
- **Identidad:** Supabase Auth con perfiles sincronizados y roles protegidos.
- **Catálogo Centralizado:** Los coches, precios y piezas dejan de estar hardcodeados en cliente y pasan a la base de datos.
- **Car Cards Digitales:** Cada figura física o logro genera una carta digital inmutable con metadatos y número de tirada.
- **Tuning y Snapshots:** El garaje permite personalizar vehículos generando *build snapshots* inmutables que congelan la configuración para la fabricación.
- **Campañas y Gift Box:** Motor dinámico para Black Friday, Navidad y bundles compuestos (Coche sorpresa + Merch Printful + Carta física).
- **Fulfillment Dual Segregado:** Gestión independiente de estados de fabricación y logística sin acoplarse a APIs concretas.

---

## 2. AISLAMIENTO DE PROVEEDORES Y FILOSOFÍA DE ADAPTERS

> ⚠️ **DECLARACIÓN DE INTEGRACIÓN Y PROVEEDOR:**  
> Ningún proveedor de fabricación externo antiguo forma parte del proyecto. La V2 utiliza un **Patrón Adapter Genérico (`factory`)** desacoplado. La conexión con el proveedor real de SSCARS se realizará en una fase posterior mediante credenciales seguras de entorno (`FACTORY_API_KEY`, `FACTORY_API_URL`), sin exponer nombres ni dependencias propietarias en el código ni en la base de datos.

```
                    ┌──────────────────────────────────────────────┐
                    │          CAPA DE FULFILLMENT V2              │
                    └──────────────────────┬───────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
       ┌─────────────────────────┐                   ┌─────────────────────────┐
       │   GENERIC FACTORY ADAPTER│                  │    PRINTFUL ADAPTER     │
       │ - Cola de impresión 3D  │                   │ - Merchandising POD     │
       │ - Logística InPost/Punto│                   │ - Ropa / Accesorios     │
       │ - Modo Manual Fallback  │                   │ - Webhook de Tracking   │
       └─────────────────────────┘                   └─────────────────────────┘
```

---

## 3. ARQUITECTURA GENERAL DEL SISTEMA V2

```
                                  ┌─────────────────────────────────────────┐
                                  │           CLIENTE WEB (V2 SPA)          │
                                  │  - Tienda V1 & Campañas Temporales      │
                                  │  - Garage 3D / Configurador de Builds   │
                                  │  - Álbum de Cartas Digitales & Ranks    │
                                  └───────────────┬─────────────────────────┘
                                                  │
                                                  ▼
                        ┌───────────────────────────────────────────────────┐
                        │              EDGE ROUTER & API GATEWAY            │
                        │            (Vercel Serverless Functions)          │
                        └─────────┬───────────────────────────────┬─────────┘
                                  │                               │
                ┌─────────────────┴─────────────┐                 │
                ▼                               ▼                 ▼
  ┌─────────────────────────┐     ┌─────────────────────────┐   ┌─────────────────────────┐
  │      SUPABASE AUTH      │     │    SUPABASE DATABASE    │   │    SUPABASE STORAGE     │
  │  - Email / Password     │     │  - PostgreSQL con RLS   │   │  - car-card-renders     │
  │  - Magic Link / OAuth   │     │  - Triggers & Functions │   │  - build-renders        │
  │  - JWT Claims           │     │  - Realtime CDC         │   │  - user-assets          │
  └─────────────────────────┘     └─────────────┬───────────┘   └─────────────────────────┘
                                                │
                ┌───────────────────────────────┼───────────────────────────────┐
                ▼                               ▼                               ▼
  ┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
  │      STRIPE CHECKOUT      │   │    ADAPTER FÁBRICA GEN.   │   │     ADAPTER PRINTFUL      │
  │  - Webhooks Idempotentes  │   │  - Cola de impresión SLA  │   │  - Sync de Variantes      │
  │  - V1 Boxes & V2 Builds   │   │  - InPost / Punto Pack    │   │  - Despacho Merch POD     │
  │  - Campañas / Gift Boxes  │   │  - Etiquetas Logísticas   │   │  - Tracking Internacional │
  └───────────────────────────┘   └───────────────────────────┘   └───────────────────────────┘
```

---

## 4. ESQUEMA DE BASE DE DATOS SUPABASE

Las migraciones SQL versionadas se organizan en `supabase/migrations/`:

| Archivo de Migración | Contenido y Propósito |
|---|---|
| `001_initial_schema.sql` | Definición de tablas maestras, tipos ENUM, claves foráneas, índices y triggers de inmutabilidad. |
| `002_rls_policies.sql` | Políticas de seguridad granular Row Level Security (RLS) para aislamiento estricto de usuarios y catálogo público. |
| `003_storage_buckets.sql` | Configuración de buckets en `storage.buckets` (`car-card-renders`, `build-renders`, `user-assets`) y políticas de lectura/escritura. |
| `004_seed_catalog.sql` | Semillas de datos para las 15 leyendas JDM, inventario Gold de 100 unidades, piezas de tuning y productos base. |
| `005_functions_and_triggers.sql` | Funciones almacenadas PostgreSQL: trigger de auto-perfil tras registro, asignación atómica de Gold, deduplicación de recompensas diarias y ledger de XP idempotente. |

---

## 5. POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)

- **Principio de Mínimo Privilegio:** Ningún cliente anónimo o autenticado puede escribir directamente en `cards`, `orders`, `order_items`, `fulfillments`, `gold_inventory` ni `xp_ledger`.
- **Aislamiento de Perfil y Garaje:** Cada usuario autenticado (`auth.uid()`) solo puede leer y modificar sus propios registros en `profiles`, `builds`, `build_snapshots` y `user_cards`.
- **Acceso Administrativo y Webhooks:** Todas las mutaciones críticas de pedidos y otorgamiento de recompensas se ejecutan exclusivamente mediante el **Service Role** en funciones serverless de backend.
- **Protección de Claves:** `SUPABASE_SERVICE_ROLE_KEY` reside únicamente en variables de entorno del servidor. NUNCA se exporta al frontend ni a repositorios.

---

## 6. SUPABASE STORAGE: CONFIGURACIÓN Y POLÍTICAS

1. **`car-card-renders` (Público, lectura abierta, escritura Service Role):**
   - Almacena las imágenes HD de Car Cards generadas por el backend.
   - Nomenclatura: `{car_slug}/{card_code}.webp`.
2. **`build-renders` (Público, lectura abierta, escritura Service Role):**
   - Almacena renders 3D de las configuraciones y snapshots del garaje.
   - Nomenclatura: `{snapshot_id}/preview.webp`.
3. **`user-assets` (Privado, autenticado por carpeta de usuario):**
   - Acceso exclusivo para subidas del propio usuario: `{user_id}/*`.

---

## 7. MOTOR DE PRODUCTOS DE TEMPORADA Y CAMPAÑAS

La **SSCARS Gift Box** y cualquier futura campaña (Black Friday, Navidad, Verano) se gestionan mediante entidades relacionales sin hardcodear fechas en código:

```sql
-- Estructura de Campaña
campaigns: {
    id: UUID,
    slug: 'xmas-2026',
    starts_at: '2026-12-01T00:00:00Z',
    ends_at: '2026-12-31T23:59:59Z',
    stock_limit: 500,
    stock_used: 0
}

-- Definición del Producto Gift Box
products: {
    id: 'gift_box_tier1',
    product_type: 'gift_box',
    campaign_id: '...',
    price: 79.95
}

-- Composición Dinámica del Bundle
product_bundle_items: [
    { item_type: 'mystery_car', provider: 'factory', quantity: 1 },
    { item_type: 'exclusive_card', provider: 'inhouse', quantity: 1 },
    { item_type: 'printful_merch', provider: 'printful', provider_variant_id: 'hoodie_xmas_l', quantity: 1 }
]
```

---

## 8. SISTEMA DE BUILDS, TUNING Y SNAPSHOTS INMUTABLES

- **Tuning Dinámico (`builds`):** Los usuarios pueden equipar piezas de la tabla `tuning_parts` (categorías extensibles: *wheels*, *spoiler*, *exhaust*, *paint*, *bodykit*, *suspension*, *decals*).
- **Snapshot Inmutable (`build_snapshots`):** Al tramitar un pedido o congelar una build, se crea un registro de snapshot. Un **trigger de PostgreSQL (`trg_build_snapshots_immutable`)** bloquea cualquier sentencia `UPDATE` o `DELETE`, garantizando que la orden histórica preserve exactamente la configuración comprada aunque el usuario modifique su garaje más adelante.

---

## 9. SISTEMA DE CARTAS DIGITALES Y CAR CARDS HD

- Cada carta posee un `code` único (p. ej. `CARD-R34-042-GOLD`).
- Los atributos de rendimiento (*hp*, *top speed*, *drift rating*) y acabado (*standard*, *matte*, *holo*, *gold_leaf*) se verifican server-side.
- La posesión en `user_cards` está ligada al perfil de Supabase y nunca se confía al `localStorage` del navegador.

---

## 10. GAMIFICACIÓN: XP LEDGER IDEMPOTENTE Y RECOMPENSA DIARIA

- **XP Ledger (`xp_ledger`):** Cada incremento de XP se registra con `idempotency_key` única. Reintentos de red o múltiples clics no duplican puntos.
- **Nivel Calculado:** Fórmula cuadrática gestionada por la función `award_xp_atomic()`:
  $$\text{Nivel} = \lfloor (\text{XP} / 100)^{1 / 1.8} \rfloor + 1$$
- **Recompensa Diaria (`daily_rewards`):** Restricción `UNIQUE(user_id, reward_date)` y control atómico de racha (`daily_streak`) mediante `claim_daily_reward_atomic()`.

---

## 11. GESTIÓN ATÓMICA DE INVENTARIO GOLD Y CONCURRENCIA

Para la tirada de 3.000 unidades con un tope estricto de **100 unidades Gold Chrome**:
- Tabla `gold_inventory` con restricción `CHECK (gold_assigned <= gold_total)`.
- Procedimiento `allocate_gold_atomic(p_car_id)` con bloqueo pesimista `FOR UPDATE`.
- Las peticiones concurrentes se resuelven secuencialmente en el motor transaccional de PostgreSQL, haciendo matemáticamente imposible sobreasignar unidades doradas.

---

## 12. FULFILLMENT DUAL POLIMÓRFICO

Un pedido con una Gift Box o ítems mixtos genera registros separados en `fulfillments`:
1. **Línea de Coche 3D:** Despacho hacia el taller de resina / punto de entrega InPost con estado `queued` → `processing` → `shipped`.
2. **Línea de Merchandising:** Despacho hacia la API de Printful con sincronización de tracking vía webhook.
3. El cliente consulta un único pedido en la web, visualizando el estado y tracking independiente de cada paquete.

---

## 13. ESTRATEGIA DE MIGRACIÓN V1 → V2 (CERO DOWNTIME)

1. **Fase 1 (Foundation - Completada):** Migraciones DDL desplegadas, tablas con RLS, Storage preparado y módulo `api/_supabase.js` listo con fallback no bloqueante.
2. **Fase 2 (Doble Escritura):** Los webhooks de Stripe registran pedidos en PostgreSQL y Upstash de forma concurrente sin modificar el checkout del cliente.
3. **Fase 3 (Lanzamiento Garage 2.0 & Gift Box):** Activación progresiva del nuevo frontend con autenticación Supabase Auth y lectura de catálogo dinámico.

---

## 14. ESTRATEGIA DE ROLLBACK Y CONTINGENCIA

- **Bandera de Seguridad (`isSupabaseConfigured`):** Si las variables de Supabase no están presentes o la base de datos se encuentra en mantenimiento, los endpoints de V1 operan normalmente con Upstash Redis y variables de entorno clásicas.
- **Fulfillment Manual de Respaldo:** Si un adaptador externo no responde, el fulfillment se marca como `pending`/`manual` y se notifica por email mediante Resend con el detalle de las piezas a producir.

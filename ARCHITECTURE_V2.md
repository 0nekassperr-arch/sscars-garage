# 🏛️ ARQUITECTURA DEL SISTEMA — SSCARS GARAGE 2.0 (V2)

> **Documento:** Especificación Técnica y Arquitectura del Sistema  
> **Versión:** 2.0.0-PROPOSAL  
> **Fecha:** 2026-09-14  
> **Estado:** Documento de Diseño Técnico (Solo Lectura / Sin cambios destructivos en V1)

---

## 📑 ÍNDICE

1. [Resumen Ejecutivo y Objetivos de la V2](#1-resumen-ejecutivo-y-objetivos-de-la-v2)
2. [Auditoría del Sistema V1 Actual (Diagnóstico y Deuda Técnica)](#2-auditoría-del-sistema-v1-actual)
3. [Arquitectura General del Sistema V2](#3-arquitectura-general-del-sistema-v2)
4. [Modelo de Datos y Esquema Supabase (PostgreSQL DDL)](#4-modelo-de-datos-y-esquema-supabase)
5. [Políticas de Seguridad Row Level Security (RLS)](#5-políticas-de-seguridad-row-level-security-rls)
6. [Motor de Productos de Temporada y Campañas (SSCARS Gift Box)](#6-motor-de-productos-de-temporada-y-campañas)
7. [Sistema de Builds, Tuning y Snapshots](#7-sistema-de-builds-tuning-y-snapshots)
8. [Sistema de Cartas Digitales y Generación de Renders (Car Cards HD)](#8-sistema-de-cartas-digitales-y-renders-hd)
9. [Sistema de Gamificación: XP, Niveles y Recompensa Diaria](#9-sistema-de-gamificación-xp-niveles-y-recompensa-diaria)
10. [Flujo de Checkout Unificado (Stripe + V1 + V2 + Gift Box)](#10-flujo-de-checkout-unificado)
11. [Arquitectura de Fulfillment Dual (Fabricante 3D + Printful)](#11-arquitectura-de-fulfillment-dual)
12. [Matriz de APIs y Endpoints V2](#12-matriz-de-apis-y-endpoints-v2)
13. [Estrategia de Migración V1 → V2 (Cero Downtime)](#13-estrategia-de-migración-v1--v2)
14. [Estrategia de Rollback y Contingencia](#14-estrategia-de-rollback-y-contingencia)

---

## 1. RESUMEN EJECUTIVO Y OBJETIVOS DE LA V2

SSCARS Garage V1 nació como una landing page estática con checkout directo de Stripe y sorteo serverless para 15 modelos físicos en formato Mystery Box.

**SSCARS Garage 2.0 (V2)** evoluciona la plataforma hacia un ecosistema híbrido **Físico + Digital (Phygital)**, introduciendo:
- **Autenticación e Identidad:** Cuentas de usuario con Supabase Auth y sincronización en tiempo real.
- **Garage Virtual y Cartas Coleccionables:** Cada figura física adquirida o recompensa desbloquea su Car Card digital con metadatos, rareza, acabados holográficos/Gold y atributos de rendimiento.
- **Tuning y Sistema de Builds:** Personalización visual profunda de vehículos (alerones, llantas, kits de carrocería, libreas/colores, altura de suspensión) con generación de snapshots inmutables para compra física bajo demanda.
- **Gamificación Progresiva:** Recompensas diarias con protección anti-trampas, streaks, niveles de conductor y puntos de experiencia (XP).
- **Fulfillment Dual Automatizado:** Despacho segregado e independiente entre el fabricante de miniaturas 3D (JLC3DP/Taller de resina) y proveedor de merchandising bajo demanda (**Printful**), unificado bajo una única orden comercial para el cliente.
- **Motor de Campañas Temporales (SSCARS Gift Box):** Capacidad de desplegar productos estacionales (Black Friday, Campañas de Navidad, Verano, lanzamientos flash) con stock limitado, paquetes combinados (Coche + Merch + Carta exclusiva) y activación/desactivación por calendario sin tocar código.

---

## 2. AUDITORÍA DEL SISTEMA V1 ACTUAL

De la auditoría integral de solo lectura sobre el código base existente (`public/`, `api/`, `test/`, `marketing/`) se extraen las siguientes conclusiones y puntos críticos:

### 2.1. Hallazgos Técnicos y Deuda Detectada

1. **Datos aislados en cliente (`localStorage`):**
   - El carrito (`sscars_cart_v1`) y el estado de interacción residen únicamente en el navegador. No hay persistencia entre dispositivos ni historial de sesión.
2. **Precios y Catálogo Duplicados:**
   - `public/index.html` hardcodea precios (`24.95`, `69.95`, `129.95`, `669.95`) y descripciones de los 15 modelos.
   - `api/catalogo.js` lee IDs de precio de Stripe desde variables de entorno.
   - `marketing/autopost.gs` contiene otra copia independiente del catálogo (`CONTENIDO`).
   - *Riesgo:* Un cambio en precios o nombres en una parte desincroniza la experiencia de usuario y los metadatos de marketing.
3. **Persistencia y Concurrencia en Backend:**
   - `api/_lib.js` implementa Upstash Redis para idempotencia (`claimOnce`) y almacenamiento de órdenes (`lpush sscars:orders`).
   - Si Upstash no está configurado, cae a un `Map` en memoria local. En entornos Serverless como Vercel, las instancias son efímeras y no comparten memoria; dos peticiones simultáneas provocan ejecución duplicada.
   - `ltrim sscars:orders 0 999` limita el histórico a los últimos 1.000 pedidos, perdiendo trazabilidad en volúmenes mayores.
4. **Reglas Gold Inconsistentes entre Documentación y Código:**
   - `public/index.html` promete "Al menos 1 Gold Chrome garantizado" en el pack completo.
   - `api/sorteo.js` garantiza `esGold: true` forzando una unidad si ninguna salió naturalmente.
   - Documentación previa referenciaba "2 Gold garantizados".
   - El nuevo plan de 3.000 unidades exige exactamente 100 unidades Gold (distribuidas 6 o 7 por modelo).
5. **Seguridad en Panel de Administración:**
   - `api/admin.js` se autentica mediante parámetro URL `?key=ADMIN_KEY`. Los parámetros GET quedan registrados en logs de servidores, proxies y navegadores.
6. **Fulfillment Monolítico:**
   - `api/fabricacion.js` asume un único proveedor por pedido. No existe concepto de ítems mixtos (coche 3D + camiseta Printful + carta física) ni gestión de estados parciales de envío.

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
  │  - Email / Password     │     │  - PostgreSQL con RLS   │   │  - Renders Car Cards HD │
  │  - Magic Link / OAuth   │     │  - Triggers & Functions │   │  - Texturas & Snapshots │
  │  - JWT Claims           │     │  - Realtime CDC         │   │  - Merch Mockups        │
  └─────────────────────────┘     └─────────────┬───────────┘   └─────────────────────────┘
                                                │
                ┌───────────────────────────────┼───────────────────────────────┐
                ▼                               ▼                               ▼
  ┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
  │      STRIPE CHECKOUT      │   │     ADAPTER FABRICACIÓN   │   │     ADAPTER PRINTFUL      │
  │  - Webhooks Idempotentes  │   │  - Cola de impresión 3D   │   │  - Sync de Variantes      │
  │  - V1 Boxes & V2 Builds   │   │  - InPost / Punto Pack    │   │  - Despacho Merch POD     │
  │  - Campañas / Gift Boxes  │   │  - Estados de Resina/SLA  │   │  - Tracking Internacional │
  └───────────────────────────┘   └───────────────────────────┘   └───────────────────────────┘
```

---

## 4. MODELO DE DATOS Y ESQUEMA SUPABASE

Esquema relacional en PostgreSQL con soporte nativo de UUID, enumerados tipados, claves foráneas en cascada e índices B-Tree/GIN.

```sql
-- ============================================================================
-- EXTENSIONES Y ENUMS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE card_rarity AS ENUM ('common', 'rare', 'epic', 'legendary', 'gold_chrome');
CREATE TYPE card_finish AS ENUM ('standard', 'matte', 'holo', 'gold_leaf');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'processing', 'partially_fulfilled', 'completed', 'cancelled', 'refunded');
CREATE TYPE fulfillment_status AS ENUM ('unassigned', 'queued', 'manufacturing', 'printed', 'shipped', 'delivered', 'failed');
CREATE TYPE provider_type AS ENUM ('factory_3d', 'printful', 'manual', 'inhouse');
CREATE TYPE product_type AS ENUM ('mystery_box', 'pack', 'gift_box', 'merch', 'build_custom', 'single_model');

-- ============================================================================
-- 1. PERFILES DE USUARIO Y GAMIFICACIÓN
-- ============================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(32) UNIQUE,
    display_name VARCHAR(64),
    avatar_url TEXT,
    role user_role DEFAULT 'user' NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL,
    xp BIGINT DEFAULT 0 NOT NULL,
    daily_streak INTEGER DEFAULT 0 NOT NULL,
    last_daily_claim TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 2. CATÁLOGO BASE DE VEHÍCULOS (Las 15 Leyendas)
-- ============================================================================
CREATE TABLE public.cars (
    id VARCHAR(16) PRIMARY KEY, -- '01', '02', ..., '15'
    slug VARCHAR(32) UNIQUE NOT NULL, -- 'r34', 'supra', 'rx7', etc.
    name VARCHAR(64) NOT NULL,
    real_car_name VARCHAR(128) NOT NULL,
    tagline TEXT NOT NULL,
    lore_history TEXT NOT NULL,
    base_color_hex VARCHAR(7) NOT NULL,
    stock_total INTEGER DEFAULT 200 NOT NULL,
    stock_gold INTEGER DEFAULT 7 NOT NULL,
    rarity_tier card_rarity DEFAULT 'rare' NOT NULL,
    default_weight DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 3. CARTAS DIGITALES COLECCIONABLES (Car Cards)
-- ============================================================================
CREATE TABLE public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    car_id VARCHAR(16) REFERENCES public.cars(id) NOT NULL,
    serial_number INTEGER NOT NULL, -- Número de unidad dentro de su tirada
    total_serial INTEGER NOT NULL,  -- p.ej. 100, 200, 250
    rarity card_rarity NOT NULL,
    finish card_finish DEFAULT 'standard' NOT NULL,
    power_hp INTEGER NOT NULL,
    top_speed_kmh INTEGER NOT NULL,
    drift_rating INTEGER NOT NULL,
    card_image_url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_cards_user ON public.cards(user_id);
CREATE INDEX idx_cards_car ON public.cards(car_id);

-- ============================================================================
-- 4. SISTEMA DE BUILDS (Tuning Personalizado)
-- ============================================================================
CREATE TABLE public.builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    car_id VARCHAR(16) REFERENCES public.cars(id) NOT NULL,
    title VARCHAR(64) NOT NULL,
    body_color VARCHAR(7) NOT NULL,
    rim_model VARCHAR(32) NOT NULL,
    rim_color VARCHAR(7) NOT NULL,
    spoiler_type VARCHAR(32) NOT NULL,
    suspension_height DECIMAL(4,2) DEFAULT 0.0 NOT NULL, -- mm de rebaje
    livery_id VARCHAR(32),
    stats_boost JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Snapshots inmutables de una build listos para fabricar o renderizar
CREATE TABLE public.build_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id UUID REFERENCES public.builds(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    configuration JSONB NOT NULL,
    preview_render_url TEXT NOT NULL,
    hd_render_url TEXT,
    manufacturing_3mf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 5. CAMPAÑAS TEMPORALES Y PRODUCTOS (SSCARS Gift Box, Packs, etc.)
-- ============================================================================
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL, -- 'black-friday-2026', 'xmas-2026'
    name VARCHAR(128) NOT NULL,
    description TEXT,
    banner_url TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.products (
    id VARCHAR(64) PRIMARY KEY, -- 'box1', 'box3', 'gift_box_tier1', 'hoodie_r34'
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    type product_type NOT NULL,
    price_cents INTEGER NOT NULL,
    stripe_price_id VARCHAR(64) NOT NULL,
    max_per_order INTEGER DEFAULT 10 NOT NULL,
    stock_limit INTEGER, -- NULL = infinito / bajo demanda
    units_sold INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Relación de componentes incluidos en un producto o Gift Box
CREATE TABLE public.product_bundle_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_product_id VARCHAR(64) REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    item_type VARCHAR(32) NOT NULL, -- 'mystery_car', 'printful_merch', 'exclusive_card'
    provider provider_type NOT NULL,
    provider_variant_id VARCHAR(64), -- ID de variante en Printful o Modelo 3D
    quantity INTEGER DEFAULT 1 NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- 6. PEDIDOS, LÍNEAS Y FULFILLMENT SEGREGADO
-- ============================================================================
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_session_id VARCHAR(128) UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(128) NOT NULL,
    shipping_address JSONB NOT NULL,
    total_amount_cents INTEGER NOT NULL,
    status order_status DEFAULT 'paid' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id VARCHAR(64) REFERENCES public.products(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    assigned_car_id VARCHAR(16) REFERENCES public.cars(id),
    is_gold BOOLEAN DEFAULT FALSE,
    build_snapshot_id UUID REFERENCES public.build_snapshots(id),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Cada ítem o paquete genera fulfillments independientes por proveedor
CREATE TABLE public.fulfillments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    provider provider_type NOT NULL,
    external_reference_id VARCHAR(128), -- ID de orden en Printful / JLC3DP
    status fulfillment_status DEFAULT 'queued' NOT NULL,
    tracking_number VARCHAR(128),
    tracking_url TEXT,
    carrier VARCHAR(64), -- 'InPost', 'Correos', 'DHL', 'GLS'
    error_message TEXT,
    shipped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 7. REGISTRO DE GAMIFICACIÓN (XP & DAILY REWARDS)
-- ============================================================================
CREATE TABLE public.xp_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    source VARCHAR(64) NOT NULL, -- 'daily_reward', 'purchase', 'card_unlock'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

---

## 5. POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)

PostgreSQL en Supabase aísla completamente los datos de cada usuario mediante RLS, garantizando que nadie pueda manipular perfiles ajenos, inventarios de cartas o estados de pedidos.

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_bundle_items ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES: Lectura pública, actualización solo por el propietario
CREATE POLICY "Profiles son visibles públicamente" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Usuarios pueden editar su propio perfil" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. CARDS: Cada usuario ve sus cartas; todos pueden ver cartas en perfiles públicos
CREATE POLICY "Cartas visibles públicamente" 
ON public.cards FOR SELECT USING (true);

CREATE POLICY "Solo sistema crea cartas (vía Service Role)" 
ON public.cards FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 3. BUILDS: Gestión privada por cada usuario
CREATE POLICY "Usuarios gestionan sus builds" 
ON public.builds FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Snapshots legibles por el creador" 
ON public.build_snapshots FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Snapshots creados por el creador" 
ON public.build_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. ORDERS & FULFILLMENT: Solo el comprador o administradores
CREATE POLICY "Usuarios ven sus propios pedidos" 
ON public.orders FOR SELECT 
USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = customer_email);

CREATE POLICY "Fulfillments visibles por el dueño de la orden" 
ON public.fulfillments FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = fulfillments.order_id 
    AND (orders.user_id = auth.uid() OR auth.jwt() ->> 'email' = orders.customer_email)
));

-- 5. CATÁLOGO Y CAMPAÑAS: Lectura pública, escritura reservada a admins
CREATE POLICY "Campañas y productos visibles públicamente" 
ON public.campaigns FOR SELECT USING (is_active = true AND NOW() BETWEEN starts_at AND ends_at);

CREATE POLICY "Productos activos visibles" 
ON public.products FOR SELECT USING (is_active = true);

CREATE POLICY "Bundle items visibles públicamente" 
ON public.product_bundle_items FOR SELECT USING (true);
```

---

## 6. MOTOR DE PRODUCTOS DE TEMPORADA Y CAMPAÑAS

### Concepto: SSCARS Gift Box (Black Friday / Navidad / Eventos)
Para evitar ensuciar el código con condicionales `if (isBlackFriday)`, el sistema implementa un **Motor de Campañas Dinámico por Base de Datos**:

```
                               ┌────────────────────────┐
                               │   TABLA CAMPAIGNS      │
                               │ - starts_at / ends_at  │
                               │ - slug: 'xmas-2026'    │
                               └───────────┬────────────┘
                                           │
                                           ▼
                               ┌────────────────────────┐
                               │     TABLA PRODUCTS     │
                               │ - type: 'gift_box'     │
                               │ - price: 79.95 €       │
                               │ - stock_limit: 500     │
                               └───────────┬────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
       ┌─────────────────────────┐                   ┌─────────────────────────┐
       │   ITEM 1: MYSTERY CAR   │                   │   ITEM 2: MERCHANDISING │
       │ - Provider: factory_3d  │                   │ - Provider: printful    │
       │ - Sorteo Anti-Repes     │                   │ - Sudadera/Taza Oficial │
       │ - Incluye Car Card HD   │                   │ - Talla/Variante elegida│
       └─────────────────────────┘                   └─────────────────────────┘
```

### Reglas Clave de la Gift Box:
1. **ADN Mystery Box Intacto:** El coche interior se sortea en el webhook de Stripe con la lógica de pesos sin sesgo.
2. **Car Card Sincronizada:** Se crea en la base de datos la carta del coche que tocó en la caja y se asocia al perfil del comprador.
3. **Control Temporal Automático:** Si `NOW() > ends_at` o `units_sold >= stock_limit`, el backend rechaza la creación de sesión en Stripe y la UI oculta la tarjeta.
4. **Checkout Transparente:** La sesión de Stripe recibe un `line_item` comercial único (p. ej. *SSCARS Gift Box Edición Especial*), y el webhook se encarga de desglosarlo en los múltiples despachos.

---

## 7. SISTEMA DE BUILDS, TUNING Y SNAPSHOTS

El configurador de garaje permite a los usuarios modificar piezas sobre la geometría del vehículo:

### Componentes de una Build:
- **Base:** Selección de modelo (`r34`, `supra`, `rx7`, etc.).
- **Carrocería:** Pintura personalizada (código Hex + acabado: Brillo, Mate, Metálico).
- **Llantas:** Modelo de llanta (5 radios, BBS multirradio, Watanabe) y color.
- **Alerón:** Stock, Alerón GT alto, Ducktail o Alerón suprimido.
- **Postura:** Suspensión rebajada / Stance.

### Ciclo de Vida del Snapshot:
1. **Edición:** El usuario modifica su coche en el Garage Virtual (Three.js / Visor Web).
2. **Congelación (Snapshot):** Al guardar o pulsar "Comprar mi Build", se genera un JSON canónico inmutable en `public.build_snapshots`.
3. **Render Serverless:** Un worker genera la imagen de la Car Card HD con los accesorios seleccionados.
4. **Compra Física:** Si el usuario encarga su coche personalizado, el ID del snapshot pasa en los metadatos de Stripe. El adaptador de fabricación genera el archivo `.3mf` multicuerpo correspondiente.

---

## 8. SISTEMA DE CARTAS DIGITALES Y RENDERS HD

Cada Car Card en SSCARS Garage 2.0 es un activo digital único con diseño de carta coleccionable:

```
┌────────────────────────────────────────────────────────┐
│  SSCARS #01 · EL EMPERADOR AZUL          [LEGENDARY]   │
│ ┌────────────────────────────────────────────────────┐ │
│ │                                                    │ │
│ │               RENDER 3D DEL COCHE                  │ │
│ │             (O BUILD PERSONALIZADA)                │ │
│ │                                                    │ │
│ └────────────────────────────────────────────────────┘ │
│  MOTOR: RB26DETT Twin-Turbo  │  POTENCIA: 327 CV       │
│  VEL. MÁX: 252 km/h          │  TRACCIÓN: ATTESA E-TS  │
│ ────────────────────────────────────────────────────── │
│  Nº SERIE: 042 / 100         │  ACABADO: HOLO GOLD     │
└────────────────────────────────────────────────────────┘
```

### Pipeline de Renderizado de Alta Resolución:
1. **Plantilla Base (SVG/Canvas):** Marco dinámico según rareza (*Common*, *Rare*, *Epic*, *Legendary*, *Gold Chrome*).
2. **Composición de Capas:** Render transparente del vehículo + Efecto shader metalizado/holográfico + Metadatos de tirada grabados.
3. **Persistencia:** La imagen final WebP/PNG se almacena en **Supabase Storage** (`bucket: car-cards/`) y se vincula en `cards.card_image_url`.

---

## 9. SISTEMA DE GAMIFICACIÓN: XP, NIVELES Y RECOMPENSA DIARIA

### Niveles y Curva de Experiencia:
La fórmula para subir de nivel es cuadrática para incentivar la retención:
$$\text{XP Requerido para Nivel } N = 100 \times N^{1.8}$$

| Nivel | Rango de Conductor | Recompensa al Desbloquear |
|---|---|---|
| **1 - 5** | Novato del Touge | Acceso a colores mate y llantas básicas |
| **6 - 15** | Corredor de la Wangan | Alerones GT y stickers exclusivos |
| **16 - 30** | Leyenda del Asfalto | Acabados holográficos para Car Cards |
| **31+** | Maestro del Garaje | Descuentos en packs y acceso a preventas secretas |

### Lógica de Recompensa Diaria (Anti-Cheat Serverless):
- **Cooldown de 24 horas:** Controlado por función RPC en PostgreSQL con `SECURITY DEFINER`.
- **Ventana de Streak:** Si el usuario reclama entre 24 y 48 horas tras su último reclamo, su `daily_streak` aumenta (+1). Si pasan más de 48 horas, el streak se reinicia a 1.
- **Premio:** XP incremental + probabilidad de desbloquear piezas de tuning o Car Cards digitales comunes.

---

## 10. FLUJO DE CHECKOUT UNIFICADO

El checkout soporta de forma nativa tanto compras anónimas (V1) como compras vinculadas a usuarios logueados (V2), builds personalizadas y Gift Boxes de temporada.

```
[CLIENTE: Carrito / Build / Gift Box]
       │
       ▼ POST /api/checkout
[VERCEL: Construcción de Sesión Stripe]
       │- Valida precios contra BD Supabase
       │- Inyecta metadatos: { userId, cartItems, snapshotId, campaignId }
       ▼
[STRIPE CHECKOUT: Pago Seguro con Tarjeta/Apple Pay]
       │
       ▼ Webhook: checkout.session.completed
[VERCEL: /api/order]
       ├── 1. Verificación de firma e Idempotencia (claimOnce en Upstash/Postgres)
       ├── 2. Registro de Orden en `public.orders`
       ├── 3. Ejecución del Sorteo Anti-Repes (si contiene Mystery Box o Gift Box)
       ├── 4. Creación de Car Cards digitales en `public.cards` para el usuario
       ├── 5. Despacho Dual de Fulfillment:
       │      ├── Componentes de Coche 3D ──► Adaptador Fabricante 3D
       │      └── Componentes de Ropa/Merch ──► Adaptador Printful API
       └── 6. Notificación por Email (Resend) con resumen y enlace de seguimiento
```

---

## 11. ARQUITECTURA DE FULFILLMENT DUAL

Para soportar pedidos mixtos (p. ej. la **SSCARS Gift Box** que incluye una figura 3D física y una sudadera oficial), el sistema utiliza adaptadores polimórficos de fulfillment:

```typescript
// Interfaz canónica de adaptador de fulfillment
interface FulfillmentAdapter {
  provider: 'factory_3d' | 'printful' | 'manual';
  dispatch(item: OrderItemContext, shipping: ShippingAddress): Promise<FulfillmentResult>;
  getTracking(externalId: string): Promise<TrackingInfo>;
}
```

### 1. Adaptador Fabricante 3D (`api/fulfillment/factory.js`):
- Genera la orden de impresión SLA en el taller/JLC3DP.
- Asigna la etiqueta logística de **InPost / Punto Pack / GLS** (Expendeduría 15 Leganés o punto de recogida asignado).
- Actualiza `fulfillments.status` a `manufacturing` y posteriormente a `shipped` con el código de seguimiento.

### 2. Adaptador Printful API (`api/fulfillment/printful.js`):
- Autenticación con Token OAuth de Printful.
- Envía payload a `https://api.printful.com/orders` con `recipient` y `items` (Sync Variant ID + Print Files).
- Escucha webhooks de Printful (`package_shipped`) para capturar automáticamente el número de tracking internacional y notificar al cliente.

---

## 12. MATRIZ DE APIS Y ENDPOINTS V2

| Endpoint | Método | Auth | Descripción |
|---|---|---|---|
| `/api/checkout` | `POST` | Opcional | Crea sesión de pago en Stripe (V1, V2 y Gift Box). |
| `/api/order` | `POST` | Stripe Sig | Webhook principal: sorteo, BD, tarjetas y despacho dual. |
| `/api/printful/webhook` | `POST` | Printful Secret | Webhook de seguimiento de merchandising. |
| `/api/catalog` | `GET` | Público | Devuelve catálogo activo, precios y campañas vigentes. |
| `/api/garage/builds` | `GET/POST`| JWT User | Lista o guarda builds personalizadas del usuario. |
| `/api/garage/snapshot`| `POST` | JWT User | Genera snapshot inmutable y solicita render HD. |
| `/api/daily-claim` | `POST` | JWT User | Reclama recompensa diaria y calcula racha. |
| `/api/admin/orders` | `GET` | Role Admin | Panel de administración con filtros de producción. |
| `/api/admin/campaigns`| `POST`| Role Admin | Creación y activación de campañas temporales. |

---

## 13. ESTRATEGIA DE MIGRACIÓN V1 → V2 (CERO DOWNTIME)

La migración se realizará en **3 fases progresivas** sin interrumpir las ventas actuales de la V1:

```
FASE 1: Infraestructura Paralela (No destructiva)
  ├── Crear proyecto y base de datos en Supabase.
  ├── Ejecutar DDL con tablas, índices y políticas RLS.
  ├── Desplegar adaptadores de Printful y Fábrica en api/fulfillment/.
  └── Mantener index.html y checkout de V1 100% operativos.

FASE 2: Doble Escritura y Conexión de Cuentas
  ├── El webhook /api/order registra pedidos en Postgres y en Upstash simultáneamente.
  ├── Si el comprador introdujo un email con cuenta registrada, sus Car Cards se asignan automáticamente.
  ├── Introducir selector de login/registro no invasivo en el header.

FASE 3: Activación de Garage 2.0 y Gift Box
  ├── Cargar la campaña temporal (Gift Box) en la tabla `campaigns`.
  ├── Activar el configurador de Garage y la vista del álbum de cartas.
  ├── Desactivar lectura de Upstash y consolidar todo en Supabase.
```

---

## 14. ESTRATEGIA DE ROLLBACK Y CONTINGENCIA

Si se detecta cualquier anomalía durante el despliegue de la V2:

1. **Rollback de Frontend:** `public/index.html` cuenta con una bandera de feature-flag `ENABLE_V2_FEATURES = false`. Al desactivarla, la web opera en modo V1 puro sin llamadas a Supabase ni Garage 3D.
2. **Fallback de Backend:** `/api/checkout` y `/api/order` mantienen el fallback nativo a variables `.env` clásicas (`STRIPE_PRICE_BOX1`, etc.) y Upstash Redis si la conexión a Supabase fallase.
3. **Fulfillment de Respaldo:** Si la API de Printful o del fabricante 3D no responde, el sistema marca el fulfillment como `queued` / `manual` y dispara un correo de alerta mediante Resend con los datos completos del pedido para despacho manual sin pérdida de ventas.

---
*Fin del documento ARCHITECTURE_V2.md*

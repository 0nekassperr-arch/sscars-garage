-- ============================================================================
-- SSCARS GARAGE 2.0 — MIGRACIÓN 001: ESQUEMA INICIAL DE BASE DE DATOS
-- Versión: 2.0.0
-- ============================================================================

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TIPOS ENUMERADOS
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE card_rarity AS ENUM ('common', 'rare', 'epic', 'legendary', 'gold_chrome');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE card_finish AS ENUM ('standard', 'matte', 'holo', 'gold_leaf');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE product_type AS ENUM ('normal', 'mystery_box', 'pack', 'gift_box', 'merch', 'bundle');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'paid', 'processing', 'partially_fulfilled', 'completed', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE fulfillment_status AS ENUM ('pending', 'queued', 'processing', 'shipped', 'delivered', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE provider_type AS ENUM ('factory', 'printful', 'manual', 'inhouse');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 1. TABLA: profiles (Perfiles de usuario, nivel y progreso)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(32) UNIQUE,
    display_name VARCHAR(64),
    avatar_url TEXT,
    role user_role DEFAULT 'user' NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL CHECK (level >= 1),
    xp BIGINT DEFAULT 0 NOT NULL CHECK (xp >= 0),
    daily_streak INTEGER DEFAULT 0 NOT NULL CHECK (daily_streak >= 0),
    last_daily_claim TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 2. TABLA: cars (Catálogo maestro de vehículos / 15 Leyendas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cars (
    id VARCHAR(16) PRIMARY KEY, -- '01', '02', ..., '15'
    number VARCHAR(8) NOT NULL,
    slug VARCHAR(32) UNIQUE NOT NULL, -- 'r34', 'supra', 'rx7', etc.
    name VARCHAR(64) NOT NULL,
    real_model VARCHAR(128) NOT NULL,
    year INTEGER NOT NULL,
    rarity card_rarity NOT NULL,
    base_stats JSONB DEFAULT '{}'::jsonb NOT NULL,
    images JSONB DEFAULT '{}'::jsonb NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 3. TABLA: cards (Definición de cartas coleccionables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id VARCHAR(16) REFERENCES public.cars(id) ON DELETE RESTRICT NOT NULL,
    rarity card_rarity NOT NULL,
    code VARCHAR(64) UNIQUE NOT NULL,
    is_gold BOOLEAN DEFAULT FALSE NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 4. TABLA: user_cards (Colección digital en posesión de usuarios)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    card_id UUID REFERENCES public.cards(id) ON DELETE RESTRICT NOT NULL,
    obtained_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    source VARCHAR(64) NOT NULL, -- 'mystery_box', 'gift_box', 'daily_reward', 'purchase', 'level_up'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_cards_user ON public.user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_card ON public.user_cards(card_id);

-- ============================================================================
-- 5. TABLA: daily_rewards (Registro de recompensa diaria con deduplicación)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reward_date DATE NOT NULL,
    reward_type VARCHAR(64) NOT NULL, -- 'xp', 'tuning_part', 'card', 'coin'
    reward_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_user_daily_reward UNIQUE (user_id, reward_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_date ON public.daily_rewards(user_id, reward_date);

-- ============================================================================
-- 6. TABLA: tuning_parts (Catálogo extensible de piezas de tuning)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tuning_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(32) NOT NULL, -- 'wheels', 'spoiler', 'exhaust', 'paint', 'bodykit', 'suspension', etc.
    name VARCHAR(64) NOT NULL,
    slug VARCHAR(64) UNIQUE NOT NULL,
    description TEXT,
    stats_modifier JSONB DEFAULT '{}'::jsonb NOT NULL,
    xp_required INTEGER DEFAULT 0 NOT NULL CHECK (xp_required >= 0),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tuning_parts_category ON public.tuning_parts(category);

-- ============================================================================
-- 7. TABLA: builds (Configuraciones de garaje activas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    car_id VARCHAR(16) REFERENCES public.cars(id) ON DELETE RESTRICT NOT NULL,
    name VARCHAR(64) NOT NULL,
    paint VARCHAR(32) DEFAULT 'factory' NOT NULL,
    wheels VARCHAR(32) DEFAULT 'factory' NOT NULL,
    spoiler VARCHAR(32) DEFAULT 'factory' NOT NULL,
    exhaust VARCHAR(32) DEFAULT 'factory' NOT NULL,
    bodykit VARCHAR(32) DEFAULT 'factory' NOT NULL,
    parts JSONB DEFAULT '{}'::jsonb NOT NULL,
    stats JSONB DEFAULT '{}'::jsonb NOT NULL,
    xp INTEGER DEFAULT 0 NOT NULL CHECK (xp >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_builds_user ON public.builds(user_id);

-- ============================================================================
-- 8. TABLA: build_snapshots (Fotografía inmutable para compras físicas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.build_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id UUID REFERENCES public.builds(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    car_id VARCHAR(16) REFERENCES public.cars(id) ON DELETE RESTRICT NOT NULL,
    build_data JSONB NOT NULL,
    stats JSONB NOT NULL,
    render_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_build_snapshots_user ON public.build_snapshots(user_id);

-- Regla de inmutabilidad en build_snapshots
CREATE OR REPLACE FUNCTION public.prevent_snapshot_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Los build_snapshots son inmutables y no pueden ser modificados ni eliminados';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_build_snapshots_immutable ON public.build_snapshots;
CREATE TRIGGER trg_build_snapshots_immutable
    BEFORE UPDATE OR DELETE ON public.build_snapshots
    FOR EACH ROW EXECUTE FUNCTION public.prevent_snapshot_mutation();

-- ============================================================================
-- 9. TABLA: campaigns (Campañas temporales configurables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    stock_limit INTEGER,
    stock_used INTEGER DEFAULT 0 NOT NULL CHECK (stock_used >= 0),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 10. TABLA: products (Catálogo centralizado de productos y bundles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id VARCHAR(64) PRIMARY KEY, -- 'box1', 'box3', 'box6', 'full', 'gift_box_black_friday', etc.
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    product_type product_type NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(3) DEFAULT 'EUR' NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    stock_limit INTEGER,
    stock_used INTEGER DEFAULT 0 NOT NULL CHECK (stock_used >= 0),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_campaign ON public.products(campaign_id);

-- ============================================================================
-- 11. TABLA: product_bundle_items (Composición dinámica de bundles / Gift Box)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_bundle_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_product_id VARCHAR(64) REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    item_type VARCHAR(32) NOT NULL, -- 'mystery_car', 'printful_merch', 'exclusive_card', 'tuning_part'
    provider provider_type DEFAULT 'manual' NOT NULL,
    provider_variant_id VARCHAR(64),
    quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_bundle_items_parent ON public.product_bundle_items(parent_product_id);

-- ============================================================================
-- 12. TABLA: orders (Cabecera de pedidos comerciales V2)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    stripe_checkout_session_id VARCHAR(128) UNIQUE,
    status order_status DEFAULT 'pending' NOT NULL,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    currency VARCHAR(3) DEFAULT 'EUR' NOT NULL,
    shipping_address JSONB DEFAULT '{}'::jsonb NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe ON public.orders(stripe_checkout_session_id);

-- ============================================================================
-- 13. TABLA: order_items (Líneas de pedido con precio histórico congelado)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id VARCHAR(64) REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
    product_type product_type NOT NULL,
    car_id VARCHAR(16) REFERENCES public.cars(id) ON DELETE SET NULL,
    build_id UUID REFERENCES public.builds(id) ON DELETE SET NULL,
    build_snapshot_id UUID REFERENCES public.build_snapshots(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- ============================================================================
-- 14. TABLA: fulfillments (Despachos segregados por proveedor)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fulfillments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    provider provider_type NOT NULL,
    provider_order_id VARCHAR(128),
    status fulfillment_status DEFAULT 'pending' NOT NULL,
    tracking_number VARCHAR(128),
    tracking_url TEXT,
    carrier VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fulfillments_order ON public.fulfillments(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_provider ON public.fulfillments(provider, status);

-- ============================================================================
-- 15. TABLA: xp_ledger (Libro mayor inmutable de experiencia con idempotencia)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.xp_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    reason VARCHAR(64) NOT NULL,
    reference_type VARCHAR(64),
    reference_id VARCHAR(128),
    idempotency_key VARCHAR(128) UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_xp_ledger_user ON public.xp_ledger(user_id);

-- ============================================================================
-- 16. TABLA: gold_inventory (Inventario atómico Gold con control de concurrencia)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gold_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id VARCHAR(16) REFERENCES public.cars(id) ON DELETE RESTRICT NOT NULL UNIQUE,
    gold_total INTEGER NOT NULL CHECK (gold_total >= 0),
    gold_assigned INTEGER DEFAULT 0 NOT NULL CHECK (gold_assigned >= 0),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_gold_limit CHECK (gold_assigned <= gold_total)
);

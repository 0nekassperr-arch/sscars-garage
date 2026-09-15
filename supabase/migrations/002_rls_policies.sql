-- ============================================================================
-- SSCARS GARAGE 2.0 — MIGRACIÓN 002: POLÍTICAS ROW LEVEL SECURITY (RLS)
-- Versión: 2.0.0
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tuning_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold_inventory ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
CREATE POLICY "profiles_select_public" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "profiles_update_own" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. CARS & CARDS (Catálogo maestro y definiciones)
-- ============================================================================
CREATE POLICY "cars_select_public" 
    ON public.cars FOR SELECT 
    USING (active = true);

CREATE POLICY "cards_select_public" 
    ON public.cards FOR SELECT 
    USING (active = true);

-- ============================================================================
-- 3. USER_CARDS (Colección digital)
-- ============================================================================
CREATE POLICY "user_cards_select_own_or_public" 
    ON public.user_cards FOR SELECT 
    USING (true);

CREATE POLICY "user_cards_service_role_all" 
    ON public.user_cards FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 4. DAILY_REWARDS
-- ============================================================================
CREATE POLICY "daily_rewards_select_own" 
    ON public.daily_rewards FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "daily_rewards_service_role_all" 
    ON public.daily_rewards FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 5. TUNING_PARTS
-- ============================================================================
CREATE POLICY "tuning_parts_select_public" 
    ON public.tuning_parts FOR SELECT 
    USING (active = true);

-- ============================================================================
-- 6. BUILDS & BUILD_SNAPSHOTS
-- ============================================================================
CREATE POLICY "builds_select_own" 
    ON public.builds FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "builds_insert_own" 
    ON public.builds FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "builds_update_own" 
    ON public.builds FOR UPDATE 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "builds_delete_own" 
    ON public.builds FOR DELETE 
    USING (auth.uid() = user_id);

CREATE POLICY "build_snapshots_select_own" 
    ON public.build_snapshots FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "build_snapshots_insert_own" 
    ON public.build_snapshots FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 7. CAMPAIGNS & PRODUCTS & BUNDLES
-- ============================================================================
CREATE POLICY "campaigns_select_active" 
    ON public.campaigns FOR SELECT 
    USING (active = true AND NOW() BETWEEN starts_at AND ends_at);

CREATE POLICY "products_select_active" 
    ON public.products FOR SELECT 
    USING (active = true);

CREATE POLICY "bundle_items_select_public" 
    ON public.product_bundle_items FOR SELECT 
    USING (true);

-- ============================================================================
-- 8. ORDERS & ORDER_ITEMS & FULFILLMENTS
-- ============================================================================
CREATE POLICY "orders_select_own" 
    ON public.orders FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "order_items_select_own" 
    ON public.order_items FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_items.order_id 
        AND orders.user_id = auth.uid()
    ));

CREATE POLICY "fulfillments_select_own" 
    ON public.fulfillments FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = fulfillments.order_id 
        AND orders.user_id = auth.uid()
    ));

CREATE POLICY "orders_service_role_all" 
    ON public.orders FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "order_items_service_role_all" 
    ON public.order_items FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "fulfillments_service_role_all" 
    ON public.fulfillments FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 9. XP_LEDGER
-- ============================================================================
CREATE POLICY "xp_ledger_select_own" 
    ON public.xp_ledger FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "xp_ledger_service_role_all" 
    ON public.xp_ledger FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 10. GOLD_INVENTORY
-- ============================================================================
CREATE POLICY "gold_inventory_select_public" 
    ON public.gold_inventory FOR SELECT 
    USING (true);

CREATE POLICY "gold_inventory_service_role_all" 
    ON public.gold_inventory FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- SSCARS GARAGE 2.0 — MIGRACIÓN 007: PRIVACIDAD Y AISLAMIENTO DE USER_CARDS
-- Versión: 2.0.2
-- ============================================================================

-- Reemplazar política pública por aislamiento estricto por usuario
DROP POLICY IF EXISTS "user_cards_select_own_or_public" ON public.user_cards;
DROP POLICY IF EXISTS "user_cards_select_own" ON public.user_cards;

CREATE POLICY "user_cards_select_own" 
    ON public.user_cards FOR SELECT 
    USING (auth.uid() = user_id);

-- Permitir acceso total únicamente al service_role (webhooks y administración)
DROP POLICY IF EXISTS "user_cards_service_role_all" ON public.user_cards;
CREATE POLICY "user_cards_service_role_all" 
    ON public.user_cards FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

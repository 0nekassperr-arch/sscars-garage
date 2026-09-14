-- ============================================================================
-- SSCARS GARAGE 2.0 — MIGRACIÓN 008: FUENTE ÚNICA XP->LEVEL Y TIMEZONE MADRID
-- Versión: 2.1.0
-- ============================================================================

-- ============================================================================
-- 1. FUNCIÓN INMUTABLE: calculate_driver_level (Única Fuente de Verdad XP -> Level)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_driver_level(p_xp BIGINT)
RETURNS INTEGER AS $$
BEGIN
    -- Fórmula cuadrática oficial: Level = FLOOR((XP / 100) ^ (1 / 1.8)) + 1
    RETURN GREATEST(1, FLOOR(POWER(GREATEST(0, p_xp)::float / 100.0, 1.0 / 1.8))::integer + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp;

-- ============================================================================
-- 2. award_xp_atomic: Utiliza calculate_driver_level
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_xp_atomic(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason VARCHAR,
    p_ref_type VARCHAR,
    p_ref_id VARCHAR,
    p_idempotency_key VARCHAR
)
RETURNS JSONB AS $$
DECLARE
    v_new_xp BIGINT;
    v_new_level INTEGER;
BEGIN
    -- Idempotencia: Si la clave ya existe, no otorgar de nuevo
    IF p_idempotency_key IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.xp_ledger WHERE idempotency_key = p_idempotency_key
    ) THEN
        SELECT xp, level INTO v_new_xp, v_new_level FROM public.profiles WHERE id = p_user_id;
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'xp', v_new_xp, 'level', v_new_level);
    END IF;

    -- Insertar en ledger inmutable
    INSERT INTO public.xp_ledger (user_id, amount, reason, reference_type, reference_id, idempotency_key)
    VALUES (p_user_id, p_amount, p_reason, p_ref_type, p_ref_id, p_idempotency_key);

    -- Actualizar perfil calculando nivel con la función centralizada
    UPDATE public.profiles
    SET xp = xp + p_amount,
        level = public.calculate_driver_level(xp + p_amount),
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING xp, level INTO v_new_xp, v_new_level;

    RETURN jsonb_build_object(
        'success', true,
        'duplicate', false,
        'added_xp', p_amount,
        'total_xp', v_new_xp,
        'level', v_new_level
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.award_xp_atomic(UUID, INTEGER, VARCHAR, VARCHAR, VARCHAR, VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp_atomic(UUID, INTEGER, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO service_role;

-- ============================================================================
-- 3. claim_daily_reward_atomic: Timezone Europe/Madrid y calculate_driver_level
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_daily_reward_atomic()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    -- Timezone oficial de negocio para SSCARS: Europe/Madrid
    v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::date;
    v_profile RECORD;
    v_new_streak INTEGER := 1;
    v_reward_xp INTEGER;
    v_reward_data JSONB;
    v_last_claim_madrid DATE;
BEGIN
    -- Validar autenticación
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Operación denegada: usuario no autenticado.';
    END IF;

    -- Verificar si ya reclamó hoy (fecha de Madrid)
    IF EXISTS (SELECT 1 FROM public.daily_rewards WHERE user_id = v_user_id AND reward_date = v_today) THEN
        RAISE EXCEPTION 'La recompensa diaria ya fue reclamada para la fecha de hoy.';
    END IF;

    -- Obtener estado de racha del usuario con bloqueo pesimista
    SELECT daily_streak, last_daily_claim, xp INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perfil de usuario no encontrado.';
    END IF;

    IF v_profile.last_daily_claim IS NOT NULL THEN
        v_last_claim_madrid := (v_profile.last_daily_claim AT TIME ZONE 'Europe/Madrid')::date;
        -- Si reclamó ayer en horario de Madrid, incrementa racha
        IF v_last_claim_madrid = v_today - INTERVAL '1 day' THEN
            v_new_streak := v_profile.daily_streak + 1;
        -- Si ya reclamó en el día de hoy de Madrid, abortar
        ELSIF v_last_claim_madrid = v_today THEN
            RAISE EXCEPTION 'Ya has reclamado hoy.';
        ELSE
            -- Si pasaron más de 1 día, reinicia racha a 1
            v_new_streak := 1;
        END IF;
    END IF;

    -- Cálculo determinista del premio en el SERVIDOR (Base 50 XP + 25 XP/día racha, max 500 XP)
    v_reward_xp := LEAST(50 + (v_new_streak * 25), 500);
    v_reward_data := jsonb_build_object(
        'xp', v_reward_xp,
        'streak', v_new_streak,
        'bonus', CASE WHEN v_new_streak % 7 = 0 THEN 'weekly_milestone' ELSE 'none' END
    );

    -- Insertar en daily_rewards
    INSERT INTO public.daily_rewards (user_id, reward_date, reward_type, reward_data)
    VALUES (v_user_id, v_today, 'daily_login', v_reward_data);

    -- Registrar en el ledger de XP de forma atómica con idempotencia
    INSERT INTO public.xp_ledger (user_id, amount, reason, reference_type, reference_id, idempotency_key)
    VALUES (v_user_id, v_reward_xp, 'daily_reward', 'daily_rewards', v_today::text, 'daily_' || v_user_id::text || '_' || v_today::text)
    ON CONFLICT (idempotency_key) DO NOTHING;

    -- Actualizar profile usando la función centralizada calculate_driver_level
    UPDATE public.profiles
    SET daily_streak = v_new_streak,
        last_daily_claim = NOW(),
        xp = xp + v_reward_xp,
        level = public.calculate_driver_level(xp + v_reward_xp),
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'reward_date', v_today,
        'timezone', 'Europe/Madrid',
        'new_streak', v_new_streak,
        'reward_type', 'daily_login',
        'reward_data', v_reward_data,
        'awarded_xp', v_reward_xp
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.claim_daily_reward_atomic() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward_atomic() TO authenticated, service_role;

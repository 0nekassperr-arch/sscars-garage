-- ============================================================================
-- SSCARS GARAGE 2.0 — MIGRACIÓN 005: FUNCIONES ALMACENADAS Y TRIGGERS ATÓMICOS
-- Versión: 2.0.0
-- ============================================================================

-- 1. Trigger para creación automática de Profile tras registro en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_url, role, level, xp, daily_streak)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'driver_' || SUBSTRING(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Conductor SSCARS'),
        NEW.raw_user_meta_data->>'avatar_url',
        'user',
        1,
        0,
        0
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Función Atómica para Asignación de Gold con Control de Concurrencia
CREATE OR REPLACE FUNCTION public.allocate_gold_atomic(p_car_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_total INTEGER;
    v_assigned INTEGER;
BEGIN
    -- Bloqueo pesimista de fila para prevenir condiciones de carrera
    SELECT gold_total, gold_assigned INTO v_total, v_assigned
    FROM public.gold_inventory
    WHERE car_id = p_car_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_assigned < v_total THEN
        UPDATE public.gold_inventory
        SET gold_assigned = gold_assigned + 1,
            updated_at = NOW()
        WHERE car_id = p_car_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función Atómica para Reclamar Recompensa Diaria con Cálculo de Racha
CREATE OR REPLACE FUNCTION public.claim_daily_reward_atomic(
    p_user_id UUID,
    p_reward_type VARCHAR,
    p_reward_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_last_claim TIMESTAMPTZ;
    v_current_streak INTEGER;
    v_new_streak INTEGER := 1;
    v_profile RECORD;
BEGIN
    -- Verificar si ya reclamó hoy
    IF EXISTS (SELECT 1 FROM public.daily_rewards WHERE user_id = p_user_id AND reward_date = v_today) THEN
        RAISE EXCEPTION 'La recompensa diaria ya fue reclamada para la fecha de hoy.';
    END IF;

    -- Obtener estado de racha del usuario
    SELECT daily_streak, last_daily_claim INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_profile.last_daily_claim IS NOT NULL THEN
        -- Si reclamó ayer, incrementa racha
        IF v_profile.last_daily_claim::date = v_today - INTERVAL '1 day' THEN
            v_new_streak := v_profile.daily_streak + 1;
        -- Si reclamó hoy o hace más de 1 día, se reinicia
        ELSIF v_profile.last_daily_claim::date = v_today THEN
            RAISE EXCEPTION 'Ya has reclamado hoy.';
        ELSE
            v_new_streak := 1;
        END IF;
    END IF;

    -- Insertar en daily_rewards
    INSERT INTO public.daily_rewards (user_id, reward_date, reward_type, reward_data)
    VALUES (p_user_id, v_today, p_reward_type, p_reward_data);

    -- Actualizar profile
    UPDATE public.profiles
    SET daily_streak = v_new_streak,
        last_daily_claim = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'reward_date', v_today,
        'new_streak', v_new_streak,
        'reward_type', p_reward_type,
        'reward_data', p_reward_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función Atómica para Otorgar XP con Idempotencia en el Ledger
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

    -- Insertar en ledger
    INSERT INTO public.xp_ledger (user_id, amount, reason, reference_type, reference_id, idempotency_key)
    VALUES (p_user_id, p_amount, p_reason, p_ref_type, p_ref_id, p_idempotency_key);

    -- Actualizar perfil calculando nivel cuadrático: Level = FLOOR((XP / 100) ^ (1 / 1.8)) + 1
    UPDATE public.profiles
    SET xp = xp + p_amount,
        level = GREATEST(1, FLOOR(POWER((xp + p_amount)::float / 100.0, 1.0 / 1.8))::integer + 1),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

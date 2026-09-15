-- ============================================================================
-- SSCARS GARAGE 2.0 — MIGRACIÓN 006: PARCHE DE HARDENING DE SEGURIDAD (R1 - R5)
-- Versión: 2.0.1
-- ============================================================================

-- ============================================================================
-- R5: search_path SEGURO EN FUNCIONES EXISTENTES
-- ============================================================================

-- 1. Inmutabilidad de snapshots con search_path seguro
CREATE OR REPLACE FUNCTION public.prevent_snapshot_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Los build_snapshots son inmutables y no pueden ser modificados ni eliminados';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Trigger de registro de usuario con search_path seguro
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- R1: PROTECCIÓN DE CAMPOS DE SISTEMA EN PROFILES (role, xp, level, streak)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_profile_system_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la actualización la realiza un cliente autenticado o anónimo (no service_role)
    IF (auth.role() = 'authenticated' OR auth.role() = 'anon') THEN
        IF (OLD.role IS DISTINCT FROM NEW.role) THEN
            RAISE EXCEPTION 'Seguridad: No tienes permiso para modificar el rol de usuario';
        END IF;
        IF (OLD.xp IS DISTINCT FROM NEW.xp) THEN
            RAISE EXCEPTION 'Seguridad: El XP solo puede incrementarse mediante el sistema de ledger server-side';
        END IF;
        IF (OLD.level IS DISTINCT FROM NEW.level) THEN
            RAISE EXCEPTION 'Seguridad: El nivel de conductor es calculado automáticamente por el sistema';
        END IF;
        IF (OLD.daily_streak IS DISTINCT FROM NEW.daily_streak) THEN
            RAISE EXCEPTION 'Seguridad: La racha diaria solo puede ser actualizada mediante claim_daily_reward_atomic';
        END IF;
        IF (OLD.last_daily_claim IS DISTINCT FROM NEW.last_daily_claim) THEN
            RAISE EXCEPTION 'Seguridad: La fecha de última recompensa es de solo lectura';
        END IF;
        IF (OLD.id IS DISTINCT FROM NEW.id) THEN
            RAISE EXCEPTION 'Seguridad: El identificador de usuario es inmutable';
        END IF;
        IF (OLD.created_at IS DISTINCT FROM NEW.created_at) THEN
            RAISE EXCEPTION 'Seguridad: created_at es inmutable';
        END IF;
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_profile_system_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_system_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_system_fields();

-- Permisos a nivel de columna para profiles
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (username, display_name, avatar_url) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- ============================================================================
-- R2: REVOCAR EJECUCIÓN PÚBLICA DE award_xp_atomic
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revocación estricta de ejecución pública
REVOKE ALL ON FUNCTION public.award_xp_atomic(UUID, INTEGER, VARCHAR, VARCHAR, VARCHAR, VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp_atomic(UUID, INTEGER, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO service_role;

-- ============================================================================
-- R3: REVOCAR EJECUCIÓN PÚBLICA DE allocate_gold_atomic
-- ============================================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revocación estricta de ejecución pública
REVOKE ALL ON FUNCTION public.allocate_gold_atomic(VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_gold_atomic(VARCHAR) TO service_role;

-- ============================================================================
-- R4: claim_daily_reward_atomic SERVER-SIDE (SIN PARÁMETROS DEL CLIENTE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_daily_reward_atomic()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date;
    v_profile RECORD;
    v_new_streak INTEGER := 1;
    v_reward_xp INTEGER;
    v_reward_data JSONB;
BEGIN
    -- Validar autenticación
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Operación denegada: usuario no autenticado.';
    END IF;

    -- Verificar si ya reclamó hoy
    IF EXISTS (SELECT 1 FROM public.daily_rewards WHERE user_id = v_user_id AND reward_date = v_today) THEN
        RAISE EXCEPTION 'La recompensa diaria ya fue reclamada para la fecha de hoy.';
    END IF;

    -- Obtener estado de racha del usuario con bloqueo pesimista
    SELECT daily_streak, last_daily_claim INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perfil de usuario no encontrado.';
    END IF;

    IF v_profile.last_daily_claim IS NOT NULL THEN
        -- Si reclamó ayer, incrementa racha
        IF (v_profile.last_daily_claim AT TIME ZONE 'UTC')::date = v_today - INTERVAL '1 day' THEN
            v_new_streak := v_profile.daily_streak + 1;
        -- Si reclamó hoy, abortar
        ELSIF (v_profile.last_daily_claim AT TIME ZONE 'UTC')::date = v_today THEN
            RAISE EXCEPTION 'Ya has reclamado hoy.';
        ELSE
            v_new_streak := 1;
        END IF;
    END IF;

    -- Cálculo determinista y seguro del premio en el SERVIDOR (Base 50 XP + 25 XP/día racha, max 500 XP)
    v_reward_xp := LEAST(50 + (v_new_streak * 25), 500);
    v_reward_data := jsonb_build_object(
        'xp', v_reward_xp,
        'streak', v_new_streak,
        'bonus', CASE WHEN v_new_streak % 7 = 0 THEN 'weekly_milestone' ELSE 'none' END
    );

    -- Insertar en daily_rewards
    INSERT INTO public.daily_rewards (user_id, reward_date, reward_type, reward_data)
    VALUES (v_user_id, 'daily_login', v_reward_data);

    -- Registrar en el ledger de XP de forma atómica
    INSERT INTO public.xp_ledger (user_id, amount, reason, reference_type, reference_id, idempotency_key)
    VALUES (v_user_id, v_reward_xp, 'daily_reward', 'daily_rewards', v_today::text, 'daily_' || v_user_id::text || '_' || v_today::text)
    ON CONFLICT (idempotency_key) DO NOTHING;

    -- Actualizar profile
    UPDATE public.profiles
    SET daily_streak = v_new_streak,
        last_daily_claim = NOW(),
        xp = xp + v_reward_xp,
        level = GREATEST(1, FLOOR(POWER((xp + v_reward_xp)::float / 100.0, 1.0 / 1.8))::integer + 1),
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'reward_date', v_today,
        'new_streak', v_new_streak,
        'reward_type', 'daily_login',
        'reward_data', v_reward_data,
        'awarded_xp', v_reward_xp
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Permisos: Solo usuarios autenticados y service_role (NO anónimo)
REVOKE ALL ON FUNCTION public.claim_daily_reward_atomic() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward_atomic() TO authenticated, service_role;

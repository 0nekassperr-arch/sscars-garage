-- ============================================================================
-- SSCARS GARAGE 2.0 — MIGRACIÓN 009: MOTOR DE RECOMPENSAS DIARIAS Y CARTAS
-- Versión: 2.2.0
-- ============================================================================

-- ============================================================================
-- 1. SEED DE CARTAS DIGITALES ESTÁNDAR Y GOLD CHROME EN TABLA CARDS
-- ============================================================================

INSERT INTO public.cards (car_id, rarity, code, is_gold, active)
VALUES
    -- 15 Cartas Estándar
    ('01', 'legendary',   'CARD-R34-STD',     false, true),
    ('02', 'rare',        'CARD-R32-STD',     false, true),
    ('03', 'rare',        'CARD-350Z-STD',    false, true),
    ('04', 'legendary',   'CARD-SUPRA-STD',   false, true),
    ('05', 'common',      'CARD-AE86-STD',    false, true),
    ('06', 'rare',        'CARD-MR2-STD',     false, true),
    ('07', 'epic',        'CARD-RX7-STD',     false, true),
    ('08', 'epic',        'CARD-NSX-STD',     false, true),
    ('09', 'common',      'CARD-CIVIC-STD',   false, true),
    ('10', 'rare',        'CARD-S2000-STD',   false, true),
    ('11', 'rare',        'CARD-EVO-STD',     false, true),
    ('12', 'common',      'CARD-ECLIPSE-STD', false, true),
    ('13', 'common',      'CARD-3000GT-STD',  false, true),
    ('14', 'rare',        'CARD-WRC-STD',     false, true),
    ('15', 'rare',        'CARD-LFA-STD',     false, true),

    -- 15 Cartas Gold Chrome Chase
    ('01', 'gold_chrome', 'CARD-R34-GOLD',     true,  true),
    ('02', 'gold_chrome', 'CARD-R32-GOLD',     true,  true),
    ('03', 'gold_chrome', 'CARD-350Z-GOLD',    true,  true),
    ('04', 'gold_chrome', 'CARD-SUPRA-GOLD',   true,  true),
    ('05', 'gold_chrome', 'CARD-AE86-GOLD',    true,  true),
    ('06', 'gold_chrome', 'CARD-MR2-GOLD',     true,  true),
    ('07', 'gold_chrome', 'CARD-RX7-GOLD',     true,  true),
    ('08', 'gold_chrome', 'CARD-NSX-GOLD',     true,  true),
    ('09', 'gold_chrome', 'CARD-CIVIC-GOLD',   true,  true),
    ('10', 'gold_chrome', 'CARD-S2000-GOLD',   true,  true),
    ('11', 'gold_chrome', 'CARD-EVO-GOLD',     true,  true),
    ('12', 'gold_chrome', 'CARD-ECLIPSE-GOLD', true,  true),
    ('13', 'gold_chrome', 'CARD-3000GT-GOLD',  true,  true),
    ('14', 'gold_chrome', 'CARD-WRC-GOLD',     true,  true),
    ('15', 'gold_chrome', 'CARD-LFA-GOLD',     true,  true)
ON CONFLICT (code) DO UPDATE SET
    car_id = EXCLUDED.car_id,
    rarity = EXCLUDED.rarity,
    is_gold = EXCLUDED.is_gold,
    active = EXCLUDED.active;

-- ============================================================================
-- 2. MOTOR COMPLETO DE RECOMPENSAS DIARIAS CON GESTIÓN DE DUPLICADOS Y XP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_daily_reward_atomic()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::date;
    v_profile RECORD;
    v_new_streak INTEGER := 1;
    v_last_claim_madrid DATE;
    v_rand FLOAT;
    
    -- Variables del Reward
    v_reward_type VARCHAR(64) := 'xp';
    v_reward_payload JSONB := '{}'::jsonb;
    v_awarded_xp INTEGER := 0;
    v_bonus_xp INTEGER := 0;
    v_total_xp BIGINT := 0;
    v_new_level INTEGER := 1;
    v_selected_card RECORD;
    v_gold_allocated BOOLEAN := false;
BEGIN
    -- 1. Validar autenticación
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Operación denegada: usuario no autenticado.';
    END IF;

    -- 2. Comprobar si ya reclamó hoy (Timezone: Europe/Madrid)
    IF EXISTS (SELECT 1 FROM public.daily_rewards WHERE user_id = v_user_id AND reward_date = v_today) THEN
        SELECT xp, level, daily_streak INTO v_profile FROM public.profiles WHERE id = v_user_id;
        RETURN jsonb_build_object(
            'success', false,
            'alreadyClaimed', true,
            'message', 'Ya has reclamado tu recompensa diaria de hoy.',
            'rewardDate', v_today,
            'timezone', 'Europe/Madrid',
            'streak', COALESCE(v_profile.daily_streak, 0),
            'xp', jsonb_build_object(
                'total', COALESCE(v_profile.xp, 0),
                'level', COALESCE(v_profile.level, 1)
            )
        );
    END IF;

    -- 3. Bloqueo de fila de perfil para garantizar atomicidad ante solicitudes concurrentes
    SELECT id, daily_streak, last_daily_claim, xp, level INTO v_profile
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perfil de usuario no encontrado.';
    END IF;

    -- 4. Cálculo de racha diaria
    IF v_profile.last_daily_claim IS NOT NULL THEN
        v_last_claim_madrid := (v_profile.last_daily_claim AT TIME ZONE 'Europe/Madrid')::date;
        IF v_last_claim_madrid = v_today - INTERVAL '1 day' THEN
            v_new_streak := v_profile.daily_streak + 1;
        ELSIF v_last_claim_madrid = v_today THEN
            RAISE EXCEPTION 'La recompensa ya fue reclamada para la fecha de hoy.';
        ELSE
            v_new_streak := 1;
        END IF;
    END IF;

    -- 5. Tirada server-side de probabilidades de recompensa:
    --    - 0.2% Gold Chase Card
    --    - 25.0% Standard/Rare/Epic Card
    --    - 5.0% Mega XP Boost (200 XP + bonus)
    --    - 69.8% Daily XP Boost (50 XP base + 25 XP * streak)
    v_rand := random();

    IF v_rand < 0.002 THEN
        -- ==========================================
        -- REWARD: GOLD CHASE CARD (1/500)
        -- ==========================================
        SELECT c.id, c.car_id, c.rarity, c.code, c.is_gold, car.name AS car_name, car.slug AS car_slug
        INTO v_selected_card
        FROM public.cards c
        JOIN public.cars car ON c.car_id = car.id
        WHERE c.active = true AND c.is_gold = true
          AND c.id NOT IN (SELECT card_id FROM public.user_cards WHERE user_id = v_user_id)
        ORDER BY random()
        LIMIT 1;

        IF FOUND THEN
            -- Intentar asignar físicamente del inventario Gold atómico
            v_gold_allocated := public.allocate_gold_atomic(v_selected_card.car_id);
            IF v_gold_allocated THEN
                v_reward_type := 'gold_card';
                v_awarded_xp := 150;
                -- Asignar carta al usuario
                INSERT INTO public.user_cards (user_id, card_id, source, metadata)
                VALUES (v_user_id, v_selected_card.id, 'daily_reward_gold', jsonb_build_object('streak', v_new_streak, 'date', v_today));

                v_reward_payload := jsonb_build_object(
                    'type', 'card',
                    'cardId', v_selected_card.id,
                    'code', v_selected_card.code,
                    'carId', v_selected_card.car_id,
                    'carName', v_selected_card.car_name,
                    'carSlug', v_selected_card.car_slug,
                    'rarity', 'gold_chrome',
                    'isGold', true,
                    'note', '✨ ¡ENHORABUENA! Has obtenido una carta secreta Gold Chrome'
                );
            ELSE
                -- Si el cupo Gold está agotado, convertir a Mega XP
                v_reward_type := 'mega_xp';
                v_awarded_xp := 300;
                v_reward_payload := jsonb_build_object('type', 'xp', 'xp', v_awarded_xp, 'note', 'Gold agotado: convertido a Mega XP');
            END IF;
        ELSE
            -- Si ya tiene todas las Gold, convertir a Mega XP
            v_reward_type := 'mega_xp';
            v_awarded_xp := 300;
            v_reward_payload := jsonb_build_object('type', 'xp', 'xp', v_awarded_xp, 'note', 'Colección Gold completa: +300 XP');
        END IF;

    ELSIF v_rand < 0.252 THEN
        -- ==========================================
        -- REWARD: CARTA DIGITAL (POLÍTICA ANTI-DUPLICADOS)
        -- ==========================================
        -- 1. Buscar una carta estándar que el usuario NO posea todavía
        SELECT c.id, c.car_id, c.rarity, c.code, c.is_gold, car.name AS car_name, car.slug AS car_slug
        INTO v_selected_card
        FROM public.cards c
        JOIN public.cars car ON c.car_id = car.id
        WHERE c.active = true AND c.is_gold = false
          AND c.id NOT IN (SELECT card_id FROM public.user_cards WHERE user_id = v_user_id)
        ORDER BY random()
        LIMIT 1;

        IF FOUND THEN
            -- Asignar carta a user_cards
            INSERT INTO public.user_cards (user_id, card_id, source, metadata)
            VALUES (v_user_id, v_selected_card.id, 'daily_reward', jsonb_build_object('streak', v_new_streak, 'date', v_today));

            v_reward_type := 'card';
            v_awarded_xp := 75;
            v_reward_payload := jsonb_build_object(
                'type', 'card',
                'cardId', v_selected_card.id,
                'code', v_selected_card.code,
                'carId', v_selected_card.car_id,
                'carName', v_selected_card.car_name,
                'carSlug', v_selected_card.car_slug,
                'rarity', v_selected_card.rarity,
                'isGold', false,
                'note', '¡Nueva carta añadida a tu Garaje!'
            );
        ELSE
            -- 2. POLÍTICA DE DUPLICADOS: Si ya posee las 15 cartas estándar, se convierte a Bonus XP
            v_reward_type := 'duplicate_xp_bonus';
            v_awarded_xp := 250;
            v_reward_payload := jsonb_build_object(
                'type', 'xp',
                'xp', v_awarded_xp,
                'note', '¡Colección estándar completa! Carta convertida en +250 XP bonus'
            );
        END IF;

    ELSIF v_rand < 0.302 THEN
        -- ==========================================
        -- REWARD: MEGA XP BOOST
        -- ==========================================
        v_reward_type := 'mega_xp';
        v_awarded_xp := 200 + LEAST(v_new_streak * 20, 200);
        v_reward_payload := jsonb_build_object(
            'type', 'xp',
            'xp', v_awarded_xp,
            'note', '⚡ ¡Golpe de Suerte! Mega XP Boost'
        );

    ELSE
        -- ==========================================
        -- REWARD: DAILY XP BOOST ESTÁNDAR
        -- ==========================================
        v_reward_type := 'daily_xp';
        v_awarded_xp := LEAST(50 + (v_new_streak * 25), 500);
        v_reward_payload := jsonb_build_object(
            'type', 'xp',
            'xp', v_awarded_xp,
            'streak', v_new_streak,
            'bonus', CASE WHEN v_new_streak % 7 = 0 THEN 'weekly_milestone' ELSE 'none' END,
            'note', 'Experiencia de conexión diaria recibida'
        );
    END IF;

    -- 6. Insertar en el registro inmutable daily_rewards (Restricción UNIQUE(user_id, reward_date))
    INSERT INTO public.daily_rewards (user_id, reward_date, reward_type, reward_data)
    VALUES (v_user_id, v_today, v_reward_type, v_reward_payload);

    -- 7. Registrar en el ledger de XP con clave de idempotencia estricta
    INSERT INTO public.xp_ledger (user_id, amount, reason, reference_type, reference_id, idempotency_key)
    VALUES (v_user_id, v_awarded_xp, 'daily_reward_' || v_reward_type, 'daily_rewards', v_today::text, 'daily_' || v_user_id::text || '_' || v_today::text)
    ON CONFLICT (idempotency_key) DO NOTHING;

    -- 8. Actualizar perfil del usuario y recalcular nivel con fórmula oficial
    v_total_xp := v_profile.xp + v_awarded_xp;
    v_new_level := public.calculate_driver_level(v_total_xp);

    UPDATE public.profiles
    SET xp = v_total_xp,
        level = v_new_level,
        daily_streak = v_new_streak,
        last_daily_claim = NOW(),
        updated_at = NOW()
    WHERE id = v_user_id;

    -- 9. Retorno de respuesta estructurada
    RETURN jsonb_build_object(
        'success', true,
        'alreadyClaimed', false,
        'rewardDate', v_today,
        'timezone', 'Europe/Madrid',
        'streak', v_new_streak,
        'reward', v_reward_payload,
        'xp', jsonb_build_object(
            'awarded', v_awarded_xp,
            'total', v_total_xp,
            'level', v_new_level,
            'nextLevelXp', FLOOR(100 * POWER(v_new_level, 1.8))
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.claim_daily_reward_atomic() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward_atomic() TO authenticated, service_role;

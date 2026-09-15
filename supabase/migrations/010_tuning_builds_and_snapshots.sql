-- ============================================================================
-- SSCARS GARAGE 2.0 — MIGRACIÓN 010: TUNING, BUILDS Y SNAPSHOTS INMUTABLES
-- Versión: 2.3.0
-- ============================================================================

-- ============================================================================
-- 1. AÑADIR VERSIONADO A BUILD_SNAPSHOTS Y COLUMNA CATEGORY A tuning_parts
-- ============================================================================

ALTER TABLE public.build_snapshots 
    ADD COLUMN IF NOT EXISTS snapshot_version INTEGER DEFAULT 1 NOT NULL;

-- ============================================================================
-- 2. SEED DE CATÁLOGO DE PIEZAS DE TUNING (5 CATEGORÍAS)
-- ============================================================================

INSERT INTO public.tuning_parts (category, name, slug, description, stats_modifier, xp_required, active)
VALUES
    -- WHEELS (Llantas)
    ('wheels', 'Llantas de Serie', 'wheels-stock', 'Llantas estándar de fábrica',
     '{"hp": 0, "handling": 0, "style": 0}'::jsonb, 0, true),
    ('wheels', 'Llantas Street Rays TE37', 'wheels-street', 'Llantas forjadas ultraligeras de 6 radios',
     '{"hp": 0, "handling": 2, "style": 4}'::jsonb, 100, true),
    ('wheels', 'Llantas Competición Magnesio', 'wheels-racing', 'Llantas multirradio para circuito',
     '{"hp": 0, "handling": 5, "style": 8}'::jsonb, 500, true),

    -- PAINT (Pintura)
    ('paint', 'Pintura Original de Fábrica', 'paint-stock', 'Acabado clásico de catálogo',
     '{"hp": 0, "handling": 0, "style": 0}'::jsonb, 0, true),
    ('paint', 'Midnight Purple III', 'paint-midnight-purple', 'Tono tornasolado legendario de la Wangan',
     '{"hp": 0, "handling": 0, "style": 8}'::jsonb, 250, true),
    ('paint', 'Negro Carbón Satinado', 'paint-carbon-black', 'Acabado oscuro de baja reflectividad',
     '{"hp": 0, "handling": 0, "style": 5}'::jsonb, 150, true),
    ('paint', 'Blanco Campeonato Type R', 'paint-championship-white', 'Pintura pura de carreras',
     '{"hp": 0, "handling": 0, "style": 4}'::jsonb, 100, true),
    ('paint', 'Rojo Fórmula GT', 'paint-formula-red', 'Rojo intenso brillante de alta visibilidad',
     '{"hp": 0, "handling": 0, "style": 4}'::jsonb, 100, true),

    -- SPOILER (Alerón)
    ('spoiler', 'Alerón de Serie', 'spoiler-stock', 'Aerodinámica original balanceada',
     '{"hp": 0, "handling": 0, "style": 0, "top_speed_kmh": 0}'::jsonb, 0, true),
    ('spoiler', 'Ducktail Callejero', 'spoiler-ducktail', 'Alerón de cola de pato integrado',
     '{"hp": 0, "handling": 2, "style": 5, "top_speed_kmh": 2}'::jsonb, 150, true),
    ('spoiler', 'Alerón GT de Carbono Alto', 'spoiler-gt-wing', 'Carga aerodinámica masiva para curvas rápidas',
     '{"hp": 0, "handling": 6, "style": 7, "top_speed_kmh": -2}'::jsonb, 400, true),

    -- EXHAUST (Escape)
    ('exhaust', 'Línea de Escape de Serie', 'exhaust-stock', 'Sistema silencioso de origen',
     '{"hp": 0, "acceleration_0_100": 0.0, "style": 0}'::jsonb, 0, true),
    ('exhaust', 'Escape Deportivo Inox', 'exhaust-sport', 'Silencioso de acero inoxidable de alto flujo',
     '{"hp": 5, "acceleration_0_100": -0.1, "style": 3}'::jsonb, 150, true),
    ('exhaust', 'Línea Completa de Titanio', 'exhaust-titanium', 'Tubería directa de titanio con colas quemadas',
     '{"hp": 12, "acceleration_0_100": -0.2, "style": 8}'::jsonb, 600, true),

    -- BODY KIT (Kit de Carrocería)
    ('body_kit', 'Carrocería de Serie', 'bodykit-stock', 'Paneles originales sin modificar',
     '{"hp": 0, "handling": 0, "style": 0}'::jsonb, 0, true),
    ('body_kit', 'Splitter y Taloneras Street', 'bodykit-street', 'Labio delantero y faldones de perfil bajo',
     '{"hp": 0, "handling": 3, "style": 6}'::jsonb, 200, true),
    ('body_kit', 'Kit Ensanchado Widebody GT', 'bodykit-widebody', 'Aletas ensanchadas y difusor trasero agresivo',
     '{"hp": 0, "handling": 7, "style": 12}'::jsonb, 750, true)
ON CONFLICT (slug) DO UPDATE SET
    category = EXCLUDED.category,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    stats_modifier = EXCLUDED.stats_modifier,
    xp_required = EXCLUDED.xp_required,
    active = EXCLUDED.active;

-- ============================================================================
-- 3. FUNCIÓN DE CÁLCULO DE STATS SERVER-SIDE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_build_stats(
    p_car_id VARCHAR,
    p_part_slugs TEXT[]
)
RETURNS JSONB AS $$
DECLARE
    v_car RECORD;
    v_base_stats JSONB;
    v_hp INTEGER;
    v_top_speed INTEGER;
    v_accel NUMERIC;
    v_handling INTEGER;
    v_style INTEGER := 0;
    v_part RECORD;
    v_categories TEXT[] := ARRAY[]::TEXT[];
BEGIN
    SELECT * INTO v_car FROM public.cars WHERE id = p_car_id AND active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehículo no válido o inactivo: %', p_car_id;
    END IF;

    v_base_stats := v_car.base_stats;
    v_hp := COALESCE((v_base_stats->>'hp')::integer, 250);
    v_top_speed := COALESCE((v_base_stats->>'top_speed_kmh')::integer, 240);
    v_accel := COALESCE((v_base_stats->>'acceleration_0_100')::numeric, 5.5);
    v_handling := COALESCE((v_base_stats->>'handling')::integer, 85);

    -- Iterar y aplicar modificadores de cada pieza
    FOR v_part IN 
        SELECT category, slug, stats_modifier 
        FROM public.tuning_parts 
        WHERE slug = ANY(p_part_slugs) AND active = true
    LOOP
        -- Validación anti-duplicidad de categoría
        IF v_part.category = ANY(v_categories) THEN
            RAISE EXCEPTION 'Configuración inválida: múltiples piezas para la categoría %', v_part.category;
        END IF;
        v_categories := array_append(v_categories, v_part.category);

        -- Aplicar modificadores
        v_hp := v_hp + COALESCE((v_part.stats_modifier->>'hp')::integer, 0);
        v_top_speed := v_top_speed + COALESCE((v_part.stats_modifier->>'top_speed_kmh')::integer, 0);
        v_accel := v_accel + COALESCE((v_part.stats_modifier->>'acceleration_0_100')::numeric, 0.0);
        v_handling := v_handling + COALESCE((v_part.stats_modifier->>'handling')::integer, 0);
        v_style := v_style + COALESCE((v_part.stats_modifier->>'style')::integer, 0);
    END LOOP;

    -- Clamping de límites físicos realistas
    v_accel := GREATEST(2.0, ROUND(v_accel, 2));
    v_handling := LEAST(100, GREATEST(1, v_handling));

    RETURN jsonb_build_object(
        'hp', v_hp,
        'top_speed_kmh', v_top_speed,
        'acceleration_0_100', v_accel,
        'handling', v_handling,
        'style_points', v_style
    );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public, pg_temp;

-- ============================================================================
-- 4. PROCEDIMIENTO ATÓMICO: GUARDAR / EDITAR BUILD (VALIDACIÓN SERVER-SIDE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_build_atomic(
    p_car_id VARCHAR,
    p_name VARCHAR,
    p_part_slugs TEXT[],
    p_build_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile RECORD;
    v_car RECORD;
    v_final_stats JSONB;
    v_parts_json JSONB := '{}'::jsonb;
    v_part RECORD;
    v_saved_build RECORD;
BEGIN
    -- 1. Validar autenticación
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Operación denegada: usuario no autenticado.';
    END IF;

    -- 2. Validar propiedad real del coche (auth.uid() -> user_cards -> cards -> cars)
    IF NOT EXISTS (
        SELECT 1 FROM public.user_cards uc
        JOIN public.cards c ON uc.card_id = c.id
        WHERE uc.user_id = v_user_id AND c.car_id = p_car_id AND c.active = true
    ) THEN
        RAISE EXCEPTION 'Operación denegada: no posees el vehículo (%) en tu Garaje.', p_car_id;
    END IF;

    -- 3. Validar XP del usuario contra cada pieza requerida
    SELECT xp, level INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perfil de usuario no encontrado.';
    END IF;

    FOR v_part IN 
        SELECT category, slug, name, xp_required 
        FROM public.tuning_parts 
        WHERE slug = ANY(p_part_slugs)
    LOOP
        IF v_part.xp_required > v_profile.xp THEN
            RAISE EXCEPTION 'XP insuficiente para equipar "%": requiere % XP (tienes % XP).', 
                v_part.name, v_part.xp_required, v_profile.xp;
        END IF;
        v_parts_json := jsonb_set(v_parts_json, ARRAY[v_part.category], to_jsonb(v_part.slug));
    END LOOP;

    -- 4. Calcular stats finales server-side
    v_final_stats := public.calculate_build_stats(p_car_id, p_part_slugs);

    -- 5. Insertar o actualizar Build
    IF p_build_id IS NOT NULL THEN
        -- Comprobar pertenencia antes de actualizar
        IF NOT EXISTS (SELECT 1 FROM public.builds WHERE id = p_build_id AND user_id = v_user_id) THEN
            RAISE EXCEPTION 'Build no encontrado o no pertenece a tu cuenta.';
        END IF;

        UPDATE public.builds
        SET name = COALESCE(TRIM(p_name), name),
            car_id = p_car_id,
            parts = v_parts_json,
            stats = v_final_stats,
            updated_at = NOW()
        WHERE id = p_build_id AND user_id = v_user_id
        RETURNING * INTO v_saved_build;
    ELSE
        INSERT INTO public.builds (user_id, car_id, name, parts, stats)
        VALUES (v_user_id, p_car_id, COALESCE(TRIM(p_name), 'Mi Build JDM'), v_parts_json, v_final_stats)
        RETURNING * INTO v_saved_build;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'build', row_to_json(v_saved_build)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.save_build_atomic(VARCHAR, VARCHAR, TEXT[], UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_build_atomic(VARCHAR, VARCHAR, TEXT[], UUID) TO authenticated, service_role;

-- ============================================================================
-- 5. PROCEDIMIENTO ATÓMICO: CREAR BUILD SNAPSHOT INMUTABLE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_build_snapshot_atomic(
    p_build_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_build RECORD;
    v_car RECORD;
    v_snapshot RECORD;
    v_snapshot_data JSONB;
BEGIN
    -- 1. Validar autenticación
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Operación denegada: usuario no autenticado.';
    END IF;

    -- 2. Obtener y validar pertenencia del build
    SELECT * INTO v_build FROM public.builds WHERE id = p_build_id AND user_id = v_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Build no encontrado o no autorizado.';
    END IF;

    SELECT * INTO v_car FROM public.cars WHERE id = v_build.car_id;

    -- 3. Congelar estructura inmutable completa del snapshot
    v_snapshot_data := jsonb_build_object(
        'build_id', v_build.id,
        'build_name', v_build.name,
        'car_id', v_build.car_id,
        'car_name', v_car.name,
        'car_slug', v_car.slug,
        'real_model', v_car.real_model,
        'parts', v_build.parts,
        'stats', v_build.stats,
        'captured_at', NOW()
    );

    -- 4. Insertar snapshot inmutable (protegido por trg_build_snapshots_immutable)
    INSERT INTO public.build_snapshots (build_id, user_id, car_id, build_data, stats, snapshot_version)
    VALUES (v_build.id, v_user_id, v_build.car_id, v_snapshot_data, v_build.stats, 1)
    RETURNING * INTO v_snapshot;

    RETURN jsonb_build_object(
        'success', true,
        'snapshot', row_to_json(v_snapshot)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.create_build_snapshot_atomic(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_build_snapshot_atomic(UUID) TO authenticated, service_role;

-- ============================================================================
-- 6. PROCEDIMIENTO ATÓMICO: ELIMINAR BUILD PROPIO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_build_atomic(
    p_build_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Operación denegada: usuario no autenticado.';
    END IF;

    DELETE FROM public.builds WHERE id = p_build_id AND user_id = v_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Build no encontrado o no pertenece a tu cuenta.';
    END IF;

    RETURN jsonb_build_object('success', true, 'deleted_id', p_build_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.delete_build_atomic(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_build_atomic(UUID) TO authenticated, service_role;

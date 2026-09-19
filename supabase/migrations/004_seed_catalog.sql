-- ============================================================================
-- SSCARS GARAGE 2.0 — MIGRACIÓN 004: SEMILLAS DE CATÁLOGO MAESTRO (15 COCHES)
-- Versión: 2.0.0
-- ============================================================================

-- 1. Inserción de los 15 vehículos JDM
INSERT INTO public.cars (id, number, slug, name, real_model, year, rarity, base_stats, images, active)
VALUES
    ('01', '01', 'r34', 'El Emperador Azul', 'Nissan Skyline GT-R R34', 1999, 'legendary',
     '{"hp": 327, "top_speed_kmh": 252, "acceleration_0_100": 4.9, "handling": 94}'::jsonb,
     '{"front": "images/r34-front.webp", "rear": "images/r34-rear.webp"}'::jsonb, true),
    ('02', '02', 'r32', 'El Monstruo Púrpura', 'Nissan Skyline GT-R R32', 1989, 'rare',
     '{"hp": 276, "top_speed_kmh": 250, "acceleration_0_100": 5.6, "handling": 88}'::jsonb,
     '{"front": "images/r32-front.webp", "rear": "images/r32-rear.webp"}'::jsonb, true),
    ('03', '03', '350z', 'Colmillo Azul', 'Nissan 350Z', 2002, 'rare',
     '{"hp": 287, "top_speed_kmh": 250, "acceleration_0_100": 5.8, "handling": 86}'::jsonb,
     '{"front": "images/350z-front.webp", "rear": "images/350z-rear.webp"}'::jsonb, true),
    ('04', '04', 'supra', 'La Bestia Naranja', 'Toyota Supra MK4', 1993, 'legendary',
     '{"hp": 326, "top_speed_kmh": 250, "acceleration_0_100": 4.6, "handling": 92}'::jsonb,
     '{"front": "images/supra-front.webp", "rear": "images/supra-rear.webp"}'::jsonb, true),
    ('05', '05', 'ae86', 'El Fantasma de la Montaña', 'Toyota AE86 Sprinter Trueno', 1983, 'common',
     '{"hp": 128, "top_speed_kmh": 200, "acceleration_0_100": 8.5, "handling": 96}'::jsonb,
     '{"front": "images/ae86-front.webp", "rear": "images/ae86-rear.webp"}'::jsonb, true),
    ('06', '06', 'mr2', 'El Exótico de Bolsillo', 'Toyota MR2', 1989, 'rare',
     '{"hp": 200, "top_speed_kmh": 240, "acceleration_0_100": 5.9, "handling": 89}'::jsonb,
     '{"front": "images/mr2-front.webp", "rear": "images/mr2-rear.webp"}'::jsonb, true),
    ('07', '07', 'rx7', 'El Aullido Rotativo', 'Mazda RX-7 FD3S', 1992, 'epic',
     '{"hp": 255, "top_speed_kmh": 250, "acceleration_0_100": 5.2, "handling": 95}'::jsonb,
     '{"front": "images/rx7-front.webp", "rear": "images/rx7-rear.webp"}'::jsonb, true),
    ('08', '08', 'nsx', 'El Samurái Rojo', 'Honda NSX', 1990, 'epic',
     '{"hp": 274, "top_speed_kmh": 270, "acceleration_0_100": 5.0, "handling": 97}'::jsonb,
     '{"front": "images/nsx-front.webp", "rear": "images/nsx-rear.webp"}'::jsonb, true),
    ('09', '09', 'civic', 'El Puño Blanco', 'Honda Civic EK9 Type R', 1997, 'common',
     '{"hp": 182, "top_speed_kmh": 225, "acceleration_0_100": 6.8, "handling": 90}'::jsonb,
     '{"front": "images/civic-front.webp", "rear": "images/civic-rear.webp"}'::jsonb, true),
    ('10', '10', 's2000', 'El Grito Amarillo', 'Honda S2000', 1999, 'rare',
     '{"hp": 240, "top_speed_kmh": 241, "acceleration_0_100": 6.2, "handling": 91}'::jsonb,
     '{"front": "images/s2000-front.webp", "rear": "images/s2000-rear.webp"}'::jsonb, true),
    ('11', '11', 'evo', 'El Domador', 'Mitsubishi Lancer Evolution', 1992, 'rare',
     '{"hp": 280, "top_speed_kmh": 250, "acceleration_0_100": 4.8, "handling": 93}'::jsonb,
     '{"front": "images/evo-front.webp", "rear": "images/evo-rear.webp"}'::jsonb, true),
    ('12', '12', 'eclipse', 'Verde Veneno', 'Mitsubishi Eclipse', 1995, 'common',
     '{"hp": 210, "top_speed_kmh": 240, "acceleration_0_100": 6.5, "handling": 85}'::jsonb,
     '{"front": "images/eclipse-front.webp", "rear": "images/eclipse-rear.webp"}'::jsonb, true),
    ('13', '13', '3000gt', 'El Visionario', 'Mitsubishi 3000GT VR-4', 1990, 'common',
     '{"hp": 300, "top_speed_kmh": 250, "acceleration_0_100": 5.4, "handling": 87}'::jsonb,
     '{"front": "images/3000gt-front.webp", "rear": "images/3000gt-rear.webp"}'::jsonb, true),
    ('14', '14', 'wrc', 'El Azul del Rally', 'Subaru Impreza WRX STI', 1998, 'rare',
     '{"hp": 280, "top_speed_kmh": 245, "acceleration_0_100": 4.9, "handling": 94}'::jsonb,
     '{"front": "images/wrc-front.webp", "rear": "images/wrc-rear.webp"}'::jsonb, true),
    ('15', '15', 'lfa', 'La Voz del V10', 'Lexus LFA', 2010, 'rare',
     '{"hp": 553, "top_speed_kmh": 325, "acceleration_0_100": 3.7, "handling": 98}'::jsonb,
     '{"front": "images/lfa-front.webp", "rear": "images/lfa-rear.webp"}'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
    number = EXCLUDED.number,
    slug = EXCLUDED.slug,
    name = EXCLUDED.name,
    real_model = EXCLUDED.real_model,
    year = EXCLUDED.year,
    rarity = EXCLUDED.rarity,
    base_stats = EXCLUDED.base_stats,
    images = EXCLUDED.images;

-- 2. Inserción de inventario atómico Gold (100 unidades en total)
INSERT INTO public.gold_inventory (car_id, gold_total, gold_assigned)
VALUES
    ('01', 6, 0), -- R34
    ('02', 7, 0), -- R32
    ('03', 7, 0), -- 350Z
    ('04', 6, 0), -- Supra
    ('05', 7, 0), -- AE86
    ('06', 7, 0), -- MR2
    ('07', 6, 0), -- RX-7
    ('08', 6, 0), -- NSX
    ('09', 7, 0), -- Civic
    ('10', 7, 0), -- S2000
    ('11', 7, 0), -- Evo
    ('12', 7, 0), -- Eclipse
    ('13', 7, 0), -- 3000GT
    ('14', 7, 0), -- WRC
    ('15', 6, 0)  -- LFA
ON CONFLICT (car_id) DO UPDATE SET
    gold_total = EXCLUDED.gold_total;

-- 3. Inserción de productos base V2
INSERT INTO public.products (id, slug, name, description, product_type, price, currency, active, stock_limit)
VALUES
    ('box1', 'caja-individual', '1 Caja Sorpresa', '1 figura sorpresa coleccionable en resina', 'mystery_box', 24.95, 'EUR', true, NULL),
    ('box3', 'pack-3-cajas', 'Pack 3 Cajas (Trío Callejero)', '3 figuras sorpresa sin repetidos', 'pack', 69.95, 'EUR', true, NULL),
    ('box6', 'pack-6-cajas', 'Pack 6 Cajas (Garaje Completo)', '6 figuras sorpresa sin repetidos', 'pack', 129.95, 'EUR', true, NULL),
    ('full', 'coleccion-completa', 'Colección Completa 15 Figuras', 'Las 15 figuras JDM + Gold Chrome garantizado', 'pack', 669.95, 'EUR', true, NULL)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    product_type = EXCLUDED.product_type;

-- 4. Inserción de piezas de tuning iniciales
INSERT INTO public.tuning_parts (category, name, slug, description, stats_modifier, xp_required)
VALUES
    ('wheels', 'Llantas 5 Radios Racing', 'wheels-5-spoke', 'Llantas ligeras de magnesio', '{"handling": 2, "top_speed_kmh": 0}'::jsonb, 0),
    ('wheels', 'Llantas BBS Multirradio', 'wheels-bbs-mesh', 'Clásicas de competición', '{"handling": 3, "top_speed_kmh": 0}'::jsonb, 500),
    ('spoiler', 'Alerón GT Carbono Alto', 'spoiler-gt-carbon', 'Carga aerodinámica extrema', '{"handling": 5, "top_speed_kmh": -2}'::jsonb, 1000),
    ('spoiler', 'Ducktail Clásico', 'spoiler-ducktail', 'Estilo limpio y bajo arrastre', '{"handling": 2, "top_speed_kmh": 2}'::jsonb, 250),
    ('exhaust', 'Línea Titanio Directa', 'exhaust-titanium', 'Reducción de peso y flujo óptimo', '{"hp": 8, "acceleration_0_100": -0.1}'::jsonb, 750),
    ('paint', 'Midnight Purple III', 'paint-midnight-purple', 'Tono cromático legendario', '{"style_points": 10}'::jsonb, 1500)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    stats_modifier = EXCLUDED.stats_modifier,
    xp_required = EXCLUDED.xp_required;

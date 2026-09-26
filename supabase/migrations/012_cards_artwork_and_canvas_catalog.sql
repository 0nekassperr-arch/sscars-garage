-- ============================================================================
-- SSCARS GARAGE 2.0 — MIGRACIÓN 012: ARTE DE LAS CARTAS + CATÁLOGO DE LIENZOS
-- Versión: 2.4.0
-- ============================================================================
--
-- Cada uno de los 15 modelos tiene su CARTA artística correlativa (01..15):
-- una lámina vertical de 1280x1792 px (proporción 5:7) con el número, el nombre
-- artístico, el OVR y las seis estadísticas (VEL · ACE · MAN · POT · EST · RAR).
--
-- Esa carta se usa en tres sitios:
--   1. La web: tercera vista de la ficha de cada modelo (delantera / trasera / carta).
--   2. Mi Garaje: ilustración de la colección digital de cada usuario.
--   3. Lienzos print-on-demand (Printify): una lámina por modelo y arte.
--
-- Ficheros que espera esta migración (ya versionados en el repo):
--   · Arte web (WebP 1000 px):  images/cartas/{nn}-{slug}.webp      → public/images/cartas/
--   · Maestro de impresión:     produccion/cartas/{nn}-{slug}.webp  → produccion/cartas/
-- ============================================================================


-- ============================================================================
-- 1. LA TABLA CARDS GUARDA EL ARTE Y LAS ESTADÍSTICAS DE LA CARTA
-- ============================================================================
ALTER TABLE public.cards
    ADD COLUMN IF NOT EXISTS image_path   VARCHAR(160),
    ADD COLUMN IF NOT EXISTS print_master VARCHAR(200),
    ADD COLUMN IF NOT EXISTS ovr          SMALLINT,
    ADD COLUMN IF NOT EXISTS stats        JSONB DEFAULT '{}'::jsonb NOT NULL;

DO $$ BEGIN
    ALTER TABLE public.cards ADD CONSTRAINT cards_ovr_range CHECK (ovr IS NULL OR (ovr BETWEEN 1 AND 100));
EXCEPTION WHEN duplicate_object THEN null; END $$;

COMMENT ON COLUMN public.cards.image_path   IS 'Arte de la carta que sirve la web, relativo a public/ (images/cartas/{nn}-{slug}.webp)';
COMMENT ON COLUMN public.cards.print_master IS 'Maestro de impresión sin recomprimir (produccion/cartas/{nn}-{slug}.webp)';
COMMENT ON COLUMN public.cards.ovr          IS 'Media global de la carta, tal como aparece impresa en el arte';
COMMENT ON COLUMN public.cards.stats        IS 'Seis estadísticas de la carta: vel, ace, man, pot, est, rar';


-- ============================================================================
-- 2. CARGA DEL ARTE Y LAS ESTADÍSTICAS DE LAS 15 CARTAS
--    (los valores están calcados del arte; fuente única en api/cartas.js)
-- ============================================================================
WITH arte (n, url, maestro, ovr, stats) AS (
    VALUES
        ('01', 'images/cartas/01-r34.webp',     'produccion/cartas/01-r34.webp',     93, '{"vel":92,"ace":90,"man":88,"pot":94,"est":95,"rar":93}'::jsonb),
        ('02', 'images/cartas/02-r32.webp',     'produccion/cartas/02-r32.webp',     92, '{"vel":91,"ace":88,"man":86,"pot":93,"est":90,"rar":94}'::jsonb),
        ('03', 'images/cartas/03-350z.webp',    'produccion/cartas/03-350z.webp',    89, '{"vel":88,"ace":87,"man":90,"pot":89,"est":93,"rar":88}'::jsonb),
        ('04', 'images/cartas/04-supra.webp',   'produccion/cartas/04-supra.webp',   94, '{"vel":93,"ace":90,"man":88,"pot":95,"est":96,"rar":94}'::jsonb),
        ('05', 'images/cartas/05-ae86.webp',    'produccion/cartas/05-ae86.webp',    88, '{"vel":82,"ace":85,"man":94,"pot":80,"est":92,"rar":90}'::jsonb),
        ('06', 'images/cartas/06-mr2.webp',     'produccion/cartas/06-mr2.webp',     86, '{"vel":84,"ace":83,"man":92,"pot":82,"est":90,"rar":87}'::jsonb),
        ('07', 'images/cartas/07-rx7.webp',     'produccion/cartas/07-rx7.webp',     90, '{"vel":90,"ace":88,"man":91,"pot":87,"est":94,"rar":91}'::jsonb),
        ('08', 'images/cartas/08-nsx.webp',     'produccion/cartas/08-nsx.webp',     91, '{"vel":90,"ace":87,"man":93,"pot":88,"est":91,"rar":92}'::jsonb),
        ('09', 'images/cartas/09-civic.webp',   'produccion/cartas/09-civic.webp',   87, '{"vel":84,"ace":86,"man":90,"pot":83,"est":88,"rar":89}'::jsonb),
        ('10', 'images/cartas/10-s2000.webp',   'produccion/cartas/10-s2000.webp',   88, '{"vel":86,"ace":87,"man":91,"pot":85,"est":89,"rar":88}'::jsonb),
        ('11', 'images/cartas/11-evo.webp',     'produccion/cartas/11-evo.webp',     89, '{"vel":87,"ace":89,"man":90,"pot":90,"est":88,"rar":89}'::jsonb),
        ('12', 'images/cartas/12-eclipse.webp', 'produccion/cartas/12-eclipse.webp', 88, '{"vel":86,"ace":85,"man":88,"pot":86,"est":95,"rar":93}'::jsonb),
        ('13', 'images/cartas/13-3000gt.webp',  'produccion/cartas/13-3000gt.webp',  87, '{"vel":85,"ace":84,"man":87,"pot":88,"est":89,"rar":86}'::jsonb),
        ('14', 'images/cartas/14-wrc.webp',     'produccion/cartas/14-wrc.webp',     90, '{"vel":88,"ace":90,"man":92,"pot":89,"est":90,"rar":94}'::jsonb),
        ('15', 'images/cartas/15-lfa.webp',     'produccion/cartas/15-lfa.webp',     96, '{"vel":96,"ace":94,"man":92,"pot":97,"est":98,"rar":96}'::jsonb)
)
UPDATE public.cards c
SET image_path   = a.url,
    print_master = a.maestro,
    ovr          = a.ovr,
    stats        = a.stats
FROM arte a
WHERE c.car_id = a.n
  AND c.is_gold = FALSE;   -- la carta Gold Chrome reutilizará este arte hasta tener el suyo


-- ============================================================================
-- 3. EL CATÁLOGO DE COCHES APUNTA A SU CARTA (columna images JSONB)
-- ============================================================================
UPDATE public.cars c
SET images = c.images || jsonb_build_object(
        'card',       'images/cartas/' || c.number || '-' || c.slug || '.webp',
        'card_print', 'produccion/cartas/' || c.number || '-' || c.slug || '.webp'
    )
WHERE c.active = TRUE;


-- ============================================================================
-- 4. CATÁLOGO DE LIENZOS PRINT-ON-DEMAND (Printify)
--    Una lámina por modelo y arte: delantera (front), trasera (rear) y carta.
--    45 productos, DESACTIVADOS hasta que existan en Printify y tengan precio final.
-- ============================================================================
INSERT INTO public.products (id, slug, name, description, product_type, price, currency, active, metadata)
SELECT
    'lienzo-' || c.slug || '-' || a.nombre,
    'lienzo-' || c.slug || '-' || a.nombre,
    'Lienzo ' || a.etiqueta || ' · ' || c.name,
    'Lienzo print-on-demand (Printify) con el arte «' || a.etiqueta || '» del modelo ' || c.name
        || ' (' || c.real_model || ', ' || c.year || ').',
    'merch',
    a.precio,
    'EUR',
    FALSE,
    jsonb_build_object(
        'proveedor',  'printify',
        'arte',       a.nombre,
        'etiqueta',   a.etiqueta,
        'car_id',     c.id,
        'slug',       c.slug,
        'imagen',     CASE WHEN a.nombre = 'carta'
                           THEN 'images/cartas/' || c.number || '-' || c.slug || '.webp'
                           ELSE 'images/' || c.slug || '-' || CASE WHEN a.nombre = 'delantera' THEN 'front' ELSE 'rear' END || '.webp'
                      END,
        'maestro_impresion', CASE WHEN a.nombre = 'carta'
                           THEN 'produccion/cartas/' || c.number || '-' || c.slug || '.webp'
                           ELSE 'public/images/' || c.slug || '-' || CASE WHEN a.nombre = 'delantera' THEN 'front' ELSE 'rear' END || '.webp'
                      END,
        'medidas_cm', jsonb_build_array(20, 30),
        'dpi_minimo', 150,
        'nota_dpi',   'Maestro 1280x1792 px: 20x30 cm a ~163 DPI. Para 30x40 cm hay que reescalar a 300 DPI.'
    )
FROM public.cars c
CROSS JOIN (VALUES
        ('delantera', 'Delantera', 39.90),
        ('trasera',   'Trasera',   39.90),
        ('carta',     'Carta',     44.90)
    ) AS a (nombre, etiqueta, precio)
WHERE c.active = TRUE
ON CONFLICT (id) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    price       = EXCLUDED.price,
    metadata    = EXCLUDED.metadata;


-- ============================================================================
-- 5. COMPROBACIÓN RÁPIDA (debe devolver 15 cartas y 45 lienzos)
-- ============================================================================
-- SELECT COUNT(*) AS cartas_con_arte FROM public.cards WHERE image_path IS NOT NULL;
-- SELECT COUNT(*) AS lienzos         FROM public.products WHERE product_type = 'merch' AND id LIKE 'lienzo-%';

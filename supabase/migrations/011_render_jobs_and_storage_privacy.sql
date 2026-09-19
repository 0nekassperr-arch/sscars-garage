-- ============================================================================
-- SSCARS GARAGE 2.0 — MIGRACIÓN 011: RENDER JOBS Y PRIVACIDAD DE STORAGE
-- Versión: 2.4.0
-- ============================================================================

-- ============================================================================
-- 1. TABLA: render_jobs (Pipeline y Gestión de Trabajos de Render)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.render_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID REFERENCES public.build_snapshots(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(32) DEFAULT 'pending' NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    renderer_provider VARCHAR(64) DEFAULT 'mock' NOT NULL,
    renderer_version VARCHAR(32) DEFAULT '1.0.0' NOT NULL,
    render_key VARCHAR(128) NOT NULL,
    storage_path TEXT NOT NULL,
    width INTEGER DEFAULT 2048 NOT NULL,
    height INTEGER DEFAULT 2048 NOT NULL,
    mime_type VARCHAR(64) DEFAULT 'image/png' NOT NULL,
    render_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    error_code VARCHAR(64),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_render_job_idempotency UNIQUE (snapshot_id, renderer_provider, renderer_version, render_key)
);

CREATE INDEX IF NOT EXISTS idx_render_jobs_user ON public.render_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_snapshot ON public.render_jobs(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_status ON public.render_jobs(status);

-- ============================================================================
-- 2. POLÍTICAS RLS EN render_jobs
-- ============================================================================

ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "render_jobs_select_own" 
    ON public.render_jobs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "render_jobs_service_role_all" 
    ON public.render_jobs FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 3. AJUSTE DE PRIVACIDAD EN STORAGE BUCKET build-renders
-- ============================================================================

-- Actualizar bucket a privado para aislamiento por usuario
UPDATE storage.buckets 
SET public = false 
WHERE id = 'build-renders';

DROP POLICY IF EXISTS "Public Read Build Renders" ON storage.objects;
DROP POLICY IF EXISTS "User Read Own Build Renders" ON storage.objects;
DROP POLICY IF EXISTS "User Upload Own Build Renders" ON storage.objects;

-- Política de lectura: Usuario solo lee sus propios renders
CREATE POLICY "User Read Own Build Renders" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'build-renders' AND (auth.uid()::text = (storage.foldername(name))[1]));

-- Política de escritura: Exclusiva de service_role (renderers autorizados)
CREATE POLICY "Service Role Upload Build Renders" 
    ON storage.objects FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 4. PROCEDIMIENTO ATÓMICO: SOLICITAR / EJECUTAR RENDER DE SNAPSHOT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.request_build_render_atomic(
    p_snapshot_id UUID,
    p_provider VARCHAR DEFAULT 'mock',
    p_version VARCHAR DEFAULT '1.0.0'
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_snapshot RECORD;
    v_car RECORD;
    v_render_key VARCHAR(128);
    v_storage_path TEXT;
    v_existing_job RECORD;
    v_created_job RECORD;
    v_meta JSONB;
BEGIN
    -- 1. Validar autenticación
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Operación denegada: usuario no autenticado.';
    END IF;

    -- 2. Validar que el snapshot existe y pertenece al usuario
    SELECT * INTO v_snapshot 
    FROM public.build_snapshots 
    WHERE id = p_snapshot_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Snapshot no encontrado o no pertenece a tu cuenta.';
    END IF;

    SELECT * INTO v_car FROM public.cars WHERE id = v_snapshot.car_id;

    -- 3. Generar render_key determinista (hash de snapshot_id + snapshot_version + build_data canónico)
    v_render_key := md5(
        p_snapshot_id::text || '_' || 
        v_snapshot.snapshot_version::text || '_' || 
        v_snapshot.build_data::text || '_' || 
        p_provider || '_' || 
        p_version
    );

    -- 4. Generar storage_path determinista y seguro (sin nombres de usuario manipulables)
    v_storage_path := 'build-renders/' || v_user_id::text || '/' || p_snapshot_id::text || '/' || p_version || '/render.png';

    -- 5. Idempotencia: Si ya existe un trabajo completado o en proceso con esta misma clave
    SELECT * INTO v_existing_job 
    FROM public.render_jobs 
    WHERE snapshot_id = p_snapshot_id 
      AND renderer_provider = p_provider 
      AND renderer_version = p_version 
      AND render_key = v_render_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_cached', true,
            'job', row_to_json(v_existing_job)
        );
    END IF;

    -- 6. Construir metadatos canónicos del render
    v_meta := jsonb_build_object(
        'car_name', v_car.name,
        'real_model', v_car.real_model,
        'build_name', v_snapshot.build_data->>'build_name',
        'parts', v_snapshot.build_data->'parts',
        'stats', v_snapshot.stats,
        'rendered_at', NOW()
    );

    -- 7. Insertar nuevo trabajo de render (para MockRenderer se completa determinísticamente de inmediato)
    INSERT INTO public.render_jobs (
        snapshot_id,
        user_id,
        status,
        renderer_provider,
        renderer_version,
        render_key,
        storage_path,
        width,
        height,
        mime_type,
        render_metadata,
        started_at,
        completed_at
    )
    VALUES (
        p_snapshot_id,
        v_user_id,
        'completed',
        p_provider,
        p_version,
        v_render_key,
        v_storage_path,
        2048,
        2048,
        'image/png',
        v_meta,
        NOW(),
        NOW()
    )
    RETURNING * INTO v_created_job;

    RETURN jsonb_build_object(
        'success', true,
        'is_cached', false,
        'job', row_to_json(v_created_job)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.request_build_render_atomic(UUID, VARCHAR, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_build_render_atomic(UUID, VARCHAR, VARCHAR) TO authenticated, service_role;

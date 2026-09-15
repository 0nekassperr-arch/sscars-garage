-- ============================================================================
-- SSCARS GARAGE 2.0 — MIGRACIÓN 003: CONFIGURACIÓN DE STORAGE BUCKETS
-- Versión: 2.0.0
-- ============================================================================

-- Inserción de buckets en el esquema storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('car-card-renders', 'car-card-renders', true, 10485760, ARRAY['image/webp', 'image/png', 'image/jpeg']),
    ('build-renders', 'build-renders', true, 10485760, ARRAY['image/webp', 'image/png', 'image/jpeg']),
    ('user-assets', 'user-assets', false, 15728640, ARRAY['image/webp', 'image/png', 'image/jpeg', 'application/json', 'model/gltf-binary'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de seguridad para storage.objects
CREATE POLICY "Public Read Car Cards" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'car-card-renders');

CREATE POLICY "Public Read Build Renders" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'build-renders');

CREATE POLICY "User Read Own Assets" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'user-assets' AND (auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "User Upload Own Assets" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'user-assets' AND (auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "Service Role Upload All Storage" 
    ON storage.objects FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

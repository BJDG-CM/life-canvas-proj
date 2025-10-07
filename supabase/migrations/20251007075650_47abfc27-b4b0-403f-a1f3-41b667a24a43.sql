-- Enable pgsodium extension for encryption (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Create a new encrypted column for access tokens
-- Using pgsodium's transparent column encryption
ALTER TABLE public.service_integrations 
ADD COLUMN IF NOT EXISTS access_token_encrypted bytea;

-- Create a view that handles encryption/decryption transparently
CREATE OR REPLACE VIEW public.service_integrations_decrypted 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  service_name,
  is_active,
  created_at,
  updated_at,
  CASE 
    WHEN access_token_encrypted IS NOT NULL 
    THEN convert_from(
      pgsodium.crypto_aead_det_decrypt(
        access_token_encrypted,
        convert_to('service_integrations_secret', 'utf8'),
        user_id::text::bytea
      ),
      'utf8'
    )
    ELSE access_token
  END as access_token
FROM public.service_integrations;

-- Create a function to handle inserts with encryption
CREATE OR REPLACE FUNCTION public.insert_service_integration(
  p_user_id uuid,
  p_service_name text,
  p_is_active boolean,
  p_access_token text DEFAULT NULL
)
RETURNS TABLE(id bigint, user_id uuid, service_name text, is_active boolean, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_encrypted bytea;
  v_id bigint;
BEGIN
  -- Encrypt the access token if provided
  IF p_access_token IS NOT NULL THEN
    v_encrypted := pgsodium.crypto_aead_det_encrypt(
      convert_to(p_access_token, 'utf8'),
      convert_to('service_integrations_secret', 'utf8'),
      p_user_id::text::bytea
    );
  END IF;

  -- Insert or update the integration
  INSERT INTO public.service_integrations (user_id, service_name, is_active, access_token_encrypted, access_token)
  VALUES (p_user_id, p_service_name, p_is_active, v_encrypted, NULL)
  ON CONFLICT (user_id, service_name) 
  DO UPDATE SET 
    is_active = EXCLUDED.is_active,
    access_token_encrypted = EXCLUDED.access_token_encrypted,
    access_token = NULL,
    updated_at = now()
  RETURNING service_integrations.id, service_integrations.user_id, service_integrations.service_name, 
            service_integrations.is_active, service_integrations.created_at, service_integrations.updated_at
  INTO v_id, p_user_id, p_service_name, p_is_active, created_at, updated_at;

  RETURN QUERY SELECT v_id, p_user_id, p_service_name, p_is_active, created_at, updated_at;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.service_integrations_decrypted TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_service_integration TO authenticated;

-- Add comment explaining the security measure
COMMENT ON COLUMN public.service_integrations.access_token_encrypted IS 'Encrypted access tokens using pgsodium deterministic encryption';
COMMENT ON FUNCTION public.insert_service_integration IS 'Securely handles service integration upserts with token encryption';
COMMENT ON VIEW public.service_integrations_decrypted IS 'Provides transparent decryption of access tokens for authorized users';

-- Migrate existing plain text tokens to encrypted format (if any exist)
DO $$
DECLARE
  r RECORD;
  v_encrypted bytea;
BEGIN
  FOR r IN SELECT id, user_id, access_token FROM public.service_integrations WHERE access_token IS NOT NULL
  LOOP
    v_encrypted := pgsodium.crypto_aead_det_encrypt(
      convert_to(r.access_token, 'utf8'),
      convert_to('service_integrations_secret', 'utf8'),
      r.user_id::text::bytea
    );
    
    UPDATE public.service_integrations 
    SET access_token_encrypted = v_encrypted,
        access_token = NULL
    WHERE id = r.id;
  END LOOP;
END $$;

-- Drop the old plain text column (after migration)
-- Commented out for safety - uncomment after verifying migration
-- ALTER TABLE public.service_integrations DROP COLUMN IF EXISTS access_token;
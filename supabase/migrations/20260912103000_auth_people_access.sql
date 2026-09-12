ALTER TABLE public.individual_contacts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS individual_contacts_user_id_idx
  ON public.individual_contacts(user_id);

DROP VIEW IF EXISTS public.individual_contact_map;

CREATE VIEW public.individual_contact_map AS
  SELECT id, display_name, latitude, longitude
  FROM public.individual_contacts
  WHERE is_available = true
    AND share_location = true
    AND user_id IS NOT NULL;

GRANT SELECT ON public.individual_contact_map TO authenticated;
REVOKE ALL ON public.individual_contact_map FROM anon;

DROP POLICY IF EXISTS "Authenticated users can read opted-in nearby contacts" ON public.individual_contacts;
DROP POLICY IF EXISTS "Users can manage their own contact" ON public.individual_contacts;

CREATE POLICY "Authenticated users can read opted-in contacts"
  ON public.individual_contacts
  FOR SELECT
  TO authenticated
  USING (is_available = true AND share_location = true AND user_id IS NOT NULL);

CREATE POLICY "Users can manage their own contact"
  ON public.individual_contacts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

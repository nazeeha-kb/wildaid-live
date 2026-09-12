DROP VIEW IF EXISTS public.individual_contact_map;

CREATE VIEW public.individual_contact_map AS
  SELECT id, display_name, latitude, longitude
  FROM public.individual_contacts
  WHERE is_available = true
    AND share_location = true;

GRANT SELECT ON public.individual_contact_map TO anon, authenticated;

DROP POLICY IF EXISTS "Authenticated users can read opted-in contacts" ON public.individual_contacts;

CREATE POLICY "Anyone can read opted-in contacts"
  ON public.individual_contacts
  FOR SELECT
  TO anon, authenticated
  USING (is_available = true AND share_location = true);

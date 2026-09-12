DROP VIEW IF EXISTS public.individual_contact_map;

CREATE VIEW public.individual_contact_map AS
  SELECT id, display_name, user_id, latitude, longitude
  FROM public.individual_contacts
  WHERE is_available = true
    AND share_location = true;

GRANT SELECT ON public.individual_contact_map TO anon, authenticated;
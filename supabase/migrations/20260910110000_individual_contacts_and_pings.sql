CREATE TABLE public.individual_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  share_location BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.assistance_pings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES public.individual_contacts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE VIEW public.individual_contact_map AS
  SELECT id, display_name, latitude, longitude
  FROM public.individual_contacts
  WHERE is_available = true AND share_location = true;

ALTER TABLE public.individual_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistance_pings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.individual_contact_map TO anon, authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assistance_pings;

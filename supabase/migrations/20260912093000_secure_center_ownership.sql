ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS work_email TEXT,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.centers
  ADD CONSTRAINT centers_work_email_domain_check CHECK (
    work_email IS NULL OR work_email !~* '@(gmail|yahoo|outlook|hotmail|icloud|protonmail)\\.'
  );

DROP POLICY IF EXISTS "Anyone can update statuses" ON public.center_species_status;
CREATE POLICY "Verified center owners can update statuses"
  ON public.center_species_status FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.centers WHERE id = center_id AND owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.centers WHERE id = center_id AND owner_user_id = auth.uid()));

CREATE POLICY "Verified center owners can claim their center"
  ON public.centers FOR UPDATE TO authenticated
  USING (owner_user_id IS NULL OR owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS centers_coordinates_idx ON public.centers (latitude, longitude);

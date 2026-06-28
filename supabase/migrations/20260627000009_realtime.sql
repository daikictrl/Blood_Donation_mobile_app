-- Configure Supabase Realtime publication

DO $$
BEGIN
  -- Add public.blood_requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'blood_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_requests;
  END IF;

  -- Add public.donor_applications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'donor_applications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.donor_applications;
  END IF;

  -- Add public.appointments
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;

  -- Add public.blood_inventory
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'blood_inventory'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_inventory;
  END IF;
END $$;

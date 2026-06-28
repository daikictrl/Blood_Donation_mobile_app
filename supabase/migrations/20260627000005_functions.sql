-- Create PostgreSQL functions and procedures

-- Shared trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dynamic eligibility function (computed field for PostgREST on donors)
CREATE OR REPLACE FUNCTION public.is_eligible(donor_row public.donors)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM age(CURRENT_DATE, donor_row.date_of_birth)) >= 21
     AND donor_row.weight >= 100
     AND donor_row.health_declaration = TRUE
     AND (
       donor_row.last_donation_date IS NULL
       OR (CURRENT_DATE - donor_row.last_donation_date) >= 30
     );
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger function for new user signups (inserts to public.profiles only)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_str TEXT;
  user_role_val public.user_role;
BEGIN
  user_role_str := new.raw_user_meta_data->>'role';
  
  IF user_role_str = 'hospital' THEN
    user_role_val := 'hospital'::public.user_role;
  ELSE
    user_role_val := 'donor'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, role)
  VALUES (new.id, user_role_val);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to validate donor application status updates
CREATE OR REPLACE FUNCTION public.validate_application_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If donor is updating, check status change
  IF auth.uid() = OLD.donor_id THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Donors cannot change application status';
    END IF;
  END IF;
  
  -- Check hospital ownership
  IF EXISTS (
    SELECT 1 FROM public.blood_requests br 
    WHERE br.id = OLD.request_id 
    AND br.hospital_id = auth.uid()
  ) THEN
    RETURN NEW;
  END IF;

  -- Allow donor to update their own fields (like message) if it's not a status change
  IF auth.uid() = OLD.donor_id THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Unauthorized to update this application';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

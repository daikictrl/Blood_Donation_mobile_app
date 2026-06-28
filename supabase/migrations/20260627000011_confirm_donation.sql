-- Create RPC function confirm_donation to atomically complete a donation and update inventory/history/eligibility
CREATE OR REPLACE FUNCTION public.confirm_donation(
  p_appointment_id UUID,
  p_donor_id UUID,
  p_hospital_id UUID,
  p_blood_group TEXT,
  p_units_donated INTEGER,
  p_donation_date DATE,
  p_notes TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Check permissions (must be authenticated, and must be the hospital in the appointment)
  IF auth.uid() IS NULL OR auth.uid() <> p_hospital_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only confirm donations for your own hospital appointments.';
  END IF;

  -- 2. Validate appointment details
  IF NOT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = p_appointment_id
      AND hospital_id = p_hospital_id
      AND donor_id = p_donor_id
      AND status = 'scheduled'::public.appointment_status
  ) THEN
    RAISE EXCEPTION 'Invalid appointment or appointment is not scheduled.';
  END IF;

  -- 3. Update appointments status to completed
  UPDATE public.appointments
  SET status = 'completed'::public.appointment_status,
      updated_at = NOW()
  WHERE id = p_appointment_id;

  -- 4. Insert into donation_history
  INSERT INTO public.donation_history (
    donor_id,
    hospital_id,
    appointment_id,
    blood_group,
    units_donated,
    donation_date,
    notes
  ) VALUES (
    p_donor_id,
    p_hospital_id,
    p_appointment_id,
    p_blood_group::public.blood_group,
    p_units_donated,
    p_donation_date,
    p_notes
  );

  -- 5. Upsert into blood_inventory
  INSERT INTO public.blood_inventory (
    hospital_id,
    blood_group,
    units_available,
    last_updated
  ) VALUES (
    p_hospital_id,
    p_blood_group::public.blood_group,
    p_units_donated,
    NOW()
  )
  ON CONFLICT (hospital_id, blood_group) DO UPDATE
  SET units_available = public.blood_inventory.units_available + p_units_donated,
      last_updated = NOW();

  -- 6. Update donor last donation date
  UPDATE public.donors
  SET last_donation_date = p_donation_date,
      updated_at = NOW()
  WHERE id = p_donor_id;

  RETURN TRUE;
END;
$$;

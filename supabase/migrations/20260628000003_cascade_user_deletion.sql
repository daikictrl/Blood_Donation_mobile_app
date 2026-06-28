-- Drop existing foreign keys that block deletion of donors or hospitals
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_donor_id_fkey,
  DROP CONSTRAINT IF EXISTS appointments_hospital_id_fkey;

ALTER TABLE public.donation_history
  DROP CONSTRAINT IF EXISTS donation_history_donor_id_fkey,
  DROP CONSTRAINT IF EXISTS donation_history_hospital_id_fkey;

-- Re-create the foreign keys with ON DELETE CASCADE
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_donor_id_fkey 
    FOREIGN KEY (donor_id) REFERENCES public.donors(id) ON DELETE CASCADE,
  ADD CONSTRAINT appointments_hospital_id_fkey 
    FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;

ALTER TABLE public.donation_history
  ADD CONSTRAINT donation_history_donor_id_fkey 
    FOREIGN KEY (donor_id) REFERENCES public.donors(id) ON DELETE CASCADE,
  ADD CONSTRAINT donation_history_hospital_id_fkey 
    FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;

-- Enable Row Level Security and define security policies for all tables

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expo_push_tokens ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Allow users to read their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- 2. Donors Policies
CREATE POLICY "Allow donors to read own profile or hospitals with applications" ON public.donors
  FOR SELECT TO authenticated 
  USING (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM public.donor_applications da 
      JOIN public.blood_requests br ON da.request_id = br.id 
      WHERE da.donor_id = donors.id AND br.hospital_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to insert their own donor record" ON public.donors
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow donors to update own profile" ON public.donors
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 3. Hospitals Policies
CREATE POLICY "Allow authenticated users to read hospital profiles" ON public.hospitals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow users to insert their own hospital record" ON public.hospitals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow hospitals to update own profile" ON public.hospitals
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 4. Blood Requests Policies
CREATE POLICY "Allow authenticated users to read blood requests" ON public.blood_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow hospitals to insert own blood requests" ON public.blood_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = hospital_id);

CREATE POLICY "Allow hospitals to update own blood requests" ON public.blood_requests
  FOR UPDATE TO authenticated USING (auth.uid() = hospital_id);

-- 5. Donor Applications Policies
CREATE POLICY "Allow users to read relevant donor applications" ON public.donor_applications
  FOR SELECT TO authenticated 
  USING (
    auth.uid() = donor_id 
    OR EXISTS (
      SELECT 1 FROM public.blood_requests br 
      WHERE br.id = request_id AND br.hospital_id = auth.uid()
    )
  );

CREATE POLICY "Allow donors to insert own applications" ON public.donor_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = donor_id);

CREATE POLICY "Allow relevant users to update donor applications" ON public.donor_applications
  FOR UPDATE TO authenticated 
  USING (
    auth.uid() = donor_id 
    OR EXISTS (
      SELECT 1 FROM public.blood_requests br 
      WHERE br.id = request_id AND br.hospital_id = auth.uid()
    )
  );

-- 6. Appointments Policies
CREATE POLICY "Allow relevant users to read appointments" ON public.appointments
  FOR SELECT TO authenticated USING (auth.uid() = donor_id OR auth.uid() = hospital_id);

CREATE POLICY "Allow hospitals to insert appointments" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = hospital_id);

CREATE POLICY "Allow hospitals to update appointments" ON public.appointments
  FOR UPDATE TO authenticated USING (auth.uid() = hospital_id);

-- 7. Donation History Policies
CREATE POLICY "Allow relevant users to read donation history" ON public.donation_history
  FOR SELECT TO authenticated USING (auth.uid() = donor_id OR auth.uid() = hospital_id);

CREATE POLICY "Allow hospitals to insert donation history" ON public.donation_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = hospital_id);

-- 8. Blood Inventory Policies
CREATE POLICY "Allow hospitals to read own inventory" ON public.blood_inventory
  FOR SELECT TO authenticated USING (auth.uid() = hospital_id);

CREATE POLICY "Allow hospitals to manage own inventory" ON public.blood_inventory
  FOR ALL TO authenticated USING (auth.uid() = hospital_id);

-- 9. Notifications Policies
CREATE POLICY "Allow users to read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 10. Expo Push Tokens Policies
CREATE POLICY "Allow users to read own push tokens" ON public.expo_push_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage own push tokens" ON public.expo_push_tokens
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Allow hospitals to delete their own blood requests
CREATE POLICY "Allow hospitals to delete own blood requests" ON public.blood_requests
  FOR DELETE TO authenticated USING (auth.uid() = hospital_id);

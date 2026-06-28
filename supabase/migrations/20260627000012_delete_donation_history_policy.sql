-- Allow donors to delete their own donation history records
CREATE POLICY "Allow donors to delete own donation history" ON public.donation_history
  FOR DELETE TO authenticated USING (auth.uid() = donor_id);

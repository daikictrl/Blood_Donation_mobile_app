-- Allow hospitals to delete donor applications linked to their own blood requests
CREATE POLICY "Allow hospitals to delete relevant donor applications" ON public.donor_applications
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.blood_requests br
      WHERE br.id = request_id AND br.hospital_id = auth.uid()
    )
  );

-- Provision storage buckets and define their security policies

-- Insert buckets if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars access rules
CREATE POLICY "Allow public read of avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Allow owners to manage avatars" ON storage.objects
  FOR ALL TO authenticated 
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Logos access rules
CREATE POLICY "Allow public read of logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "Allow owners to manage logos" ON storage.objects
  FOR ALL TO authenticated 
  USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

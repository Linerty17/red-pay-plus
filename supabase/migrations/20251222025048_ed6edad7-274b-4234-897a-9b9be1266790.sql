-- Add RLS policies for payment proof uploads in profile-images bucket
CREATE POLICY "Users can upload payment proofs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'payments'
);

CREATE POLICY "Users can view payment proofs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'profile-images'
  AND (storage.foldername(name))[1] = 'payments'
);

CREATE POLICY "Users can update their payment proofs"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'profile-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'payments'
);
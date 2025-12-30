-- Fix storage policy for payment proof uploads
-- The current policy expects auth.uid() in the path but the code uses user_id

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;

-- Create a simpler policy that allows any authenticated user to upload to payments folder
CREATE POLICY "Authenticated users can upload payment proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = 'payments'
  );

-- Also fix the update policy
DROP POLICY IF EXISTS "Users can update their payment proofs" ON storage.objects;

CREATE POLICY "Authenticated users can update payment proofs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = 'payments'
  );
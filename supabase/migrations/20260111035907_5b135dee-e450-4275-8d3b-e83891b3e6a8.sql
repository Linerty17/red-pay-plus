-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can view whitelisted settings" ON settings;

-- Create updated policy that includes activation_link
CREATE POLICY "Authenticated users can view whitelisted settings" 
ON settings 
FOR SELECT 
USING (key = ANY (ARRAY['payment_amount'::text, 'account_number'::text, 'bank_name'::text, 'account_name'::text, 'video_link'::text, 'activation_link'::text]));
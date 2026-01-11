-- Add policy allowing users to acknowledge their own payment status
CREATE POLICY "Users can acknowledge their own purchase status"
ON public.rpc_purchases
FOR UPDATE
USING (user_id IN (SELECT users.user_id FROM users WHERE users.auth_user_id = auth.uid()))
WITH CHECK (user_id IN (SELECT users.user_id FROM users WHERE users.auth_user_id = auth.uid()));
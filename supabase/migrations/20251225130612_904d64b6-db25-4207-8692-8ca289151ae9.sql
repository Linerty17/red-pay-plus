-- Add policy for admins to update users (for banning/unbanning)
CREATE POLICY "Admins can update users"
ON public.users
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
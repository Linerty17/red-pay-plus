-- Allow admins to update settings
CREATE POLICY "Admins can update settings" 
ON public.settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert settings
CREATE POLICY "Admins can insert settings" 
ON public.settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to upsert settings (for ON CONFLICT)
CREATE POLICY "Admins can delete settings" 
ON public.settings 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));
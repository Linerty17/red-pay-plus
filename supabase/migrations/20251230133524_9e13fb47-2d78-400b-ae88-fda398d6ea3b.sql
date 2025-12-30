-- Create private_settings table for sensitive configuration
CREATE TABLE IF NOT EXISTS public.private_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.private_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view private settings
CREATE POLICY "Admins can view private settings" 
ON public.private_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert private settings
CREATE POLICY "Admins can insert private settings" 
ON public.private_settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update private settings
CREATE POLICY "Admins can update private settings" 
ON public.private_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete private settings
CREATE POLICY "Admins can delete private settings" 
ON public.private_settings 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate sensitive settings from settings to private_settings
INSERT INTO public.private_settings (key, value)
SELECT key, value FROM public.settings 
WHERE key IN ('moniepoint_account_number', 'moniepoint_account_name', 'bank_name', 'rpc_access_code', 'rpc_code', 'admin_pin')
ON CONFLICT (key) DO NOTHING;

-- Remove sensitive settings from the public settings table
DELETE FROM public.settings 
WHERE key IN ('moniepoint_account_number', 'moniepoint_account_name', 'bank_name', 'rpc_access_code', 'rpc_code', 'admin_pin');

-- Create audit trigger for private_settings
CREATE OR REPLACE FUNCTION public.log_private_settings_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.settings_audit (setting_key, old_value, new_value, changed_by)
  VALUES (
    COALESCE(NEW.key, OLD.key),
    OLD.value,
    NEW.value,
    COALESCE(auth.uid()::TEXT, 'service_role')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on private_settings table
DROP TRIGGER IF EXISTS private_settings_audit_trigger ON public.private_settings;
CREATE TRIGGER private_settings_audit_trigger
AFTER UPDATE ON public.private_settings
FOR EACH ROW
EXECUTE FUNCTION public.log_private_settings_change();
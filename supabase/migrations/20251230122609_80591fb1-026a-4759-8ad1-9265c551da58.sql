-- Create audit table for settings changes
CREATE TABLE IF NOT EXISTS public.settings_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by TEXT,
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.settings_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view settings audit" 
ON public.settings_audit 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger function to log settings changes
CREATE OR REPLACE FUNCTION public.log_settings_change()
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

-- Create trigger on settings table
DROP TRIGGER IF EXISTS settings_audit_trigger ON public.settings;
CREATE TRIGGER settings_audit_trigger
AFTER UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.log_settings_change();
-- Fix search_path for the update_support_request_updated_at function
CREATE OR REPLACE FUNCTION public.update_support_request_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
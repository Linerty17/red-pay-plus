-- Update the auto_assign_admin_role function with new admin email
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if the user email matches admin email
  IF NEW.email = 'sundaychinemerem266@gmail.com' THEN
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;
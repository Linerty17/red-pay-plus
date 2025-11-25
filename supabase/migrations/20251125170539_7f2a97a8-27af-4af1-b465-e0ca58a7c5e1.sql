
-- Create trigger to auto-assign admin role to specific email
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user email matches admin email
  IF NEW.email = 'sundaychinemerem66@gmail.com' THEN
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();

COMMENT ON FUNCTION public.auto_assign_admin_role() IS 'Automatically assigns admin role to sundaychinemerem66@gmail.com on signup';

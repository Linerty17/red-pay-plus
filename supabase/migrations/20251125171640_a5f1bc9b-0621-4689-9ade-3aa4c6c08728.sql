
-- First, ensure the auth user exists and update admin info
-- This will be executed by Supabase with proper permissions

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if auth user exists for this email
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'sundaychinemerem66@gmail.com';
  
  -- If user exists, ensure they have confirmed email
  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users 
    SET 
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = jsonb_build_object('is_admin', true)
    WHERE id = v_user_id;
    
    -- Ensure admin role is assigned
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin user updated: %', v_user_id;
  ELSE
    RAISE NOTICE 'No auth user found for sundaychinemerem66@gmail.com';
  END IF;
END $$;

-- Ensure the trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;

CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();

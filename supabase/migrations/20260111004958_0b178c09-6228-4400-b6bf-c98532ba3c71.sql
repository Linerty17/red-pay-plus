-- Create a security definer function to fetch users for admins
-- This bypasses RLS while still checking admin role
CREATE OR REPLACE FUNCTION public.admin_get_users(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id text,
  first_name text,
  last_name text,
  email text,
  phone text,
  country text,
  balance integer,
  referral_code text,
  referral_count integer,
  rpc_code text,
  rpc_purchased boolean,
  status text,
  created_at timestamptz,
  ban_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_search IS NOT NULL AND p_search != '' THEN
    RETURN QUERY
    SELECT 
      u.id, u.user_id, u.first_name, u.last_name, u.email, u.phone,
      u.country, u.balance, u.referral_code, u.referral_count,
      u.rpc_code, u.rpc_purchased, u.status, u.created_at, u.ban_reason
    FROM users u
    WHERE 
      u.first_name ILIKE '%' || p_search || '%' OR
      u.last_name ILIKE '%' || p_search || '%' OR
      u.email ILIKE '%' || p_search || '%' OR
      u.user_id ILIKE '%' || p_search || '%' OR
      u.phone ILIKE '%' || p_search || '%' OR
      u.rpc_code ILIKE '%' || p_search || '%'
    ORDER BY u.created_at DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT 
      u.id, u.user_id, u.first_name, u.last_name, u.email, u.phone,
      u.country, u.balance, u.referral_code, u.referral_count,
      u.rpc_code, u.rpc_purchased, u.status, u.created_at, u.ban_reason
    FROM users u
    ORDER BY u.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$;

-- Create function to get referrals for admins
CREATE OR REPLACE FUNCTION public.admin_get_referrals(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  referrer_id text,
  new_user_id text,
  status text,
  amount_given integer,
  created_at timestamptz,
  manual_credit_notes text,
  referrer_email text,
  new_user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    r.id, r.referrer_id, r.new_user_id, r.status, r.amount_given,
    r.created_at, r.manual_credit_notes,
    ref_user.email as referrer_email,
    new_user.email as new_user_email
  FROM referrals r
  LEFT JOIN users ref_user ON ref_user.user_id = r.referrer_id
  LEFT JOIN users new_user ON new_user.user_id = r.new_user_id
  WHERE (p_status IS NULL OR p_status = 'all' OR r.status = p_status)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
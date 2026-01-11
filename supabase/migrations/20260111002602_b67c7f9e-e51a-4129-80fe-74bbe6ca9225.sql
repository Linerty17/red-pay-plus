-- Create a security definer function to get leaderboard data
-- This allows users to see leaderboard rankings without having direct access to other users' data
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id text,
  first_name text,
  last_name text,
  referral_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.user_id,
    u.first_name,
    u.last_name,
    u.referral_count
  FROM users u
  WHERE u.referral_count > 0
  ORDER BY u.referral_count DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;
-- Create a security definer function to get time-filtered leaderboard data
CREATE OR REPLACE FUNCTION public.get_leaderboard_filtered(date_from timestamptz)
RETURNS TABLE (
  user_id text,
  first_name text,
  last_name text,
  referral_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.referrer_id as user_id,
    u.first_name,
    u.last_name,
    COUNT(*)::bigint as referral_count
  FROM referrals r
  JOIN users u ON u.user_id = r.referrer_id
  WHERE r.created_at >= date_from
    AND r.status = 'confirmed'
  GROUP BY r.referrer_id, u.first_name, u.last_name
  ORDER BY referral_count DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_leaderboard_filtered(timestamptz) TO authenticated;
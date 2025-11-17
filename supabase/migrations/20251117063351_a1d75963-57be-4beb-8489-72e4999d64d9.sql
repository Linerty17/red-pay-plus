-- Add constraints to prevent duplicate and self-referrals
-- Unique constraint: one referral per new user
alter table public.referrals 
add constraint referrals_new_user_id_unique unique (new_user_id);

-- Check constraint: prevent self-referral
alter table public.referrals
add constraint referrals_no_self_referral 
check (referrer_id != new_user_id);

-- Grant necessary permissions for trigger to work
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
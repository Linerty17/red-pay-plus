-- Referral reward trigger: credit referrer and add transaction on insert
create or replace function public.handle_new_referral()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before integer;
  v_after integer;
begin
  -- Lock row to avoid race conditions and read current balance
  select coalesce(balance, 0) into v_before
  from public.users
  where user_id = new.referrer_id
  for update;

  v_after := coalesce(v_before, 0) + 5000;

  -- Update referrer's balance and count
  update public.users
    set balance = v_after,
        referral_count = coalesce(referral_count, 0) + 1
  where user_id = new.referrer_id;

  -- Insert transaction record
  insert into public.transactions (
    user_id, title, amount, type, transaction_id, balance_before, balance_after, meta
  ) values (
    new.referrer_id,
    'Referral Bonus',
    5000,
    'credit',
    'REF-' || extract(epoch from now())::bigint,
    coalesce(v_before, 0),
    v_after,
    jsonb_build_object('referral_new_user_id', new.new_user_id)
  );

  return new;
end;
$$;

-- Create trigger if not exists
do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_referrals_after_insert'
  ) then
    create trigger on_referrals_after_insert
    after insert on public.referrals
    for each row execute function public.handle_new_referral();
  end if;
end $$;
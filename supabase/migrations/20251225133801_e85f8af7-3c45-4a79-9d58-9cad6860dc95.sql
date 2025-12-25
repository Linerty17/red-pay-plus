-- Add ban_reason column to users table
ALTER TABLE public.users ADD COLUMN ban_reason text;
-- Add RLS policies for admins to view all referrals and manage them
-- Admins can view all referrals
CREATE POLICY "Admins can view all referrals" 
ON public.referrals 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can update referrals (for manual crediting tracking)
CREATE POLICY "Admins can update referrals" 
ON public.referrals 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add a column to track manual credits
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS manually_credited boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_credit_notes text;
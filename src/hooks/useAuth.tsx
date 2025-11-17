import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  status: string;
  referral_code: string;
  referred_by: string | null;
  balance: number;
  last_claim_at: string | null;
  rpc_purchased: boolean;
  rpc_code: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  signUp: (data: SignUpData) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  retryFetch: () => Promise<void>;
}

interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  country: string;
  referredBy?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('[Auth] Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (error) {
        console.error('[Auth] Error fetching profile:', error);
        setError(new Error(`Failed to fetch profile: ${error.message}`));
        return null;
      }
      
      if (!data) {
        console.error('[Auth] No profile data found for user:', userId);
        setError(new Error('Profile not found. Please contact support.'));
        return null;
      }
      
      console.log('[Auth] Profile fetched successfully:', data);
      setError(null);
      return data;
    } catch (err) {
      console.error('[Auth] Unexpected error fetching profile:', err);
      setError(err instanceof Error ? err : new Error('Unknown error fetching profile'));
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  const retryFetch = async () => {
    console.log('[Auth] Retrying profile fetch...');
    setLoading(true);
    setError(null);
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Session check:', session ? 'Active' : 'None');
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      } else {
        setError(null);
      }
      setLoading(false);
    }).catch((err) => {
      console.error('[Auth] Error getting session:', err);
      setError(new Error('Failed to check authentication status'));
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[Auth] Auth state changed:', _event);
      setUser(session?.user ?? null);
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      } else {
        setProfile(null);
        setError(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (data: SignUpData) => {
    try {
      // Generate unique IDs
      const userId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const referralCode = `REF${Math.floor(100000 + Math.random() * 900000)}`;

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (authError) return { error: authError };
      if (!authData.user) return { error: new Error('No user returned') };

      // Create user profile
      const { error: profileError } = await supabase.from('users').insert({
        auth_user_id: authData.user.id,
        user_id: userId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        country: data.country,
        referral_code: referralCode,
        referred_by: data.referredBy || null,
        balance: 160000,
      });

      if (profileError) return { error: profileError };

      // If referred by someone, process the referral
      if (data.referredBy) {
        // Get referrer's user_id from their referral code or user_id
        const { data: referrer } = await supabase
          .from('users')
          .select('user_id, balance')
          .or(`referral_code.eq.${data.referredBy},user_id.eq.${data.referredBy}`)
          .single();

        if (referrer) {
          // Create referral record
          await supabase.from('referrals').insert({
            referrer_id: referrer.user_id,
            new_user_id: userId,
            amount_given: 5000,
          });

          // Update referrer's balance
          const newBalance = (referrer.balance || 0) + 5000;
          await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('user_id', referrer.user_id);

          // Create transaction record for referral bonus
          await supabase.from('transactions').insert({
            user_id: referrer.user_id,
            title: 'Referral Bonus',
            amount: 5000,
            type: 'credit',
            transaction_id: `REF${Date.now()}`,
            balance_after: newBalance,
          });
        }
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, error, signUp, signIn, signOut, refreshProfile, retryFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

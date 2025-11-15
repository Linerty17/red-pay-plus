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
  signUp: (data: SignUpData) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      } else {
        setProfile(null);
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

      // If referred by someone, add bonus
      if (data.referredBy) {
        // Find referrer
        const { data: referrer } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', data.referredBy)
          .single();

        if (referrer) {
          // Add ₦5,000 to referrer's balance
          await supabase
            .from('users')
            .update({ balance: referrer.balance + 5000 })
            .eq('user_id', data.referredBy);

          // Create referral record
          await supabase.from('referrals').insert({
            referrer_id: data.referredBy,
            new_user_id: userId,
            amount_given: 5000,
          });

          // Add transaction for referrer
          await supabase.from('transactions').insert({
            transaction_id: `TXN${Date.now()}`,
            user_id: data.referredBy,
            type: 'credit',
            title: 'Referral Bonus',
            amount: 5000,
            balance_after: referrer.balance + 5000,
            reference_id: `REF${Date.now()}`,
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
      value={{ user, profile, loading, signUp, signIn, signOut, refreshProfile }}
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

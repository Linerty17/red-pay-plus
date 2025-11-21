import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  auth_user_id: string;
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
  profile_image: string | null;
  referral_count: number;
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
      .maybeSingle();

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
      // Store access token for external API calls if needed
      if (session?.access_token) {
        localStorage.setItem('authToken', session.access_token);
      } else {
        localStorage.removeItem('authToken');
      }
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      // Maintain token for external requests
      if (session?.access_token) {
        localStorage.setItem('authToken', session.access_token);
      } else {
        localStorage.removeItem('authToken');
      }
      // Defer any additional Supabase calls to avoid deadlocks
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user!.id).then(setProfile);
        }, 0);
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
      
      // Generate unique referral code using initials + timestamp + random
      const initials = (data.firstName[0] + data.lastName[0]).toUpperCase();
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(100 + Math.random() * 900);
      const referralCode = `${initials}${timestamp}${random}`;

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

      const storedRefCode = localStorage.getItem('referral_code');
      const referralSource = storedRefCode || data.referredBy || null;

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
        referred_by: referralSource,
        balance: 160000,
      });

      if (profileError) return { error: profileError };

      // Call server-side edge function to credit referral atomically
      if (referralSource) {
        console.log('🎯 ReferralCapture: Calling server to apply referral code:', referralSource);
        
        try {
          const { data: creditResult, error: creditError } = await supabase.functions.invoke('credit-referral', {
            body: {
              new_user_id: userId,
              new_user_email: data.email,
              referral_code: referralSource
            }
          });

          if (creditError) {
            console.error('❌ ReferralError: Failed to call credit function:', creditError);
          } else if (creditResult?.credited) {
            console.log('✅ ReferralCredited: Referral bonus applied successfully', creditResult);
          } else {
            console.warn('⚠️ ReferralNotCredited:', creditResult?.reason || 'Unknown reason', creditResult);
          }
        } catch (error) {
          console.error('❌ ReferralError: Exception calling credit function:', error);
        }
        
        // Always clear the stored referral code after attempting to apply it
        if (storedRefCode) localStorage.removeItem('referral_code');
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
    localStorage.removeItem('authToken');
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

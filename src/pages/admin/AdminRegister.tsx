import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import adminLogo from '@/assets/admin-logo.png';

const ADMIN_EMAIL = 'sundaychinemerem66@gmail.com';
const ADMIN_PASSWORD = 'Chinemerem2007';

export default function AdminRegister() {
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const navigate = useNavigate();

  const createAdminAccount = async () => {
    setLoading(true);
    
    try {
      // First check if already exists
      const { data: existingUser } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });

      if (existingUser.user) {
        toast.success('Account already exists! Redirecting to login...');
        setTimeout(() => navigate('/admin/login'), 1500);
        return;
      }
    } catch (existError) {
      // User doesn't exist, continue with registration
    }

    try {
      // Create the admin account
      const { data, error } = await supabase.auth.signUp({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        options: {
          emailRedirectTo: `${window.location.origin}/admin/dashboard`,
          data: {
            is_admin: true
          }
        }
      });

      if (error) {
        // Check if it's because user already exists
        if (error.message.includes('already registered')) {
          toast.success('Account already exists! Please login.');
          setTimeout(() => navigate('/admin/login'), 1500);
          return;
        }
        throw error;
      }

      if (data.user) {
        setRegistered(true);
        toast.success('Admin account created successfully!');
        
        // Wait a moment for the trigger to assign admin role
        setTimeout(async () => {
          // Try to sign in immediately
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
          });

          if (!signInError) {
            navigate('/admin/dashboard');
          } else {
            navigate('/admin/login');
          }
        }, 2000);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={adminLogo} alt="RedPay Admin" className="h-16 mx-auto mb-4" />
          <CardTitle className="text-2xl">Admin Account Setup</CardTitle>
          <CardDescription>
            One-time setup for the admin account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!registered ? (
            <>
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-mono font-medium">{ADMIN_EMAIL}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Password:</span>
                  <span className="font-mono font-medium">{'•'.repeat(ADMIN_PASSWORD.length)}</span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground text-center">
                Click below to create your permanent admin account with the pre-configured credentials.
              </div>

              <Button 
                onClick={createAdminAccount} 
                className="w-full" 
                disabled={loading}
                size="lg"
              >
                {loading ? 'Creating Account...' : 'Create Admin Account'}
              </Button>

              <div className="text-center">
                <Button 
                  variant="link" 
                  onClick={() => navigate('/admin/login')}
                  className="text-sm"
                >
                  Already have an account? Login
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-green-600 font-semibold text-lg">
                ✓ Account Created Successfully!
              </div>
              <p className="text-sm text-muted-foreground">
                Redirecting to admin dashboard...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

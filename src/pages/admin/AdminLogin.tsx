import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Navigate } from 'react-router-dom';
import adminLogo from '@/assets/admin-logo.png';

const ADMIN_PHONE = '08109375382';

export default function AdminLogin() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedPhone = phoneNumber.trim();
    
    if (trimmedPhone !== ADMIN_PHONE) {
      toast.error('Invalid access number. Access denied.');
      return;
    }

    try {
      setLoading(true);

      // Sign in with the admin account
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'sundaychinemerem66@gmail.com',
        password: 'Chinemerem2007',
      });

      if (error) throw error;

      // Verify admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        await supabase.auth.signOut();
        toast.error('Access denied.');
        return;
      }

      toast.success('Access granted');
      navigate('/admin/dashboard');
    } catch (error: any) {
      toast.error('Authentication failed. Please contact support.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={adminLogo} alt="RedPay Admin" className="h-16 mx-auto mb-4" />
          <CardTitle className="text-2xl">Admin Access</CardTitle>
          <CardDescription>
            Enter your access number to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Access Number</Label>
              <Input
                id="phoneNumber"
                type="text"
                placeholder="Enter access number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                maxLength={11}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Access Admin'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

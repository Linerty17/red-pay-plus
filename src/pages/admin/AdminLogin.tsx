import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import adminLogo from '@/assets/admin-logo.png';

const ADMIN_PHONE = '08109375382';

export default function AdminLogin() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isAdminAuthenticated = sessionStorage.getItem('admin_auth') === 'true';

  if (isAdminAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedPhone = phoneNumber.trim();
    
    if (trimmedPhone !== ADMIN_PHONE) {
      toast.error('Invalid access number. Access denied.');
      return;
    }

    setLoading(true);
    sessionStorage.setItem('admin_auth', 'true');
    toast.success('Access granted');
    
    setTimeout(() => {
      navigate('/admin/dashboard');
      setLoading(false);
    }, 300);
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

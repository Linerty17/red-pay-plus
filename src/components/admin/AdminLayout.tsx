import { useState, useEffect, Suspense, memo } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import LoadingSpinner from '@/components/LoadingSpinner';
import { AdminSidebar } from './AdminSidebar';
import { AdminErrorBoundary } from './AdminErrorBoundary';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import adminLogo from '@/assets/admin-logo.png';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, ShieldCheck, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { usePrefetchAdminData } from '@/hooks/useAdminData';
import { Skeleton } from '@/components/ui/skeleton';

const DEFAULT_PIN = '9111';

// Memoized header component
const AdminHeader = memo(() => (
  <header className="h-16 border-b bg-card flex items-center px-6 gap-4">
    <SidebarTrigger />
    <img src={adminLogo} alt="RedPay Admin" className="h-10" />
    <h1 className="text-xl font-bold text-foreground">RedPay Admin Dashboard</h1>
  </header>
));

AdminHeader.displayName = 'AdminHeader';

// Loading fallback for Suspense
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="space-y-4 w-full max-w-2xl px-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  </div>
);

export function AdminLayout() {
  const { isAdmin, loading, signOut } = useAdminAuth();
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [accessPin, setAccessPin] = useState<string | null>(null);
  const [loadingPin, setLoadingPin] = useState(true);
  const { prefetch } = usePrefetchAdminData();

  useEffect(() => {
    const fetchPin = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'admin_pin')
          .maybeSingle();
        
        setAccessPin(data?.value || DEFAULT_PIN);
      } catch (error) {
        console.error('Error fetching admin PIN:', error);
        setAccessPin(DEFAULT_PIN);
      } finally {
        setLoadingPin(false);
      }
    };
    
    fetchPin();
  }, []);

  // Prefetch admin data when PIN is verified
  useEffect(() => {
    if (isPinVerified) {
      prefetch();
    }
  }, [isPinVerified, prefetch]);

  const handlePinComplete = (value: string) => {
    setPin(value);
    
    if (value === accessPin) {
      setIsPinVerified(true);
      toast.success('Access granted');
    } else if (value.length === 4) {
      setAttempts(prev => prev + 1);
      toast.error('Invalid PIN');
      setPin('');
      
      if (attempts >= 2) {
        toast.error('Too many failed attempts. Logging out.');
        signOut();
      }
    }
  };

  if (loading || loadingPin) {
    return <LoadingSpinner />;
  }

  if (!isAdmin) {
    return <Navigate to="/ifechukwu/login" replace />;
  }

  // Show PIN verification screen after successful login
  if (!isPinVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src={adminLogo} alt="RedPay Admin" className="h-16 mx-auto mb-4" />
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Security Verification
            </CardTitle>
            <CardDescription>
              Enter the 4-digit access PIN to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={pin}
                onChange={handlePinComplete}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="w-14 h-14 text-2xl" />
                  <InputOTPSlot index={1} className="w-14 h-14 text-2xl" />
                  <InputOTPSlot index={2} className="w-14 h-14 text-2xl" />
                  <InputOTPSlot index={3} className="w-14 h-14 text-2xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            {attempts > 0 && (
              <p className="text-center text-sm text-destructive">
                {3 - attempts} attempts remaining
              </p>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader />
          <main className="flex-1 p-6 overflow-auto">
            <AdminErrorBoundary>
              <Suspense fallback={<PageLoadingFallback />}>
                <Outlet />
              </Suspense>
            </AdminErrorBoundary>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import AdminSettings from './AdminSettings';
import LoadingSpinner from '@/components/LoadingSpinner';

const DEFAULT_PIN = '9111';

export default function AdminSettingsProtected() {
  const [isVerified, setIsVerified] = useState(false);
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [accessPin, setAccessPin] = useState<string | null>(null);
  const [loadingPin, setLoadingPin] = useState(true);
  const navigate = useNavigate();

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

  const handlePinComplete = (value: string) => {
    setPin(value);
    
    if (value === accessPin) {
      setIsVerified(true);
      toast.success('Access granted');
    } else if (value.length === 4) {
      setAttempts(prev => prev + 1);
      toast.error('Invalid PIN');
      setPin('');
      
      if (attempts >= 2) {
        toast.error('Too many failed attempts. Please try again later.');
        navigate('/ifechukwu/dashboard');
      }
    }
  };

  if (loadingPin) {
    return <LoadingSpinner />;
  }

  if (isVerified) {
    return <AdminSettings />;
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Settings Access
          </CardTitle>
          <CardDescription>
            Enter the 4-digit access PIN to view settings
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
            onClick={() => navigate('/ifechukwu/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bell, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PermissionRequestDialogProps {
  userId: string;
  onComplete?: () => void;
}

export function PermissionRequestDialog({ userId, onComplete }: PermissionRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'notification' | 'complete'>('notification');
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    const checkAndShowDialog = async () => {
      // Check if user already has push subscription
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      // If already subscribed, don't show dialog
      if (subscription) {
        return;
      }

      // Check last prompt time - only show once per day if skipped
      const lastPrompt = localStorage.getItem(`permissions_prompt_${userId}`);
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      if (lastPrompt && parseInt(lastPrompt) > oneDayAgo) {
        return; // Don't show if prompted within last 24 hours
      }

      // Show dialog after delay
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    };

    checkAndShowDialog();
  }, [userId]);

  const requestNotification = async () => {
    setIsRequesting(true);
    try {
      if (!('Notification' in window)) {
        toast.error('Notifications not supported on this browser');
        completeSetup();
        return;
      }

      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        setNotificationGranted(true);
        
        // Generate a unique device token for this browser
        const deviceToken = `web_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Save subscription to database
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: userId,
            fcm_token: deviceToken,
            platform: 'web',
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Error saving subscription:', error);
        } else {
          console.log('Push subscription saved successfully');
        }

        toast.success('Notifications enabled!');
      } else {
        toast.error('Notification permission denied');
      }

      completeSetup();
    } catch (error) {
      console.error('Notification error:', error);
      toast.error('Could not enable notifications');
      completeSetup();
    } finally {
      setIsRequesting(false);
    }
  };

  const completeSetup = () => {
    setStep('complete');
    // Store timestamp instead of boolean - allows re-prompting after 24 hours
    localStorage.setItem(`permissions_prompt_${userId}`, Date.now().toString());
    setTimeout(() => {
      setOpen(false);
      onComplete?.();
    }, 2000);
  };

  const skipNotification = () => {
    completeSetup();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        {step === 'notification' && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-primary" />
              </div>
              <DialogTitle className="text-xl">Enable Notifications</DialogTitle>
              <DialogDescription className="text-center">
                Stay updated with important alerts about your account, transactions, and exclusive offers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Bell className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">You'll receive:</p>
                  <ul className="text-muted-foreground mt-1 space-y-1">
                    <li>• Transaction confirmations</li>
                    <li>• Security alerts</li>
                    <li>• Referral bonus notifications</li>
                    <li>• Exclusive promotions</li>
                  </ul>
                </div>
              </div>
              <Button 
                onClick={requestNotification} 
                className="w-full" 
                size="lg"
                disabled={isRequesting}
              >
                {isRequesting ? 'Enabling...' : 'Enable Notifications'}
              </Button>
              <Button 
                onClick={skipNotification} 
                variant="ghost" 
                className="w-full text-muted-foreground"
              >
                Maybe later
              </Button>
            </div>
          </>
        )}

        {step === 'complete' && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <DialogTitle className="text-xl">You're All Set!</DialogTitle>
              <DialogDescription className="text-center">
                Your preferences have been saved. Enjoy using REDPAY!
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm">
                {notificationGranted ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <X className="w-4 h-4 text-muted-foreground" />
                )}
                <span className={notificationGranted ? 'text-green-600' : 'text-muted-foreground'}>
                  Notifications
                </span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

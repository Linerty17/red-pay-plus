import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ShieldX, MessageCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BannedOverlay = () => {
  const { profile, user } = useAuth();
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkBanStatus = async () => {
      if (!user || !profile) {
        setChecking(false);
        return;
      }

      // Check if user status is "Banned"
      if (profile.status === 'Banned') {
        setIsBanned(true);
        // Fetch ban reason from database
        const { data } = await supabase
          .from('users')
          .select('ban_reason')
          .eq('user_id', profile.user_id)
          .single();
        
        if (data?.ban_reason) {
          setBanReason(data.ban_reason);
        }
      } else {
        setIsBanned(false);
        setBanReason(null);
      }
      setChecking(false);
    };

    checkBanStatus();

    // Subscribe to realtime changes on the user's profile
    if (profile?.user_id) {
      const channel = supabase
        .channel('ban-status')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `user_id=eq.${profile.user_id}`,
          },
          (payload: any) => {
            if (payload.new?.status === 'Banned') {
              setIsBanned(true);
              setBanReason(payload.new?.ban_reason || null);
            } else {
              setIsBanned(false);
              setBanReason(null);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, profile]);

  const handleContactSupport = () => {
    window.open('https://t.me/OfficialChixx9ja', '_blank');
  };

  const handleEmailSupport = () => {
    window.location.href = 'mailto:support@redpay.com?subject=Account Ban Appeal';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  if (checking || !isBanned) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-destructive/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-destructive/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-md w-full">
        {/* Ban Icon with animation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/30 rounded-full blur-xl animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-24 h-24 bg-destructive/20 rounded-full flex items-center justify-center border-4 border-destructive animate-scale-in">
              <ShieldX className="w-12 h-12 text-destructive animate-pulse" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-card border border-destructive/30 rounded-2xl p-8 shadow-2xl animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <h1 className="text-2xl font-bold text-center text-destructive mb-2">
            Account Suspended
          </h1>
          <p className="text-center text-muted-foreground mb-4">
            Your account has been temporarily suspended.
          </p>

          {banReason && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-center">
                <strong>Reason:</strong><br />
                {banReason}
              </p>
            </div>
          )}

          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
            <p className="text-sm text-center">
              <strong>What this means:</strong><br />
              You cannot access any features of RedPay until your account is reviewed and reinstated by our support team.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleContactSupport}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Contact Support on Telegram
            </Button>

            <Button
              onClick={handleEmailSupport}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Mail className="w-5 h-5 mr-2" />
              Email Support
            </Button>

            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Log Out
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            If you believe this was a mistake, please contact our support team immediately. We'll review your case within 24-48 hours.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BannedOverlay;

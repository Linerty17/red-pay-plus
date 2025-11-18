import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import {
  Wallet,
  Video,
  Gift,
  ShoppingBag,
  Radio,
  Users,
  History as HistoryIcon,
  HeadphonesIcon,
  Send,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import advert1 from "@/assets/advert-1.png";
import advert2 from "@/assets/advert-2.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const { profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [nextClaimAt, setNextClaimAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoLink, setVideoLink] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (profile?.last_claim_at) {
      const lastClaim = new Date(profile.last_claim_at);
      const nextClaim = new Date(lastClaim.getTime() + 15 * 60 * 1000); // 15 minutes
      if (nextClaim.getTime() > Date.now()) {
        setNextClaimAt(nextClaim);
      }
    }
  }, [profile]);

  // Realtime subscription for balance and referral count updates
  useEffect(() => {
    if (!profile?.user_id) return;

    const channel = supabase
      .channel('user-balance-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `user_id=eq.${profile.user_id}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          // Refresh profile to get updated balance and referral_count
          refreshProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.user_id, refreshProfile]);

  // Claim timer effect
  useEffect(() => {
    if (nextClaimAt) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = nextClaimAt.getTime() - now;

        if (distance < 0) {
          setTimeLeft("");
          setNextClaimAt(null);
          localStorage.removeItem("nextClaimAt");
          clearInterval(interval);
        } else {
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [nextClaimAt]);

  const handleClaim = useCallback(async () => {
    if (!profile || isProcessing) return;
    
    if (nextClaimAt) {
      toast.error(`Next claim in ${timeLeft}`);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const newBalance = (profile.balance || 0) + 30000;
      
      // Update user balance and last claim time
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          balance: newBalance,
          last_claim_at: new Date().toISOString()
        })
        .eq('user_id', profile.user_id);

      if (updateError) throw updateError;

      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: profile.user_id,
        title: 'Daily Claim Bonus',
        amount: 30000,
        type: 'credit',
        transaction_id: `CLAIM-${Date.now()}`,
        balance_before: profile.balance || 0,
        balance_after: newBalance,
        meta: {}
      });

      // Set next claim time (15 minutes from now)
      const next = new Date(Date.now() + 15 * 60 * 1000);
      setNextClaimAt(next);
      
      await refreshProfile();
      toast.success("₦30,000 claimed successfully!");
    } catch (error: any) {
      console.error('Error claiming bonus:', error);
      toast.error(error.message || "Failed to claim bonus");
    } finally {
      setIsProcessing(false);
    }
  }, [profile, isProcessing, nextClaimAt, timeLeft, refreshProfile]);

  const handleWithdraw = useCallback(() => {
    navigate("/withdraw");
  }, [navigate]);

  const handleAction = useCallback((action: string) => {
    if (action === "Video") {
      setVideoLink("https://www.youtube.com/embed/HIIsekQx_dU");
      setVideoOpen(true);
    } else {
      toast.info(`${action} feature coming soon!`);
    }
  }, []);

  const handleRetry = useCallback(async () => {
    setLoadError(false);
    await refreshProfile();
  }, [refreshProfile]);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate("/");
  }, [signOut, navigate]);

  const actionButtons = useMemo(() => [
    { icon: ShoppingBag, label: "BuyRPC", color: "bg-primary", route: "/buyrpc" },
    { icon: Radio, label: "Broadcast", color: "bg-purple-600", route: "/broadcast" },
    { icon: Gift, label: "Refer&Earn", color: "bg-blue-600", route: "/refer-earn" },
    { icon: Users, label: "Community", color: "bg-green-600", route: "/community" },
    { icon: HistoryIcon, label: "History", color: "bg-orange-600", route: "/history" },
    { icon: HeadphonesIcon, label: "Support", color: "bg-red-600", route: "/support" },
  ], []);

  // Loading skeleton while profile loads
  if (!profile && !loadError) {
    return (
      <div className="min-h-screen w-full relative">
        <LiquidBackground />
        <header className="relative z-10 px-3 py-2 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
          <Logo />
          <ProfileButton />
        </header>
        <main className="relative z-10 px-3 py-3 max-w-4xl mx-auto space-y-3">
          <Skeleton className="h-8 w-24 ml-auto" />
          <Card className="bg-card/60 backdrop-blur-sm border-border">
            <CardContent className="pt-4 pb-4 px-4 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
              </div>
            </CardContent>
          </Card>
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Error fallback with retry
  if (loadError || !profile) {
    return (
      <div className="min-h-screen w-full relative">
        <LiquidBackground />
        <header className="relative z-10 px-3 py-2 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
          <Logo />
          <ProfileButton />
        </header>
        <main className="relative z-10 px-3 py-3 max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
          <Card className="bg-card/80 backdrop-blur-sm border-border max-w-md">
            <CardContent className="p-8 text-center space-y-4">
              <h2 className="text-xl font-bold text-foreground">Dashboard failed to load</h2>
              <p className="text-muted-foreground">Unable to fetch your profile data</p>
              <div className="flex gap-2">
                <Button onClick={handleRetry} className="flex-1">
                  Retry
                </Button>
                <Button onClick={handleLogout} variant="outline" className="flex-1">
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative">
      <LiquidBackground />

      {/* Header */}
      <header className="relative z-10 px-3 py-2 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
        <Logo />
        <ProfileButton />
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-3 py-3 max-w-4xl mx-auto space-y-3">
        {/* Video Button - Above Balance */}
        <div className="flex justify-end">
          <Button
            onClick={() => handleAction("Video")}
            variant="outline"
            size="sm"
            className="bg-primary/10 hover:bg-primary/20 border-primary text-primary font-semibold"
          >
            <Video className="w-3 h-3 mr-1" />
            Video
          </Button>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 border-primary shadow-glow animate-fade-in">
          <CardContent className="pt-4 pb-4 px-4 space-y-3">
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-medium">Total Balance</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-primary-foreground">
                  ₦{profile?.balance?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-primary-foreground/60">
                  ID: {profile?.user_id || 'Loading...'}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleClaim}
                  variant="secondary"
                  size="sm"
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                  disabled={!!nextClaimAt || !profile || isProcessing}
                >
                  <Gift className="w-3 h-3 mr-1" />
                  {isProcessing ? "Processing..." : nextClaimAt ? `Next claim in ${timeLeft}` : "Claim ₦30,000"}
                </Button>
                <Button
                  onClick={handleWithdraw}
                  variant="secondary"
                  size="sm"
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Withdraw
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advert 1 */}
        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in overflow-hidden">
          <CardContent className="p-0">
            <img src={advert1} alt="RedPay Advertisement" className="w-full h-auto max-h-24 object-cover" />
          </CardContent>
        </Card>

        {/* Action Buttons Grid - 3x2 */}
        <div className="grid grid-cols-3 gap-2 animate-fade-in">
          {actionButtons.map((button, index) => {
            const IconComponent = button.icon;
            return (
              <Link
                key={index}
                to={button.route}
                className="block"
              >
                <Card className="bg-card/60 backdrop-blur-sm border-border hover-lift cursor-pointer transition-all h-full">
                  <CardContent className="p-3 flex flex-col items-center justify-center space-y-1 text-center">
                    <div className={`w-10 h-10 ${button.color} rounded-xl flex items-center justify-center`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-xs text-foreground">{button.label}</h3>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Advert 2 */}
        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in overflow-hidden">
          <CardContent className="p-0">
            <img src={advert2} alt="RedPay Advertisement" className="w-full h-auto max-h-24 object-cover" />
          </CardContent>
        </Card>
      </main>

      {/* Video Modal */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Video</DialogTitle>
          </DialogHeader>
          {videoLink ? (
            <div className="aspect-video">
              <iframe
                src={videoLink}
                className="w-full h-full rounded-lg"
                allowFullScreen
                title="RedPay Video"
              />
            </div>
          ) : (
            <div className="aspect-video bg-secondary/20 rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">No video available yet</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;

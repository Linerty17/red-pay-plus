import { useState, useEffect } from "react";
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
  History,
  HeadphonesIcon,
  Send,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import advert1 from "@/assets/advert-1.png";
import advert2 from "@/assets/advert-2.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { profile, refreshProfile, loading, error, retryFetch } = useAuth();
  const [nextClaimAt, setNextClaimAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (profile?.last_claim_at) {
      const lastClaim = new Date(profile.last_claim_at);
      const nextClaim = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
      if (nextClaim.getTime() > Date.now()) {
        setNextClaimAt(nextClaim);
      }
    }
  }, [profile]);

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

  const handleClaim = async () => {
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
        transaction_id: `CLAIM${Date.now()}`,
        balance_after: newBalance,
      });

      // Set next claim time
      const next = new Date();
      next.setHours(next.getHours() + 24);
      setNextClaimAt(next);
      
      // Refresh profile to get updated balance
      await refreshProfile();
      
      toast.success("Success — ₦30,000 added to your wallet!");
    } catch (error: any) {
      console.error('Error claiming bonus:', error);
      toast.error(error.message || "Failed to claim bonus");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = () => {
    window.location.href = "/withdraw";
  };

  const handleAction = (action: string) => {
    toast.info(`${action} feature coming soon!`);
  };

  const actionButtons = [
    { icon: ShoppingBag, label: "BuyRPC", color: "bg-primary", route: "/buyrpc" },
    { icon: Radio, label: "Broadcast", color: "bg-purple-600", route: "/broadcast" },
    { icon: Gift, label: "Refer&Earn", color: "bg-blue-600", route: "/refer-earn" },
    { icon: Users, label: "Community", color: "bg-green-600", route: "/community" },
    { icon: History, label: "History", color: "bg-orange-600", route: "/history" },
    { icon: HeadphonesIcon, label: "Support", color: "bg-red-600", route: "/support" },
  ];

  const handleRetry = async () => {
    await retryFetch();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

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
        {/* Loading State */}
        {loading && (
          <Card className="bg-card/60 backdrop-blur-sm border-border">
            <CardContent className="pt-6 pb-6 px-4 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-muted-foreground">Loading dashboard...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="bg-card/60 backdrop-blur-sm border-destructive">
            <CardContent className="pt-6 pb-6 px-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-foreground">Unable to load dashboard</h3>
                  <p className="text-sm text-muted-foreground">{error.message}</p>
                  <p className="text-xs text-muted-foreground/60">Check console for details</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleRetry} variant="default" size="sm" className="flex-1">
                  Retry
                </Button>
                <Button onClick={handleLogout} variant="outline" size="sm" className="flex-1">
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Content */}
        {!loading && !error && profile && (
          <>
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
          {actionButtons.map((button, index) => (
            <Link
              key={index}
              to={button.route}
              className="block"
            >
              <Card className="bg-card/60 backdrop-blur-sm border-border hover-lift cursor-pointer transition-all h-full">
                <CardContent className="p-3 flex flex-col items-center justify-center space-y-1 text-center">
                  <div className={`w-10 h-10 ${button.color} rounded-xl flex items-center justify-center`}>
                    <button.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-xs text-foreground">{button.label}</h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Advert 2 */}
        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in overflow-hidden">
          <CardContent className="p-0">
            <img src={advert2} alt="RedPay Advertisement" className="w-full h-auto max-h-24 object-cover" />
          </CardContent>
        </Card>
        </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

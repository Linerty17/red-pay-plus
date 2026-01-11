import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import { PermissionRequestDialog } from "@/components/PermissionRequestDialog";
import { NotificationCenter } from "@/components/NotificationCenter";
import { PaymentStatusOverlay } from "@/components/PaymentStatusOverlay";
import { useNotifications } from "@/hooks/useNotifications";
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
  MessageCircle,
  Bell,
  X,
  TrendingUp,
  Shield,
  Zap,
  ChevronRight,
  Sparkles,
  BadgeCheck,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import advert1 from "@/assets/advert-1.png";
import advert2 from "@/assets/advert-2.png";
import advert3 from "@/assets/advert-3.png";
import advert4 from "@/assets/advert-4.png";
import advert5 from "@/assets/advert-5.png";
import advert6 from "@/assets/advert-6.png";
import advert7 from "@/assets/advert-7.png";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import ConfettiCelebration from "@/components/ConfettiCelebration";

const TELEGRAM_CHANNEL_URL = "https://t.me/Skypay261";

const Dashboard = () => {
  const { profile, refreshProfile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [nextClaimAt, setNextClaimAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoLink, setVideoLink] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [showTelegramBanner, setShowTelegramBanner] = useState(true); // Temporarily show to all users
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
  // Only show payment status if navigating from Buy RPC page or on realtime update
  const [showPaymentStatus, setShowPaymentStatus] = useState(() => {
    return location.state?.showPaymentStatus === true;
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCommunityConfetti, setShowCommunityConfetti] = useState(false);

  // Initialize notifications hook
  useNotifications(profile?.user_id);

  // Check if user has push subscription
  useEffect(() => {
    const checkNotificationSubscription = async () => {
      if (!profile?.user_id) return;
      
      // Check if notifications are supported
      if (!('Notification' in window)) return;
      
      // Check if already subscribed
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      // Show banner if not subscribed and notification permission is not denied
      if (!subscription && Notification.permission !== 'denied') {
        setShowNotificationBanner(true);
      }
    };

    checkNotificationSubscription();
  }, [profile?.user_id]);

  const handleEnableNotifications = async () => {
    if (!profile?.user_id) return;
    
    setIsEnablingNotifications(true);
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // Generate a unique device token
        const deviceToken = `web_${profile.user_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Save subscription to database
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: profile.user_id,
            fcm_token: deviceToken,
            platform: 'web',
          }, {
            onConflict: 'user_id'
          });

        if (error) throw error;

        toast.success('Notifications enabled! You\'ll now receive updates.');
        setShowNotificationBanner(false);
      } else {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsEnablingNotifications(false);
    }
  };

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
      
      // Trigger confetti celebration
      setShowConfetti(true);
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

  const handleOpenVideo = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'video_link')
        .single();
      
      setVideoLink(data?.value || "https://geo.dailymotion.com/player.html?video=kjvoNS9iocB3LtEnmRW&mute=false");
      setVideoOpen(true);
    } catch {
      setVideoLink("https://geo.dailymotion.com/player.html?video=kjvoNS9iocB3LtEnmRW&mute=false");
      setVideoOpen(true);
    }
  }, []);

  const handleRetry = useCallback(async () => {
    setLoadError(false);
    await refreshProfile();
  }, [refreshProfile]);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate("/auth", { replace: true });
  }, [signOut, navigate]);

  const actionButtons = useMemo(() => [
    { icon: ShoppingBag, label: "Buy RPC", description: "Get verified", color: "from-primary to-primary/80", route: "/buyrpc" },
    { icon: Radio, label: "Broadcast", description: "Go live", color: "from-purple-600 to-purple-500", route: "/broadcast" },
    { icon: Gift, label: "Refer & Earn", description: "Invite friends", color: "from-blue-600 to-blue-500", route: "/refer-earn" },
    { icon: Users, label: "Community", description: "Join others", color: "from-green-600 to-green-500", route: "/community" },
    { icon: HistoryIcon, label: "History", description: "View records", color: "from-orange-600 to-orange-500", route: "/history" },
    { icon: HeadphonesIcon, label: "Support", description: "Get help", color: "from-rose-600 to-rose-500", route: "/support" },
  ], []);

  const trustBadges = useMemo(() => [
    { icon: Shield, label: "Secured", color: "text-green-500" },
    { icon: Zap, label: "Instant", color: "text-yellow-500" },
    { icon: BadgeCheck, label: "Verified", color: "text-blue-500" },
  ], []);

  // Calculate claim progress for timer visualization
  const claimProgress = useMemo(() => {
    if (!nextClaimAt) return 100;
    const total = 15 * 60 * 1000; // 15 minutes
    const remaining = nextClaimAt.getTime() - Date.now();
    return Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  }, [nextClaimAt, timeLeft]);

  // Loading skeleton while auth or profile loads
  if (authLoading || (!profile && !loadError)) {
    return (
      <div className="min-h-screen w-full relative">
        <LiquidBackground />
        <header className="relative z-10 px-4 py-3 flex items-center justify-between border-b border-border/10 bg-background/50 backdrop-blur-xl">
          <Logo />
          <ProfileButton />
        </header>
        <main className="relative z-10 px-4 py-4 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
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
        <header className="relative z-10 px-4 py-3 flex items-center justify-between border-b border-border/10 bg-background/50 backdrop-blur-xl">
          <Logo />
          <ProfileButton />
        </header>
        <main className="relative z-10 px-4 py-4 max-w-lg mx-auto flex items-center justify-center min-h-[60vh]">
          <Card className="bg-card/90 backdrop-blur-xl border-border/50 max-w-md rounded-3xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Dashboard failed to load</h2>
              <p className="text-muted-foreground">Unable to fetch your profile data</p>
              <div className="flex gap-3">
                <Button onClick={handleRetry} className="flex-1 rounded-xl">
                  Retry
                </Button>
                <Button onClick={handleLogout} variant="outline" className="flex-1 rounded-xl">
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
    <div className="min-h-screen min-h-[100dvh] w-full relative overflow-x-hidden">
      <LiquidBackground />
      
      {/* Confetti Celebration */}
      <ConfettiCelebration 
        isActive={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />
      
      {/* Community Join Confetti */}
      <ConfettiCelebration 
        isActive={showCommunityConfetti} 
        onComplete={() => setShowCommunityConfetti(false)} 
      />

      {/* Payment Status Overlay - Full Screen */}
      {profile?.user_id && (
        <PaymentStatusOverlay 
          userId={profile.user_id}
          onClose={() => setShowPaymentStatus(false)}
          checkOnMount={true} // Always check for unacknowledged payments on mount
          onStatusFound={() => setShowPaymentStatus(true)} // Show overlay on realtime update
        />
      )}

      {/* Permission Request Dialog */}
      {profile?.user_id && (
        <PermissionRequestDialog 
          userId={profile.user_id} 
          onComplete={() => console.log('Permissions setup complete')}
        />
      )}

      {/* Modern Glass Header */}
      <header className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b border-border/10 bg-background/70 backdrop-blur-xl">
        <Logo />
        <div className="flex items-center gap-3">
          {profile?.user_id && <NotificationCenter userId={profile.user_id} />}
          <ProfileButton />
        </div>
      </header>

      {/* Premium Community Popup */}
      {showTelegramBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="mx-4 max-w-sm w-full relative">
            {/* Animated glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-red-500 to-orange-500 rounded-3xl blur-lg opacity-75 animate-pulse" />
            
            <Card className="relative bg-gradient-to-br from-card via-card to-card/95 border-0 shadow-2xl rounded-3xl overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-primary/30 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-red-500/30 to-transparent rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-3xl" />
              </div>
              
              <CardContent className="relative p-6 pt-8 text-center space-y-5">
                {/* Close button */}
                <button 
                  onClick={() => setShowTelegramBanner(false)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Animated icon with rings */}
                <div className="relative mx-auto w-24 h-24">
                  {/* Outer animated ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                  {/* Middle ring */}
                  <div className="absolute inset-2 rounded-full border-2 border-primary/50 animate-pulse" />
                  {/* Icon container */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary via-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl transform rotate-3 hover:rotate-0 transition-transform">
                      <Send className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  {/* Sparkle decorations */}
                  <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-400 animate-pulse" />
                  <Sparkles className="absolute -bottom-1 -left-1 w-4 h-4 text-orange-400 animate-pulse delay-100" />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground via-primary to-red-500 bg-clip-text text-transparent">
                      Join Our Community
                    </h3>
                    <BadgeCheck className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Be part of <span className="text-primary font-semibold">50,000+</span> members! Get exclusive bonuses, updates & earn more rewards.
                  </p>
                </div>

                {/* Benefits pills */}
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                    <Gift className="w-3 h-3" /> Exclusive Bonuses
                  </span>
                  <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Fast Updates
                  </span>
                  <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Safe & Trusted
                  </span>
                </div>

                {/* Action buttons */}
                <div className="space-y-3 pt-2">
                  <Button 
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary via-red-500 to-orange-500 hover:opacity-90 text-white font-bold shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => {
                      setShowCommunityConfetti(true);
                      // Small delay before opening link for confetti effect
                      setTimeout(() => {
                        window.open(TELEGRAM_CHANNEL_URL, '_blank');
                      }, 300);
                    }}
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Join Telegram Now
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      className="w-full text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl h-10"
                      onClick={() => setShowTelegramBanner(false)}
                    >
                      Remind Me Later
                    </Button>
                    <button
                      className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors underline-offset-2 hover:underline"
                      onClick={() => {
                        localStorage.setItem('hideCommunityPopup', 'true');
                        setShowTelegramBanner(false);
                      }}
                    >
                      Never show again
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Notification Enable Banner */}
      {showNotificationBanner && !showTelegramBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-40 animate-fade-in">
          <Card className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold">Enable Notifications</p>
                  <p className="text-white/80 text-sm">Never miss bonuses & updates</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleEnableNotifications}
                    size="sm"
                    disabled={isEnablingNotifications}
                    className="bg-white text-amber-600 hover:bg-white/90 font-bold rounded-xl px-4"
                  >
                    {isEnablingNotifications ? 'Enabling...' : 'Enable'}
                  </Button>
                  <Button
                    onClick={() => setShowNotificationBanner(false)}
                    size="sm"
                    variant="ghost"
                    className="text-white/80 hover:text-white hover:bg-white/10 p-2 h-auto rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 px-3 sm:px-4 py-3 sm:py-4 max-w-md sm:max-w-lg mx-auto space-y-3 sm:space-y-4 pb-6">
        
        {/* Trust Badges Row */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 py-1 animate-fade-in">
          {trustBadges.map((badge, index) => (
            <div key={index} className="flex items-center gap-1 text-muted-foreground">
              <badge.icon className={`w-3 h-3 sm:w-4 sm:h-4 ${badge.color}`} />
              <span className="text-[10px] sm:text-xs font-medium">{badge.label}</span>
            </div>
          ))}
        </div>

        {/* Premium Balance Card - Compact */}
        <Card className="relative overflow-hidden rounded-xl sm:rounded-2xl border-0 shadow-lg sm:shadow-xl animate-fade-in">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_50%)]" />
          
          <CardContent className="relative p-3 sm:p-4 space-y-2 sm:space-y-2.5">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-primary-foreground/80">
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium">Total Balance</span>
              </div>
              <Button
                onClick={handleOpenVideo}
                variant="ghost"
                size="sm"
                className="h-6 sm:h-7 px-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm text-[10px] sm:text-xs"
              >
                <Video className="w-3 h-3 mr-1" />
                Watch
              </Button>
            </div>

            {/* Balance Display */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    ₦{profile?.balance?.toLocaleString() || '0'}
                  </span>
                  <div className="flex items-center gap-0.5 bg-white/20 px-1 py-0.5 rounded-full">
                    <TrendingUp className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-green-300" />
                    <span className="text-[8px] sm:text-[10px] text-green-200 font-medium">+₦30k</span>
                  </div>
                </div>
                <p className="text-[8px] sm:text-[10px] text-primary-foreground/60 font-mono truncate">
                  ID: {profile?.user_id || 'Loading...'}
                </p>
              </div>
              {/* Referral Stats - Inline */}
              <Link to="/refer-earn" className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl px-2 py-1.5 hover:bg-white/15 transition-colors">
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white/20 rounded-lg flex items-center justify-center">
                  <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-[8px] sm:text-[10px] text-primary-foreground/70">Referrals</p>
                  <p className="text-sm sm:text-base font-bold text-white leading-none">{profile?.referral_count || 0}</p>
                </div>
              </Link>
            </div>

            {/* Claim Timer Progress */}
            {nextClaimAt && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                  <span className="text-primary-foreground/70">Next claim in</span>
                  <span className="text-white font-mono font-bold">{timeLeft}</span>
                </div>
                <Progress value={claimProgress} className="h-1 bg-white/20" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleClaim}
                className={`flex-1 h-9 sm:h-10 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all ${
                  nextClaimAt 
                    ? 'bg-white/20 text-white/70 cursor-not-allowed' 
                    : 'bg-white text-primary hover:bg-white/90 hover:scale-[1.01]'
                }`}
                disabled={!!nextClaimAt || !profile || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1 animate-spin" />
                    Processing...
                  </>
                ) : nextClaimAt ? (
                  <>
                    <Gift className="w-3.5 h-3.5 mr-1" />
                    {timeLeft}
                  </>
                ) : (
                  <>
                    <Gift className="w-3.5 h-3.5 mr-1" />
                    Claim ₦30,000
                  </>
                )}
              </Button>
              <Button
                onClick={handleWithdraw}
                className="flex-1 h-9 sm:h-10 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/20 shadow-md transition-all hover:scale-[1.01]"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Advert Carousel - Top */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/30 rounded-xl sm:rounded-2xl overflow-hidden shadow-md sm:shadow-lg animate-fade-in">
          <CardContent className="p-0">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              plugins={[
                Autoplay({
                  delay: 7000,
                  stopOnInteraction: false,
                }),
              ]}
              className="w-full"
            >
              <CarouselContent>
                {[advert1, advert2, advert3, advert4, advert5, advert6, advert7].map((advert, index) => (
                  <CarouselItem key={index}>
                    <img 
                      src={advert} 
                      alt={`RedPay Advertisement ${index + 1}`} 
                      className="w-full h-auto max-h-20 sm:max-h-24 object-cover" 
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </CardContent>
        </Card>

        {/* Quick Actions Title */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-sm sm:text-base font-bold text-foreground">Quick Actions</h2>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            <span className="text-[10px] sm:text-xs">Explore features</span>
          </div>
        </div>

        {/* Modern Action Buttons Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 animate-fade-in">
          {actionButtons.map((button, index) => {
            const IconComponent = button.icon;
            return (
              <Link
                key={index}
                to={button.route}
                className="block group"
              >
                <Card className="relative overflow-hidden bg-card/80 backdrop-blur-xl border-border/30 rounded-xl sm:rounded-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:border-primary/30 h-full">
                  <CardContent className="p-2.5 sm:p-3 flex flex-col items-center justify-center space-y-1.5 text-center">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br ${button.color} rounded-lg sm:rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[11px] sm:text-xs text-foreground leading-tight">{button.label}</h3>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">{button.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Advert Carousel - Bottom */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/30 rounded-xl sm:rounded-2xl overflow-hidden shadow-md sm:shadow-lg animate-fade-in">
          <CardContent className="p-0">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              plugins={[
                Autoplay({
                  delay: 7000,
                  stopOnInteraction: false,
                }),
              ]}
              className="w-full"
            >
              <CarouselContent>
                {[advert1, advert2, advert3, advert4, advert5, advert6, advert7].map((advert, index) => (
                  <CarouselItem key={index}>
                    <img 
                      src={advert} 
                      alt={`RedPay Advertisement ${index + 1}`} 
                      className="w-full h-auto max-h-20 sm:max-h-24 object-cover" 
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </CardContent>
        </Card>

        {/* Footer Trust Section */}
        <div className="text-center py-2 sm:py-3 space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">256-bit SSL Encrypted • Bank-level Security</span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground/60">© 2026 RedPay. All rights reserved.</p>
        </div>
      </main>

      {/* Video Modal */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-3xl border-border/50">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>RedPay Video</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full">
            {videoOpen && videoLink && (
              <iframe
                src={videoLink}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture; web-share"
                allowFullScreen
                title="RedPay Video"
                loading="eager"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;

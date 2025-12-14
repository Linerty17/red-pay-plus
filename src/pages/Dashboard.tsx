import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import { PermissionRequestDialog } from "@/components/PermissionRequestDialog";
import { NotificationCenter } from "@/components/NotificationCenter";
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
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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

const TELEGRAM_CHANNEL_URL = "https://t.me/Skypay261";

const Dashboard = () => {
  const { profile, refreshProfile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [nextClaimAt, setNextClaimAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoLink, setVideoLink] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [showTelegramBanner, setShowTelegramBanner] = useState(true);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);

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

  // Loading skeleton while auth or profile loads
  if (authLoading || (!profile && !loadError)) {
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
    <div className="min-h-screen min-h-[100dvh] w-full relative">
      <LiquidBackground />

      {/* Permission Request Dialog */}
      {profile?.user_id && (
        <PermissionRequestDialog 
          userId={profile.user_id} 
          onComplete={() => console.log('Permissions setup complete')}
        />
      )}

      {/* Header */}
      <header className="relative z-10 px-3 py-2 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
        <Logo />
        <div className="flex items-center gap-2">
          {profile?.user_id && <NotificationCenter userId={profile.user_id} />}
          <ProfileButton />
        </div>
      </header>

      {/* Telegram Notification Overlay */}
      {showTelegramBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <Card className="mx-4 max-w-sm w-full bg-card border-primary/50 shadow-glow animate-float">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto animate-pulse">
                <MessageCircle className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">Join Our Telegram Channel</h3>
                <p className="text-sm text-muted-foreground">
                  Stay updated with the latest news, exclusive offers, and announcements from RedPay!
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  href={TELEGRAM_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Join Telegram Channel
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setShowTelegramBanner(false)}
                >
                  Maybe Later
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notification Enable Banner */}
      {showNotificationBanner && !showTelegramBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-40 animate-fade-in">
          <Card className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 border-amber-400/50 shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">Enable Notifications</p>
                  <p className="text-white/80 text-xs">Get alerts for bonuses & updates</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleEnableNotifications}
                    size="sm"
                    disabled={isEnablingNotifications}
                    className="bg-white text-amber-600 hover:bg-white/90 font-semibold"
                  >
                    {isEnablingNotifications ? 'Enabling...' : 'Enable'}
                  </Button>
                  <Button
                    onClick={() => setShowNotificationBanner(false)}
                    size="sm"
                    variant="ghost"
                    className="text-white/80 hover:text-white hover:bg-white/10 p-1 h-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 px-3 py-3 max-w-4xl mx-auto space-y-3">
        {/* Video Button - Above Balance */}
        <div className="flex justify-end">
          <Button
            onClick={handleOpenVideo}
            variant="outline"
            size="sm"
            className="bg-primary/10 hover:bg-primary/20 border-primary text-primary font-semibold"
          >
            <Video className="w-3 h-3 mr-1" />
            Video
          </Button>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 border-primary shadow-glow animate-fade-in float-element">
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

        {/* Advert Carousel - Top */}
        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in overflow-hidden float-element-slow">
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
                      className="w-full h-auto max-h-24 object-cover" 
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
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

        {/* Advert Carousel - Bottom */}
        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in overflow-hidden float-element-delayed">
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
                      className="w-full h-auto max-h-24 object-cover" 
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </CardContent>
        </Card>
      </main>

      {/* Video Modal */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
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

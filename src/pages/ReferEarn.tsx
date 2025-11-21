import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import { Copy, Users, Gift, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const ReferEarn = () => {
  const { profile } = useAuth();
  const [referralCount, setReferralCount] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferralData = async () => {
      if (!profile) return;

      // Get referral count
      const { count, error: countError } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', profile.user_id);

      if (!countError && count !== null) {
        setReferralCount(count);
        setReferralEarnings(count * 5000);
      }

      setLoading(false);
    };

    fetchReferralData();
  }, [profile]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const shareReferral = (template: 'casual' | 'friendly' | 'short' = 'casual') => {
    if (!profile) return;
    const referralLink = `${window.location.origin}/?ref=${profile.referral_code}`;
    
    const messages = {
      casual: `🚀 Join me on RedPay and start earning!\nSign up with my link & get started: ${referralLink} ✅\nYou can install the app below 👇`,
      friendly: `🔥 I'm using RedPay — fast, safe payments + referral rewards!\nUse my link to sign up so we both win: ${referralLink}\nTap the link, register and start earning. You can install the app below 👇`,
      short: `Join RedPay with my link: ${referralLink} — register now and start earning!`
    };
    
    if (navigator.share) {
      navigator.share({
        title: "Join RedPay",
        text: messages[template],
        url: referralLink,
      });
    } else {
      copyToClipboard(referralLink, "Referral link");
    }
  };

  if (!profile || loading) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  const referralLink = `${window.location.origin}/?ref=${profile.referral_code}`;

  return (
    <div className="min-h-screen w-full relative">
      <LiquidBackground />

      <header className="relative z-10 px-3 py-2 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
        <Logo />
        <ProfileButton />
      </header>

      <main className="relative z-10 px-3 py-4 max-w-4xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Refer & Earn</h1>
          <p className="text-sm text-muted-foreground">Invite friends and earn rewards</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          <Card className="bg-card/60 backdrop-blur-sm border-border">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{referralCount}</p>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </CardContent>
          </Card>
          <Card className="bg-card/60 backdrop-blur-sm border-border">
            <CardContent className="p-4 text-center">
              <Gift className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-success">₦{referralEarnings.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Rewards Info */}
        <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent backdrop-blur-sm border-primary/30 animate-fade-in">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Share your link and earn ₦5,000 per referral</p>
            <div className="flex items-center justify-center gap-2 text-xs">
              <span className="text-muted-foreground">Your referral link:</span>
              <button
                onClick={() => copyToClipboard(referralLink, "Referral link")}
                className="text-primary underline"
              >
                {referralLink}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Referral Code */}
        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>Your Referral Code</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <span className="text-2xl font-bold text-primary font-mono">{profile.referral_code}</span>
                <Button
                  onClick={() => copyToClipboard(profile.referral_code, "Referral code")}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Share2 className="w-4 h-4" />
                <span>Referral Link</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-secondary/20 rounded-lg text-xs font-mono text-foreground truncate">
                  {referralLink}
                </div>
                <Button
                  onClick={() => copyToClipboard(referralLink, "Referral link")}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={() => shareReferral('casual')} className="w-full" size="lg">
                <Share2 className="w-4 h-4 mr-2" />
                Share (Quick & Casual)
              </Button>
              <Button onClick={() => shareReferral('friendly')} className="w-full" variant="outline" size="lg">
                <Share2 className="w-4 h-4 mr-2" />
                Share (Friendly Pitch)
              </Button>
              <Button onClick={() => shareReferral('short')} className="w-full" variant="outline" size="lg">
                <Share2 className="w-4 h-4 mr-2" />
                Share (Short & Urgent)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-foreground">How It Works</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Share Your Code</p>
                  <p className="text-xs text-muted-foreground">Send your referral code to friends and family</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">They Sign Up</p>
                  <p className="text-xs text-muted-foreground">Your friend registers using your referral code</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Earn Rewards</p>
                  <p className="text-xs text-muted-foreground">Get ₦5,000 credited to your wallet instantly</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ReferEarn;

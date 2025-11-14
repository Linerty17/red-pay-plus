import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import { Copy, Users, Gift, Share2 } from "lucide-react";
import { toast } from "sonner";

const ReferEarn = () => {
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");

  useEffect(() => {
    const code = localStorage.getItem("referralCode") || "REF123456";
    const link = `${window.location.origin}/?ref=${code}`;
    setReferralCode(code);
    setReferralLink(link);
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const shareReferral = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join RedPay",
        text: `Use my referral code ${referralCode} to join RedPay and get amazing bonuses!`,
        url: referralLink,
      });
    } else {
      copyToClipboard(referralLink, "Referral link");
    }
  };

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

        {/* Rewards Info */}
        <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent backdrop-blur-sm border-primary/30 animate-fade-in">
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <Gift className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Earn ₦5,000 Per Referral!</h2>
            <p className="text-sm text-muted-foreground">Share your referral code and earn rewards when friends sign up</p>
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
                <span className="text-2xl font-bold text-primary font-mono">{referralCode}</span>
                <Button
                  onClick={() => copyToClipboard(referralCode, "Referral code")}
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

            <Button onClick={shareReferral} className="w-full" size="lg">
              <Share2 className="w-4 h-4 mr-2" />
              Share Referral Link
            </Button>
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

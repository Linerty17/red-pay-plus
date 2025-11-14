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

const Dashboard = () => {
  const [balance, setBalance] = useState(160000);
  const [userId] = useState(() => {
    let id = localStorage.getItem("userId");
    if (!id) {
      id = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      localStorage.setItem("userId", id);
    }
    return id;
  });
  const [nextClaimAt, setNextClaimAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  // Initialize balance and claim timer from localStorage
  useEffect(() => {
    const savedBalance = localStorage.getItem("balance");
    if (savedBalance) {
      setBalance(parseInt(savedBalance));
    } else {
      localStorage.setItem("balance", "160000");
    }

    const savedClaimTime = localStorage.getItem("nextClaimAt");
    if (savedClaimTime) {
      const claimDate = new Date(savedClaimTime);
      if (claimDate.getTime() > Date.now()) {
        setNextClaimAt(claimDate);
      } else {
        localStorage.removeItem("nextClaimAt");
      }
    }
  }, []);

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

  const handleClaim = () => {
    if (nextClaimAt) {
      toast.error(`Next claim in ${timeLeft}`);
      return;
    }
    
    const newBalance = balance + 30000;
    setBalance(newBalance);
    localStorage.setItem("balance", newBalance.toString());
    
    // Save transaction to history
    const transactions = JSON.parse(localStorage.getItem("transactions") || "[]");
    transactions.unshift({
      id: Date.now(),
      type: "credit",
      title: "Daily Claim Bonus",
      date: new Date().toLocaleString(),
      amount: "+₦30,000",
    });
    localStorage.setItem("transactions", JSON.stringify(transactions));
    
    toast.success("Success — ₦30,000 added to your wallet!");
    
    const next = new Date();
    next.setHours(next.getHours() + 24);
    setNextClaimAt(next);
    localStorage.setItem("nextClaimAt", next.toISOString());
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
                  ₦{balance.toLocaleString()}
                </div>
                <div className="text-xs text-primary-foreground/60">
                  ID: {userId}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleClaim}
                  variant="secondary"
                  size="sm"
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                  disabled={!!nextClaimAt}
                >
                  <Gift className="w-3 h-3 mr-1" />
                  {nextClaimAt ? `Next claim in ${timeLeft}` : "Claim ₦30,000"}
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
      </main>
    </div>
  );
};

export default Dashboard;

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import { PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Welcome = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const firstName = searchParams.get("firstName") || "User";
  const [balance, setBalance] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const targetBalance = 160000;

  useEffect(() => {
    // Check if user was referred
    const checkReferral = async () => {
      const refCode = localStorage.getItem("referral_code");
      if (refCode) {
        const { data } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('referral_code', refCode)
          .single();
        
        if (data) {
          setReferrerName(`${data.first_name} ${data.last_name}`);
        }
        // Clear the referral code after using it
        localStorage.removeItem("referral_code");
      }
    };
    checkReferral();
    
    // Trigger confetti animation
    setShowConfetti(true);
    
    // Animate balance counter
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = targetBalance / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetBalance) {
        setBalance(targetBalance);
        clearInterval(timer);
      } else {
        setBalance(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, []);

  // Generate confetti particles
  const confettiColors = ["bg-primary", "bg-yellow-500", "bg-green-500", "bg-blue-500", "bg-purple-500"];
  const confettiParticles = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    size: Math.random() * 10 + 5,
  }));

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      <LiquidBackground />

      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {confettiParticles.map((particle) => (
            <div
              key={particle.id}
              className={`celebration-confetti ${particle.color} rounded-full absolute`}
              style={{
                left: particle.left,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                animationDelay: particle.delay,
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-lg relative z-20 animate-scale-in">
        <Card className="bg-card/90 backdrop-blur-sm border-border shadow-elevated">
          <CardContent className="pt-12 pb-12 px-6 space-y-8">
            {/* Celebration Icon */}
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center animate-bounce">
                <PartyPopper className="w-12 h-12 text-primary" />
              </div>
            </div>

            {/* Welcome Message */}
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-foreground">
                Welcome, {firstName}!
              </h1>
              <p className="text-muted-foreground text-lg">
                Your account is ready to go
              </p>
            </div>

            {/* Bonus Display */}
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 text-center space-y-4 border border-primary/20">
              <p className="text-muted-foreground font-medium">Welcome Bonus</p>
              <div className="space-y-2">
                <div className="text-5xl font-bold text-primary counter-animate">
                  ₦{balance.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  has been added to your wallet 🎊
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-primary-foreground hover-lift"
            >
              Go to Dashboard
            </Button>

            {/* Additional Info */}
            {referrerName && (
              <div className="bg-primary/10 rounded-lg p-4 text-center border border-primary/20">
                <p className="text-sm text-foreground">
                  🎉 Welcome! You signed up with a referral. <span className="font-semibold">{referrerName}</span> will receive ₦5,000 once your registration completes. Thanks for joining RedPay!
                </p>
              </div>
            )}
            <p className="text-center text-sm text-muted-foreground">
              Start exploring RedPay and enjoy seamless payments
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Welcome;

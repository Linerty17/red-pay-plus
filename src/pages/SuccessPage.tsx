import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LiquidBackground from "@/components/LiquidBackground";
import { PartyPopper, Check } from "lucide-react";

const SuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "transaction";
  const amount = searchParams.get("amount") || "";
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const confettiColors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];
  const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 3}s`,
    backgroundColor: confettiColors[Math.floor(Math.random() * confettiColors.length)],
  }));

  const getMessage = () => {
    switch (type) {
      case "airtime":
        return "Airtime Purchase Successful!";
      case "data":
        return "Data Purchase Successful!";
      case "withdraw":
        return "Withdrawal Successful!";
      default:
        return "Transaction Successful!";
    }
  };

  const getSubMessage = () => {
    switch (type) {
      case "airtime":
        return "Your airtime has been delivered successfully";
      case "data":
        return "Your data bundle has been activated";
      case "withdraw":
        return "Your funds will be processed within 24 hours";
      default:
        return "Your transaction was completed successfully";
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      <LiquidBackground />

      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {confettiParticles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-2 h-2 animate-[fall_3s_linear_infinite]"
              style={{
                left: particle.left,
                animationDelay: particle.animationDelay,
                backgroundColor: particle.backgroundColor,
              }}
            />
          ))}
        </div>
      )}

      <main className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
        <Card className="bg-card/80 backdrop-blur-sm border-border animate-scale-in max-w-md w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="relative">
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <PartyPopper className="w-12 h-12 text-primary" />
              </div>
              <div className="absolute -top-2 -right-2 w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-green-500" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                Congratulations!
              </h1>
              <p className="text-xl font-semibold text-primary">
                {getMessage()}
              </p>
              <p className="text-sm text-muted-foreground">
                {getSubMessage()}
              </p>
            </div>

            {amount && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold text-primary">₦{amount}</p>
              </div>
            )}

            <Button 
              onClick={() => navigate("/dashboard")} 
              className="w-full" 
              size="lg"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </main>

      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default SuccessPage;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import PaymentNoticeDialog from "@/components/PaymentNoticeDialog";
import { Check } from "lucide-react";
import { toast } from "sonner";

const BuyRPC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [success, setSuccess] = useState(false);
  const [showNoticeDialog, setShowNoticeDialog] = useState(false);

  const navigate = useNavigate();
  const [userId] = useState(localStorage.getItem("userId") || "1234567890");

  useEffect(() => {
    // Pre-fill form with saved data
    const name = localStorage.getItem("userName") || "";
    const email = localStorage.getItem("userEmail") || "";
    const phone = localStorage.getItem("userPhone") || "";
    
    if (name || email || phone) {
      setFormData({ name, email, phone });
    }
  }, []);

  const handleProceed = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    setLoadingStep("Initiating");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoadingStep("Verifying");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoadingStep("Processing");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    
    // Show payment notice dialog
    setShowNoticeDialog(true);
  };

  const handleConfirmNotice = () => {
    setShowNoticeDialog(false);
    navigate("/payment-instructions");
  };

  if (success) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <Card className="relative z-10 bg-card/80 backdrop-blur-sm border-border animate-scale-in">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Payment Successful!</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <div className="relative z-10">
          <LoadingSpinner message={loadingStep} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative">
      <LiquidBackground />

      <header className="relative z-10 px-3 py-2 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
        <Logo />
        <ProfileButton />
      </header>

      <main className="relative z-10 px-3 py-4 max-w-4xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Buy RPC</h1>
          <p className="text-sm text-muted-foreground">Purchase RedPay Credits</p>
        </div>

        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
          <CardContent className="p-4 space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold text-primary">₦6,700</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="userId" className="text-xs">User ID</Label>
                <Input
                  id="userId"
                  value={userId}
                  disabled
                  className="h-9 bg-secondary/20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>

            <Button onClick={handleProceed} className="w-full" size="lg">
              Proceed
            </Button>
          </CardContent>
        </Card>
      </main>

      <PaymentNoticeDialog
        open={showNoticeDialog}
        onOpenChange={setShowNoticeDialog}
        onConfirm={handleConfirmNotice}
      />
    </div>
  );
};

export default BuyRPC;

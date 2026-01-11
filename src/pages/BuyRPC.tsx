import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import PaymentNoticeDialog from "@/components/PaymentNoticeDialog";
import { Check, Copy, AlertTriangle, CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const buyRPCSchema = z.object({
  name: z.string().trim()
    .min(3, 'Name must be at least 3 characters').max(100, 'Name too long')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email too long'),
  phone: z.string().trim()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format')
});

const BuyRPC = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const invalidCode = location.state?.invalidCode;
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState("");
  const [success, setSuccess] = useState(false);
  const [showNoticeDialog, setShowNoticeDialog] = useState(false);
  const [approvedPurchase, setApprovedPurchase] = useState<any>(null);
  const [pendingPurchase, setPendingPurchase] = useState<any>(null);
  const [globalRpcCode, setGlobalRpcCode] = useState<string | null>(null);
  const [rpcCodeCopied, setRpcCodeCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const navigate = useNavigate();
  const [userId] = useState(localStorage.getItem("userId") || "1234567890");

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      const referralUrl = `${window.location.origin}/?ref=${profile.referral_code}`;
      navigator.clipboard.writeText(referralUrl);
      toast.success("Referral link copied to clipboard!");
    }
  };

  const copyRpcCode = () => {
    const code = globalRpcCode || approvedPurchase?.rpc_code_issued;
    if (code) {
      navigator.clipboard.writeText(code);
      setRpcCodeCopied(true);
      toast.success("RPC Code copied!");
      setTimeout(() => setRpcCodeCopied(false), 2000);
    }
  };

  useEffect(() => {
    checkExistingApproval();
    
    // Pre-fill form with saved data
    const name = localStorage.getItem("userName") || "";
    const email = localStorage.getItem("userEmail") || "";
    const phone = localStorage.getItem("userPhone") || "";
    
    if (name || email || phone) {
      setFormData({ name, email, phone });
    }

    // Subscribe to real-time updates for the user's purchases
    if (profile?.user_id) {
      const channel = supabase
        .channel('buyrpc-status-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rpc_purchases',
            filter: `user_id=eq.${profile.user_id}`
          },
          (payload) => {
            const newData = payload.new as any;
            // If payment was cancelled or rejected, clear the pending purchase state
            if (newData.status === 'cancelled' || newData.status === 'rejected') {
              setApprovedPurchase(null);
              setPendingPurchase(null);
            } else if (newData.status === 'approved') {
              setApprovedPurchase(newData);
              setPendingPurchase(null);
              fetchGlobalRpcCode();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.user_id]);

  const fetchGlobalRpcCode = async () => {
    const { data: settingsData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'rpc_code')
      .maybeSingle();
    
    if (settingsData?.value) {
      setGlobalRpcCode(settingsData.value);
    }
  };

  const checkExistingApproval = async () => {
    if (!profile?.user_id) {
      setLoading(false);
      return;
    }

    try {
      // Check if user has an approved purchase
      const { data: purchaseData } = await supabase
        .from('rpc_purchases')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (purchaseData) {
        setApprovedPurchase(purchaseData);
        // Fetch global RPC code
        const { data: settingsData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'rpc_code')
          .maybeSingle();
        
        if (settingsData?.value) {
          setGlobalRpcCode(settingsData.value);
        }
      } else {
        // Check if user has a pending purchase
        const { data: pendingData } = await supabase
          .from('rpc_purchases')
          .select('*')
          .eq('user_id', profile.user_id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pendingData) {
          setPendingPurchase(pendingData);
        }
      }
    } catch (error) {
      console.error('Error checking approval:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = async () => {
    // Validate form data with Zod
    const validation = buyRPCSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setLoading(true);
    setLoadingStep("Initiating");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoadingStep("Verifying");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoadingStep("Processing");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Clear loading states BEFORE showing dialog
    setLoadingStep("");
    setLoading(false);
    
    // Show payment notice dialog
    setShowNoticeDialog(true);
  };

  const handleConfirmNotice = () => {
    setShowNoticeDialog(false);
    navigate("/payment-instructions");
  };

  // Show loading step animation when processing form with enhanced transition
  if (loadingStep) {
    const steps = ["Initiating", "Verifying", "Processing"];
    const currentStepIndex = steps.indexOf(loadingStep);
    
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <div className="relative z-10 flex flex-col items-center gap-6 p-8">
          {/* Animated circular loader */}
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-primary/30 border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
          
          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                  index < currentStepIndex 
                    ? 'bg-primary text-primary-foreground scale-90' 
                    : index === currentStepIndex 
                      ? 'bg-primary text-primary-foreground animate-pulse scale-110' 
                      : 'bg-muted text-muted-foreground scale-75'
                }`}>
                  {index < currentStepIndex ? '✓' : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 transition-all duration-500 ${
                    index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          {/* Current step label */}
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground animate-pulse">{loadingStep}...</p>
            <p className="text-xs text-muted-foreground mt-1">Please wait while we prepare your payment</p>
          </div>
        </div>
      </div>
    );
  }

  // Show initial loading only when checking existing approval status
  if (loading && !loadingStep) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <div className="relative z-10">
          <LoadingSpinner message="Checking status..." />
        </div>
      </div>
    );
  }

  // If user has approved purchase, show the approval page with code
  if (approvedPurchase) {
    const rpcCode = globalRpcCode || approvedPurchase.rpc_code_issued;
    
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <Card className="relative z-10 mx-4 max-w-md w-full bg-card/90 backdrop-blur-sm border-primary/50 shadow-2xl animate-scale-in">
          <CardContent className="p-8 text-center space-y-6">
            {/* Animated Check icon */}
            <div className="relative">
              <div className="w-28 h-28 mx-auto relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 bg-primary/10 rounded-full" />
                <div className="relative w-28 h-28 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                  <CheckCircle2 className="w-14 h-14 text-primary-foreground animate-bounce" style={{ animationDuration: '2s' }} />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
                Payment Approved ✅
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your RPC code is active and ready to use!
              </p>
            </div>

            {/* RPC Code Display */}
            {rpcCode && (
              <div className="bg-primary/10 border-2 border-primary/30 rounded-xl p-5 space-y-3">
                <p className="text-sm font-semibold text-primary">Your RPC Access Code:</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-bold text-foreground tracking-wider font-mono bg-card px-4 py-2 rounded-lg border border-border">
                    {rpcCode}
                  </span>
                  <Button
                    onClick={copyRpcCode}
                    size="icon"
                    variant="outline"
                    className="h-12 w-12 border-primary/50 hover:bg-primary/10"
                  >
                    {rpcCodeCopied ? (
                      <Check className="w-5 h-5 text-primary" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Activation Notice - Prominent Warning */}
            <div className="bg-gradient-to-r from-red-500/20 via-amber-500/20 to-red-500/20 border-2 border-red-500/60 rounded-xl p-5 space-y-4 relative overflow-hidden shadow-lg shadow-red-500/20">
              {/* Animated border glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 via-amber-400/20 to-red-400/10 animate-pulse" />
              
              <div className="relative space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <AlertTriangle className="w-7 h-7 text-red-500 animate-bounce" style={{ animationDuration: '1.5s' }} />
                  <h3 className="text-xl font-bold text-red-500">⚠️ ACTIVATION REQUIRED ⚠️</h3>
                  <AlertTriangle className="w-7 h-7 text-red-500 animate-bounce" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
                </div>
                
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
                  <p className="text-base text-foreground font-bold text-center leading-relaxed">
                    🚫 Your RPC code will <span className="text-red-500 underline">NOT WORK</span> until activated!
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    You <span className="text-amber-500 font-semibold">won't be credited</span> and <span className="text-amber-500 font-semibold">cannot withdraw</span> until your code is activated on our portal.
                  </p>
                </div>

                <Button 
                  onClick={() => window.open('https://redpay-validation.vercel.app/', '_blank')}
                  className="w-full bg-gradient-to-r from-red-500 via-amber-500 to-red-500 hover:from-red-600 hover:via-amber-600 hover:to-red-600 text-white font-bold text-lg shadow-xl shadow-red-500/40 border-0 animate-pulse py-6" 
                  style={{ animationDuration: '2s' }}
                  size="lg"
                >
                  <ExternalLink className="w-6 h-6 mr-2" />
                  🔓 TAP HERE TO ACTIVATE NOW
                </Button>
                
                <p className="text-xs text-red-400 text-center font-medium">
                  ⏰ Activate immediately to start earning!
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/dashboard', { state: { showPaymentStatus: true } })}
                className="w-full bg-primary hover:bg-primary/90 shadow-lg" 
                size="lg"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user has pending purchase, show pending status
  if (pendingPurchase) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <Card className="relative z-10 mx-4 max-w-md w-full bg-card/90 backdrop-blur-sm border-orange-500/50 shadow-2xl animate-scale-in">
          <CardContent className="p-8 text-center space-y-6">
            {/* Animated Clock icon */}
            <div className="relative">
              <div className="w-28 h-28 mx-auto relative">
                <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 bg-orange-500/10 rounded-full" />
                <div className="relative w-28 h-28 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <AlertTriangle className="w-14 h-14 text-white" />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-orange-500 flex items-center justify-center gap-2">
                Payment Under Review ⏳
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You already have a payment waiting for approval. Please wait while our team verifies your payment.
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 space-y-2 text-left">
              <p className="text-sm font-semibold text-orange-500">What happens next?</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Our team will verify your payment proof</li>
                <li>• You'll receive a notification once approved</li>
                <li>• This usually takes a few minutes to hours</li>
                <li>• Contact support if it takes longer than 24 hours</li>
              </ul>
            </div>

            {/* Submission Details */}
            <div className="bg-secondary/50 border border-border rounded-lg p-4 space-y-2 text-left">
              <p className="text-sm font-semibold text-foreground">Your Submission</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Submitted: {new Date(pendingPurchase.created_at).toLocaleString()}</p>
                <p>Name: {pendingPurchase.user_name}</p>
                <p>Email: {pendingPurchase.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive"
                    className="w-full" 
                    size="lg"
                    disabled={cancelling}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {cancelling ? "Cancelling..." : "Cancel Payment Request"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Payment Request?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel this payment request? This action cannot be undone. 
                      You will need to submit a new payment if you want to purchase RPC again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Request</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        setCancelling(true);
                        try {
                          const { error } = await supabase
                            .from('rpc_purchases')
                            .update({ status: 'cancelled' })
                            .eq('id', pendingPurchase.id);
                          
                          if (error) throw error;
                          
                          setPendingPurchase(null);
                          toast.success("Payment request cancelled successfully");
                        } catch (error) {
                          console.error('Error cancelling:', error);
                          toast.error("Failed to cancel request. Please try again.");
                        } finally {
                          setCancelling(false);
                        }
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, Cancel Request
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button 
                onClick={() => window.open('https://t.me/OfficialChixx9ja', '_blank')}
                variant="outline"
                className="w-full border-orange-500/30 hover:bg-orange-500/10" 
                size="lg"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Contact Support
              </Button>
              
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                className="w-full" 
                size="lg"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

        {/* Invalid Code Warning Banner */}
        {invalidCode && (
          <Card className="bg-destructive/10 border-destructive/30 animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-destructive">Invalid RPC Code!</h3>
                  <p className="text-sm text-muted-foreground">
                    The access code you entered is incorrect or you don't have one yet. 
                    Please purchase an RPC Code below to access withdrawal and broadcast features.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in float-element-fast">
          <CardContent className="p-4 space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold text-primary">₦6,670</p>
            </div>

            {profile?.referral_code && (
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">Your Referral Code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-background/50 rounded border border-border text-sm font-mono text-foreground">
                    {profile.referral_code}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyReferralCode}
                    className="shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this code and earn ₦5,000 for each referral!
                </p>
              </div>
            )}

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

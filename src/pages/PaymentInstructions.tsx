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
import { Copy, Check, Upload, Clock, RefreshCw, XCircle, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
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
  const [timeElapsed, setTimeElapsed] = useState({ minutes: 0, seconds: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SECURITY: No fallback values - must be loaded from database
  const [amount, setAmount] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState<string | null>(null);
  const [bankName, setBankName] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState(false);

  useEffect(() => {
    fetchPaymentSettings();
    checkExistingPurchase();
  }, []);

  // Countdown/elapsed timer effect
  useEffect(() => {
    if (!pendingPurchase?.created_at || pendingPurchase?.verified) return;

    const updateTimer = () => {
      const createdAt = new Date(pendingPurchase.created_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - createdAt) / 1000);
      
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      
      setTimeElapsed({ minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [pendingPurchase]);

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
        // Check for pending purchase only (exclude cancelled and rejected - they should start fresh)
        const { data: purchase } = await supabase
          .from('rpc_purchases')
          .select('*')
          .eq('user_id', userData.user_id)
          .not('status', 'in', '("cancelled","rejected")')
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

      // SECURITY: Validate all required settings are present
      const requiredKeys = ['payment_amount', 'account_number', 'bank_name', 'account_name'];
      const foundKeys = data?.map(s => s.key) || [];
      const missingKeys = requiredKeys.filter(k => !foundKeys.includes(k));
      
      if (missingKeys.length > 0) {
        console.error('SECURITY: Missing payment settings:', missingKeys);
        setSettingsError(true);
        toast.error('Payment configuration error. Please contact support.');
        return;
      }

      // SECURITY: Validate each setting has a non-empty value
      for (const setting of data || []) {
        if (!setting.value || setting.value.trim() === '') {
          console.error('SECURITY: Empty payment setting:', setting.key);
          setSettingsError(true);
          toast.error('Payment configuration error. Please contact support.');
          return;
        }
      }

      data?.forEach((setting) => {
        switch (setting.key) {
          case 'payment_amount':
            const num = parseInt(setting.value);
            if (isNaN(num) || num <= 0) {
              console.error('SECURITY: Invalid payment amount');
              setSettingsError(true);
              return;
            }
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
      console.error('SECURITY: Error fetching payment settings:', error);
      setSettingsError(true);
      toast.error('Failed to load payment details. Please try again later.');
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
    console.log('handlePaymentConfirm called, screenshot:', screenshot?.name);
    
    if (!screenshot) {
      toast.error("Please upload payment screenshot");
      return;
    }

    // Prevent double submission
    if (isSubmitting) {
      toast.error("Payment already being submitted");
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    try {
      console.log('Getting auth user...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('Auth result:', { user: user?.id, authError });
      
      if (!user) {
        toast.error("Please login first");
        navigate('/auth');
        return;
      }

      // Get user profile
      console.log('Fetching user profile for auth_user_id:', user.id);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      console.log('User profile result:', { userData: userData?.user_id, userError });

      if (userError || !userData) {
        console.error('User profile error:', userError);
        toast.error("User profile not found");
        return;
      }

      // Upload screenshot to storage
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${userData.user_id}-${Date.now()}.${fileExt}`;
      console.log('Uploading file:', `payments/${fileName}`, 'size:', screenshot.size);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(`payments/${fileName}`, screenshot);

      console.log('Upload result:', { uploadData, uploadError });

      if (uploadError) {
        console.error('Upload error details:', JSON.stringify(uploadError, null, 2));
        toast.error("Failed to upload screenshot: " + (uploadError.message || 'Unknown error'));
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

      // Notify admins about new payment (non-blocking)
      supabase.functions.invoke('notify-admin-payment', {
        body: {
          userName: `${userData.first_name} ${userData.last_name}`,
          userEmail: userData.email,
          paymentId: purchase.id
        }
      }).catch(err => console.log('Admin notification sent in background:', err));
    } catch (error) {
      console.error('Error:', error);
      toast.error("An error occurred");
      setIsSubmitting(false);
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
    window.open('https://t.me/OfficialChixx9ja', '_blank');
  };

  // Get user's RPC code from users table
  const [userRpcCode, setUserRpcCode] = useState<string | null>(null);
  const [rpcCodeCopied, setRpcCodeCopied] = useState(false);

  useEffect(() => {
    const fetchUserRpcCode = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('rpc_code')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        if (data?.rpc_code) {
          setUserRpcCode(data.rpc_code);
        }
      }
    };
    fetchUserRpcCode();
  }, [pendingPurchase]);

  const copyRpcCode = () => {
    const code = userRpcCode || pendingPurchase?.rpc_code_issued;
    if (code) {
      navigator.clipboard.writeText(code);
      setRpcCodeCopied(true);
      toast.success("RPC Code copied!");
      setTimeout(() => setRpcCodeCopied(false), 2000);
    }
  };

  const handleTryAgain = () => {
    setPendingPurchase(null);
  };

  // Show rejected status
  if (pendingPurchase?.status === 'rejected') {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center p-4">
        <LiquidBackground />
        <Card className="relative z-10 bg-card/90 backdrop-blur-sm border-destructive/30 animate-scale-in max-w-md w-full">
          <CardContent className="p-8 text-center space-y-6">
            {/* Animated X icon */}
            <div className="relative">
              <div className="w-24 h-24 mx-auto relative">
                <div className="absolute inset-0 bg-destructive/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 bg-destructive/10 rounded-full" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-destructive/80 to-destructive rounded-full flex items-center justify-center shadow-lg shadow-destructive/30">
                  <XCircle className="w-12 h-12 text-destructive-foreground animate-bounce" style={{ animationDuration: '2s' }} />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-destructive flex items-center justify-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Payment Not Approved
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unfortunately, we couldn't verify your payment. This could be due to incorrect payment details, 
                insufficient amount, or the screenshot provided was unclear.
              </p>
            </div>

            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-destructive">What to do next:</p>
              <ul className="text-xs text-muted-foreground text-left space-y-1">
                <li>• Ensure you transferred the exact amount specified</li>
                <li>• Make sure the screenshot clearly shows the transaction</li>
                <li>• Verify the account details before retrying</li>
                <li>• Contact support if you believe this is an error</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleTryAgain}
                className="w-full bg-primary hover:bg-primary/90" 
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                onClick={openTelegramSupport}
                variant="outline"
                className="w-full border-destructive/30 hover:bg-destructive/10" 
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

  // Show pending status
  if (pendingPurchase && !pendingPurchase.verified && pendingPurchase.status !== 'approved') {
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

            {/* Timer Display */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-primary font-semibold">Time Elapsed</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="bg-card border border-border rounded-lg px-4 py-2 min-w-[60px]">
                  <p className="text-2xl font-bold text-foreground font-mono">{String(timeElapsed.minutes).padStart(2, '0')}</p>
                  <p className="text-xs text-muted-foreground">min</p>
                </div>
                <span className="text-2xl font-bold text-foreground">:</span>
                <div className="bg-card border border-border rounded-lg px-4 py-2 min-w-[60px]">
                  <p className="text-2xl font-bold text-foreground font-mono">{String(timeElapsed.seconds).padStart(2, '0')}</p>
                  <p className="text-xs text-muted-foreground">sec</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Estimated completion: 10 - 30 minutes
              </p>
              {timeElapsed.minutes >= 30 && (
                <p className="text-xs text-primary mt-1 font-medium">
                  Taking longer than expected? Contact support below.
                </p>
              )}
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

  // Show approved status with beautiful animation
  if (pendingPurchase?.verified || pendingPurchase?.status === 'approved') {
    const displayCode = userRpcCode || pendingPurchase?.rpc_code_issued;
    
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center p-4">
        <LiquidBackground />
        <Card className="relative z-10 bg-card/90 backdrop-blur-sm border-primary/30 animate-scale-in max-w-md w-full overflow-hidden">
          {/* Celebration animation overlay */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '1.5s' }} />
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-primary/80 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '1.5s' }} />
            <div className="absolute top-0 left-3/4 w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '1.5s' }} />
          </div>
          
          <CardContent className="p-8 text-center space-y-6 relative">
            {/* Animated Success Icon */}
            <div className="relative">
              <div className="w-24 h-24 mx-auto relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 bg-primary/10 rounded-full" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 animate-pulse" style={{ animationDuration: '2s' }}>
                  <CheckCircle2 className="w-14 h-14 text-primary-foreground" />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
                Payment Received ✅
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Congratulations! Your payment has been verified and your RPC code is ready.
              </p>
            </div>

            {/* Important Notice */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-primary font-semibold">
                <AlertTriangle className="w-5 h-5" />
                <span>Important: Activation Required</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Before using your RPC code, you must first copy your code below and validate/activate it using the validation link. 
                Your code will not work until it has been properly activated.
              </p>
            </div>

            {/* RPC Code Display */}
            {displayCode && (
              <div className="bg-card border-2 border-primary/50 rounded-xl p-5 space-y-3 shadow-lg shadow-primary/10">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Your RPC Access Code</p>
                <div className="flex items-center justify-center gap-3">
                  <p className="text-2xl font-mono font-bold text-primary tracking-wider bg-primary/10 px-4 py-2 rounded-lg">
                    {displayCode}
                  </p>
                  <Button
                    onClick={copyRpcCode}
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 border-primary/30 hover:bg-primary/10"
                  >
                    {rpcCodeCopied ? (
                      <Check className="w-5 h-5 text-primary" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-primary font-medium">
                  {rpcCodeCopied ? "Code copied to clipboard!" : "Click to copy your code"}
                </p>
              </div>
            )}

            {/* Validation Steps */}
            <div className="bg-secondary/50 border border-border rounded-lg p-4 text-left space-y-2">
              <p className="text-sm font-semibold text-foreground">Follow these steps:</p>
              <ol className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <span>Copy your RPC code using the button above</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <span>Click the "Activate Code" button below</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <span>Paste and validate your code on the activation page</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                  <span>Return here to access all features</span>
                </li>
              </ol>
            </div>

            <div className="space-y-3">
              {/* Validation Link Button */}
              <Button 
                onClick={() => window.open('https://redpay-validation.vercel.app/', '_blank')}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20" 
                size="lg"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Click Here to Activate Code
              </Button>
              
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="w-full" 
                size="lg"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || checkingStatus || loadingSettings) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <div className="relative z-10">
          <LoadingSpinner message={loading ? "Submitting Payment" : loadingSettings ? "Loading Payment Details" : "Checking Status"} />
        </div>
      </div>
    );
  }

  // SECURITY: Block payment form if settings failed to load
  if (settingsError || !amount || !accountNumber || !bankName || !accountName) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center p-4">
        <LiquidBackground />
        <Card className="relative z-10 bg-card/90 backdrop-blur-sm border-destructive/30 max-w-md w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-destructive">Configuration Error</h2>
              <p className="text-sm text-muted-foreground">
                Payment details could not be loaded. Please contact support or try again later.
              </p>
            </div>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full" 
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={openTelegramSupport}
                variant="outline"
                className="w-full" 
                size="lg"
              >
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
              disabled={!screenshot || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "I Have Made Payment"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PaymentInstructions;

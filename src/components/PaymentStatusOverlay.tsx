import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Copy, Check, ExternalLink, AlertTriangle, RefreshCw, Ban } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { playApprovalSound, playRejectionSound } from "@/hooks/useNotificationSound";

interface PaymentStatusOverlayProps {
  userId: string;
  onClose: () => void;
  checkOnMount?: boolean; // Only check for existing unacknowledged status on mount
  onStatusFound?: () => void; // Callback when a status is found (for realtime)
}

export const PaymentStatusOverlay = ({ userId, onClose, checkOnMount = true, onStatusFound }: PaymentStatusOverlayProps) => {
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<any>(null);
  const [globalRpcCode, setGlobalRpcCode] = useState<string | null>(null);
  const [rpcCodeCopied, setRpcCodeCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const soundPlayedRef = useRef<Set<string>>(new Set()); // Track which purchases have played sound

  useEffect(() => {
    if (checkOnMount) {
      checkPaymentStatus();
    } else {
      setLoading(false);
    }
    fetchGlobalRpcCode();
    
    // Subscribe to realtime updates - this always runs to catch live updates
    // Use unique channel name with userId to avoid conflicts on remount
    const channelName = `payment-status-${userId}-${Date.now()}`;
    console.log('PaymentStatusOverlay: Subscribing to realtime channel:', channelName, 'for user:', userId);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rpc_purchases',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('PaymentStatusOverlay: Realtime update received:', payload);
          const newData = payload.new as any;
          if (newData && !newData.status_acknowledged && (newData.status === 'approved' || newData.status === 'rejected' || newData.status === 'cancelled')) {
            console.log('PaymentStatusOverlay: Showing overlay for status:', newData.status);
            setPurchase(newData);
            onStatusFound?.(); // Notify parent to show overlay
            
            // Play notification sound based on status (only once per purchase)
            const purchaseId = newData.id;
            if (!soundPlayedRef.current.has(purchaseId)) {
              soundPlayedRef.current.add(purchaseId);
              if (newData.status === 'approved') {
                playApprovalSound();
                fetchGlobalRpcCode();
              } else if (newData.status === 'rejected' || newData.status === 'cancelled') {
                playRejectionSound();
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('PaymentStatusOverlay: Channel subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, checkOnMount]);

  const fetchGlobalRpcCode = async () => {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'rpc_code')
      .maybeSingle();
    
    if (data?.value) {
      setGlobalRpcCode(data.value);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      const { data: purchaseData } = await supabase
        .from('rpc_purchases')
        .select('*')
        .eq('user_id', userId)
        .eq('status_acknowledged', false)
        .in('status', ['approved', 'rejected', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (purchaseData) {
        setPurchase(purchaseData);
        if (purchaseData.status === 'approved') {
          await fetchGlobalRpcCode();
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeStatus = async () => {
    if (!purchase) return;
    
    try {
      await supabase
        .from('rpc_purchases')
        .update({ status_acknowledged: true })
        .eq('id', purchase.id);
      
      onClose();
    } catch (error) {
      console.error('Error acknowledging status:', error);
    }
  };

  const copyRpcCode = () => {
    const code = globalRpcCode || purchase?.rpc_code_issued;
    if (code) {
      navigator.clipboard.writeText(code);
      setRpcCodeCopied(true);
      toast.success("RPC Code copied!");
      setTimeout(() => setRpcCodeCopied(false), 2000);
    }
  };

  const handleTryAgain = async () => {
    await acknowledgeStatus();
    navigate('/buyrpc');
  };

  if (loading || !purchase) return null;

  // Approved status
  if (purchase.status === 'approved') {
    const rpcCode = globalRpcCode || purchase.rpc_code_issued;
    
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md animate-fade-in">
        <Card className="mx-4 max-w-md w-full bg-card border-primary/50 shadow-2xl animate-scale-in">
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
                Payment Received ✅
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your payment has been verified and your RPC code is ready for use!
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

            {/* Activation Instructions */}
            <div className="bg-secondary/50 border border-border rounded-lg p-4 space-y-2 text-left">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                Important: Activate Before Use
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Before using your RPC code, you must first activate it through our validation portal. 
                Copy your code above, then click the button below to complete the activation process.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => window.open('https://redpay-validation.vercel.app/', '_blank')}
                className="w-full bg-primary hover:bg-primary/90 shadow-lg" 
                size="lg"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Click Here to Activate Code
              </Button>
              
              <Button 
                onClick={acknowledgeStatus}
                variant="outline"
                className="w-full" 
                size="lg"
              >
                Continue to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rejected status
  if (purchase.status === 'rejected') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md animate-fade-in">
        <Card className="mx-4 max-w-md w-full bg-card border-destructive/50 shadow-2xl animate-scale-in">
          <CardContent className="p-8 text-center space-y-6">
            {/* Animated X icon */}
            <div className="relative">
              <div className="w-28 h-28 mx-auto relative">
                <div className="absolute inset-0 bg-destructive/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 bg-destructive/10 rounded-full" />
                <div className="relative w-28 h-28 bg-gradient-to-br from-destructive/80 to-destructive rounded-full flex items-center justify-center shadow-lg shadow-destructive/30">
                  <XCircle className="w-14 h-14 text-destructive-foreground animate-bounce" style={{ animationDuration: '2s' }} />
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
                onClick={() => window.open('https://t.me/OfficialChixx9ja', '_blank')}
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
                onClick={acknowledgeStatus}
                variant="ghost"
                className="w-full" 
                size="lg"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cancelled status
  if (purchase.status === 'cancelled') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md animate-fade-in">
        <Card className="mx-4 max-w-md w-full bg-card border-orange-500/50 shadow-2xl animate-scale-in">
          <CardContent className="p-8 text-center space-y-6">
            {/* Animated Ban icon */}
            <div className="relative">
              <div className="w-28 h-28 mx-auto relative">
                <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 bg-orange-500/10 rounded-full" />
                <div className="relative w-28 h-28 bg-gradient-to-br from-orange-500/80 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Ban className="w-14 h-14 text-white animate-bounce" style={{ animationDuration: '2s' }} />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-orange-500 flex items-center justify-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Code Cancelled
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The RPC code you purchased has been cancelled by the administrator. 
                Your access has been revoked and you will need to purchase again.
              </p>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-orange-500">Why was it cancelled?</p>
              <ul className="text-xs text-muted-foreground text-left space-y-1">
                <li>• Payment issues or discrepancies</li>
                <li>• Violation of terms of service</li>
                <li>• Administrative action</li>
                <li>• Contact support for more details</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleTryAgain}
                className="w-full bg-primary hover:bg-primary/90" 
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Purchase Again
              </Button>
              
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
                onClick={acknowledgeStatus}
                variant="ghost"
                className="w-full" 
                size="lg"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

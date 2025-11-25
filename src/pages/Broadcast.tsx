import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import { Phone, Smartphone, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { z } from "zod";

const broadcastSchema = z.object({
  phoneNumber: z.string().trim()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format'),
  amount: z.string().trim()
    .regex(/^[0-9]+$/, 'Amount must be a number')
    .refine((val) => parseInt(val) >= 50, 'Minimum purchase is ₦50')
    .refine((val) => parseInt(val) <= 100000, 'Maximum purchase is ₦100,000'),
});

const Broadcast = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [isAirtime, setIsAirtime] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyAccessPin = async () => {
    if (!profile) {
      toast.error("Please log in to continue");
      return;
    }

    if (!pinInput.trim()) {
      toast.error("Please enter your RPC access code");
      return;
    }

    setVerifyingPin(true);
    try {
      // Check if user has purchased RPC and verify the code
      const { data: rpcData } = await supabase
        .from('users')
        .select('rpc_code, rpc_purchased')
        .eq('user_id', profile.user_id)
        .single();

      if (!rpcData?.rpc_purchased || !rpcData?.rpc_code) {
        toast.error("No RPC code found. Please purchase RPC first.");
        navigate('/buy-rpc');
        return;
      }

      if (rpcData.rpc_code !== pinInput.trim()) {
        toast.error("Invalid RPC code. Redirecting to Buy RPC...");
        setTimeout(() => navigate('/buy-rpc'), 1500);
        return;
      }

      // Access granted
      setIsAccessGranted(true);
      toast.success("Access granted!");
    } catch (error: any) {
      console.error('Error verifying RPC code:', error);
      toast.error("Failed to verify RPC code");
    } finally {
      setVerifyingPin(false);
    }
  };

  const handlePurchase = async () => {
    if (!profile) {
      toast.error("Please log in to continue");
      return;
    }

    // Validate form data with Zod
    const validation = broadcastSchema.safeParse({
      phoneNumber,
      amount
    });
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    const purchaseAmount = parseInt(amount);

    // Check balance
    if (purchaseAmount > (profile.balance || 0)) {
      toast.error("Insufficient balance");
      return;
    }

    setLoading(true);
    try {
      const newBalance = (profile.balance || 0) - purchaseAmount;
      
      // Update user balance
      const { error: updateError } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('user_id', profile.user_id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.user_id,
          title: `${isAirtime ? "Airtime" : "Data"} Purchase`,
          amount: -purchaseAmount,
          type: 'debit',
          transaction_id: `${isAirtime ? 'AIR' : 'DATA'}-${Date.now()}`,
          balance_before: profile.balance || 0,
          balance_after: newBalance,
          meta: {
            phone_number: phoneNumber,
            service_type: isAirtime ? 'airtime' : 'data'
          }
        });

      if (transactionError) throw transactionError;

      await refreshProfile();
      toast.success(`${isAirtime ? "Airtime" : "Data"} purchase successful!`);
      navigate(`/success?type=${isAirtime ? "airtime" : "data"}&amount=${purchaseAmount}`);
    } catch (error: any) {
      console.error('Error processing purchase:', error);
      toast.error(error.message || "Failed to process purchase");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <div className="relative z-10">
          <LoadingSpinner message={`Processing ${isAirtime ? 'Airtime' : 'Data'} Purchase`} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <div className="relative z-10 text-foreground">Loading...</div>
      </div>
    );
  }

  // Show PIN entry screen if access not granted
  if (!isAccessGranted) {
    return (
      <div className="min-h-screen w-full relative">
        <LiquidBackground />

        <header className="relative z-10 px-4 py-4 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
          <Logo />
          <ProfileButton />
        </header>

        <main className="relative z-10 px-4 py-8 max-w-md mx-auto">
          <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Broadcast Access</h1>
                <p className="text-sm text-muted-foreground">Enter your RPC code to proceed</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pin">RPC Access Code</Label>
                  <Input
                    id="pin"
                    type="password"
                    placeholder="Enter RPC code"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && verifyAccessPin()}
                    className="text-center text-lg tracking-widest"
                    disabled={verifyingPin}
                  />
                </div>

                <Button
                  onClick={verifyAccessPin}
                  className="w-full"
                  size="lg"
                  disabled={verifyingPin}
                >
                  {verifyingPin ? "Verifying..." : "Verify & Continue"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/buy-rpc')}
                  className="w-full"
                >
                  Don't have RPC? Buy Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Main broadcast form (shown after PIN verification)
  return (
    <div className="min-h-screen w-full relative">
      <LiquidBackground />

      {/* Header */}
      <header className="relative z-10 px-4 py-4 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
        <Logo />
        <ProfileButton />
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 py-8 max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Broadcast</h1>
          <p className="text-muted-foreground">Purchase airtime or data</p>
        </div>

        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
          <CardContent className="p-8 space-y-6">
            {/* Balance Display */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-primary">₦{(profile.balance || 0).toLocaleString()}</p>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-foreground" />
                <span className="font-medium text-foreground">
                  {isAirtime ? "Airtime" : "Data"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Airtime</span>
                <Switch
                  checked={!isAirtime}
                  onCheckedChange={(checked) => setIsAirtime(!checked)}
                />
                <span className="text-sm text-muted-foreground">Data</span>
              </div>
            </div>

            {/* Icon Display */}
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center">
                {isAirtime ? (
                  <Phone className="w-12 h-12 text-primary" />
                ) : (
                  <Smartphone className="w-12 h-12 text-primary" />
                )}
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08012345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  {isAirtime ? "Amount (₦)" : "Select Data Plan"}
                </Label>
                {isAirtime ? (
                  <Input
                    id="amount"
                    type="number"
                    placeholder="1000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-background/50"
                  />
                ) : (
                  <select
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background/50 text-foreground"
                  >
                    <option value="">Select data plan</option>
                    <option value="500">500MB - ₦500</option>
                    <option value="1000">1GB - ₦1,000</option>
                    <option value="2000">2GB - ₦2,000</option>
                    <option value="5000">5GB - ₦5,000</option>
                    <option value="10000">10GB - ₦10,000</option>
                  </select>
                )}
              </div>
            </div>

            <Button
              onClick={handlePurchase}
              className="w-full"
              size="lg"
            >
              Purchase {isAirtime ? "Airtime" : "Data"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Broadcast;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import { DollarSign, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const withdrawSchema = z.object({
  accountNumber: z.string().trim()
    .regex(/^[0-9]{10}$/, 'Account number must be 10 digits'),
  accountName: z.string().trim()
    .min(3, 'Name must be at least 3 characters').max(100, 'Name too long')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  bank: z.string().min(1, 'Please select a bank'),
  amount: z.string().trim()
    .regex(/^[0-9]+$/, 'Amount must be a number')
    .refine((val) => parseInt(val) >= 1000, 'Minimum withdrawal is ₦1,000')
    .refine((val) => parseInt(val) <= 10000000, 'Maximum withdrawal is ₦10,000,000'),
  rpcCode: z.string().trim()
    .regex(/^RPC[0-9]+$/, 'Invalid RPC code format')
});

const Withdraw = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [formData, setFormData] = useState({
    accountNumber: "",
    accountName: "",
    bank: "",
    amount: "",
    rpcCode: "",
  });
  const [loading, setLoading] = useState(false);

  const banks = [
    "Access Bank", "GTBank", "First Bank", "UBA", "Zenith Bank",
    "Stanbic IBTC", "Fidelity Bank", "Union Bank", "Sterling Bank",
    "Wema Bank", "Moniepoint", "Opay", "Kuda", "Palmpay"
  ];

  const handleWithdraw = async () => {
    if (!profile) {
      toast.error("Please log in to continue");
      return;
    }

    // Validate form data with Zod
    const validation = withdrawSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    // Validate RPC code against database
    const { data: rpcPurchase } = await supabase
      .from('rpc_purchases')
      .select('rpc_code_issued, verified')
      .eq('user_id', profile.user_id)
      .eq('verified', true)
      .single();

    if (!rpcPurchase || rpcPurchase.rpc_code_issued !== formData.rpcCode) {
      toast.error("Invalid or unverified RPC Code. Please purchase RPC first.");
      return;
    }

    const withdrawAmount = parseInt(formData.amount);

    // Check balance
    if (withdrawAmount > (profile.balance || 0)) {
      toast.error("Insufficient balance");
      return;
    }

    setLoading(true);
    try {
      const newBalance = (profile.balance || 0) - withdrawAmount;
      
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
          title: 'Withdrawal',
          amount: -withdrawAmount,
          type: 'debit',
          transaction_id: `WD-${Date.now()}`,
          balance_before: profile.balance || 0,
          balance_after: newBalance,
          meta: {
            account_number: formData.accountNumber,
            account_name: formData.accountName,
            bank: formData.bank
          }
        });

      if (transactionError) throw transactionError;

      await refreshProfile();
      toast.success("Withdrawal processed successfully!");
      navigate(`/success?type=withdraw&amount=${withdrawAmount.toLocaleString()}`);
    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      toast.error(error.message || "Failed to process withdrawal");
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <div className="relative z-10">
          <LoadingSpinner message="Processing Withdrawal" />
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

  return (
    <div className="min-h-screen w-full relative">
      <LiquidBackground />

      <header className="relative z-10 px-3 py-2 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
        <Logo />
        <ProfileButton />
      </header>

      <main className="relative z-10 px-3 py-4 max-w-4xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Withdraw Funds</h1>
          <p className="text-sm text-muted-foreground">Transfer money to your bank account</p>
        </div>

        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
          <CardContent className="p-4 space-y-4">
            {/* Balance Display */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-primary">₦{(profile?.balance || 0).toLocaleString()}</p>
            </div>

            <div className="space-y-3">
              {/* User ID (Fixed) */}
              <div className="space-y-1">
                <Label htmlFor="userId" className="text-xs">User ID</Label>
                <Input
                  id="userId"
                  value={profile?.user_id || ''}
                  disabled
                  className="h-9 bg-secondary/20"
                />
              </div>

              {/* Account Number */}
              <div className="space-y-1">
                <Label htmlFor="accountNumber" className="text-xs">Account Number</Label>
                <Input
                  id="accountNumber"
                  type="tel"
                  placeholder="1234567890"
                  maxLength={10}
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  className="h-9"
                />
              </div>

              {/* Account Name */}
              <div className="space-y-1">
                <Label htmlFor="accountName" className="text-xs">Account Name</Label>
                <Input
                  id="accountName"
                  placeholder="John Doe"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  className="h-9"
                />
              </div>

              {/* Bank Selection */}
              <div className="space-y-1">
                <Label htmlFor="bank" className="text-xs">Select Bank</Label>
                <Select value={formData.bank} onValueChange={(value) => setFormData({ ...formData, bank: value })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <Label htmlFor="amount" className="text-xs">Amount (₦)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="5000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">Minimum: ₦1,000</p>
              </div>

              {/* RPC Code */}
              <div className="space-y-1">
                <Label htmlFor="rpcCode" className="text-xs">Enter RPC Code</Label>
                <Input
                  id="rpcCode"
                  type="password"
                  placeholder="••••••••"
                  value={formData.rpcCode}
                  onChange={(e) => setFormData({ ...formData, rpcCode: e.target.value.toUpperCase() })}
                  className="h-9"
                />
                <p className="text-xs text-destructive">⚠️ RPC code is required for withdrawal</p>
              </div>
            </div>

            <Button onClick={handleWithdraw} className="w-full" size="lg">
              <DollarSign className="w-4 h-4 mr-2" />
              Withdraw Funds
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Withdraw;

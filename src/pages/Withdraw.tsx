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

const Withdraw = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    accountNumber: "",
    accountName: "",
    bank: "",
    amount: "",
    rpcCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userId] = useState(localStorage.getItem("userId") || "1234567890");
  const [currentBalance, setCurrentBalance] = useState(0);

  useEffect(() => {
    const balance = parseInt(localStorage.getItem("balance") || "160000");
    setCurrentBalance(balance);
  }, []);

  const banks = [
    "Access Bank", "GTBank", "First Bank", "UBA", "Zenith Bank",
    "Stanbic IBTC", "Fidelity Bank", "Union Bank", "Sterling Bank",
    "Wema Bank", "Moniepoint", "Opay", "Kuda", "Palmpay"
  ];

  const handleWithdraw = async () => {
    // Validation
    if (!formData.accountNumber || !formData.accountName || !formData.bank || !formData.amount || !formData.rpcCode) {
      toast.error("Please fill in all fields");
      return;
    }

    // Check RPC code
    const rpcPurchased = localStorage.getItem("rpcPurchased") === "true";
    const savedRPCCode = localStorage.getItem("rpcCode");
    
    if (!rpcPurchased) {
      toast.error("RPC Code required. Please purchase RPC first.");
      navigate("/buyrpc");
      return;
    }

    if (formData.rpcCode !== savedRPCCode) {
      toast.error("Invalid RPC Code");
      return;
    }

    const withdrawAmount = parseInt(formData.amount);
    if (withdrawAmount > currentBalance) {
      toast.error("Insufficient balance");
      return;
    }

    if (withdrawAmount < 1000) {
      toast.error("Minimum withdrawal is ₦1,000");
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Deduct from balance
    const newBalance = currentBalance - withdrawAmount;
    localStorage.setItem("balance", newBalance.toString());
    
    setLoading(false);
    setSuccess(true);
    
    setTimeout(() => {
      toast.success("Withdrawal successful!");
      navigate("/dashboard");
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <Card className="relative z-10 bg-card/80 backdrop-blur-sm border-border animate-scale-in max-w-md mx-3">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Withdrawal Successful!</h2>
            <p className="text-sm text-muted-foreground">Your funds will be processed within 24 hours</p>
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
          <LoadingSpinner message="Processing Withdrawal" />
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
          <h1 className="text-2xl font-bold text-foreground">Withdraw Funds</h1>
          <p className="text-sm text-muted-foreground">Transfer money to your bank account</p>
        </div>

        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
          <CardContent className="p-4 space-y-4">
            {/* Balance Display */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-primary">₦{currentBalance.toLocaleString()}</p>
            </div>

            <div className="space-y-3">
              {/* User ID (Fixed) */}
              <div className="space-y-1">
                <Label htmlFor="userId" className="text-xs">User ID</Label>
                <Input
                  id="userId"
                  value={userId}
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
                  placeholder="RPC2007"
                  value={formData.rpcCode}
                  onChange={(e) => setFormData({ ...formData, rpcCode: e.target.value.toUpperCase() })}
                  className="h-9 font-mono"
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

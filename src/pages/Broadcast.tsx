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
import { Phone, Smartphone } from "lucide-react";
import { toast } from "sonner";

const Broadcast = () => {
  const navigate = useNavigate();
  const [isAirtime, setIsAirtime] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [rpcCode, setRpcCode] = useState("");

  const handlePurchase = () => {
    if (!phoneNumber || !amount || !rpcCode) {
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

    if (rpcCode !== savedRPCCode) {
      toast.error("Invalid RPC Code");
      return;
    }

    // Save transaction to history
    const transactions = JSON.parse(localStorage.getItem("transactions") || "[]");
    transactions.unshift({
      id: Date.now(),
      type: "debit",
      title: `${isAirtime ? "Airtime" : "Data"} Purchase`,
      date: new Date().toLocaleString(),
      amount: `-₦${amount}`,
    });
    localStorage.setItem("transactions", JSON.stringify(transactions));
    
    navigate(`/success?type=${isAirtime ? "airtime" : "data"}&amount=${amount}`);
  };

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

              <div className="space-y-2">
                <Label htmlFor="rpcCode">RPC Code</Label>
                <Input
                  id="rpcCode"
                  type="password"
                  placeholder="••••••••"
                  value={rpcCode}
                  onChange={(e) => setRpcCode(e.target.value.toUpperCase())}
                  className="bg-background/50"
                />
                <p className="text-xs text-destructive">⚠️ RPC code is required to proceed</p>
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

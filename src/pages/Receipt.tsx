import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import { ArrowLeft, Check, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: string;
  date: string;
  transaction_id: string;
  balance_after: number;
  reference_id?: string;
  proof_image?: string;
}

const Receipt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransaction = async () => {
      if (!profile || !id) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', profile.user_id)
        .single();

      if (error) {
        console.error('Error fetching transaction:', error);
      } else {
        setTransaction(data);
      }
      setLoading(false);
    };

    fetchTransaction();
  }, [id, profile]);

  if (loading) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen w-full relative">
        <LiquidBackground />
        <div className="relative z-10 p-4 text-center">
          <p className="text-foreground mb-4">Transaction not found</p>
          <Button onClick={() => navigate('/history')}>Back to History</Button>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (transaction.title.includes("Failed")) return X;
    if (transaction.title.includes("Pending")) return Clock;
    return Check;
  };

  const getStatusColor = () => {
    if (transaction.title.includes("Failed")) return "text-destructive";
    if (transaction.title.includes("Pending")) return "text-warning";
    return "text-success";
  };

  const StatusIcon = getStatusIcon();
  const statusColor = getStatusColor();

  return (
    <div className="min-h-screen w-full relative">
      <LiquidBackground />

      {/* Header */}
      <header className="relative z-10 px-4 py-4 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
        <Logo />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/history')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 py-8 max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
            transaction.type === "credit" ? "bg-success/20" : "bg-destructive/20"
          }`}>
            <StatusIcon className={`w-10 h-10 ${statusColor}`} />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Transaction Receipt</h1>
          <p className={`text-2xl font-bold ${
            transaction.type === "credit" ? "text-success" : "text-destructive"
          }`}>
            {transaction.type === "credit" ? "+" : "-"}₦{transaction.amount.toLocaleString()}
          </p>
        </div>

        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between py-3 border-b border-border/50">
                <span className="text-muted-foreground">Transaction Type</span>
                <span className="font-semibold text-foreground">{transaction.title}</span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-border/50">
                <span className="text-muted-foreground">Amount</span>
                <span className={`font-bold ${
                  transaction.type === "credit" ? "text-success" : "text-destructive"
                }`}>
                  {transaction.type === "credit" ? "+" : "-"}₦{transaction.amount.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between py-3 border-b border-border/50">
                <span className="text-muted-foreground">Date & Time</span>
                <span className="font-semibold text-foreground">
                  {new Date(transaction.date).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between py-3 border-b border-border/50">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono text-sm text-foreground">{transaction.transaction_id}</span>
              </div>

              {transaction.reference_id && (
                <div className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground">Reference ID</span>
                  <span className="font-mono text-sm text-foreground">{transaction.reference_id}</span>
                </div>
              )}

              <div className="flex justify-between py-3 border-b border-border/50">
                <span className="text-muted-foreground">Balance After</span>
                <span className="font-bold text-foreground">₦{transaction.balance_after.toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-3">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-semibold ${statusColor}`}>
                  {transaction.title.includes("Failed") ? "Failed" : 
                   transaction.title.includes("Pending") ? "Pending" : "Success"}
                </span>
              </div>
            </div>

            {transaction.proof_image && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground mb-2">Proof of Payment</p>
                <img
                  src={transaction.proof_image}
                  alt="Payment proof"
                  className="w-full rounded-lg"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={() => navigate('/history')}
          className="w-full"
          variant="outline"
        >
          Back to History
        </Button>
      </main>
    </div>
  );
};

export default Receipt;

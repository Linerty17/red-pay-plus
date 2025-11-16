import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import { ArrowDownLeft, ArrowUpRight, ShoppingBag } from "lucide-react";
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
}

const History = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!profile) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
      } else {
        setTransactions(data || []);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [profile]);
  
  const getIcon = (title: string) => {
    if (title.includes("Bonus") || title.includes("Claim") || title.includes("Referral")) return ArrowDownLeft;
    if (title.includes("Withdrawal")) return ArrowUpRight;
    return ShoppingBag;
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
      <main className="relative z-10 px-4 py-8 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Transaction History</h1>
          <p className="text-muted-foreground">View all your recent transactions</p>
        </div>

        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
          <CardContent className="p-6">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions yet</p>
            ) : (
              <div className="space-y-1">
              {transactions.map((transaction) => {
                const Icon = getIcon(transaction.title);
                return (
                  <div
                    key={transaction.id}
                    onClick={() => navigate(`/receipt/${transaction.id}`)}
                    className="flex items-center justify-between py-4 border-b border-border/50 last:border-0 cursor-pointer hover:bg-secondary/10 transition-colors rounded-lg px-2"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          transaction.type === "credit"
                            ? "bg-success/20"
                            : "bg-destructive/20"
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 ${
                            transaction.type === "credit"
                              ? "text-success"
                              : "text-destructive"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {transaction.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold text-lg ${
                        transaction.type === "credit"
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {transaction.type === "credit" ? "+" : "-"}₦{transaction.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default History;

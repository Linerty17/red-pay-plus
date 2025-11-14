import { Card, CardContent } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import { ArrowDownLeft, ArrowUpRight, ShoppingBag } from "lucide-react";

const History = () => {
  const storedTransactions = JSON.parse(localStorage.getItem("transactions") || "[]");
  
  const getIcon = (title: string) => {
    if (title.includes("Bonus") || title.includes("Claim")) return ArrowDownLeft;
    if (title.includes("Withdrawal")) return ArrowUpRight;
    return ShoppingBag;
  };

  const transactions = storedTransactions.map((tx: any) => ({
    ...tx,
    icon: getIcon(tx.title),
  }));

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
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions yet</p>
            ) : (
              <div className="space-y-1">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-4 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        transaction.type === "credit"
                          ? "bg-success/20"
                          : "bg-destructive/20"
                      }`}
                    >
                      <transaction.icon
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
                        {transaction.date}
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
                    {transaction.amount}
                  </span>
                </div>
              ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default History;

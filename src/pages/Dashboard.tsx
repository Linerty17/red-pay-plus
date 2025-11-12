import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingBag,
  Radio,
  ListChecks,
  Users,
  History,
  Send,
} from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const [balance] = useState(160000);

  const handleAction = (action: string) => {
    toast.info(`${action} feature coming soon!`);
  };

  const actionButtons = [
    { icon: ShoppingBag, label: "BuyRPC", color: "bg-primary", action: "BuyRPC" },
    { icon: Radio, label: "Broadcast", color: "bg-purple-600", action: "Broadcast" },
    { icon: ListChecks, label: "Tasks", color: "bg-blue-600", action: "Tasks" },
    { icon: Users, label: "Community", color: "bg-green-600", action: "Community" },
    { icon: History, label: "History", color: "bg-orange-600", action: "History" },
    { icon: Send, label: "Withdraw", color: "bg-red-600", action: "Withdraw" },
  ];

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
        {/* Withdraw Button - Above Balance */}
        <div className="flex justify-end">
          <Button
            onClick={() => handleAction("Withdraw")}
            variant="outline"
            className="bg-primary/10 hover:bg-primary/20 border-primary text-primary font-semibold"
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Withdraw
          </Button>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 border-primary shadow-glow animate-fade-in">
          <CardContent className="pt-8 pb-8 px-6 space-y-6">
            <div className="flex items-center gap-3 text-primary-foreground/80">
              <Wallet className="w-6 h-6" />
              <span className="text-lg font-medium">Total Balance</span>
            </div>

            <div className="space-y-4">
              <div className="text-5xl font-bold text-primary-foreground">
                ₦{balance.toLocaleString()}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleAction("Deposit")}
                  variant="secondary"
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                >
                  <ArrowDownLeft className="w-4 h-4 mr-2" />
                  Deposit
                </Button>
                <Button
                  onClick={() => handleAction("Top-up")}
                  variant="secondary"
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Top-up
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video Section */}
        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
          <CardContent className="p-6">
            <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                  <Radio className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">Featured Video Content</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
          {actionButtons.map((button, index) => (
            <Card
              key={index}
              className="bg-card/60 backdrop-blur-sm border-border hover-lift cursor-pointer transition-all"
              onClick={() => handleAction(button.action)}
            >
              <CardContent className="p-6 space-y-4">
                <div className={`w-12 h-12 ${button.color} rounded-xl flex items-center justify-center`}>
                  <button.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{button.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {button.label === "BuyRPC" && "Purchase RPC tokens"}
                    {button.label === "Broadcast" && "Share updates"}
                    {button.label === "Tasks" && "Complete & earn"}
                    {button.label === "Community" && "Connect with others"}
                    {button.label === "History" && "View transactions"}
                    {button.label === "Withdraw" && "Cash out funds"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Activity Feed */}
        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center">
                    <ArrowDownLeft className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Welcome Bonus</p>
                    <p className="text-sm text-muted-foreground">Today, 2:30 PM</p>
                  </div>
                </div>
                <span className="text-success font-bold">+₦160,000</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;

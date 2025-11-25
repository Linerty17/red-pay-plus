import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import LoadingSpinner from "./LoadingSpinner";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import adminLogo from "@/assets/redpay-admin-logo.png";
import { Users, Bell, Receipt, LayoutDashboard, LogOut } from "lucide-react";
import redpayLogo from "@/assets/redpay-logo.png";

export function AdminLayout({ children }: { children: ReactNode }) {
  const { loading } = useAdminAuth();
  const { signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-accent/5">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <img src={redpayLogo} alt="RedPay" className="h-8" />
            <nav className="hidden md:flex items-center gap-6">
              <NavLink
                to="/admin/referrals"
                className={({ isActive }) =>
                  `flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`
                }
              >
                <Users className="w-4 h-4" />
                Referrals
              </NavLink>
              <NavLink
                to="/admin/payments"
                className={({ isActive }) =>
                  `flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`
                }
              >
                <Receipt className="w-4 h-4" />
                Payments
              </NavLink>
              <NavLink
                to="/admin/push-notifications"
                className={({ isActive }) =>
                  `flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`
                }
              >
                <Bell className="w-4 h-4" />
                Push Notifications
              </NavLink>
              <NavLink
                to="/dashboard"
                className="flex items-center gap-2 text-sm font-medium transition-colors text-muted-foreground hover:text-primary"
              >
                <LayoutDashboard className="w-4 h-4" />
                User Dashboard
              </NavLink>
            </nav>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 px-4">
        {children}
      </main>
    </div>
  );
}

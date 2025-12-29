import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import OfficialBanner from "./components/OfficialBanner";
import BannedOverlay from "./components/BannedOverlay";
import { useReferralCapture } from "./hooks/useReferralCapture";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import Community from "./pages/Community";
import Broadcast from "./pages/Broadcast";
import Support from "./pages/Support";
import History from "./pages/History";
import BuyRPC from "./pages/BuyRPC";
import PaymentInstructions from "./pages/PaymentInstructions";
import Withdraw from "./pages/Withdraw";
import Profile from "./pages/Profile";
import SuccessPage from "./pages/SuccessPage";
import ReferEarn from "./pages/ReferEarn";
import Receipt from "./pages/Receipt";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminRegister from "./pages/admin/AdminRegister";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminPush from "./pages/admin/AdminPush";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminSettingsProtected from "./pages/admin/AdminSettingsProtected";
import AdminBannedUsers from "./pages/admin/AdminBannedUsers";

const queryClient = new QueryClient();

const App = () => {
  useReferralCapture();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfficialBanner />
          <BannedOverlay />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/community" element={<Community />} />
              <Route path="/broadcast" element={<Broadcast />} />
              <Route path="/support" element={<Support />} />
              <Route path="/history" element={<History />} />
              <Route path="/receipt/:id" element={<Receipt />} />
              <Route path="/buyrpc" element={<BuyRPC />} />
              <Route path="/buy-rpc" element={<BuyRPC />} />
              <Route path="/payment-instructions" element={<PaymentInstructions />} />
              <Route path="/withdraw" element={<Withdraw />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/success" element={<SuccessPage />} />
              <Route path="/refer-earn" element={<ReferEarn />} />
              <Route path="/notifications" element={<Notifications />} />
              
              {/* Admin Routes - secured path */}
              <Route path="/ifechukwu/register" element={<AdminRegister />} />
              <Route path="/ifechukwu/login" element={<AdminLogin />} />
              <Route path="/ifechukwu" element={<AdminLayout />}>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="referrals" element={<AdminReferrals />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="transactions" element={<AdminTransactions />} />
                <Route path="push" element={<AdminPush />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="audit" element={<AdminAudit />} />
                <Route path="settings" element={<AdminSettingsProtected />} />
                <Route path="banned-users" element={<AdminBannedUsers />} />
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

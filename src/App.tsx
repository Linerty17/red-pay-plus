import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useReferralCapture();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
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
              <Route path="/payment-instructions" element={<PaymentInstructions />} />
              <Route path="/withdraw" element={<Withdraw />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/success" element={<SuccessPage />} />
              <Route path="/refer-earn" element={<ReferEarn />} />
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

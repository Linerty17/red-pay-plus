import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import { DollarSign, Loader2, CheckCircle2, XCircle, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [verifying, setVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [bankOpen, setBankOpen] = useState(false);

  // Bank codes for Paystack verification (comprehensive Nigerian banks list)
  const bankCodes: Record<string, string> = {
    "9mobile 9Payment Service Bank": "120001",
    "Abbey Mortgage Bank": "801",
    "Access Bank": "044",
    "Access Bank (Diamond)": "063",
    "ALAT by WEMA": "035A",
    "Brass": "50912",
    "Carbon": "565",
    "Citibank Nigeria": "023",
    "Coronation Merchant Bank": "559",
    "Ecobank Nigeria": "050",
    "Eyowo": "50126",
    "Fidelity Bank": "070",
    "First Bank of Nigeria": "011",
    "First City Monument Bank": "214",
    "FSDH Merchant Bank": "501",
    "Globus Bank": "00103",
    "GoMoney": "100022",
    "Guaranty Trust Bank": "058",
    "Hasal Microfinance Bank": "50383",
    "Heritage Bank": "030",
    "Jaiz Bank": "301",
    "Keystone Bank": "082",
    "Kuda Bank": "50211",
    "Lagos Building Investment Company Plc": "90052",
    "Lotus Bank": "303",
    "Mint MFB": "50563",
    "Moniepoint MFB": "50515",
    "OPay": "999992",
    "Paga": "100002",
    "PalmPay": "999991",
    "Parallex Bank": "104",
    "Paycom": "999992",
    "Paystack-Titan": "100039",
    "Polaris Bank": "076",
    "Providus Bank": "101",
    "Rand Merchant Bank": "502",
    "Rubies MFB": "125",
    "Sparkle Microfinance Bank": "51310",
    "Stanbic IBTC Bank": "221",
    "Standard Chartered Bank": "068",
    "Sterling Bank": "232",
    "Suntrust Bank": "100",
    "TAJ Bank": "302",
    "Tangerine Money": "51269",
    "TCF MFB": "51211",
    "Titan Trust Bank": "102",
    "Union Bank of Nigeria": "032",
    "United Bank For Africa": "033",
    "Unity Bank": "215",
    "VFD Microfinance Bank": "566",
    "Wema Bank": "035",
    "Zenith Bank": "057"
  };

  const banks = Object.keys(bankCodes);

  // Verify account when account number and bank are both provided
  const verifyAccount = useCallback(async (accountNumber: string, bank: string) => {
    const bankCode = bankCodes[bank];
    if (!bankCode || accountNumber.length !== 10) return;

    setVerifying(true);
    setVerificationStatus('idle');
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-account', {
        body: { accountNumber, bankCode }
      });

      if (error) throw error;

      if (data?.success && data?.accountName) {
        setFormData(prev => ({ ...prev, accountName: data.accountName }));
        setVerificationStatus('success');
        toast.success(`Account verified: ${data.accountName}`);
      } else {
        setVerificationStatus('error');
        toast.error("Could not verify account. Please enter name manually.");
      }
    } catch (error) {
      console.error('Account verification error:', error);
      setVerificationStatus('error');
      toast.error("Verification failed. Please enter account name manually.");
    } finally {
      setVerifying(false);
    }
  }, []);

  // Trigger verification when account number reaches 10 digits and bank is selected
  useEffect(() => {
    if (formData.accountNumber.length === 10 && formData.bank) {
      verifyAccount(formData.accountNumber, formData.bank);
    } else {
      setVerificationStatus('idle');
    }
  }, [formData.accountNumber, formData.bank, verifyAccount]);

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

      // Handle edge function errors (non-2xx responses)
      if (error) {
        // Check if it's an invalid RPC code error
        const errorMessage = error.message?.toLowerCase() || '';
        if (errorMessage.includes('invalid access code') || errorMessage.includes('403')) {
          navigate("/buy-rpc", { state: { invalidCode: true } });
          return;
        }
        throw error;
      }

      if (!data.success) {
        if (data.redirect) {
          navigate("/buy-rpc", { state: { invalidCode: true } });
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
      // Check for RPC code related errors in catch block as well
      const errorMessage = error?.message?.toLowerCase() || '';
      if (errorMessage.includes('invalid access code') || errorMessage.includes('403') || errorMessage.includes('forbidden')) {
        navigate("/buy-rpc", { state: { invalidCode: true } });
        return;
      }
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
                <Label htmlFor="accountName" className="text-xs flex items-center gap-2">
                  Account Name
                  {verifying && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  {verificationStatus === 'success' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  {verificationStatus === 'error' && <XCircle className="h-3 w-3 text-destructive" />}
                </Label>
                <Input
                  id="accountName"
                  placeholder={verifying ? "Verifying..." : "John Doe"}
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  className={`h-9 ${verificationStatus === 'success' ? 'border-green-500 bg-green-500/10' : ''}`}
                  disabled={verifying}
                />
                {verificationStatus === 'success' && (
                  <p className="text-xs text-green-600">✓ Account verified via Paystack</p>
                )}
              </div>

              {/* Bank Selection */}
              <div className="space-y-1">
                <Label htmlFor="bank" className="text-xs">Select Bank</Label>
                <Popover open={bankOpen} onOpenChange={setBankOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={bankOpen}
                      className="w-full h-9 justify-between font-normal"
                    >
                      {formData.bank || "Search and select bank..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-popover z-50" align="start">
                    <Command>
                      <CommandInput placeholder="Search bank..." />
                      <CommandList>
                        <CommandEmpty>No bank found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-y-auto">
                          {banks.map((bank) => (
                            <CommandItem
                              key={bank}
                              value={bank}
                              onSelect={(currentValue) => {
                                setFormData({ ...formData, bank: currentValue === formData.bank ? "" : bank });
                                setBankOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.bank === bank ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {bank}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                <div className="flex items-center justify-between">
                  <p className="text-xs text-destructive">⚠️ Access code is required for withdrawal</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs text-primary p-0 h-auto"
                    onClick={() => navigate("/buy-rpc")}
                  >
                    Need RPC Code?
                  </Button>
                </div>
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
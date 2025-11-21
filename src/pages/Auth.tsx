import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const signUpSchema = z.object({
  firstName: z.string().trim()
    .min(2, 'First name must be at least 2 characters').max(50, 'First name too long')
    .regex(/^[a-zA-Z]+$/, 'First name can only contain letters'),
  lastName: z.string().trim()
    .min(2, 'Last name must be at least 2 characters').max(50, 'Last name too long')
    .regex(/^[a-zA-Z]+$/, 'Last name can only contain letters'),
  phone: z.string().trim()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password too long'),
  country: z.string().min(1, 'Please select a country')
});

const signInSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, signIn, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("signup");

  useEffect(() => {
    // Get referral code from URL
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref);
      // Fetch referrer name
      const fetchReferrer = async () => {
        const { data } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('referral_code', ref)
          .single();
        
        if (data) {
          setReferrerName(`${data.first_name} ${data.last_name}`);
        }
      };
      fetchReferrer();
    }
  }, [searchParams]);

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const signUpData = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      country: formData.get("country") as string
    };

    // Validate form data with Zod
    const validation = signUpSchema.safeParse(signUpData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      setIsLoading(false);
      return;
    }

    const { error } = await signUp({
      firstName: signUpData.firstName,
      lastName: signUpData.lastName,
      email: signUpData.email,
      password: signUpData.password,
      phone: signUpData.phone,
      country: signUpData.country,
      referredBy: referralCode || undefined,
    });

    setIsLoading(false);

    if (error) {
      toast.error(error.message || "Failed to create account");
    } else {
      toast.success("Account created successfully!");
      navigate(`/welcome?firstName=${signUpData.firstName}`);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const signInData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string
    };

    // Validate form data with Zod
    const validation = signInSchema.safeParse(signInData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(signInData.email, signInData.password);

    setIsLoading(false);

    if (error) {
      toast.error(error.message || "Failed to sign in");
    } else {
      toast.success("Welcome back!");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative">
      <LiquidBackground />
      
      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <div className="mb-8 text-center">
          <Logo className="justify-center mb-4" />
          <p className="text-muted-foreground">Your gateway to seamless payments</p>
        </div>

        {referralCode && activeTab === "signup" && (
          <Card className="bg-primary/10 backdrop-blur-sm border-primary/30 mb-4 shadow-elevated">
            <CardContent className="pt-6 pb-4 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-primary mb-2">
                <UserPlus className="w-5 h-5" />
                <p className="font-semibold text-lg">Someone invited you to RedPay 🎉</p>
              </div>
              {referrerName ? (
                <p className="text-sm text-muted-foreground">
                  You were invited by <span className="font-semibold text-foreground">{referrerName}</span> — sign up now and help them earn ₦5,000!
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sign up with this referral link to help your friend earn ₦5,000!
                </p>
              )}
              <p className="text-xs text-muted-foreground pt-2 border-t border-border/30 mt-3">
                By signing up with this link, the inviter will automatically receive ₦5,000 after your account is created. The bonus appears on their dashboard.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card/90 backdrop-blur-sm border-border shadow-elevated">
          <CardHeader>
            <CardTitle className="text-foreground">Get Started</CardTitle>
            <CardDescription>Create an account or sign in to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signup" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="signin">Sign In</TabsTrigger>
              </TabsList>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="John"
                        required
                        className="bg-input border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Doe"
                        required
                        className="bg-input border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+234 800 000 0000"
                      required
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      required
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select name="country" defaultValue="nigeria">
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nigeria">🇳🇬 Nigeria</SelectItem>
                        <SelectItem value="ghana">🇬🇭 Ghana</SelectItem>
                        <SelectItem value="kenya">🇰🇪 Kenya</SelectItem>
                        <SelectItem value="southafrica">🇿🇦 South Africa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="individual">
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="refCode">Referral Code (Optional)</Label>
                    <Input
                      id="refCode"
                      name="refCode"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="Enter code"
                      className="bg-input border-border"
                    />
                    <p className="text-xs text-muted-foreground">
                      Have a referral code? Add it to earn rewards.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email or Phone</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="text"
                      placeholder="john@example.com"
                      required
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="bg-input border-border"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-primary"
                  >
                    Forgot password?
                  </Button>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;

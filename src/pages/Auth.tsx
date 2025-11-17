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

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, signIn, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    // Get referral code from localStorage (captured by splash) or URL
    const storedRef = localStorage.getItem("referral_code");
    const urlRef = searchParams.get("ref");
    
    if (storedRef) {
      setReferralCode(storedRef);
    } else if (urlRef) {
      setReferralCode(urlRef);
      localStorage.setItem("referral_code", urlRef);
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
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phone = formData.get("phone") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const country = formData.get("country") as string;

    const { error } = await signUp({
      firstName,
      lastName,
      email,
      password,
      phone,
      country,
      referredBy: referralCode || undefined,
    });

    setIsLoading(false);

    if (error) {
      toast.error(error.message || "Failed to create account");
    } else {
      toast.success("Account created successfully!");
      navigate(`/welcome?firstName=${firstName}`);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signIn(email, password);

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

        <Card className="bg-card/90 backdrop-blur-sm border-border shadow-elevated">
          <CardHeader>
            <CardTitle className="text-foreground">Get Started</CardTitle>
            <CardDescription>Create an account or sign in to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signup" className="w-full">
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

                  {referralCode ? (
                    <div className="space-y-2">
                      <Label>Referral Applied</Label>
                      <div className="flex items-center gap-2 p-3 rounded-md bg-primary/10 border border-primary/20">
                        <span className="text-sm font-medium text-primary">
                          Referral code: {referralCode}
                        </span>
                      </div>
                    </div>
                  ) : (
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
                  )}

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

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import { User, Mail, Phone, MapPin, Hash, Shield, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const Profile = () => {
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    userId: "",
    status: "Active",
    referralCode: "",
  });

  useEffect(() => {
    // Load profile data from localStorage
    const name = localStorage.getItem("userName") || "John Doe";
    const email = localStorage.getItem("userEmail") || "user@example.com";
    const phone = localStorage.getItem("userPhone") || "+234 800 000 0000";
    const country = localStorage.getItem("userCountry") || "Nigeria";
    const userId = localStorage.getItem("userId") || "1234567890";
    const referralCode = localStorage.getItem("referralCode") || "REF123456";

    setProfileData({
      name,
      email,
      phone,
      country,
      userId,
      status: "Active",
      referralCode,
    });
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const profileFields = [
    { icon: User, label: "Full Name", value: profileData.name },
    { icon: Mail, label: "Email", value: profileData.email },
    { icon: Phone, label: "Phone Number", value: profileData.phone },
    { icon: MapPin, label: "Country", value: profileData.country },
    { icon: Hash, label: "User ID", value: profileData.userId, copyable: true },
    { icon: Shield, label: "Status", value: profileData.status },
    { icon: Copy, label: "Referral Code", value: profileData.referralCode, copyable: true },
  ];

  return (
    <div className="min-h-screen w-full relative">
      <LiquidBackground />

      <header className="relative z-10 px-3 py-2 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
        <Logo />
        <ProfileButton />
      </header>

      <main className="relative z-10 px-3 py-4 max-w-4xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground">View your account information</p>
        </div>

        {/* Profile Avatar */}
        <div className="flex justify-center animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-full flex items-center justify-center border-4 border-primary/20">
            <User className="w-12 h-12 text-primary-foreground" />
          </div>
        </div>

        {/* Profile Information */}
        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
          <CardContent className="p-4 space-y-3">
            {profileFields.map((field, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <field.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{field.label}</p>
                    <p className={`text-sm font-semibold text-foreground ${field.copyable ? 'font-mono' : ''}`}>
                      {field.value}
                    </p>
                  </div>
                </div>
                {field.copyable && (
                  <Button
                    onClick={() => copyToClipboard(field.value, field.label)}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-2 animate-fade-in">
          <Link to="/dashboard" className="block">
            <Button variant="outline" className="w-full" size="lg">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Profile;

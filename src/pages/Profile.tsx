import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import { User, Mail, Phone, MapPin, Hash, Shield, Copy, Camera, LogOut, Eye, EyeOff, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { NotificationSetup } from "@/components/NotificationSetup";
import { Switch } from "@/components/ui/switch";

const Profile = () => {
  const { profile, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [hideEmail, setHideEmail] = useState(false);
  const [hidePhone, setHidePhone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate('/auth');
    } catch (error) {
      toast.error("Failed to log out");
    } finally {
      setLoggingOut(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const maskEmail = (email: string) => {
    const [username, domain] = email.split('@');
    if (username.length <= 2) return `${username[0]}***@${domain}`;
    return `${username.slice(0, 2)}${'*'.repeat(Math.min(username.length - 2, 6))}@${domain}`;
  };

  const maskPhone = (phone: string) => {
    if (phone.length <= 4) return '*'.repeat(phone.length);
    return `${phone.slice(0, 3)}${'*'.repeat(phone.length - 6)}${phone.slice(-3)}`;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile.auth_user_id) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error("Only JPG, PNG, and WEBP images are allowed");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.auth_user_id}/avatar.${fileExt}`;

      if (profile.profile_image) {
        await supabase.storage.from('profile-images').remove([profile.profile_image]);
      }

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image: publicUrl })
        .eq('auth_user_id', profile.auth_user_id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success("Profile image updated!");
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const initials = `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();

  return (
    <div className="min-h-screen w-full relative bg-background">
      <LiquidBackground />

      <header className="relative z-10 px-4 py-3 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-xl">
        <Logo />
        <ProfileButton />
      </header>

      <main className="relative z-10 px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Hero Section */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-3xl blur-2xl" />
          <Card className="relative bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl border-border/30 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <CardContent className="pt-8 pb-6 px-6">
              {/* Avatar */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/60 rounded-full blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
                  <div className="relative w-28 h-28 rounded-full border-4 border-primary/30 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                    {profile.profile_image ? (
                      <img 
                        src={profile.profile_image} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-primary/80">
                        <span className="text-3xl font-bold text-primary-foreground">{initials}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-1 right-1 w-9 h-9 bg-primary rounded-full flex items-center justify-center border-3 border-background shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-primary-foreground" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Name & Status */}
                <div className="text-center space-y-1">
                  <h1 className="text-2xl font-bold text-foreground">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/15 rounded-full">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium text-primary">{profile.status || "Active"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Privacy Controls */}
        <Card className="bg-card/60 backdrop-blur-xl border-border/30 animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Privacy Controls</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Hide Email</span>
                </div>
                <Switch checked={hideEmail} onCheckedChange={setHideEmail} />
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Hide Phone</span>
                </div>
                <Switch checked={hidePhone} onCheckedChange={setHidePhone} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="bg-card/60 backdrop-blur-xl border-border/30 animate-fade-in">
          <CardContent className="p-4 space-y-2">
            {/* Email */}
            <div className="flex items-center justify-between p-3.5 bg-secondary/20 rounded-xl hover:bg-secondary/30 transition-colors group">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {hideEmail ? maskEmail(profile.email) : profile.email}
                    </p>
                    <button
                      onClick={() => setHideEmail(!hideEmail)}
                      className="p-1 hover:bg-secondary/50 rounded-md transition-colors"
                    >
                      {hideEmail ? (
                        <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => copyToClipboard(profile.email, "Email")}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between p-3.5 bg-secondary/20 rounded-xl hover:bg-secondary/30 transition-colors group">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Phone Number</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {hidePhone ? maskPhone(profile.phone) : profile.phone}
                    </p>
                    <button
                      onClick={() => setHidePhone(!hidePhone)}
                      className="p-1 hover:bg-secondary/50 rounded-md transition-colors"
                    >
                      {hidePhone ? (
                        <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => copyToClipboard(profile.phone, "Phone")}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Country */}
            <div className="flex items-center justify-between p-3.5 bg-secondary/20 rounded-xl hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Country</p>
                  <p className="text-sm font-medium text-foreground">{profile.country}</p>
                </div>
              </div>
            </div>

            {/* User ID */}
            <div className="flex items-center justify-between p-3.5 bg-secondary/20 rounded-xl hover:bg-secondary/30 transition-colors group">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Hash className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">User ID</p>
                  <p className="text-sm font-mono font-medium text-foreground truncate">{profile.user_id}</p>
                </div>
              </div>
              <Button
                onClick={() => copyToClipboard(profile.user_id, "User ID")}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Referral Code */}
            <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 group">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/30 to-primary/20 rounded-xl flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Referral Code</p>
                  <p className="text-sm font-mono font-bold text-primary">{profile.referral_code}</p>
                </div>
              </div>
              <Button
                onClick={() => copyToClipboard(profile.referral_code, "Referral Code")}
                variant="outline"
                size="sm"
                className="border-primary/30 hover:bg-primary/10"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        {profile.auth_user_id && (
          <div className="animate-fade-in">
            <NotificationSetup userId={profile.user_id} />
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 animate-fade-in pb-4">
          <Link to="/dashboard" className="block">
            <Button variant="outline" className="w-full h-12 text-base font-medium border-border/50 hover:bg-secondary/50" size="lg">
              Back to Dashboard
            </Button>
          </Link>
          <Button 
            variant="destructive" 
            className="w-full h-12 text-base font-medium" 
            size="lg"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {loggingOut ? "Logging out..." : "Log Out"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Profile;

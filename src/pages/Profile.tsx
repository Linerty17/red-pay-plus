import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import { User, Mail, Phone, MapPin, Hash, Shield, Copy, Camera, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const { profile, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile.auth_user_id) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error("Only JPG, PNG, and WEBP images are allowed");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.auth_user_id}/avatar.${fileExt}`;

      // Delete old image if exists
      if (profile.profile_image) {
        await supabase.storage.from('profile-images').remove([profile.profile_image]);
      }

      // Upload new image
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image: publicUrl })
        .eq('auth_user_id', profile.auth_user_id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success("Profile image updated successfully!");
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const profileFields = [
    { icon: User, label: "Full Name", value: `${profile.first_name} ${profile.last_name}` },
    { icon: Mail, label: "Email", value: profile.email },
    { icon: Phone, label: "Phone Number", value: profile.phone },
    { icon: MapPin, label: "Country", value: profile.country },
    { icon: Hash, label: "User ID", value: profile.user_id, copyable: true },
    { icon: Shield, label: "Status", value: profile.status || "Active" },
    { icon: Copy, label: "Referral Code", value: profile.referral_code, copyable: true },
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
          <div className="relative group">
            <div className="w-24 h-24 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-full flex items-center justify-center border-4 border-primary/20 overflow-hidden">
              {profile.profile_image ? (
                <img src={profile.profile_image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-primary-foreground" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-background hover:bg-primary/90 transition-colors disabled:opacity-50"
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

import { useState } from "react";
import { Eye, EyeOff, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ProfileButton = () => {
  const [showPreview, setShowPreview] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { profile } = useAuth();

  if (!profile) {
    return null;
  }

  const initials = `${profile.first_name[0]}${profile.last_name[0]}`;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="relative p-0 h-auto hover:bg-transparent"
          onMouseEnter={() => setShowPreview(true)}
          onMouseLeave={() => setShowPreview(false)}
        >
          <Avatar className="w-10 h-10 border-2 border-primary">
            <AvatarImage src="" />
            <AvatarFallback className="bg-card text-foreground font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
            {showPreview ? (
              <Eye className="w-3 h-3 text-primary-foreground" />
            ) : (
              <EyeOff className="w-3 h-3 text-primary-foreground" />
            )}
          </div>
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-card border-border w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-foreground">Profile</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24 border-4 border-primary">
              <AvatarImage src="" />
              <AvatarFallback className="bg-card text-foreground font-bold text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground">
                {profile.first_name} {profile.last_name}
              </h3>
              <p className="text-sm text-muted-foreground">{profile.status}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-foreground">{profile.email}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <p className="text-foreground">{profile.phone}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Country</label>
              <p className="text-foreground">{profile.country}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Referral Code
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-secondary rounded-lg text-foreground font-mono text-sm">
                  {profile.referral_code}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(profile.referral_code);
                    toast.success("Referral code copied!");
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>

          <Button className="w-full" variant="outline">
            Edit Profile
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProfileButton;

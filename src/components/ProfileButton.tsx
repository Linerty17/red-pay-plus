import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const ProfileButton = () => {
  const [isHovered, setIsHovered] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (!profile) {
    return null;
  }

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();

  return (
    <Button
      variant="ghost"
      className="relative p-0 h-auto hover:bg-transparent"
      onClick={() => navigate('/profile')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Avatar className={`w-10 h-10 border-2 transition-all duration-200 ${isHovered ? 'border-primary scale-110' : 'border-border'}`}>
        <AvatarImage src={profile.profile_image || ''} alt={`${profile.first_name} ${profile.last_name}`} />
        <AvatarFallback className="bg-card text-foreground font-bold">
          {initials || <User className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
    </Button>
  );
};

export default ProfileButton;

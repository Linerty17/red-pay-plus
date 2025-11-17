import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import { MessageCircle, Send } from "lucide-react";

const Community = () => {
  const handleJoinWhatsApp = () => {
    window.open("https://chat.whatsapp.com/I5j03L8Yy78D7fHEbntFKU", "_blank");
  };

  const handleJoinTelegram = () => {
    window.open("https://t.me/Skypay261", "_blank");
  };

  return (
    <div className="min-h-screen w-full relative">
      <LiquidBackground />

      {/* Header */}
      <header className="relative z-10 px-4 py-4 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
        <Logo />
        <ProfileButton />
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 py-8 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Join Our Community</h1>
          <p className="text-muted-foreground">
            Connect with other RedPay users and stay updated
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* WhatsApp */}
          <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                <MessageCircle className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">WhatsApp Group</h2>
                <p className="text-muted-foreground">
                  Join our WhatsApp group for instant updates and community discussions
                </p>
              </div>
              <Button
                onClick={handleJoinWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Join WhatsApp
              </Button>
            </CardContent>
          </Card>

          {/* Telegram */}
          <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Send className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">Telegram Channel</h2>
                <p className="text-muted-foreground">
                  Follow our Telegram channel for official announcements and news
                </p>
              </div>
              <Button
                onClick={handleJoinTelegram}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Send className="w-4 h-4 mr-2" />
                Join Telegram
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Community;

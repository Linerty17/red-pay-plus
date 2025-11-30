import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import LiveChat from "@/components/LiveChat";
import { MessageCircle, Send, Mail, MessagesSquare } from "lucide-react";

const Support = () => {
  const [liveChatOpen, setLiveChatOpen] = useState(false);
  const handleTelegramSupport = () => {
    window.open("https://t.me/Redpaysupport", "_blank");
  };

  const handleWhatsAppSupport = () => {
    window.open("https://wa.me/2349029987533", "_blank");
  };

  const handleEmailSupport = () => {
    window.location.href = "mailto:redpaycustomerservice@gmail.com";
  };

  const handleLiveChat = () => {
    setLiveChatOpen(true);
  };

  return (
    <div className="min-h-screen w-full relative">
      <LiquidBackground />

      {/* Floating Live Chat Button */}
      <button
        onClick={handleLiveChat}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-primary rounded-full shadow-glow flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="Live Chat"
      >
        <MessagesSquare className="w-8 h-8 text-white" />
      </button>

      {/* Header */}
      <header className="relative z-10 px-4 py-4 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
        <Logo />
        <ProfileButton />
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 py-8 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Support</h1>
          <p className="text-muted-foreground">
            We're here to help! Choose your preferred support channel
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Telegram Support */}
          <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in hover-lift">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Send className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-foreground">Telegram</h2>
                <p className="text-sm text-muted-foreground">
                  Chat with us on Telegram
                </p>
              </div>
              <Button
                onClick={handleTelegramSupport}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Open Telegram
              </Button>
            </CardContent>
          </Card>

          {/* WhatsApp Support */}
          <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in hover-lift">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-foreground">WhatsApp</h2>
                <p className="text-sm text-muted-foreground">
                  Message us on WhatsApp
                </p>
              </div>
              <Button
                onClick={handleWhatsAppSupport}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Open WhatsApp
              </Button>
            </CardContent>
          </Card>

          {/* Email Support */}
          <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in hover-lift">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-foreground">Email</h2>
                <p className="text-sm text-muted-foreground">
                  Send us an email
                </p>
              </div>
              <Button
                onClick={handleEmailSupport}
                className="w-full"
              >
                Send Email
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-3">Support Hours</h3>
            <p className="text-muted-foreground mb-2">
              24/7 Support - We're here for you around the clock
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Average response time: Within a few hours via email, or instantly via Live Chat, WhatsApp, and Telegram.
            </p>
          </CardContent>
        </Card>
      </main>

      <LiveChat open={liveChatOpen} onOpenChange={setLiveChatOpen} />
    </div>
  );
};

export default Support;

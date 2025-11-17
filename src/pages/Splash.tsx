import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import splashImage from "@/assets/splash-screen.jpeg";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Capture referral code immediately before rendering anything
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get("ref");
      if (ref) {
        localStorage.setItem("referral_code", ref);
        // Clean URL without reloading
        url.searchParams.delete("ref");
        const clean = url.pathname + (url.search ? `?${url.searchParams.toString()}` : "") + url.hash;
        window.history.replaceState({}, "", clean);
      }
    } catch (_) {
      // no-op
    }

    // Check if user has seen splash before
    const hasSeenSplash = localStorage.getItem("has_seen_splash");
    if (hasSeenSplash === "true") {
      navigate("/auth", { replace: true });
    }
  }, [navigate]);

  const handleGetStarted = () => {
    localStorage.setItem("has_seen_splash", "true");
    navigate("/auth");
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <img
        src={splashImage}
        alt="RedPay Splash"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 flex items-end justify-center pb-32">
        <Button
          onClick={handleGetStarted}
          size="lg"
          className="text-lg px-12 py-6 h-auto rounded-full"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Splash;

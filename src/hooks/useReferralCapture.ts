import { useEffect } from "react";

export function useReferralCapture() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get("ref");
      if (ref) {
        // Save code and strip it from the URL
        localStorage.setItem("referral_code", ref);
        url.searchParams.delete("ref");
        const clean = url.pathname + (url.search ? `?${url.searchParams.toString()}` : "") + url.hash;
        window.history.replaceState({}, "", clean);
      }
    } catch (_) {
      // no-op
    }
  }, []);
}

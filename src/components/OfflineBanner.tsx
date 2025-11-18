import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Banner shown when the app detects offline status
 * Uses navigator.onLine to detect connectivity
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-warning/90 px-4 py-2 text-center text-sm font-medium text-warning-foreground backdrop-blur"
      role="alert"
      aria-live="polite"
    >
      <div className="container mx-auto flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You are currently offline. Changes cannot be saved.</span>
      </div>
    </div>
  );
}

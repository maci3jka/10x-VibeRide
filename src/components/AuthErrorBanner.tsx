import { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

interface AuthErrorBannerProps {
  error: string;
  onDismiss: () => void;
}

/**
 * Error message mapping for OAuth and auth errors
 */
const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "Sign in failed. Please try again.",
  invalid_code: "Invalid authentication code. Please sign in again.",
  expired_code: "Your sign-in link has expired. Please sign in again.",
  network_error: "Network error. Please check your connection and try again.",
  session_expired: "Your session has expired. Please sign in again.",
  signout_failed: "Sign out failed. Please try again.",
  missing_code: "Authentication failed. Please try signing in again.",
  server_error: "An unexpected error occurred. Please try again.",
  auth_cancelled: "Sign in was cancelled.",
  oauth_server_error: "Authentication service error. Please try again later.",
};

/**
 * Auth error banner component
 * Displays OAuth errors with auto-dismiss functionality
 * Accessible with ARIA live region
 */
export function AuthErrorBanner({ error, onDismiss }: AuthErrorBannerProps) {
  const [visible, setVisible] = useState(true);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss();
  };

  if (!visible) return null;

  const message = ERROR_MESSAGES[error] || ERROR_MESSAGES.server_error;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3"
    >
      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm text-destructive font-medium">{message}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="text-destructive hover:text-destructive/80 transition-colors flex-shrink-0"
        aria-label="Dismiss error message"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

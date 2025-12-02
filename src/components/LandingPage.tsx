import { GoogleSignInButton } from "./GoogleSignInButton";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { FileText, Sparkles, Map } from "lucide-react";

interface LandingPageProps {
  error?: string | null;
  returnTo?: string | null;
}

/**
 * Landing page component with hero section and authentication
 * Displays error messages from OAuth failures
 * Styled to match the profile page design system
 */
export function LandingPage({ error, returnTo }: LandingPageProps) {
  const handleDismissError = () => {
    // Remove error from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('error');
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-8">
          {/* Error Banner */}
          {error && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <AuthErrorBanner error={error} onDismiss={handleDismissError} />
            </div>
          )}

          {/* Hero Section */}
          <div className="space-y-6 text-center">
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
                VibeRide
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Transform your ride notes into epic motorcycle adventures
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-lg p-6 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">
                Simple Notes
              </h3>
              <p className="text-sm text-muted-foreground">
                Jot down your ride ideas in plain text
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">
                AI-Powered
              </h3>
              <p className="text-sm text-muted-foreground">
                Let AI craft detailed itineraries
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Map className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">
                Ready to Ride
              </h3>
              <p className="text-sm text-muted-foreground">
                Download GPX files for your GPS
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="space-y-2 text-center">
                <h2 className="text-xl font-semibold">
                  Get Started
                </h2>
                <p className="text-sm text-muted-foreground">
                  Sign in to start planning your next adventure
                </p>
              </div>
              <GoogleSignInButton returnTo={returnTo || undefined} />
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center text-muted-foreground text-sm space-y-2 pt-8 pb-8">
            <div className="space-x-4">
              <a
                href="/privacy"
                className="hover:text-foreground transition-colors underline"
              >
                Privacy Policy
              </a>
              <span>•</span>
              <a
                href="/terms"
                className="hover:text-foreground transition-colors underline"
              >
                Terms of Service
              </a>
            </div>
            <p>© 2025 VibeRide. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}


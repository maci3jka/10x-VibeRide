import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Moon, Sun, BarChart3, LogOut } from "lucide-react";

interface AppSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Settings sheet for app-wide preferences
 * Manages dark mode, analytics opt-out, and sign out
 */
export function AppSettingsSheet({ isOpen, onClose }: AppSettingsSheetProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [analyticsOptOut, setAnalyticsOptOut] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);

    const optOut = localStorage.getItem("analytics-opt-out") === "true";
    setAnalyticsOptOut(optOut);
  }, []);

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleAnalyticsToggle = (checked: boolean) => {
    setAnalyticsOptOut(checked);
    localStorage.setItem("analytics-opt-out", String(checked));
  };

  const handleSignOut = async () => {
    // In dev mode, just redirect to home
    if (import.meta.env.DEVENV === "true") {
      window.location.href = "/";
      return;
    }

    // In production, sign out via Supabase
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      });
      if (response.ok) {
        window.location.href = "/";
      }
    } catch {
      // Sign out failed, redirect anyway
      window.location.href = "/";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>App Settings</SheetTitle>
          <SheetDescription>Manage your app preferences and account settings</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-3">
              {darkMode ? (
                <Moon className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode" className="text-base">
                  Dark Mode
                </Label>
                <p className="text-sm text-muted-foreground">Toggle dark theme</p>
              </div>
            </div>
            <Switch id="dark-mode" checked={darkMode} onCheckedChange={handleDarkModeToggle} />
          </div>

          {/* Analytics Opt-Out Toggle */}
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="analytics-opt-out" className="text-base">
                  Opt Out of Analytics
                </Label>
                <p className="text-sm text-muted-foreground">Disable usage tracking</p>
              </div>
            </div>
            <Switch id="analytics-opt-out" checked={analyticsOptOut} onCheckedChange={handleAnalyticsToggle} />
          </div>

          {/* Sign Out Button */}
          <div className="pt-4 border-t">
            <Button variant="destructive" className="w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings } from "lucide-react";
import { useProfileState } from "@/lib/hooks/useProfileState";
import { PreferencesForm } from "@/components/PreferencesForm";
import { SaveButton } from "@/components/SaveButton";
import { TabBar } from "@/components/TabBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AppSettingsSheet } from "@/components/AppSettingsSheet";
import { ConflictDialog } from "@/components/ConflictDialog";
import { Button } from "@/components/ui/button";
import type { UserPreferencesResponse } from "@/types";

/**
 * Profile screen component - orchestrates preferences form and save operations
 * Handles data fetching, validation, mutations, and user feedback
 */
export function ProfileScreen() {
  const { form, errors, status, apiError, updateField, isDirty, save, validate, reset, serverData } = useProfileState();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [conflictData, setConflictData] = useState<UserPreferencesResponse | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Monitor online status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Show toast on success
  useEffect(() => {
    if (status === "success") {
      toast.success("Preferences saved successfully!");
    }
  }, [status]);

  // Handle API errors including 409 conflicts
  useEffect(() => {
    if (apiError) {
      // Check for 409 conflict error
      if (apiError.error === "conflict" || apiError.message?.includes("updated")) {
        // Extract server data from error details if available
        // For now, we'll trigger a refetch by showing the conflict dialog
        toast.error("Preferences were updated elsewhere");
        // In a real scenario, the API should return the current server state
        // For now, we'll just show a generic conflict message
      } else {
        toast.error(apiError.message || "Failed to save preferences");
      }
    }
  }, [apiError]);

  const handleSave = async () => {
    if (!isOnline) {
      toast.error("Cannot save while offline");
      return;
    }

    const isValid = validate();
    if (!isValid) {
      toast.error("Please fix the errors before saving");
      return;
    }

    await save();
  };

  const handleConflictOverwrite = async () => {
    setConflictData(null);
    // Force save with current form data
    await save();
  };

  const handleConflictReload = () => {
    setConflictData(null);
    reset();
    toast.info("Preferences reloaded from server");
  };

  const isFormDisabled = status === "saving" || status === "loading";
  const isSaveDisabled = !isDirty || isFormDisabled || !isOnline || Object.keys(errors).length > 0;

  return (
    <>
      <OfflineBanner />

      <div className="container mx-auto max-w-2xl px-4 py-8 pb-24">
        <div className="space-y-8">
          {/* Header with Settings Button */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Riding Preferences</h1>
              <p className="text-muted-foreground">
                Set your default riding preferences to help us create better itineraries for you.
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(true)} aria-label="Open settings">
              <Settings className="h-5 w-5" />
            </Button>
          </div>

          {/* Loading State */}
          {status === "loading" && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Loading preferences...</p>
              </div>
            </div>
          )}

          {/* Form */}
          {status !== "loading" && (
            <>
              <PreferencesForm value={form} onUpdate={updateField} errors={errors} disabled={isFormDisabled} />

              {/* Actions */}
              <div className="flex items-center justify-between border-t pt-6">
                <p className="text-sm text-muted-foreground">
                  <span className="text-destructive">*</span> Required fields
                </p>
                <SaveButton disabled={isSaveDisabled} state={status} onClick={handleSave} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab Bar Navigation */}
      <TabBar currentPath="/profile" />

      {/* App Settings Sheet */}
      <AppSettingsSheet isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Conflict Dialog */}
      {conflictData && (
        <ConflictDialog
          isOpen={!!conflictData}
          serverPrefs={conflictData}
          onOverwrite={handleConflictOverwrite}
          onReload={handleConflictReload}
        />
      )}
    </>
  );
}

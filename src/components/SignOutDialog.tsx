import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmation dialog for user sign-out
 * Prevents accidental sign-outs with explicit confirmation
 */
export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Implement actual sign-out API call in next step
      // For now, this is just the UI shell
      console.log("Sign out initiated");

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // In production, this will call the sign-out endpoint
      // const response = await fetch('/api/auth/signout', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' }
      // });
      //
      // if (!response.ok) {
      //   throw new Error('Sign out failed');
      // }
      //
      // toast.success('You have been signed out.');
      // window.location.href = '/';
    } catch (err) {
      setError("Sign out failed. Please try again.");
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        role="alertdialog"
        aria-describedby="signout-description"
      >
        <DialogHeader>
          <DialogTitle>Sign Out</DialogTitle>
          <DialogDescription id="signout-description">
            Are you sure you want to sign out? You'll need to sign in again to access your notes and itineraries.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Signing out...
              </>
            ) : (
              "Sign Out"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


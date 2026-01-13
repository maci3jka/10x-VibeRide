import { Toaster as SonnerToaster } from "sonner";

/**
 * Toast notification component wrapper for Sonner
 * Provides consistent styling and positioning for toast messages
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      expand={false}
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        className: "toast",
        style: {
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          border: "1px solid hsl(var(--border))",
        },
      }}
    />
  );
}

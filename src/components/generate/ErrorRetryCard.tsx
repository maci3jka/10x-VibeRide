import { AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorRetryCardProps {
  error?: string;
  onRetry: () => void;
}

/**
 * ErrorRetryCard - displays error message with retry option
 * Shown when generation fails or polling encounters errors
 */
export function ErrorRetryCard({ error, onRetry }: ErrorRetryCardProps) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Generation Failed
        </CardTitle>
        <CardDescription>
          We encountered an error while generating your itinerary
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertDescription>
            {error || "An unexpected error occurred. Please try again."}
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Button onClick={onRetry} variant="default" className="w-full">
          Retry Generation
        </Button>
      </CardFooter>
    </Card>
  );
}

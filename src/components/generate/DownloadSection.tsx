import { useState } from "react";
import { Download, HelpCircle, Map as MapIcon, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { DownloadFormat } from "@/lib/hooks/useGenerate";
import type { ErrorResponse, MapyLinkResponse, GoogleMapsLinkResponse } from "@/types";

interface DownloadSectionProps {
  onDownload: (acknowledged: boolean, format: DownloadFormat) => void;
  itineraryId: string;
}

/**
 * DownloadSection - Route download with format selection and safety disclaimer
 * Supports GPX (for GPS devices), KML (for Google Earth), and GeoJSON (for web mapping) formats
 * Also provides quick preview in Mapy.cz
 */
export function DownloadSection({ onDownload, itineraryId }: DownloadSectionProps) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat>("gpx");
  const [isMapyLoading, setIsMapyLoading] = useState(false);
  const [isGoogleMapsLoading, setIsGoogleMapsLoading] = useState(false);

  const handleDownloadClick = () => {
    setShowDisclaimer(true);
  };

  const handleAccept = () => {
    onDownload(true, selectedFormat);
    setShowDisclaimer(false);
  };

  const handleDecline = () => {
    setShowDisclaimer(false);
  };

  const handleMapyClick = async () => {
    if (isMapyLoading) {
      return;
    }

    setIsMapyLoading(true);

    try {
      const response = await window.fetch(`/api/itineraries/${itineraryId}/mapy?acknowledged=true`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Handle 401 - session expired
        if (response.status === 401) {
          window.location.href = "/";
          return;
        }

        // Handle 422 - too many points
        if (response.status === 422) {
          toast.error("Route contains too many points for Mapy.cz quick preview. Download GPX instead.");
          return;
        }

        const errorData: ErrorResponse = await response.json();
        toast.error(errorData.message || "Failed to open Mapy.cz. Please try again.");
        return;
      }

      const result: MapyLinkResponse = await response.json();
      
      // Open Mapy.cz link
      // On mobile: Opens app if installed, otherwise opens in browser
      // On desktop: Opens in new tab
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // On mobile, use location.href for better deep linking to app
        window.location.href = result.url;
      } else {
        // On desktop, open in new tab
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("Network error. Failed to open Mapy.cz.");
    } finally {
      setIsMapyLoading(false);
    }
  };

  const handleGoogleMapsClick = async () => {
    if (isGoogleMapsLoading) {
      return;
    }

    setIsGoogleMapsLoading(true);

    try {
      const response = await window.fetch(`/api/itineraries/${itineraryId}/google?acknowledged=true`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Handle 401 - session expired
        if (response.status === 401) {
          window.location.href = "/";
          return;
        }

        // Handle 422 - too many points
        if (response.status === 422) {
          toast.error("Route contains too many points for Google Maps quick preview. Download GPX instead.");
          return;
        }

        const errorData: ErrorResponse = await response.json();
        toast.error(errorData.message || "Failed to open Google Maps. Please try again.");
        return;
      }

      const result: GoogleMapsLinkResponse = await response.json();
      
      // Open Google Maps link in new tab
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Network error. Failed to open Google Maps.");
    } finally {
      setIsGoogleMapsLoading(false);
    }
  };

  const getFormatLabel = (format: DownloadFormat): string => {
    switch (format) {
      case "gpx":
        return "GPX";
      case "kml":
        return "KML";
      case "geojson":
        return "GeoJSON";
    }
  };

  const getFormatDescription = (format: DownloadFormat): string => {
    switch (format) {
      case "gpx":
        return "GPX 1.1 format for GPS devices and navigation apps";
      case "kml":
        return "KML 2.2 format for Google Earth and Google Maps";
      case "geojson":
        return "GeoJSON format for web mapping and custom applications";
    }
  };

  const formatLabel = getFormatLabel(selectedFormat);
  const formatDescription = getFormatDescription(selectedFormat);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Download Route</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="format-select">Download Format</Label>
          <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as DownloadFormat)}>
            <SelectTrigger id="format-select">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpx">GPX - For GPS Devices</SelectItem>
              <SelectItem value="kml">KML - For Google Earth</SelectItem>
              <SelectItem value="geojson">GeoJSON - For Web Mapping</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{formatDescription}</p>
        </div>

        <div className="rounded-lg border border-muted bg-muted/30 p-3">
          <div className="flex items-start gap-2">
            <HelpCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>GPX:</strong> Use with Garmin, TomTom, and most GPS navigation devices. Compatible with
                apps like Google Maps, Komoot, and Ride with GPS.
              </p>
              <p>
                <strong>KML:</strong> Use with Google Earth and Google Maps. Includes styled routes and waypoints
                with custom icons and descriptions.
              </p>
              <p>
                <strong>GeoJSON:</strong> Use for web mapping libraries (Leaflet, Mapbox), custom applications,
                or data analysis tools.
              </p>
            </div>
          </div>
        </div>

        {showDisclaimer && (
          <Alert>
            <AlertDescription className="space-y-3">
              <p className="font-semibold">Safety Disclaimer</p>
              <p className="text-sm">
                This itinerary is generated by AI and provided for informational purposes only. Always verify
                routes, road conditions, and local regulations before riding. Ride within your skill level and
                always prioritize safety. VibeRide is not responsible for any accidents, injuries, or damages
                that may occur while using this itinerary.
              </p>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleAccept} size="sm" className="flex-1">
                  Accept & Download
                </Button>
                <Button onClick={handleDecline} size="sm" variant="outline" className="flex-1">
                  Decline
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      {!showDisclaimer && (
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={handleDownloadClick} className="w-full h-10" variant="default">
            <Download className="mr-2 h-4 w-4" />
            Download {formatLabel} File
          </Button>

          <Button 
            onClick={handleMapyClick} 
            className="w-full h-10" 
            variant="outline"
            disabled={isMapyLoading}
            title="Open route in Mapy.cz"
          >
            {isMapyLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                <MapIcon className="mr-2 h-4 w-4" />
                <ExternalLink className="mr-1 h-3 w-3" />
              </>
            )}
            Mapy.cz
          </Button>

          <Button 
            onClick={handleGoogleMapsClick} 
            className="w-full h-10" 
            variant="outline"
            disabled={isGoogleMapsLoading}
            title="Open route in Google Maps"
          >
            {isGoogleMapsLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                <MapIcon className="mr-2 h-4 w-4" />
                <ExternalLink className="mr-1 h-3 w-3" />
              </>
            )}
            Google
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}



import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Calendar,
  MapPin,
  Map as MapIcon,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type {
  ItineraryListItemResponse,
  GeoJSONFeature,
  ErrorResponse,
  MapyLinkResponse,
  GoogleMapsLinkResponse,
} from "@/types";
import { extractSummary, type ExtractedSummary } from "@/lib/services/geojsonService";

interface PastItinerariesSectionProps {
  itineraries: ItineraryListItemResponse[];
  isLoading: boolean;
  onDownload: (itineraryId: string, format: "gpx" | "kml" | "geojson") => void;
}

/**
 * PastItinerariesSection - displays previously generated itineraries
 * Shows a collapsible list of past versions with ability to view and download
 */
export function PastItinerariesSection({ itineraries, isLoading, onDownload }: PastItinerariesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">Loading past itineraries...</p>
        </CardContent>
      </Card>
    );
  }

  if (itineraries.length === 0) {
    return null; // Don't show section if no past itineraries
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Past Itineraries</CardTitle>
            <span className="text-sm text-muted-foreground">({itineraries.length})</span>
          </div>
          <Button variant="ghost" size="sm" aria-expanded={isExpanded} aria-label="Toggle past itineraries">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="space-y-3">
            {itineraries.map((itinerary) => (
              <ItineraryCard key={itinerary.itinerary_id} itinerary={itinerary} onDownload={onDownload} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface ItineraryCardProps {
  itinerary: ItineraryListItemResponse;
  onDownload: (itineraryId: string, format: "gpx" | "kml" | "geojson") => void;
}

function ItineraryCard({ itinerary, onDownload }: ItineraryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<"gpx" | "kml" | "geojson">("gpx");
  const [isMapyLoading, setIsMapyLoading] = useState(false);
  const [isGoogleMapsLoading, setIsGoogleMapsLoading] = useState(false);

  // Extract summary from GeoJSON
  let summary: ExtractedSummary | null = null;
  let dayCount = 0;
  const featuresByDay = new Map<number, GeoJSONFeature[]>();

  if (itinerary.route_geojson) {
    try {
      summary = extractSummary(itinerary.route_geojson);

      // Group features by day for details view
      for (const feature of itinerary.route_geojson.features) {
        if (feature.geometry.type === "LineString") {
          const day = feature.properties.day ?? 1;
          if (!featuresByDay.has(day)) {
            featuresByDay.set(day, []);
          }
          const dayFeatures = featuresByDay.get(day);
          if (dayFeatures) {
            dayFeatures.push(feature);
          }
        }
      }
      dayCount = featuresByDay.size;
    } catch {
      // Failed to extract summary, will show fallback
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleMapyClick = async () => {
    if (isMapyLoading) {
      return;
    }

    setIsMapyLoading(true);

    try {
      const response = await window.fetch(`/api/itineraries/${itinerary.itinerary_id}/mapy?acknowledged=true`, {
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

      // Open in new tab
      window.open(result.url, "_blank", "noopener,noreferrer");
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
      const response = await window.fetch(`/api/itineraries/${itinerary.itinerary_id}/google?acknowledged=true`, {
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

      // Open in new tab
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Network error. Failed to open Google Maps.");
    } finally {
      setIsGoogleMapsLoading(false);
    }
  };

  // Fallback if no summary available
  if (!summary) {
    return (
      <div className="border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">Unable to load itinerary data</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{summary.title}</h4>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(itinerary.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {summary.total_distance_km.toFixed(1)} km
            </span>
            <span>v{itinerary.version}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Select
              value={downloadFormat}
              onValueChange={(value) => setDownloadFormat(value as "gpx" | "kml" | "geojson")}
            >
              <SelectTrigger className="h-8 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpx">GPX</SelectItem>
                <SelectItem value="kml">KML</SelectItem>
                <SelectItem value="geojson">GeoJSON</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(itinerary.itinerary_id, downloadFormat)}
              className="h-8 w-[130px]"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMapyClick}
              disabled={isMapyLoading}
              className="h-8 w-[130px]"
              title="Open route in Mapy.cz"
            >
              {isMapyLoading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <>
                  <MapIcon className="h-3 w-3 mr-1" />
                  <ExternalLink className="h-2 w-2 mr-1" />
                </>
              )}
              Mapy.cz
            </Button>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoogleMapsClick}
              disabled={isGoogleMapsLoading}
              className="h-8 w-[130px]"
              title="Open route in Google Maps"
            >
              {isGoogleMapsLoading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <>
                  <MapIcon className="h-3 w-3 mr-1" />
                  <ExternalLink className="h-2 w-2 mr-1" />
                </>
              )}
              Google
            </Button>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-xs h-7 px-2">
          {isExpanded ? "Hide" : "View"} Details
          {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
        </Button>

        {isExpanded && (
          <div className="mt-3 space-y-3">
            {/* Highlights */}
            {summary.highlights && summary.highlights.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Highlights</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                  {summary.highlights.slice(0, 3).map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Days Summary */}
            {dayCount > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">
                  {dayCount} {dayCount === 1 ? "Day" : "Days"}
                </p>
                <div className="space-y-1">
                  {Array.from(featuresByDay.entries())
                    .sort(([a], [b]) => a - b)
                    .map(([day, features]) => {
                      const dayDistance = features.reduce((sum, f) => sum + (f.properties.distance_km || 0), 0);
                      const dayDuration = features.reduce((sum, f) => sum + (f.properties.duration_h || 0), 0);
                      return (
                        <div key={day} className="text-xs text-muted-foreground">
                          Day {day}: {dayDistance.toFixed(1)} km · {dayDuration.toFixed(1)} h · {features.length}{" "}
                          {features.length === 1 ? "segment" : "segments"}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

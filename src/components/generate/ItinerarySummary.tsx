import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { RouteGeoJSON, GeoJSONFeature } from "@/types";
import { extractSummary, type ExtractedSummary } from "@/lib/services/geojsonService";

interface ItinerarySummaryProps {
  routeGeoJSON: RouteGeoJSON;
}

interface DaySegments {
  day: number;
  features: GeoJSONFeature[];
}

/**
 * ItinerarySummary - displays generated itinerary from GeoJSON
 * Shows title, highlights, totals, and day-by-day breakdown with accordions
 */
export function ItinerarySummary({ routeGeoJSON }: ItinerarySummaryProps) {
  // Safety checks
  if (!routeGeoJSON || !routeGeoJSON.features || !Array.isArray(routeGeoJSON.features)) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">Unable to display itinerary summary</p>
        </CardContent>
      </Card>
    );
  }

  // Extract summary metadata
  let summary: ExtractedSummary;
  try {
    summary = extractSummary(routeGeoJSON);
  } catch {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">Unable to parse itinerary data</p>
        </CardContent>
      </Card>
    );
  }

  // Group features by day
  const daySegments = groupFeaturesByDay(routeGeoJSON.features);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{summary.title || "Untitled Itinerary"}</CardTitle>
        <CardDescription>
          {summary.total_distance_km.toFixed(1)} km · {summary.total_duration_h.toFixed(1)} hours
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Highlights */}
        {summary.highlights && summary.highlights.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Highlights</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {summary.highlights.map((highlight, index) => (
                <li key={index}>{highlight}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Day-by-day breakdown */}
        {daySegments.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Itinerary</h3>
            <Accordion type="single" collapsible className="w-full">
              {daySegments.map((dayData) => (
                <DayAccordion key={dayData.day} dayData={dayData} />
              ))}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Group GeoJSON features by day property
 * Returns array of day segments sorted by day number
 */
function groupFeaturesByDay(features: GeoJSONFeature[]): DaySegments[] {
  const dayMap = new Map<number, GeoJSONFeature[]>();

  // Group features by day
  for (const feature of features) {
    // Only include route features (LineStrings), skip waypoints (Points)
    if (feature.geometry.type !== "LineString") {
      continue;
    }

    const day = feature.properties.day ?? 1;
    if (!dayMap.has(day)) {
      dayMap.set(day, []);
    }
    const dayFeatures = dayMap.get(day);
    if (dayFeatures) {
      dayFeatures.push(feature);
    }
  }

  // Convert to array and sort by day
  const result: DaySegments[] = Array.from(dayMap.entries())
    .map(([day, features]) => ({ day, features }))
    .sort((a, b) => a.day - b.day);

  return result;
}

interface DayAccordionProps {
  dayData: DaySegments;
}

/**
 * DayAccordion - single day accordion item
 * Shows route segments (GeoJSON features) for the day when expanded
 */
function DayAccordion({ dayData }: DayAccordionProps) {
  const { day, features } = dayData;

  // Calculate day totals from feature properties
  const dayDistance = features.reduce((sum, feature) => sum + (feature.properties.distance_km || 0), 0);
  const dayDuration = features.reduce((sum, feature) => sum + (feature.properties.duration_h || 0), 0);

  // Sort features by segment number if available
  const sortedFeatures = [...features].sort((a, b) => {
    const segA = a.properties.segment ?? 0;
    const segB = b.properties.segment ?? 0;
    return segA - segB;
  });

  return (
    <AccordionItem value={`day-${day}`}>
      <AccordionTrigger>
        <div className="flex items-center justify-between w-full pr-4">
          <span className="font-medium">Day {day}</span>
          <span className="text-sm text-muted-foreground">
            {dayDistance.toFixed(1)} km · {dayDuration.toFixed(1)} h
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pt-2">
          {sortedFeatures.length > 0 ? (
            sortedFeatures.map((feature, index) => (
              <div key={feature.id || index} className="border-l-2 border-primary pl-4 py-2">
                <h4 className="font-medium text-sm">{feature.properties.name || "Unnamed Segment"}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {feature.properties.description || "No description available"}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{(feature.properties.distance_km || 0).toFixed(1)} km</span>
                  <span>{(feature.properties.duration_h || 0).toFixed(1)} h</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No segments available</p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

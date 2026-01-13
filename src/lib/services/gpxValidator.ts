/**
 * GPX 1.1 Validator
 * Validates GPX XML structure before download
 */

export interface GpxValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a GPX 1.1 XML string
 */
export function validateGpx(gpxContent: string): GpxValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic structure checks
  if (!gpxContent || gpxContent.trim().length === 0) {
    errors.push("GPX content is empty");
    return { isValid: false, errors, warnings };
  }

  // Check XML declaration
  if (!gpxContent.includes('<?xml version="1.0"')) {
    errors.push("Missing XML declaration");
  }

  // Check GPX root element
  if (!gpxContent.includes('<gpx')) {
    errors.push("Missing <gpx> root element");
  }

  // Check GPX version
  if (!gpxContent.includes('version="1.1"')) {
    errors.push("Missing or incorrect GPX version (must be 1.1)");
  }

  // Check GPX namespace
  if (!gpxContent.includes('xmlns="http://www.topografix.com/GPX/1/1"')) {
    errors.push("Missing or incorrect GPX namespace");
  }

  // Check for metadata
  if (!gpxContent.includes('<metadata>')) {
    warnings.push("Missing <metadata> element (recommended)");
  }

  // Check for at least one waypoint or route
  const hasWaypoints = gpxContent.includes('<wpt ');
  const hasRoutes = gpxContent.includes('<rte>');
  const hasTracks = gpxContent.includes('<trk>');

  if (!hasWaypoints && !hasRoutes && !hasTracks) {
    errors.push("GPX must contain at least one waypoint, route, or track");
  }

  // Validate waypoint structure
  if (hasWaypoints) {
    const wptMatches = gpxContent.match(/<wpt\s+lat="[^"]+"\s+lon="[^"]+"/g);
    if (!wptMatches) {
      errors.push("Waypoints missing required lat/lon attributes");
    } else {
      // Check each waypoint has valid coordinates
      wptMatches.forEach((wpt, index) => {
        const latMatch = wpt.match(/lat="([^"]+)"/);
        const lonMatch = wpt.match(/lon="([^"]+)"/);
        
        if (latMatch) {
          const lat = parseFloat(latMatch[1]);
          if (isNaN(lat) || lat < -90 || lat > 90) {
            errors.push(`Waypoint ${index + 1}: Invalid latitude (${latMatch[1]})`);
          }
        }
        
        if (lonMatch) {
          const lon = parseFloat(lonMatch[1]);
          if (isNaN(lon) || lon < -180 || lon > 180) {
            errors.push(`Waypoint ${index + 1}: Invalid longitude (${lonMatch[1]})`);
          }
        }
      });

      // Check waypoints have names
      const wptNameMatches = gpxContent.match(/<wpt[^>]*>[\s\S]*?<name>/g);
      if (!wptNameMatches || wptNameMatches.length !== wptMatches.length) {
        warnings.push("Some waypoints missing <name> element (recommended)");
      }
    }
  }

  // Validate route structure
  if (hasRoutes) {
    const rteMatches = gpxContent.match(/<rte>/g);
    const rteNameMatches = gpxContent.match(/<rte>[\s\S]*?<name>/g);
    
    if (!rteNameMatches || (rteMatches && rteNameMatches.length !== rteMatches.length)) {
      warnings.push("Some routes missing <name> element (recommended)");
    }

    // Check route points
    const rteptMatches = gpxContent.match(/<rtept\s+lat="[^"]+"\s+lon="[^"]+"/g);
    if (!rteptMatches) {
      errors.push("Routes missing route points (<rtept>)");
    } else {
      // Validate route point coordinates
      rteptMatches.forEach((rtept, index) => {
        const latMatch = rtept.match(/lat="([^"]+)"/);
        const lonMatch = rtept.match(/lon="([^"]+)"/);
        
        if (latMatch) {
          const lat = parseFloat(latMatch[1]);
          if (isNaN(lat) || lat < -90 || lat > 90) {
            errors.push(`Route point ${index + 1}: Invalid latitude (${latMatch[1]})`);
          }
        }
        
        if (lonMatch) {
          const lon = parseFloat(lonMatch[1]);
          if (isNaN(lon) || lon < -180 || lon > 180) {
            errors.push(`Route point ${index + 1}: Invalid longitude (${lonMatch[1]})`);
          }
        }
      });
    }
  }

  // Check proper closing tags
  if (!gpxContent.includes('</gpx>')) {
    errors.push("Missing closing </gpx> tag");
  }

  // Check for balanced tags (basic check)
  const openTags = (gpxContent.match(/<(?!\/|\?)[^>]+>/g) || []).length;
  const closeTags = (gpxContent.match(/<\/[^>]+>/g) || []).length;
  
  if (openTags !== closeTags + 1) { // +1 for <?xml> declaration
    warnings.push("Potentially unbalanced XML tags");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates GPX and throws if invalid
 */
export function assertValidGpx(gpxContent: string): void {
  const result = validateGpx(gpxContent);
  
  if (!result.isValid) {
    throw new Error(
      `Invalid GPX file:\n${result.errors.join('\n')}`
    );
  }
}



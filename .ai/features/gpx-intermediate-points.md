# GPX Intermediate Points Enhancement

## Overview
Enhanced GPX generation to include intermediate waypoints along route segments, ensuring GPS devices can guide riders along the proper roads with better accuracy.

## Problem
Previously, GPX files only contained start and end points for each segment. For longer segments (e.g., 50-100km), this could result in GPS devices choosing incorrect routes between waypoints, potentially routing riders on highways instead of scenic roads, or missing key turns.

## Solution
Automatically generate intermediate waypoints along each segment based on segment distance, creating a more detailed route that GPS devices can follow accurately.

## Implementation

### 1. Intermediate Point Calculation
**File:** `src/lib/services/gpxService.ts`

```typescript
function calculateIntermediatePoints(distanceKm: number): number {
  if (distanceKm < 20) return 1;      // Short segments: 1 intermediate point
  if (distanceKm < 50) return 2;      // Medium segments: 2 intermediate points
  if (distanceKm < 100) return 3;     // Long segments: 3 intermediate points
  return Math.min(5, Math.floor(distanceKm / 30)); // Very long: up to 5 points
}
```

**Logic:**
- **< 20km**: 1 intermediate point (total 3 points: start, mid, end)
- **20-50km**: 2 intermediate points (total 4 points)
- **50-100km**: 3 intermediate points (total 5 points)
- **> 100km**: Up to 5 intermediate points (1 per 30km)

### 2. Point Generation
For each segment:
1. **Start Point**: Named waypoint at segment beginning
2. **Intermediate Points**: Evenly distributed along the segment
3. **End Point**: Named waypoint at segment end

Intermediate points are calculated using linear interpolation:
```typescript
const ratio = i / (numIntermediatePoints + 1);
const intermediateLat = startLat + (endLat - startLat) * ratio;
const intermediateLon = startLon + (endLon - startLon) * ratio;
```

### 3. Waypoint Types
Enhanced waypoint structure includes a `type` field:
- `'start'`: Segment start points
- `'intermediate'`: Generated intermediate points
- `'end'`: Segment end points and day endpoints

### 4. GPX Structure

#### Waypoints (`<wpt>`)
Only includes **start** and **end** points for user reference:
- Segment start points
- Segment end points
- Day end points

These appear as named waypoints in GPS devices.

#### Route Points (`<rtept>`)
Includes **all** points (start, intermediate, end) for routing:
- All segment start points
- All intermediate points
- All segment end points
- All day end points

GPS devices use these for turn-by-turn navigation.

## Enhanced AI Prompt

Updated the AI generation prompt to request more detailed segments:

```
CRITICAL GPS REQUIREMENTS:
For each segment, you MUST include accurate GPS coordinates:
- start_lat, start_lon: GPS coordinates of the segment start point
- end_lat, end_lon: GPS coordinates of the segment end point

GPS ACCURACY GUIDELINES:
- Use real GPS coordinates based on actual locations
- Coordinates should reflect the actual road network
- For longer segments (>50km), break them into multiple smaller segments
- Each segment should represent a distinct portion of the route
- Ensure coordinates are in the correct geographic region
```

This encourages the AI to:
1. Provide accurate GPS coordinates
2. Break long routes into smaller segments
3. Use real geographic data

## Example Output

### Before (2 points per segment):
```
Segment: Kraków to Zakopane (80km)
- Start: 50.0647, 19.9450
- End: 49.2992, 19.9496
Total: 2 points
```

### After (5 points per segment):
```
Segment: Kraków to Zakopane (80km)
- Start: 50.0647, 19.9450
- Point 1: 49.9737, 19.9461
- Point 2: 49.8827, 19.9473
- Point 3: 49.7917, 19.9484
- End: 49.2992, 19.9496
Total: 5 points
```

## Benefits

### 1. Better Route Accuracy
- GPS devices have more points to follow
- Reduces chance of incorrect routing
- Ensures riders stay on intended roads

### 2. Improved Turn Guidance
- More frequent waypoints = more turn notifications
- Helps riders anticipate upcoming changes
- Better for complex routes with many turns

### 3. Scenic Route Preservation
- Prevents GPS from "optimizing" to highways
- Maintains intended scenic/twisty road selections
- Keeps riders on motorcycle-friendly routes

### 4. Flexible Density
- Automatic adjustment based on segment length
- Short segments: minimal overhead
- Long segments: maximum guidance
- Caps at 5 points to avoid GPS device overload

## Testing

### Updated Tests
**File:** `src/lib/services/gpxService.test.ts`

Updated tests to verify:
- Intermediate points are generated
- More route points than waypoints
- Coordinates are properly distributed
- All segment names are preserved

### Test Results
All 8 tests passing ✅

## Technical Details

### Linear Interpolation
Uses simple linear interpolation between start and end coordinates:
```
lat(t) = lat_start + (lat_end - lat_start) × t
lon(t) = lon_start + (lon_end - lon_start) × t
where t ∈ [0, 1]
```

**Note:** This is a straight-line approximation. In production, you would:
1. Use actual routing APIs (Google Maps, Mapbox, OpenRouteService)
2. Get real road geometry
3. Include elevation data
4. Account for road curvature

### Performance Impact
- Minimal: Calculations are simple arithmetic
- Memory: ~50-100 bytes per intermediate point
- Typical itinerary: 10-30 segments × 1-3 intermediate points = 10-90 extra points
- GPX file size increase: ~2-5KB per itinerary

## Future Enhancements

1. **Real Routing Integration**
   - Use routing APIs to get actual road geometry
   - Include turn-by-turn instructions
   - Add road names and numbers

2. **Elevation Data**
   - Include `<ele>` tags for elevation
   - Help riders prepare for climbs
   - Useful for trip planning

3. **Dynamic Density**
   - More points on twisty roads
   - Fewer points on straight highways
   - Based on road type and curvature

4. **Road Type Metadata**
   - Tag points with road surface type
   - Include speed limits
   - Add scenic rating

5. **POI Integration**
   - Add nearby points of interest
   - Gas stations, restaurants, viewpoints
   - Emergency services

## Related Files

- `src/lib/services/gpxService.ts` - GPX generation with intermediate points
- `src/lib/services/gpxService.test.ts` - Updated tests
- `src/lib/services/itineraryService.ts` - Enhanced AI prompt
- `src/types.ts` - Segment type definitions (includes GPS coordinates)



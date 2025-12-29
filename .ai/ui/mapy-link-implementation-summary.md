# Mapy.cz Link Implementation Summary

## Overview
Successfully implemented the "Open in Mapy.cz" feature that allows users to quickly preview their generated itinerary routes in Mapy.cz without downloading files.

## Updates

### Update 1 (2025-12-29): Fixed URL Format
Fixed issue where Mapy.cz was opening but not displaying the route. Updated to use the new Mapy.cz fnc/v1/route API format instead of the deprecated query parameter format.

### Update 2 (2025-12-29 - 16:55): Fixed Multi-Segment Routes
Fixed issue where multi-day/multi-segment routes only showed 3 points. The service now merges all LineString features from the GeoJSON into a single continuous route, properly handling multi-day itineraries.

### Update 3 (2025-12-29 - 17:02): Changed Transport Mode to Car
Changed default transport mode from `bike` to `car` for motorcycle routes. Mapy.cz's "bike" mode is designed for bicycles, not motorcycles. The "car" mode (`car_fast`) is more appropriate for motorcycle routing.

### Update 4 (2025-12-29 - 17:05): Added Mobile Deep Linking
Improved mobile experience by detecting mobile devices and using `window.location.href` instead of `window.open()`. This ensures the Mapy.cz mobile app opens automatically if installed, with seamless fallback to the web version if not installed.

### Update 5 (2025-12-29 - 20:45): Migrated to mapy.com Domain
Updated all URLs from `mapy.cz` to `mapy.com` following the official domain migration. Both domains work (backward compatible), but `mapy.com` is recommended for new integrations. The mobile app responds to both domains equally.

## Changes Made

### 1. Updated `DownloadSection.tsx`
**File:** `src/components/generate/DownloadSection.tsx`

**Changes:**
- Added new imports: `Map`, `ExternalLink`, `Loader2` from lucide-react, `toast` from sonner, and `MapyLinkResponse` type
- Added `itineraryId` prop to component interface
- Added `isMapyLoading` state to track API call status
- Implemented `handleMapyClick` function that:
  - Calls `/api/itineraries/:id/mapy?acknowledged=true` endpoint
  - Handles loading state with spinner
  - Opens returned URL in new tab with `window.open()`
  - Handles error cases:
    - 401: Redirects to home (session expired)
    - 422: Shows toast about too many points
    - Other errors: Shows generic error toast
  - Handles network errors gracefully
- Updated CardFooter UI:
  - Changed to flex column layout
  - Added "Quick Preview" divider section
  - Added new "Open in Mapy.cz" button with:
    - Map and ExternalLink icons (or Loader2 when loading)
    - Outline variant styling
    - Disabled state during loading
    - Accessible title attribute

### 3. Updated `PastItinerariesSection.tsx`
**File:** `src/components/generate/PastItinerariesSection.tsx`

**Changes:**
- Added new imports: `Map`, `ExternalLink`, `Loader2` from lucide-react, `toast` from sonner, and `MapyLinkResponse`, `ErrorResponse` types
- Added `isMapyLoading` state to `ItineraryCard` component
- Implemented `handleMapyClick` function (same logic as DownloadSection)
- Added "Open in Mapy.cz" button next to Download button:
  - Ghost variant for subtle appearance
  - Map + ExternalLink icons (or Loader2 when loading)
  - Compact size (h-8) to match Download button
  - Disabled state during loading
  - Accessible title attribute

### 2. Updated `GeneratePage.tsx`
**File:** `src/components/generate/GeneratePage.tsx`

**Changes:**
- Added `itineraryId` to destructured values from `useGenerate()` hook
- Passed `itineraryId` prop to `DownloadSection` component
- Added null check for `itineraryId` in conditional rendering

## Implementation Details

### API Integration
- Direct API call using `window.fetch()` (following existing codebase patterns)
- No custom hook created (simpler approach, consistent with other one-off API calls)
- Proper error handling with user-friendly toast messages
- Session expiration handling with redirect

### UI/UX
- Button placed in "Quick Preview" section below main download button
- Visual separator with text label for clear grouping
- Loading state with animated spinner
- Disabled state during API call to prevent duplicate requests
- Accessible with title attribute for screen readers
- Icons: Map + ExternalLink to indicate external navigation

### Error Handling
- **422 (too_many_points)**: Specific toast message directing user to download GPX instead
- **401 (unauthorized)**: Automatic redirect to home page
- **Network errors**: Generic error toast
- **Other errors**: Error message from API response

## User Flow

### Desktop
1. User generates itinerary successfully (state = "completed")
2. DownloadSection appears with two options:
   - Download file (existing functionality)
   - Open in Mapy.cz (new functionality)
3. User clicks "Open in Mapy.cz"
4. Button shows loading spinner
5. API call to `/api/itineraries/:id/mapy?acknowledged=true`
6. On success: New tab opens with Mapy.cz route in browser
7. On error: Toast notification with appropriate message

### Mobile
1. User generates itinerary successfully (state = "completed")
2. DownloadSection appears with two options:
   - Download file (existing functionality)
   - Open in Mapy.cz (new functionality)
3. User clicks "Open in Mapy.cz"
4. Button shows loading spinner
5. API call to `/api/itineraries/:id/mapy?acknowledged=true`
6. On success:
   - If Mapy.cz app is installed: Opens directly in the app
   - If app not installed: Opens in mobile browser
7. On error: Toast notification with appropriate message

## Edge Cases Handled
- ✅ Route with too many points (>15) - shows specific error message
- ✅ Session expired - redirects to login
- ✅ Network failure - shows error toast
- ✅ Duplicate clicks - button disabled during loading
- ✅ Missing itineraryId - component not rendered

## Testing Recommendations
1. **Happy Path**: Generate itinerary and click "Open in Mapy.cz" - should open new tab
2. **Too Many Points**: Test with route having >15 waypoints - should show error toast
3. **Loading State**: Verify spinner appears during API call
4. **Error Handling**: Test with network offline - should show error toast
5. **Accessibility**: Test keyboard navigation and screen reader support
6. **Responsive**: Test on mobile and desktop layouts

## Files Modified
- `src/components/generate/DownloadSection.tsx` (main implementation for current itinerary)
- `src/components/generate/PastItinerariesSection.tsx` (added button for past itineraries)
- `src/components/generate/GeneratePage.tsx` (prop passing)
- `src/lib/services/mapyLinkService.ts` (updated to new API format)
- `src/lib/services/mapyLinkService.test.ts` (updated tests for new format)

## Dependencies
- Existing: `sonner` (toast notifications)
- Existing: `lucide-react` (icons)
- Existing: Backend API endpoint `/api/itineraries/:id/mapy`
- Existing: `MapyLinkResponse` type from `src/types.ts`

## Notes
- Implementation follows existing codebase patterns (direct fetch calls, similar to `useGenerate` hook)
- No new dependencies added
- Backend API already implemented and tested
- Toast notifications use existing `sonner` library
- Consistent error handling with other API calls in the app

## Technical Details: Mapy.cz URL Format

### Old Format (Deprecated)
```
https://mapy.cz/?route=bike|lat,lon,name|lat,lon,name|...&lang=en
```

### New Format (Current)
```
https://mapy.com/fnc/v1/route?start=lon,lat&end=lon,lat&waypoints=lon,lat;lon,lat;...&routeType=car_fast
```

**Note:** `mapy.com` is the new official domain (as of June 2025). `mapy.cz` still works for backward compatibility.

**Key Differences:**
1. **Base URL**: Changed from `https://mapy.cz/?route=` to `https://mapy.com/fnc/v1/route`
2. **Parameters**: 
   - `start`: Start coordinate (lon,lat format)
   - `end`: End coordinate (lon,lat format)
   - `waypoints`: Semicolon-separated middle points (lon,lat format)
   - `routeType`: Route planning type (car_fast, bike_road, foot_fast)
3. **Coordinate Format**: Still uses lon,lat (not lat,lon)
4. **No Point Names**: New format doesn't support custom point names
5. **Route Types**: Maps to specific Mapy.cz route types:
   - `car` → `car_fast` (used for motorcycle routes)
   - `bike` → `bike_road` (for bicycles, not motorcycles)
   - `foot` → `foot_fast`

### Example URLs

**Simple 2-point route:**
```
https://mapy.com/fnc/v1/route?start=19.944900%2C50.064700&end=19.948800%2C49.300000&routeType=car_fast
```

**Route with waypoints:**
```
https://mapy.com/fnc/v1/route?start=19.944900%2C50.064700&end=19.948800%2C49.300000&routeType=car_fast&waypoints=19.892400%2C49.824100
```

This format is documented at: https://developer.mapy.com/en/further-uses-of-mapycz/mapy-cz-url/

## Multi-Segment Route Handling

For multi-day itineraries, the GeoJSON contains multiple LineString features (one per day/segment). The service now:

1. **Finds all LineString features** in the GeoJSON (filters out Point features)
2. **Merges coordinates** from all segments into a single array
3. **Removes duplicate points** at segment boundaries (last point of segment N = first point of segment N+1)
4. **Samples the merged route** down to 15 points if needed

### Example: 5-Day Route

**Before fix:**
- Only used first LineString feature
- Result: 3 points (start, middle, end of Day 1 only)

**After fix:**
- Merges all 5 LineString features
- Original: 5 segments × 3 points = 15 points
- After deduplication: 11 unique points
- Result: Full route with all days included

**Generated URL for itinerary b40d033a-505e-438e-8111-fff40c4082d5:**
```
https://mapy.com/fnc/v1/route?
  start=19.944900,50.064700&
  end=19.944900,50.064700&
  routeType=car_fast&
  waypoints=19.888900,49.887600;19.949000,49.692700;20.127600,49.423000;
           20.328200,49.395200;20.706900,49.421400;20.987800,49.423500;
           20.701400,49.623400;20.698900,49.727500;20.250000,49.966700
```

This represents the complete 5-day route from Kraków → Zakopane → Niedzica → Krynica-Zdrój → Nowy Sącz → Kraków.

**Note:** Uses `routeType=car_fast` because Mapy.cz's bike routing is designed for bicycles, not motorcycles. Car routing provides better routes for motorized vehicles.

## Mobile Deep Linking

The implementation automatically detects mobile devices and adjusts link opening behavior:

### How It Works

**Desktop Behavior:**
```typescript
window.open(result.url, "_blank", "noopener,noreferrer");
// Opens in new browser tab
```

**Mobile Behavior:**
```typescript
window.location.href = result.url;
// Attempts to open Mapy.cz app, falls back to browser
```

### Mobile Detection
```typescript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
```

### URL Format Benefits

The `https://mapy.com/fnc/v1/route` URL format is designed for universal links:
- **iOS**: Recognizes the URL and opens Mapy.cz app if installed
- **Android**: Uses Android App Links to open Mapy.cz app if installed
- **Fallback**: Opens in mobile browser if app not installed
- **Desktop**: Opens normally in browser

This provides a seamless experience across all platforms without requiring platform-specific URL schemes (like `mapycz://`).


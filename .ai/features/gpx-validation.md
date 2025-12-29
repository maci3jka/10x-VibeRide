# GPX Validation Feature

## Overview
Added comprehensive GPX 1.1 validation to ensure all generated GPX files are valid before download. This prevents users from downloading corrupt or malformed GPS files.

## Implementation

### 1. GPX Validator Service
**File:** `src/lib/services/gpxValidator.ts`

Validates GPX 1.1 XML structure with the following checks:

#### Critical Validations (Errors)
- XML declaration present
- GPX root element exists
- GPX version is 1.1
- Correct GPX namespace (`http://www.topografix.com/GPX/1/1`)
- At least one waypoint, route, or track present
- Waypoints have required `lat` and `lon` attributes
- Latitude values between -90 and 90
- Longitude values between -180 and 180
- Routes contain route points (`<rtept>`)
- Route points have valid coordinates
- Proper closing `</gpx>` tag

#### Non-Critical Validations (Warnings)
- Missing `<metadata>` element (recommended but not required)
- Waypoints missing `<name>` elements
- Routes missing `<name>` elements
- Potentially unbalanced XML tags

### 2. Validation API

```typescript
interface GpxValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Validate and return detailed results
function validateGpx(gpxContent: string): GpxValidationResult

// Validate and throw if invalid
function assertValidGpx(gpxContent: string): void
```

### 3. Integration Points

#### A. GPX Service (Generation Time)
**File:** `src/lib/services/gpxService.ts`

```typescript
export function generateGPX(itinerary: ItinerarySummaryJSON, itineraryId: string): string {
  // ... generate GPX XML ...
  
  // Validate before returning
  assertValidGpx(gpxXml);
  
  return gpxXml;
}
```

Catches validation errors immediately during generation, preventing invalid GPX from being stored.

#### B. Download API (Download Time)
**File:** `src/pages/api/itineraries/[itineraryId]/gpx.ts`

```typescript
// Generate GPX
const gpxContent = generateGPX(itinerary.summary_json, itineraryId);

// Validate before download
const validationResult = validateGpx(gpxContent);

if (!validationResult.isValid) {
  logger.error({ errors: validationResult.errors }, "GPX validation failed");
  return errorResponse(500, "gpx_validation_failed", 
    `Generated GPX file is invalid: ${validationResult.errors.join(", ")}`);
}

// Log warnings
if (validationResult.warnings.length > 0) {
  logger.warn({ warnings: validationResult.warnings }, "GPX has warnings");
}
```

Double-checks validation before serving the file to users, with detailed error logging.

## Error Handling

### Generation Errors
If GPX generation produces invalid output:
1. Error is caught by `assertValidGpx()` in `gpxService.ts`
2. Error is logged with itinerary details
3. Itinerary status set to `failed`
4. User sees error message in UI

### Download Errors
If stored GPX is invalid (shouldn't happen, but defensive):
1. Validation runs before download
2. Returns 500 error with specific validation failures
3. Logs detailed error information
4. User sees "Failed to download GPX" message

## Testing

### Unit Tests
**File:** `src/lib/services/gpxValidator.test.ts`

16 comprehensive tests covering:
- Valid GPX acceptance
- Empty content rejection
- Missing XML declaration
- Missing/incorrect GPX version
- Missing namespace
- Missing metadata (warning)
- Empty GPX (no waypoints/routes/tracks)
- Invalid latitude/longitude values
- Waypoints without coordinates
- Routes without route points
- Missing closing tags
- `assertValidGpx()` exception behavior

### Integration Tests
Updated `src/lib/services/gpxService.test.ts`:
- All tests now generate valid GPX (at least one segment)
- Tests verify validator doesn't reject valid GPX
- Tests ensure empty itineraries still produce valid structure

## Benefits

1. **User Safety**: Prevents download of corrupt GPS files that could cause navigation issues
2. **Early Detection**: Catches generation errors immediately, not at download time
3. **Debugging**: Detailed error messages help identify specific issues
4. **Standards Compliance**: Ensures all GPX files conform to GPX 1.1 specification
5. **Logging**: Comprehensive logging of validation failures for monitoring

## Future Enhancements

Potential improvements:
1. Validate elevation data when added
2. Check for track points in tracks
3. Validate timestamp formats
4. Check for minimum distance between points
5. Validate route point ordering
6. Add XML schema validation (XSD)
7. Validate against specific GPS device requirements

## Related Files

- `src/lib/services/gpxValidator.ts` - Validator implementation
- `src/lib/services/gpxValidator.test.ts` - Unit tests
- `src/lib/services/gpxService.ts` - GPX generation with validation
- `src/lib/services/gpxService.test.ts` - GPX service tests
- `src/pages/api/itineraries/[itineraryId]/gpx.ts` - Download endpoint with validation


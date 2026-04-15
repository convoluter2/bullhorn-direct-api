# Fixes Applied to Rate Card Builder

## Issue 1: KV Storage Error - "KeyValuePairExceedsMaxLength"

### Problem
The error `KeyValuePairExceedsMaxLength` with length '515272' exceeds maximum '512000' was occurring when caching entity metadata for lookups. The metadata objects were too large to store in the KV store.

### Solution
Updated `/src/lib/entity-cache-service.ts` with intelligent metadata compression:

1. **Compression Method** - Added `compressMetadata()` that strips unnecessary fields from metadata before storage, keeping only essential fields:
   - name, label, type, dataType
   - dataSpecialization, required, readonly, multiValue
   - optionsType, associatedEntity (minimal)
   - composite fields (minimal)

2. **Minimal Fallback** - Added `createMinimalMetadata()` that creates ultra-minimal metadata (only name, label, type, dataType) if compressed version is still too large

3. **Size Checking** - Added pre-save size checking that logs metadata size and automatically uses minimal version if over 500KB

4. **Error Handling** - Catches `KeyValuePairExceedsMaxLength` errors and automatically retries with minimal metadata

This fix ensures that entity metadata can be cached without exceeding the 512KB limit, preventing lookup errors.

## Issue 2: Field Mapping for Rate Card CSV Upload

### Problem
Users couldn't map custom CSV columns to RateCardLine fields, limiting flexibility when importing from different CSV formats.

### Solution
Enhanced `/src/components/RateCardBuilder.tsx` with comprehensive field mapping:

1. **Auto-Detection** - Automatically detects standard column names (Earn Code, Title, Rate, etc.) and maps them

2. **Custom Mapping Dialog** - Added interactive mapping dialog when non-standard columns are detected with:
   - Visual column-to-field mapping interface
   - Dropdown selectors for CSV columns and RateCardLine fields
   - Add/remove mapping rows
   - Required field indicators

3. **Field Metadata Loading** - Fetches RateCardLine metadata on component mount to show all available fields for mapping

4. **Flexible Data Handling** - Preserves unmapped columns as additional fields, allowing custom data to flow through

## Issue 3: Adding Custom Fields to Rate Card Lines

### Problem
Users couldn't add additional fields from their CSV to RateCardLine entities during upload.

### Solution
Modified the CSV processing and insertion logic:

1. **Extended CSVRateCardLine Interface** - Added `[key: string]: any` to accept any additional fields from CSV

2. **Field Preservation** - During mapping, all unmapped CSV columns are preserved in the line object

3. **Dynamic Field Insertion** - When creating RateCardLine entities, all additional fields (beyond the standard earnCode, title, unitOfMeasure, rate, markupPercent) are included in the insert payload

4. **Field Discovery** - The mapping dialog shows all available RateCardLine fields from metadata, not just the standard ones

### Usage Examples

**Standard CSV (Auto-Mapped)**
```csv
Earn Code,Title,Unit of Measure,Rate,Markup %
REG,Regular Time,Hour,50.00,10.00
OT,Overtime,Hour,75.00,10.00
```

**Custom CSV (Requires Mapping)**
```csv
Code,Description,UoM,Bill Rate,Markup,Category,Notes
REG,Regular Time,Hour,50.00,10.00,Standard,General work
OT,Overtime,Hour,75.00,10.00,Premium,Over 40 hours
```

Map:
- Code → earnCode
- Description → title
- UoM → unitOfMeasure
- Bill Rate → rate
- Markup → markupPercent
- Category → (custom field if exists in RateCardLine)
- Notes → (custom field if exists in RateCardLine)

## Benefits

1. **No More KV Storage Errors** - Metadata is compressed and fits within the 512KB limit
2. **Flexible CSV Import** - Any CSV format can be mapped to RateCardLine fields
3. **Custom Field Support** - Additional fields from CSV are preserved and inserted
4. **Better UX** - Visual mapping interface makes it clear what data goes where
5. **Auto-Detection** - Standard formats still work automatically without manual mapping

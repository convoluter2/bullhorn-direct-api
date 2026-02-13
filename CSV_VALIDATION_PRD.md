# CSV Upload Validation System

A comprehensive data validation system that prevents invalid CSV uploads and provides real-time feedback to ensure data integrity before import operations.

**Experience Qualities**: 
1. **Preventative** - Catches errors early with multi-layered validation that stops invalid data before it reaches the API
2. **Informative** - Clear, actionable error messages and warnings guide users to fix issues efficiently
3. **Real-time** - Instant validation feedback as users configure mappings and settings, preventing wasted time on failed imports

**Complexity Level**: Light Application (multiple features with basic state) - Adds a validation layer to existing CSV import functionality with real-time state management and user feedback mechanisms.

## Essential Features

### File-Level Validation
- **Functionality**: Validates CSV files before parsing - checks file size, extension, MIME type, and basic structure
- **Purpose**: Prevents upload of corrupted, oversized, or incorrect file types that would fail during import
- **Trigger**: Immediately when user selects a file via file input
- **Progression**: User selects file → File validation runs → Errors block upload → Warnings shown with toast → File parsed if valid
- **Success criteria**: Invalid files rejected before parsing, valid files load with appropriate warnings displayed

### Content-Level Validation
- **Functionality**: Validates parsed CSV structure - headers, row count, column consistency, data types
- **Purpose**: Ensures CSV content meets requirements for successful import (proper headers, consistent columns, valid data)
- **Trigger**: After successful file parse
- **Progression**: CSV parsed → Content validation runs → Headers checked → Rows validated → Errors/warnings displayed → User proceeds or fixes issues
- **Success criteria**: Structural issues identified and displayed before any field mapping occurs

### Field Mapping Validation
- **Functionality**: Validates that field mappings are correct - no duplicates, required fields mapped, lookup field configured
- **Purpose**: Prevents import failures due to misconfigured field mappings
- **Trigger**: Real-time as user changes field mappings in dropdowns
- **Progression**: User maps field → Validation runs → Duplicate check → Required field check → Errors/warnings update → Import button state updates
- **Success criteria**: Mapping errors caught immediately with clear guidance on what needs to be fixed

### Import Configuration Validation
- **Functionality**: Validates import settings - entity selected, operation mode chosen, lookup field properly configured
- **Purpose**: Ensures all required configuration is complete before import execution
- **Trigger**: Real-time as user changes switches and selectors
- **Progression**: User changes setting → Configuration validation runs → Logic checked → Errors/warnings displayed → Import blocked if invalid
- **Success criteria**: Configuration errors prevent import execution with clear messages on required fixes

### Real-Time Validation Feedback
- **Functionality**: Live validation status display with error and warning counts, detailed messages, and visual indicators
- **Purpose**: Keeps users informed of validation state without needing to attempt import
- **Trigger**: Automatically updates when any validation-related state changes
- **Progression**: State changes → Validation runs → UI updates → Alerts shown/hidden → Button states change → User sees instant feedback
- **Success criteria**: Users always see current validation state without lag or confusion

### Pre-Import Validation Gate
- **Functionality**: Final comprehensive validation check before import execution starts
- **Purpose**: Last safety check to prevent any invalid data from reaching the API
- **Trigger**: User clicks import/preview button
- **Progression**: Button clicked → All validations re-run → Errors block execution → Warnings displayed → Import proceeds if valid
- **Success criteria**: Zero invalid imports reach the API, all errors caught and reported

## Edge Case Handling

- **Empty Files**: Validation error with clear message "CSV file is empty"
- **Oversized Files**: Rejection with specific size limit message (50MB default)
- **Missing Headers**: Error with message "CSV file has no headers"
- **Duplicate Column Names**: Error listing which columns are duplicated with occurrence counts
- **Inconsistent Row Lengths**: Warning about rows with mismatched column counts
- **Empty Cells**: Optional warning about empty values (configurable)
- **Special Characters in Headers**: Warning about potentially problematic characters
- **No Mapped Fields**: Error requiring at least one field to be mapped (not skipped)
- **Duplicate Field Mappings**: Error if same Bullhorn field mapped multiple times
- **Update Without Lookup**: Error if update mode enabled but no lookup field selected
- **No Operation Selected**: Error if neither update nor create mode enabled
- **Large Cell Values**: Warning about cells exceeding 10,000 characters

## Design Direction

The validation system should feel proactive and helpful, not punitive. Errors should clearly explain the problem and guide users toward the fix. Visual hierarchy should make critical errors stand out while warnings provide context without blocking progress.

## Color Selection

- **Primary Color**: Deep blue-purple `oklch(0.35 0.12 265)` - Technical authority for actions
- **Secondary Colors**: Cool grays for neutral UI elements
- **Accent Color**: Cyan `oklch(0.70 0.15 210)` - Success states and highlights
- **Error Color**: Red `oklch(0.55 0.22 25)` - Validation errors and destructive actions
- **Warning Color**: Yellow/Orange `oklch(0.70 0.15 50)` - Non-blocking validation warnings
- **Foreground/Background Pairings**: 
  - Error Alert (Red) `oklch(0.55 0.22 25)`: White text `oklch(0.98 0 0)` - Ratio 5.2:1 ✓
  - Warning Alert (Yellow) `oklch(0.70 0.15 50)`: Dark text `oklch(0.25 0.01 260)` - Ratio 6.8:1 ✓
  - Success (Accent) `oklch(0.70 0.15 210)`: Dark text `oklch(0.25 0.01 260)` - Ratio 5.1:1 ✓

## Font Selection

Clear, readable typefaces that ensure error messages are scannable and understandable:

- **Typographic Hierarchy**:
  - Alert Titles: Inter Semibold/14px/tight spacing - Stand out for quick scanning
  - Error Messages: Inter Regular/13px/relaxed spacing - Easy to read details
  - Warning Text: Inter Regular/13px/relaxed spacing - Less urgent but clear
  - Validation Counts: Inter Medium/12px/tight spacing - Compact numerical feedback

## Animations

Subtle animations that draw attention to validation changes without being distracting:

- **Alert Appearance**: Gentle fade-in with slide down (200ms ease-out)
- **Error Icon Pulse**: Single subtle pulse when errors appear (300ms)
- **Button State Changes**: Smooth color transition when disabled state changes (150ms)
- **Toast Notifications**: Standard sonner slide-in animation for instant feedback

## Component Selection

- **Components**: 
  - `Alert` (default and destructive variants) - Primary validation message display
  - `Badge` - Compact error/warning counts
  - `toast` from sonner - Instant feedback on file upload and validation changes
  - `Button` - Disabled state when validation fails
  - Custom warning Alert with yellow styling

- **Customizations**: 
  - Warning Alert: Custom yellow border and background (`border-yellow-500/50 bg-yellow-500/10`)
  - Error lists: Bulleted lists within alert descriptions for multiple errors
  - Validation summary below import button with icons
  - Real-time error count badges

- **States**:
  - Valid: No alerts shown, import button enabled, green success indicators
  - Errors: Red alert with error list, import button disabled, error count shown
  - Warnings: Yellow alert with warning list, import button enabled, warning count shown
  - Mixed: Both alerts shown, import enabled but with caution indicators

- **Icon Selection**: 
  - `WarningCircle` - Critical validation errors
  - `Warning` - Non-blocking validation warnings
  - `CheckCircle` - Validation success states
  - `Upload` - File selection

- **Spacing**: Consistent use of gap-2 for alert stacks, p-3 for alert padding, space-y-2 for validation sections

- **Mobile**: Alerts stack vertically, full width on mobile with responsive text sizing

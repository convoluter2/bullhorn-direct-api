# Field Mapping Templates Feature

A template management system that allows users to save, load, and reuse common CSV field mapping configurations, dramatically reducing setup time for recurring imports.

**Experience Qualities**: 
1. **Efficient** - Save once, reuse forever. Templates eliminate repetitive manual field mapping for common import scenarios
2. **Organized** - Templates are automatically filtered by entity type, ensuring you only see relevant mappings
3. **Discoverable** - Prominent Save/Load buttons integrated directly into the field mapping workflow

**Complexity Level**: Light Application (multiple features with basic state) - Adds template persistence and management to the existing CSV Loader, introducing CRUD operations for templates with entity-aware filtering.

## Essential Features

### Save Field Mapping Template
- **Functionality**: Captures current field mappings and stores them as a named, reusable template
- **Purpose**: Eliminates the need to manually map the same fields repeatedly for recurring imports
- **Trigger**: User clicks "Save Template" button after configuring field mappings
- **Progression**: User configures mappings → Clicks Save Template → Dialog opens → Enters name & description → Saves → Template persisted to storage
- **Success criteria**: Template is saved with all current mappings, entity association, and metadata; confirmation toast appears

### Load Field Mapping Template
- **Functionality**: Applies a previously saved template's mappings to the current CSV upload
- **Purpose**: Instantly configure all field mappings based on proven, working configurations
- **Trigger**: User clicks "Load Template" button when CSV is loaded and entity is selected
- **Progression**: User clicks Load Template → Dialog shows entity-filtered templates → User selects template → Mappings applied → Confirmation shown
- **Success criteria**: All matching CSV columns are mapped according to template; auto-matching fills in any additional columns; usage count increments

### Template Management
- **Functionality**: View, delete, and track usage of saved templates
- **Purpose**: Allows users to manage their library of templates and remove obsolete ones
- **Trigger**: Template cards in the Load Template dialog with delete buttons
- **Progression**: User views templates → Clicks delete icon → Confirms deletion → Template removed → Storage updated
- **Success criteria**: Template is permanently removed from storage; UI updates immediately

### Smart Template Application
- **Functionality**: When applying a template, matches CSV columns to template mappings by name (case-insensitive), with fallback to auto-matching for unmapped columns
- **Purpose**: Handles variations in CSV column ordering and presence while maximizing template utility
- **Trigger**: Automatically when user selects a template to load
- **Progression**: Template selected → CSV columns matched to template by name → Unmatched columns auto-matched to entity fields → All mappings applied
- **Success criteria**: Maximum number of fields mapped correctly; user notified of match count

### Entity-Aware Filtering
- **Functionality**: Templates are filtered to show only those matching the currently selected entity
- **Purpose**: Prevents confusion and errors from applying wrong-entity templates
- **Trigger**: Automatically when Load Template dialog opens
- **Progression**: Dialog opens → Current entity checked → Templates filtered → Matching templates shown; others listed separately
- **Success criteria**: Users see relevant templates first; attempting to apply wrong-entity template shows error

## Edge Case Handling

- **No Templates Saved**: Empty state with helpful message encouraging users to save their first template
- **Wrong Entity Selected**: Error toast prevents applying templates for different entities
- **CSV Column Mismatch**: Unmapped columns fall back to auto-matching; user sees count of applied mappings
- **No Valid Mappings**: Save button disabled with tooltip explaining at least one valid mapping is required
- **Template Name Collision**: Each template gets unique ID; multiple templates can have same display name
- **CSV Not Loaded**: Load Template disabled with tooltip to upload CSV first

## Design Direction

The template system should feel like a productivity enhancement - fast, lightweight, and integrated seamlessly into the existing workflow. Templates should be easy to save on first use and trivial to apply on subsequent imports.

## Color Selection

Inherits from existing CSV Loader design:

- **Primary Color**: Deep blue-purple `oklch(0.35 0.12 265)` - Template action buttons match existing UI
- **Secondary Colors**: Cool gray tones for template cards and metadata
- **Accent Color**: Cyan `oklch(0.70 0.15 210)` - Success states and active template indicators
- **Foreground/Background Pairings**: 
  - Template card `oklch(0.22 0.01 260)`: Light text `oklch(0.98 0 0)` - Ratio 12.5:1 ✓
  - Badge (entity) `oklch(0.30 0.01 260)`: Light text `oklch(0.98 0 0)` - Ratio 10.2:1 ✓

## Font Selection

Consistent with the technical aesthetic of the data management interface:

- **Typographic Hierarchy**:
  - Dialog Title: Space Grotesk Bold/20px/tight spacing
  - Template Name: Space Grotesk Semi-Bold/16px/normal spacing
  - Template Description: Inter Regular/14px/relaxed spacing
  - Field Mapping Badges: JetBrains Mono Regular/12px/tight spacing - Monospace for field names
  - Metadata (usage, dates): Inter Regular/12px/tight spacing

## Animations

Subtle animations enhance the template selection experience:

- **Template Card Hover**: Border color transition to primary (200ms) - Indicates clickability
- **Dialog Open/Close**: Smooth fade-in with scale (150ms) - Radix UI default
- **Delete Confirmation**: Button hover with slight scale increase (100ms)
- **Template Applied**: Success toast slides in from top-right (300ms)

## Component Selection

- **Components**: 
  - `Dialog` - Full-screen modal for template save/load with proper focus management
  - `Card` - Template list items with hover states for selection
  - `Button` - Save/Load actions use outline variant; delete uses ghost variant
  - `Input` - Template name and description fields with proper labeling
  - `Badge` - Shows entity type, usage count, and field count
  - `ScrollArea` - Handles long template lists with smooth scrolling
  - `Alert` - Informative message when no templates match current entity

- **Customizations**: 
  - Template cards are clickable with `cursor-pointer` and hover border color change
  - Load Template dialog uses `max-w-2xl` for viewing template details
  - Save Template dialog uses `max-w-md` for focused data entry
  - Field mapping badges truncate with ellipsis to prevent layout breaks

- **States**:
  - Save Template button: Disabled when no entity or no valid mappings
  - Load Template button: Disabled when no entity selected; shows badge with template count
  - Template cards: Hover state with primary border; click applies template
  - Delete button: Ghost variant, stops event propagation to prevent card click

- **Icon Selection**: 
  - `FloppyDisk` - Classic save icon, universally recognized
  - `FolderOpen` - Open/load action for templates
  - `Trash` - Delete action on template cards
  - `FileText` - Empty state icon when no templates exist
  - `Database` - Alert icon when showing wrong-entity templates
  - `Calendar` - Timestamp metadata display
  - `Check` - Confirmation in save dialog

- **Spacing**: 
  - Template cards: `space-y-2` for clean list separation
  - Dialog content: `py-4` top/bottom, `space-y-4` internal
  - Button groups: `gap-2` for related actions
  - Template metadata: `gap-4` between stats, `gap-1` for icon pairs

- **Mobile**: 
  - Dialog remains full-width on mobile with proper padding
  - Template card layout stacks vertically on small screens
  - Field mapping badges wrap with `flex-wrap` to prevent overflow
  - Save/Load buttons maintain full width on mobile

## Usage Tracking

Templates track usage statistics for user insights:

- **Usage Count**: Increments each time a template is applied
- **Created At**: Timestamp of template creation
- **Updated At**: Updates when template is applied (for usage count)
- **Display Format**: "Used X times" and relative time ("2 days ago")

## Storage Implementation

Templates are persisted using the `useKV` hook:

- **Key**: `'field-mapping-templates'`
- **Type**: Array of `FieldMappingTemplate` objects
- **Structure**: Each template includes id, name, description, entity, mappings array, timestamps, and usage count
- **Persistence**: Survives page refreshes and browser sessions
- **Updates**: All operations use functional updates to prevent race conditions

## Integration Points

The template system integrates seamlessly with existing CSV Loader features:

- **Auto-Matching**: Works alongside template application - unmapped columns still use auto-match logic
- **Field Validation**: Templates respect all existing validation rules
- **Audit Logging**: Template application creates audit log entries
- **Entity Selection**: Templates are entity-aware and only apply to matching entities
- **Transform Functions**: Transform configurations are saved and restored with templates

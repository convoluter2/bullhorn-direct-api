# Real-Time Metadata Refresh Enhancement

A real-time metadata refresh system that allows users to force reload entity lists and metadata on demand, with visual feedback and improved user experience.

**Experience Qualities**: 
1. **Responsive** - Immediate visual feedback with spinning animations and toast notifications during refresh operations
2. **Reliable** - Clear error states with retry mechanisms ensure users can always access fresh data
3. **Intuitive** - Subtle, discoverable refresh buttons placed contextually next to entity selectors

**Complexity Level**: Light Application (multiple features with basic state) - This enhancement adds interactive refresh capabilities to an existing data management application, introducing state management for loading indicators and cache invalidation logic.

## Essential Features

### Entity List Refresh Button
- **Functionality**: Allows users to force reload the complete list of available Bullhorn entities from the API
- **Purpose**: Ensures users always have access to the latest entity types, especially important when custom entities are added or schema changes occur
- **Trigger**: Click on the refresh icon button (ArrowsClockwise) next to the entity count badge
- **Progression**: User clicks refresh → Loading toast appears → API call executes → Cache invalidates → Fresh entity list loads → Success toast displays
- **Success criteria**: Entity list updates with latest data from API, cache is cleared, and user receives confirmation notification

### Metadata Refresh Function
- **Functionality**: Programmatic refresh of entity field metadata with cache invalidation
- **Purpose**: Enables on-demand reloading of field definitions when entity schemas are modified
- **Trigger**: Exported `refresh()` function from `useEntityMetadata` hook and `clearMetadataCache()` utility
- **Progression**: Component calls refresh → Cache entry deleted → Metadata refetched from API → Fields list updates
- **Success criteria**: Latest field metadata loaded and displayed, obsolete cache cleared

### Visual Loading States
- **Functionality**: Animated feedback during refresh operations
- **Purpose**: Provides clear indication that the system is working and prevents user confusion
- **Trigger**: Automatically shown during any refresh operation
- **Progression**: User initiates refresh → Icon spins with CSS animation → Loading toast notification → Operation completes → Success toast
- **Success criteria**: Users see immediate visual response and understand the current state of their action

### Error Recovery
- **Functionality**: Dedicated retry buttons in error and empty states
- **Purpose**: Provides clear recovery path when entity loading fails
- **Trigger**: Displayed when entity fetch fails or returns empty results
- **Progression**: Error occurs → Error message shown → User clicks Retry → Fresh fetch attempt → Success or new error state
- **Success criteria**: Users can recover from transient failures without page reload

## Edge Case Handling

- **Network Failures**: Retry button with spinning animation and error toast notification
- **Empty Response**: "Load Entities" button with clear messaging guides user to manual fetch
- **Concurrent Refreshes**: Loading state prevents multiple simultaneous refresh operations
- **Cache Invalidation**: Explicit cache clearing ensures no stale data persists after refresh

## Design Direction

The design should feel technical and professional, with subtle animations that enhance usability without being distracting. Refresh actions should feel instantaneous and reliable, building confidence in data freshness.

## Color Selection

- **Primary Color**: Deep blue-purple `oklch(0.35 0.12 265)` - Technical authority for primary actions
- **Secondary Colors**: Cool gray tones for subtle UI elements
- **Accent Color**: Cyan `oklch(0.70 0.15 210)` - Highlights refresh actions and success states
- **Foreground/Background Pairings**: 
  - Background (Dark) `oklch(0.15 0.01 260)`: Light text `oklch(0.98 0 0)` - Ratio 14.2:1 ✓
  - Accent (Cyan) `oklch(0.70 0.15 210)`: Dark text `oklch(0.25 0.01 260)` - Ratio 5.1:1 ✓

## Font Selection

Modern, technical typefaces that convey precision and clarity:

- **Typographic Hierarchy**:
  - H1 (Component Titles): Space Grotesk Bold/24px/tight spacing
  - Labels: Inter Medium/14px/normal spacing  
  - Body: Inter Regular/14px/relaxed spacing
  - Badges: Inter Medium/12px/tight spacing

## Animations

Animations serve functional purposes - communicating state changes and providing feedback:

- **Refresh Icon Spin**: Continuous 360° rotation during loading (CSS `animate-spin`)
- **Toast Notifications**: Slide-in from top-right with gentle ease-out timing
- **Button Hover**: Subtle background color transition (150ms)

## Component Selection

- **Components**: 
  - `Button` (ghost variant) - Minimal refresh icon buttons that don't compete visually
  - `Badge` (secondary variant) - Displays entity count with subtle styling
  - `Skeleton` - Loading placeholder for entity selector during fetch
  - `toast` from sonner - Non-blocking notifications for refresh operations

- **Customizations**: 
  - Refresh buttons use `h-6 px-2` sizing for compact placement
  - Added `animate-spin` conditional class on ArrowsClockwise icon
  - Toast notifications use contextual IDs for state replacement

- **States**:
  - Loading: Spinning icon + loading toast + disabled state
  - Success: Success toast with green checkmark
  - Error: Error message + retry button with red accent
  - Empty: Informational message + load button

- **Icon Selection**: 
  - `ArrowsClockwise` - Universal symbol for refresh/reload
  - `Plus` - Add manual entity
  - Consistent 14px-16px sizing for compact layouts

- **Spacing**: 
  - `gap-2` for button groups
  - `h-6` height for inline action buttons
  - `px-2` horizontal padding for compact clickable area

- **Mobile**: 
  - Refresh buttons remain visible on mobile
  - Toast notifications stack responsively
  - Icon-only buttons save horizontal space

---

# Certification File Converter

A batch processing tool that downloads CandidateCertificationFileAttachment images, converts them to standardized letter-size PDFs with compression, and replaces the originals in Bullhorn.

**Experience Qualities**: 
1. **Efficient** - Batch processing with progress tracking and pause/resume capabilities
2. **Transparent** - Real-time status updates, detailed logging, and comprehensive error reporting  
3. **Reliable** - Automatic retry logic, file validation, and rollback on failure

**Complexity Level**: Light Application (multiple features with basic state) - Handles file downloads, image-to-PDF conversion with compression, API interactions, and provides detailed progress tracking with error recovery.

## Essential Features

### Bulk File ID Input
- **Functionality**: Accepts multiple CandidateCertificationFileAttachment IDs via textarea (newline or comma-separated)
- **Purpose**: Enables batch processing of certification files without manual repetition
- **Trigger**: User pastes or types file attachment IDs into the textarea
- **Progression**: User enters IDs → System parses and validates → Displays count → Ready to start
- **Success criteria**: All valid numeric IDs are parsed and deduplicated, count displayed to user

### Image to PDF Conversion
- **Functionality**: Downloads image files and converts them to standard 8.5" x 11" PDFs with compression
- **Purpose**: Standardizes certification documents for consistent packet generation and reduces storage requirements
- **Trigger**: Automated for each file when "Start Conversion" is clicked
- **Progression**: Download image blob → Load into canvas → Resize maintaining aspect ratio → Center on letter page → Apply JPEG compression (85%) → Generate PDF with jsPDF → Compress final output
- **Success criteria**: Image centered on page with 0.5" margins, maximum dimension 2000px, final PDF smaller than original

### File Replacement
- **Functionality**: Deletes original image attachment and uploads converted PDF in its place
- **Purpose**: Maintains single source of truth while upgrading file format
- **Trigger**: Automatically after successful conversion
- **Progression**: Delete original via DELETE /file endpoint → Upload PDF via PUT /file endpoint → Associate with same CandidateCertification
- **Success criteria**: Original removed, PDF attached with original filename (changed extension), same certification linkage preserved

### Progress Tracking & Controls
- **Functionality**: Real-time progress bar, file counter, ETA, pause/resume buttons
- **Purpose**: Provides visibility into long-running operations and control over processing
- **Trigger**: Automatically updates during batch processing
- **Progression**: Start → Processing indicator shows current file → Progress bar updates → ETA calculated → Pause available → Success/error states logged
- **Success criteria**: User sees current file number, percentage complete, time remaining, and can pause/resume at any time

### Results Table
- **Functionality**: Detailed table showing all conversion attempts with status, file info, compression ratios, and error messages
- **Purpose**: Comprehensive reporting for audit and troubleshooting
- **Trigger**: Populates as each file processes
- **Progression**: File starts → Status "processing" → Completes → Status "success" or "error" → Details populated
- **Success criteria**: Every file shows status badge, original/converted sizes, compression ratio, and descriptive messages

## Edge Case Handling

- **Non-Image Files**: Skip with clear error message indicating only image types supported (JPG, PNG, GIF, BMP, WEBP)
- **Missing Associations**: Log error if CandidateCertification or Candidate ID not found
- **Download Failures**: Retry up to 2 times with exponential backoff (2s, 4s)
- **Conversion Errors**: Catch image load failures and canvas rendering issues, log specific error
- **Upload Failures**: Retry upload, but don't delete original if upload fails
- **Paused State**: Preserve all results and allow resumption from next file

## Design Direction

The design should feel professional and data-focused, emphasizing clarity and completeness. Visual hierarchy should guide users through the batch process with confidence.

## Color Selection

Using existing application color scheme for consistency:

- **Primary Color**: Deep blue-purple `oklch(0.35 0.12 265)` - Primary action buttons
- **Success Color**: Green from `CheckCircle` icon - Successful conversions
- **Error Color**: Red from `XCircle` icon and `destructive` variant - Failed conversions  
- **Accent Color**: Cyan `oklch(0.70 0.15 210)` - Active processing indicators
- **Foreground/Background Pairings**: 
  - Background (Dark) `oklch(0.15 0.01 260)`: Light text `oklch(0.98 0 0)` - Ratio 14.2:1 ✓
  - Success (Green): White text - Ratio 4.8:1 ✓ (in Badge component)
  - Error (Red): White text - Ratio 4.5:1 ✓ (in Badge component)

## Font Selection

Consistent with application for cohesive experience:

- **Typographic Hierarchy**:
  - H1 (Card Title): Space Grotesk Bold/24px/tight spacing
  - H2 (Section Headers): Space Grotesk Semibold/18px/normal spacing
  - Labels: Inter Medium/14px/normal spacing  
  - Body: Inter Regular/14px/relaxed spacing
  - Table Data: Inter Regular/13px/normal spacing
  - Monospace (IDs, file sizes): JetBrains Mono Regular/12px

## Animations

Functional animations that communicate state and progress:

- **Processing Indicator**: Pulsing animation on "Processing" badge
- **Progress Bar**: Smooth width transition as percentage updates
- **Pause Icon**: Instant swap between Play/Pause icons
- **Toast Notifications**: Slide-in for each file completion (success or error)

## Component Selection

- **Components**: 
  - `Card` with `CardHeader` and `CardContent` - Main container
  - `Textarea` - Multi-line file ID input with monospace font
  - `Button` (default and outline variants) - Start, Pause/Resume, Reset
  - `Progress` - Visual progress bar
  - `Badge` (default, outline, secondary, destructive) - Status indicators and counters
  - `Table` with `ScrollArea` - Results display
  - `Alert` - Informational help text and pause notifications
  - `toast` from sonner - Per-file completion notifications

- **Customizations**: 
  - Textarea uses `font-mono` class for ID readability
  - Table cells use `truncate` with `title` attribute for long filenames
  - Success/error colors applied contextually in table
  - File sizes formatted with custom utility function (KB/MB)
  - Compression ratios highlighted in green when >1x

- **States**:
  - Idle: Input enabled, Start button active
  - Processing: Progress bar visible, Pause button active, current file highlighted
  - Paused: Alert shown, Resume button active, state preserved
  - Complete: Full results table, Reset button to clear

- **Icon Selection**: 
  - `FilePdf` (32px, duotone) - Card header representing PDF conversion
  - `Play` (fill) - Start and Resume actions
  - `Pause` (fill) - Pause action
  - `ArrowClockwise` - Reset action
  - `CheckCircle` (fill, green) - Success status
  - `XCircle` (fill, red) - Error status  
  - `FileArrowDown` (pulse) - Processing status
  - `ImageIcon` - Original file type indicator
  - `Info` - Help alert icon

- **Spacing**: 
  - `space-y-6` for card sections
  - `space-y-3` for form groups
  - `gap-3` for button groups
  - `gap-2` for inline badge groups
  - `p-4` for alert content

- **Mobile**: 
  - Table wraps in ScrollArea for horizontal scroll
  - Button text remains visible (not icon-only)
  - Progress bar full width
  - Results table shows key columns, others truncate

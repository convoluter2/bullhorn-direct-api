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

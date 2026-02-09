# Bullhorn Entity Documentation System

A comprehensive, auto-updating API reference documentation system for all Bullhorn entities, matching the official documentation format.

**Experience Qualities**:
1. **Professional** - Clean, reference-style documentation matching enterprise API docs standards
2. **Comprehensive** - Complete field details, sample requests/responses, and operations for every entity
3. **Dynamic** - Automatically updates when entities are added or modified in the application

**Complexity Level**: Light Application (multiple features with basic state)
This is a documentation viewer with entity metadata management, search, and auto-generation capabilities.

## Essential Features

### Entity Documentation Browser
- **Functionality**: Display complete API reference for each Bullhorn entity
- **Purpose**: Provide developers quick access to field definitions, data types, and usage examples
- **Trigger**: User selects entity from sidebar or searches
- **Progression**: Select entity → View fields table → See sample requests → Copy code snippets → Test in app
- **Success criteria**: Documentation loads instantly, matches official format, includes all entity metadata

### Auto-Discovery & Sync
- **Functionality**: Detect when users query new entities and automatically fetch their metadata from API
- **Purpose**: Keep documentation current with actual API usage without manual updates
- **Trigger**: User queries an entity not yet documented
- **Progression**: Detect new entity → Fetch metadata via API → Generate docs → Update sidebar → Notify user
- **Success criteria**: New entities appear in docs within seconds of first use

### Sample Code Generator
- **Functionality**: Generate working API request samples for CRUD operations
- **Purpose**: Accelerate development by providing copy-paste ready code
- **Trigger**: User clicks operation tab (GET, PUT, POST, DELETE)
- **Progression**: Select operation → View sample curl/JS → Customize parameters → Copy code → Use in app
- **Success criteria**: All samples use current session credentials and work when pasted

### Field Metadata Display
- **Functionality**: Show comprehensive field information (type, nullable, max length, associations)
- **Purpose**: Help developers understand data constraints and relationships
- **Trigger**: View entity documentation page
- **Progression**: Open entity → Scan fields table → Understand types/constraints → Use correct values
- **Success criteria**: Table shows type, nullable status, description, and related entities

### Search & Filter
- **Functionality**: Quick search across entities and fields
- **Purpose**: Find specific entities or fields instantly
- **Trigger**: User types in search box
- **Progression**: Type search term → See filtered results → Click entity → View docs
- **Success criteria**: Search returns results in <100ms, highlights matches

## Edge Case Handling
- **Missing Metadata**: Gracefully show partial docs with "fetch metadata" button when API fails
- **Unsupported Entities**: Display warning for custom entities that may have different schemas
- **Network Errors**: Show cached docs with warning banner when offline
- **Large Field Lists**: Virtual scrolling for entities with 100+ fields
- **Circular References**: Mark and handle to-many/to-one relationships without infinite loops

## Design Direction
Technical, modern documentation aesthetic - think Stripe or GitHub API docs. Clean typography, generous whitespace, syntax-highlighted code blocks, and professional color coding for data types.

## Color Selection
A refined technical palette emphasizing readability and professional documentation standards.

- **Primary Color**: Deep Blue `oklch(0.35 0.12 265)` - Professional, trustworthy, used for headers and links
- **Secondary Colors**: Slate Gray `oklch(0.55 0.015 250)` for subtle backgrounds and borders
- **Accent Color**: Bright Cyan `oklch(0.70 0.15 210)` for interactive elements, code highlights, and CTAs
- **Foreground/Background Pairings**:
  - Background `oklch(0.15 0.01 260)`: Foreground `oklch(0.98 0 0)` - Ratio 13.2:1 ✓
  - Card `oklch(0.22 0.01 260)`: Card Foreground `oklch(0.98 0 0)` - Ratio 11.8:1 ✓
  - Accent `oklch(0.70 0.15 210)`: Accent Foreground `oklch(0.25 0.01 260)` - Ratio 7.1:1 ✓
  - Success Green `oklch(0.65 0.15 145)`: White text - Ratio 5.2:1 ✓
  - Warning Amber `oklch(0.75 0.15 85)`: Dark text `oklch(0.25 0.01 260)` - Ratio 6.8:1 ✓

## Font Selection
Developer-focused fonts emphasizing code readability and technical precision.

- **Typographic Hierarchy**:
  - H1 (Page Title): Space Grotesk Bold/32px/tight letter spacing
  - H2 (Entity Name): Space Grotesk SemiBold/24px/normal spacing
  - H3 (Section Headers): Space Grotesk SemiBold/18px/normal spacing
  - Body Text: Inter Regular/14px/1.6 line height
  - Code: JetBrains Mono Regular/13px/1.5 line height
  - Field Names: Inter Medium/14px/normal spacing
  - Labels: Inter Medium/12px/uppercase/wide spacing

## Animations
Subtle, purposeful transitions that enhance usability without distraction.

- Smooth page transitions (300ms) when switching entities
- Quick hover states (150ms) on interactive elements
- Gentle fade-in (200ms) for newly loaded content
- Instant syntax highlighting (no delay) for code blocks
- Smooth scroll (400ms ease-out) when jumping to sections

## Component Selection
- **Components**:
  - Tabs: For CRUD operation examples (GET, PUT, POST, DELETE)
  - Card: Field metadata containers with subtle borders
  - Table: Field reference with sortable columns
  - ScrollArea: Entity list sidebar with smooth scrolling
  - Badge: Data type indicators, required/optional flags
  - Input: Search field with clear button
  - Separator: Section dividers
  - Button: Copy code, fetch metadata actions
  - Skeleton: Loading states for entity metadata
  - Collapsible: Expandable field descriptions
  
- **Customizations**:
  - Code blocks with syntax highlighting (custom component)
  - Copy-to-clipboard buttons on all code samples
  - Virtual scrolling for large field lists (custom implementation)
  - Two-column layout: sidebar + main content (custom)
  
- **States**:
  - Buttons: Subtle scale on hover, pressed state with inset shadow
  - Links: Underline on hover, accent color
  - Code blocks: Background highlight on hover, border on focus
  - Search: Focus ring, clear button appears when text present
  
- **Icon Selection**:
  - Database for entities
  - MagnifyingGlass for search
  - Code for code samples
  - Copy for clipboard actions
  - CheckCircle for success states
  - WarningCircle for errors
  - ArrowRight for navigation
  
- **Spacing**:
  - Section gaps: 8 (2rem)
  - Card padding: 6 (1.5rem)
  - Field rows: 4 (1rem)
  - Inline elements: 2 (0.5rem)
  
- **Mobile**:
  - Sidebar collapses to sheet/drawer
  - Tables convert to stacked cards
  - Code blocks become horizontally scrollable
  - Tabs remain but with smaller text

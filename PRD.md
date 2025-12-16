# Planning Guide

A comprehensive Bullhorn ATS/CRM data management platform that enables enterprise users to query, import, export, and manipulate candidate and job data through direct REST API integration.

**Experience Qualities**: 
1. **Professional** - Enterprise-grade interface that instills confidence in handling critical recruitment data
2. **Efficient** - Streamlined workflows that minimize clicks and maximize productivity for bulk operations
3. **Transparent** - Clear visibility into all operations with comprehensive logging and audit trails

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
This is a sophisticated enterprise data management tool with multiple modules (QueryBlast, CSV Loader, SmartStack), authentication flows, API integration, bulk operations, error handling, audit logging, and data export capabilities.

## Essential Features

### Authentication & Authorization
- **Functionality**: OAuth2 authorization code flow with Bullhorn REST API, including automatic token refresh and automatic callback handling
- **Purpose**: Secure access to Bullhorn tenant data with persistent session management
- **Trigger**: User clicks "Connect to Bullhorn" and chooses authentication method (credentials or authorization code with optional redirect)
- **Progression**: 
  - **Method 1 (Username/Password)**: Enter client credentials + username/password → Auto-exchange for auth code → Exchange code for access token → Get REST session token → Store session with refresh token → Auto-refresh before expiry → Enable features
  - **Method 2 (Authorization Code - Manual)**: Enter client credentials → Open authorization URL → Copy authorization code from redirect → Paste code → Exchange for access token → Get REST session token → Store session with refresh token → Enable features
  - **Method 3 (Authorization Code - Automatic Redirect)**: Enter client credentials → Enable redirect URI → Click "Start OAuth Flow" → Redirect to Bullhorn → Authorize → Automatic redirect back to app → Auto-capture code from URL → Exchange for access token → Get REST session token → Store session with refresh token → Enable features
- **Success criteria**: Valid BhRestToken obtained and stored, refresh token maintained, automatic token refresh works, API calls authenticated successfully, OAuth callback auto-detected and processed

### QueryBlast (Advanced Search)
- **Functionality**: Build and execute complex queries against Bullhorn entities with field selection
- **Purpose**: Power users need flexible data retrieval beyond standard UI search
- **Trigger**: User selects entity type, adds filters, and clicks Execute
- **Progression**: Select entity → Choose fields → Add filters/conditions → Set parameters → Execute → Display results table → Export option
- **Success criteria**: Query returns accurate data, supports pagination, handles errors gracefully

### CSV Data Loader
- **Functionality**: Bulk import records via CSV with field mapping and validation
- **Purpose**: Mass data migration and updates without manual entry
- **Trigger**: User uploads CSV file
- **Progression**: Upload CSV → Parse headers → Map to Bullhorn fields → Validate data → Preview → Execute import → Show progress → Generate report
- **Success criteria**: Successfully imports valid records, reports errors clearly, maintains data integrity

### SmartStack v2
- **Functionality**: AI-powered batch processing with natural language operation generation, or manual operation configuration with dependencies and error handling
- **Purpose**: Complex multi-step operations that require ordering and rollback capability, made simple through AI assistance
- **Trigger**: User describes operations in natural language OR manually configures operation stack
- **Progression**: 
  - **AI Method**: Describe task in natural language → AI generates operations → Review/edit operations → Execute stack → Monitor progress → Handle failures → Complete
  - **Manual Method**: Add operations → Define operation type/entity/data → Configure rules → Execute stack → Monitor progress → Handle failures → Complete or rollback
- **Success criteria**: AI generates accurate operations from natural language, executes operations in correct order, handles failures gracefully, provides detailed status with descriptions

### Audit & Logging
- **Functionality**: Comprehensive tracking of all operations with timestamps and results
- **Purpose**: Compliance, troubleshooting, and operation verification
- **Trigger**: Automatic for all operations
- **Progression**: Operation occurs → Log created → Stored with details → Viewable in audit panel → Filterable and exportable
- **Success criteria**: All operations logged, logs persist across sessions, searchable and filterable

### Data Export
- **Functionality**: Export query results and logs to CSV/JSON formats
- **Purpose**: Reporting, backup, and integration with other systems
- **Trigger**: User clicks export button on results or logs
- **Progression**: User selects format → System generates file → Download initiated
- **Success criteria**: Exports complete datasets accurately, proper formatting, no data loss

## Edge Case Handling
- **Rate Limiting**: Implement exponential backoff and request queuing to respect Bullhorn API limits
- **Large Datasets**: Pagination support with configurable page sizes, streaming for exports
- **Network Failures**: Retry logic with user notification, operation resumption where possible
- **Invalid Data**: Pre-validation before API calls, clear error messages with field-level feedback
- **Session Expiration**: Automatic token refresh using refresh token, graceful re-authentication prompts if refresh fails
- **Token Expiry**: Proactive refresh 60 seconds before expiration, background refresh every 30 seconds
- **Concurrent Operations**: Queue management to prevent conflicting updates
- **Malformed CSV**: Robust parsing with error reporting, skip invalid rows option

## Design Direction
The design should evoke confidence, precision, and power - like a professional developer tool or enterprise admin console. It should feel sophisticated yet approachable, with clear information hierarchy and data-dense displays that don't overwhelm.

## Color Selection
A technical, developer-focused palette with strong contrast and semantic color coding.

- **Primary Color**: Deep indigo `oklch(0.35 0.12 265)` - Conveys professionalism, technology, and trustworthiness
- **Secondary Colors**: 
  - Slate gray `oklch(0.55 0.015 250)` for secondary actions
  - Charcoal `oklch(0.25 0.01 260)` for backgrounds providing depth
- **Accent Color**: Electric cyan `oklch(0.70 0.15 210)` - Calls attention to active operations and CTAs
- **Foreground/Background Pairings**: 
  - Background (Charcoal #1a1b26): White text `oklch(0.98 0 0)` - Ratio 15.2:1 ✓
  - Primary (Deep Indigo): White text `oklch(0.98 0 0)` - Ratio 8.5:1 ✓
  - Accent (Electric Cyan): Charcoal text `oklch(0.25 0.01 260)` - Ratio 9.1:1 ✓
  - Card backgrounds `oklch(0.22 0.01 260)`: Light gray text `oklch(0.90 0.01 260)` - Ratio 13.8:1 ✓

## Font Selection
Typography should communicate technical precision and modern professionalism with excellent code/data readability.

- **Typographic Hierarchy**: 
  - H1 (Page Title): Space Grotesk Bold/32px/tight letter spacing (-0.02em)
  - H2 (Section Header): Space Grotesk SemiBold/24px/normal
  - H3 (Card Header): Space Grotesk Medium/18px/normal
  - Body (UI Text): Inter Regular/14px/1.5 line height
  - Data/Code: JetBrains Mono Regular/13px/1.4 line height
  - Labels: Inter Medium/12px/uppercase/wide tracking (0.05em)

## Animations
Animations should emphasize state changes and provide feedback without delaying workflows - quick, purposeful, and subtle.

- **State Transitions**: 150ms ease-out for button states, tab switching
- **Loading States**: Smooth spinner with pulsing effect for API calls
- **Success Feedback**: Brief 200ms scale+fade for confirmation icons
- **Panel Sliding**: 300ms ease-in-out for drawer/modal entrances
- **Data Updates**: Subtle 100ms highlight flash on row updates
- **Error Shake**: 400ms shake animation for validation errors

## Component Selection
- **Components**: 
  - Tabs for switching between QueryBlast/CSV Loader/SmartStack modules
  - Table for displaying query results and audit logs with sortable columns
  - Dialog for authentication flow and confirmation prompts
  - Sheet (drawer) for detailed operation logs and configuration
  - Card for organizing features and displaying stats
  - Form with Input, Select, Textarea for query building
  - Button with loading states for all API operations
  - Badge for status indicators (success/error/pending)
  - Progress for upload and batch operation tracking
  - Separator for visual organization
  - Scroll Area for large data displays
  - Alert for important messages and warnings
- **Customizations**: 
  - Custom syntax-highlighted query builder component
  - Data table with inline editing capabilities
  - Multi-step wizard component for CSV mapping
  - Stack operation timeline visualizer
- **States**: 
  - Buttons: Default with icon, hover with brightness increase, active with scale(0.98), loading with spinner, disabled with reduced opacity
  - Inputs: Default with subtle border, focus with accent ring, error with red border + icon, success with green checkmark
  - Table rows: Hover with background highlight, selected with accent background, error rows with red tint
- **Icon Selection**: 
  - Database for entity selection
  - MagnifyingGlass for search/query
  - Upload for CSV import
  - Stack for SmartStack operations
  - CheckCircle for success states
  - XCircle for errors
  - ClockCounterClockwise for audit logs
  - DownloadSimple for exports
  - Lightning for execute/run
  - Gear for settings
- **Spacing**: 
  - Section padding: p-6
  - Card padding: p-4
  - Gap between elements: gap-4 (16px) for related, gap-6 (24px) for sections
  - Form fields: gap-2 (8px) vertical stacking
  - Button padding: px-4 py-2 for primary, px-3 py-1.5 for secondary
- **Mobile**: 
  - Tabs convert to select dropdown on mobile
  - Tables scroll horizontally with sticky first column
  - Drawers slide from bottom instead of side
  - Stack navigation instead of parallel module view
  - Touch-friendly button sizes (min 44px height)
  - Collapsible sections for dense data displays

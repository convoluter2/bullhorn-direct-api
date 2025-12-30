# Pause/Resume Functionality Integration Guide

## Overview

This guide explains how to integrate pause/resume functionality with time remaining estimates into all data operation tools (QueryBlast, CSV Loader, SmartStack, QueryStack, WFN Export).

## Core Components

### 1. `usePausableOperation` Hook

Located in `/src/hooks/use-pausable-operation.ts`

**Purpose**: Manages pause/resume state, calculates speed, and estimates time remaining.

**Usage**:
```typescript
import { usePausableOperation } from '@/hooks/use-pausable-operation'

const operation = usePausableOperation(
  'unique-operation-key',  // Unique key for persistence
  totalItems,              // Total number of items to process
  {
    persistProgress: true, // Enable progress persistence across page refresh
    onComplete: () => {    // Optional callback when operation completes
      toast.success('Operation complete!')
    }
  }
)
```

**API**:
- `progress`: Current operation progress state
  - `total`: Total items
  - `completed`: Items completed
  - `failed`: Items failed
  - `isPaused`: Whether operation is paused
  - `isStopped`: Whether operation is stopped
  - `estimatedTimeRemaining`: Estimated seconds remaining (or null)
  - `speeds`: Array of recent speed samples
- `pause()`: Pause the operation
- `resume()`: Resume the operation
- `stop()`: Stop the operation completely
- `reset()`: Reset all progress
- `updateProgress(completed, failed)`: Update progress counters
- `canResume`: Boolean indicating if operation can be resumed

### 2. `OperationProgressControls` Component

Located in `/src/components/OperationProgressControls.tsx`

**Purpose**: Provides a standardized UI for displaying progress and controlling pause/resume.

**Usage**:
```typescript
import { OperationProgressControls } from '@/components/OperationProgressControls'

<OperationProgressControls
  progress={operation.progress}
  onPause={operation.pause}
  onResume={operation.resume}
  onStop={operation.stop}
  operationName="My Operation"
  canResume={operation.canResume}
/>
```

**Features**:
- Progress bar with percentage
- Current speed (items/minute)
- Time remaining estimate
- Pause/Resume/Stop buttons
- Status badges (Running/Paused/Stopped/Complete)
- Failed items counter

## Integration Pattern

### Step 1: Add Hook to Component

```typescript
import { usePausableOperation } from '@/hooks/use-pausable-operation'

function MyDataTool() {
  const [data, setData] = useState([])
  const [processing, setProcessing] = useState(false)
  
  // Add the pausable operation hook
  const operation = usePausableOperation(
    'my-data-tool-operation',
    data.length,
    {
      persistProgress: true,
      onComplete: () => {
        setProcessing(false)
        toast.success('Processing complete!')
      }
    }
  )
  
  // ... rest of component
}
```

### Step 2: Check Pause State in Processing Loop

```typescript
const processData = async () => {
  setProcessing(true)
  operation.reset()
  
  for (let i = 0; i < data.length; i++) {
    // Check if stopped
    if (operation.progress.isStopped) {
      toast.info('Operation stopped by user')
      break
    }
    
    // Wait while paused
    while (operation.progress.isPaused) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    try {
      // Process the item
      await processItem(data[i])
      
      // Update progress (successful)
      operation.updateProgress(i + 1, operation.progress.failed)
    } catch (error) {
      // Update progress (failed)
      operation.updateProgress(i + 1, operation.progress.failed + 1)
      console.error('Item processing failed:', error)
    }
  }
  
  setProcessing(false)
}
```

### Step 3: Add UI Controls

```typescript
import { OperationProgressControls } from '@/components/OperationProgressControls'

return (
  <div className="space-y-6">
    {/* Existing UI */}
    
    {/* Add progress controls when processing */}
    {processing && (
      <OperationProgressControls
        progress={operation.progress}
        onPause={operation.pause}
        onResume={operation.resume}
        onStop={operation.stop}
        operationName="Data Processing"
        canResume={operation.canResume}
      />
    )}
    
    {/* Rest of component */}
  </div>
)
```

## Complete Example: Integrating into CSV Loader

```typescript
import { useState } from 'react'
import { usePausableOperation } from '@/hooks/use-pausable-operation'
import { OperationProgressControls } from '@/components/OperationProgressControls'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'

export function CSVLoader({ onLog }) {
  const [csvData, setCsvData] = useState([])
  const [processing, setProcessing] = useState(false)
  const [entity, setEntity] = useState('')
  
  // Add pausable operation
  const uploadOperation = usePausableOperation(
    'csv-loader-upload',
    csvData.length,
    {
      persistProgress: true,
      onComplete: () => {
        setProcessing(false)
        toast.success(`Upload complete! ${uploadOperation.progress.completed} items processed`)
        onLog('CSV Upload', 'success', 'Upload completed', {
          total: csvData.length,
          completed: uploadOperation.progress.completed,
          failed: uploadOperation.progress.failed
        })
      }
    }
  )
  
  const handleUpload = async () => {
    if (!entity || csvData.length === 0) {
      toast.error('Please select entity and load CSV data')
      return
    }
    
    setProcessing(true)
    uploadOperation.reset()
    
    for (let i = 0; i < csvData.length; i++) {
      // Check if stopped
      if (uploadOperation.progress.isStopped) {
        toast.info('Upload stopped by user')
        onLog('CSV Upload', 'error', 'Upload stopped by user', {
          completed: uploadOperation.progress.completed,
          remaining: csvData.length - uploadOperation.progress.completed
        })
        break
      }
      
      // Wait while paused
      while (uploadOperation.progress.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      try {
        // Upload the record
        await bullhornAPI.createEntity(entity, csvData[i])
        
        // Update progress (successful)
        uploadOperation.updateProgress(i + 1, uploadOperation.progress.failed)
      } catch (error) {
        // Update progress (failed)
        uploadOperation.updateProgress(i + 1, uploadOperation.progress.failed + 1)
        console.error(`Failed to upload row ${i + 1}:`, error)
      }
    }
    
    setProcessing(false)
  }
  
  return (
    <div className="space-y-6">
      {/* Existing CSV upload UI */}
      
      <Button onClick={handleUpload} disabled={processing}>
        Upload CSV
      </Button>
      
      {/* Show progress controls when processing */}
      {processing && (
        <OperationProgressControls
          progress={uploadOperation.progress}
          onPause={uploadOperation.pause}
          onResume={uploadOperation.resume}
          onStop={uploadOperation.stop}
          operationName="CSV Upload"
          canResume={uploadOperation.canResume}
        />
      )}
    </div>
  )
}
```

## Key Features

### 1. Progress Persistence
- Progress is automatically saved to KV storage when `persistProgress: true`
- Survives page refreshes
- Automatically cleans up when operation completes

### 2. Time Estimation
- Calculates speed based on recent processing rates
- Uses rolling average of last 10 speed samples
- Updates estimate in real-time
- Displays as human-readable format (e.g., "2m 30s" or "1h 15m")

### 3. Speed Calculation
- Tracks items processed per millisecond
- Converts to items per minute for display
- Filters out anomalies by using recent samples

### 4. Pause/Resume Logic
- Pause immediately sets `isPaused` flag
- Resume continues from exact position
- Tracks total paused duration for accurate time estimates

### 5. Stop Functionality
- Stops operation completely
- Cannot be resumed after stopping
- Cleans up state and persisted data

## Testing

A comprehensive test suite is available in the "Pause/Resume" tab:

### Test Categories

1. **Basic Pause/Resume**: Validates pause and resume work correctly
2. **Time Estimation Accuracy**: Ensures time estimates are calculated
3. **Speed Calculation**: Verifies speed tracking is accurate
4. **Progress Persistence**: Tests state survives across operations
5. **Stop Functionality**: Confirms stop halts processing
6. **Multiple Pause/Resume Cycles**: Tests multiple pauses in one operation

### Running Tests

1. Navigate to the "Pause/Resume" tab in the app
2. Click "Run All Tests" to execute the full suite
3. View results in the "Test Results" tab
4. Use the "Live Demo" tab to interact with progress controls

## Best Practices

1. **Always reset before starting**: Call `operation.reset()` before beginning a new operation
2. **Check stopped state**: Always check `isStopped` before processing items
3. **Wait on pause**: Use a `while` loop to wait when paused
4. **Update progress regularly**: Call `updateProgress()` after each item
5. **Handle errors**: Track failed items separately from completed
6. **Provide feedback**: Show progress controls to users during long operations
7. **Use unique keys**: Each tool should have a unique operation key for persistence
8. **Clean up on unmount**: Operations auto-cleanup, but ensure UI state is managed

## Troubleshooting

### Progress not persisting
- Ensure `persistProgress: true` is set
- Check that operation key is unique and consistent
- Verify KV storage is working

### Time estimate not showing
- Ensure enough items have been processed (needs ~5+ for accurate estimate)
- Check that `updateProgress()` is being called regularly
- Verify processing isn't too fast (estimates work better for longer operations)

### Pause not working
- Confirm the processing loop checks `isPaused` state
- Ensure the loop uses `await` when checking pause state
- Check that the pause button is calling `operation.pause()`

### Operation doesn't stop
- Verify `isStopped` is checked in the processing loop
- Ensure the loop breaks when stopped
- Check that stop button calls `operation.stop()`

# Bulk Operations Fixes - Complete Implementation

## Summary
Fixed critical bugs in bulk file download and upload operations, improved retry logic, and updated file naming conventions to use document types instead of entity IDs.

## Changes Made

### 1. Fixed Retry Logic for Bulk Downloads
**Problem:** When retrying failed downloads, the system was re-downloading all entities instead of just the failed ones.

**Solution:** 
- Updated `handleRetryFailed()` in `BulkFileDownloader.tsx`
- Now properly filters only failed downloads
- Preserves successful download results
- Only retries entities that actually failed
- Maintains mapped entity ID relationships during retry

**Code Changes:**
```typescript
const handleRetryFailed = () => {
  const failedDownloads = downloadResults.filter(r => r.status === 'error')
  
  if (failedDownloads.length === 0) {
    toast.info('No failed downloads to retry')
    return
  }

  const failedIds = failedDownloads.map(r => r.entityId)
  const failedMappings = failedDownloads.map(r => ({
    entityId: r.entityId,
    mappedEntityId: r.mappedEntityId
  }))
  
  toast.info(`Retrying ${failedIds.length} failed download(s)...`)
  
  setEntityIds(failedIds)
  setEntityIdMappings(failedMappings)
  
  // Keep non-failed results
  const nonFailedResults = downloadResults.filter(r => r.status !== 'error')
  setDownloadResults(nonFailedResults)
  
  setTimeout(() => {
    handleBulkDownload()
  }, 500)
}
```

### 2. Updated File Naming Convention
**Problem:** Files inside ZIP archives were named as `[EntityID]-[OriginalFileName]`, making it hard to identify document types.

**Solution:**
- Changed naming convention to `[DocumentType]-[OriginalFileName]`
- If no document type exists, uses "Blank" as the document type name
- Entity ID is no longer in individual file names (still in ZIP filename)
- Document type labels are human-readable (e.g., "Resume", "Assignment Agreement Letter")

**Code Changes:**
```typescript
const downloadFile = async (file: any, fileIndex: number) => {
  // ... download logic ...
  
  const documentType = file.type || 'Blank'
  const documentTypeLabel = fileTypeOptions.find(t => t.value === documentType)?.label || documentType
  const newFileName = `${documentTypeLabel}-${file.name}`
  
  zip.file(newFileName, blob)
  // ... rest of logic ...
}
```

**Examples:**
- Old: `19641937-Resume.pdf`
- New: `Resume-JohnDoe.pdf`
- No type: `Blank-Document.pdf`

### 3. Default Download Location
**Verified:** All file downloads already default to the browser's Downloads folder automatically. This is the standard browser behavior when using the `<a>` tag with the `download` attribute. No changes needed.

**How it works:**
- Browser automatically saves files to user's default Downloads folder
- Users can change their browser's default download location in browser settings
- Some browsers may prompt for location on first download

## File Structure After Changes

### ZIP File Structure
```
EntityID-EntityType-EntityName.zip
├── DocumentType1-file1.pdf
├── DocumentType2-file2.pdf
├── Blank-file3.docx  (if no type)
└── Resume-candidate.pdf
```

### Example with Mapped Entities
```
CSV:
id,MappedEntity
12345,67890
23456,78901

Downloaded ZIPs (with renaming enabled):
67890-Candidate-John_Doe.zip
78901-Candidate-Jane_Smith.zip

Files inside ZIP:
Resume-JohnDoe.pdf
Assignment Agreement Letter-Contract.pdf
Blank-Unknown.docx
```

## Testing Recommendations

### Test Case 1: Basic Bulk Download
1. Upload CSV with multiple entity IDs
2. Select entity type (e.g., Candidate)
3. Click "Download All Files"
4. Verify:
   - ZIP files are created with correct naming
   - Files inside use document type prefix
   - Files without type use "Blank" prefix
   - Downloads go to Downloads folder

### Test Case 2: Retry Failed Downloads
1. Start a bulk download with multiple entities
2. Cancel midway through
3. Click "Retry Failed Downloads"
4. Verify:
   - Only failed/cancelled entities are retried
   - Successfully downloaded entities are NOT re-downloaded
   - Results table shows both old successes and new attempts

### Test Case 3: Mapped Entity Renaming
1. Create CSV with id and MappedEntity columns
2. Enable "Use Mapped IDs" toggle
3. Download files
4. Verify:
   - ZIP files use mapped entity IDs in name
   - Files inside also reference mapped IDs
   - Original IDs are logged for reference

### Test Case 4: Document Type Filtering
1. Load entity files
2. Select specific document types (e.g., Resume, License)
3. Set date range filter
4. Download
5. Verify:
   - Only filtered files are downloaded
   - File names reflect correct document types
   - Filters are preserved during retry

### Test Case 5: Bulk Upload Retry
1. Upload folder with ZIP files
2. If any fail, click "Retry"
3. Verify:
   - Only failed uploads are retried
   - Already uploaded files are not re-uploaded
   - Retry count increments correctly

## Known Limitations

1. **Browser Download Folder:** Cannot programmatically select destination folder due to browser security restrictions. Users must configure their browser's default download location.

2. **Document Type Labels:** Depends on the file type being set in Bullhorn. Files without types will use "Blank" prefix.

3. **Concurrent Downloads:** High concurrency may trigger rate limits. Default is 5, adjustable by user.

## Future Enhancements

1. Add ability to export failed downloads list to CSV for manual processing
2. Implement smart retry with exponential backoff
3. Add progress estimation based on file sizes (not just count)
4. Add option to download as individual files instead of ZIP
5. Support for custom document type mappings

## Error Handling

All operations now include:
- Detailed error logging with file-level granularity
- Failed file tracking with error messages
- Copy-to-clipboard functionality for failed file lists
- Automatic retry capability for failed operations
- User-friendly error messages and recovery options

## Documentation Updates

Updated the following sections:
- File Naming Convention in BulkFileDownloader component
- Alert descriptions for retry functionality
- Info tooltips explaining document type prefix usage
- CSV format examples with MappedEntity column

## Deployment Notes

- No database changes required
- No API changes required
- Fully backward compatible with existing data
- Works with all supported entity types
- No additional dependencies added

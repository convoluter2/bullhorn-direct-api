# Certification File Converter - Quick Start Guide

## What does it do?

The Certification File Converter automatically downloads candidate certification image files from Bullhorn, converts them to standard 8.5" x 11" PDFs with compression, and replaces the original files.

## Why use it?

- ✅ **Standardize Documents**: All certification images become uniform letter-size PDFs
- ✅ **Reduce File Sizes**: Compression typically saves 50-80% storage space
- ✅ **Packet-Ready**: Standard format perfect for creating certification packets
- ✅ **Batch Processing**: Convert dozens or hundreds of files automatically
- ✅ **Safe Operations**: Original files only deleted after successful conversion

## How to use it

### Step 1: Get File Attachment IDs

You need the CandidateCertificationFileAttachment IDs. You can get these by:

1. Using QueryBlast to search for attachments:
   ```
   Entity: CandidateCertificationFileAttachment
   Fields: id, name, fileType, contentType, candidateCertification, candidate
   Where: contentType='image/jpeg' OR contentType='image/png'
   ```

2. Or from direct API queries if you have them

### Step 2: Enter IDs

Navigate to the **Cert Converter** tab and paste your file attachment IDs into the textarea. You can enter them:

- One per line:
  ```
  12345
  67890
  11223
  ```

- Or comma-separated:
  ```
  12345, 67890, 11223
  ```

- Or any combination of newlines and commas

The tool will automatically parse and deduplicate the IDs.

### Step 3: Start Conversion

Click the **Start Conversion** button. The tool will:

1. Process each file attachment in sequence
2. Show real-time progress with a progress bar
3. Display current file number and ETA
4. Show status for each file in the results table
5. Send toast notifications for successes and errors

### Step 4: Monitor Progress

Watch the conversion process:

- **Progress Bar**: Shows percentage complete
- **Status Badges**: 
  - Green checkmark = Success
  - Red X = Error
  - Blue pulse = Currently processing
  - Gray = Pending
- **Results Table**: Details for every file

### Step 5: Review Results

After completion, check:

- **Summary Badges**: Total successful vs failed
- **Results Table**: Detailed info including:
  - Original filename and type
  - File sizes (before/after)
  - Compression ratio
  - Error messages if any failed
- **Audit Logs Tab**: Complete operation history

## Controls

### Pause/Resume

Click **Pause** to temporarily stop processing. This is useful if:
- You need to check something mid-batch
- System resources are needed elsewhere
- You want to verify results before continuing

Click **Resume** to continue from where you left off. All progress is preserved.

### Reset

Click **Reset** to clear all results and start over. This:
- Clears the results table
- Resets progress to 0%
- Does NOT undo any conversions already completed

## Supported File Types

✅ **Supported** (will be converted):
- JPG/JPEG
- PNG
- GIF
- BMP
- WEBP

❌ **Not Supported** (will be skipped with error message):
- PDF (already PDF)
- Documents (Word, Excel, etc.)
- Other formats

## How Conversion Works

For each image:

1. **Download**: Retrieves the image file from Bullhorn
2. **Resize**: If image is larger than 2000px, it's resized to fit
3. **Layout**: Image is centered on an 8.5" x 11" page with 0.5" margins
4. **Compress**: Converts to JPEG with 85% quality, then to PDF
5. **Replace**: Deletes original image, uploads PDF with same name (.pdf extension)

## Typical Compression Results

- **PNG files**: 2x-5x smaller (PNG → PDF with JPEG compression)
- **High-res JPEGs**: 1.5x-3x smaller (dimension reduction + optimization)
- **Already optimized JPEGs**: 1x-1.2x smaller (format standardization)

## Error Handling

The tool handles errors gracefully:

- **Invalid IDs**: Skipped with error message
- **Non-image files**: Skipped with clear explanation
- **Download failures**: Automatically retries up to 2 times
- **Network issues**: Exponential backoff between retries
- **Upload failures**: Original file is NOT deleted if upload fails

## Best Practices

### Before Starting

1. **Test with a small batch first** (5-10 files) to verify IDs and permissions
2. **Check file types** - Ensure they're images
3. **Verify IDs** - Make sure they're CandidateCertificationFileAttachment IDs (not just file IDs)

### During Processing

1. **Monitor the results table** - Watch for any error patterns
2. **Check compression ratios** - Should typically be >1x
3. **Don't close the browser tab** - Processing happens client-side

### After Completion

1. **Review the audit logs** - Complete operation history
2. **Check failed conversions** - Investigate any errors
3. **Verify in Bullhorn** - Spot-check a few converted files

## Troubleshooting

### "File attachment not found"
- Verify the ID is correct
- Check that you have permission to access it
- Ensure it belongs to the current corporation/tenant

### "File type is not an image"
- The file is not a supported image format
- Cannot be converted (PDFs, documents, etc.)

### "Download failed"
- Network connectivity issue
- File may be corrupted in Bullhorn
- Will automatically retry

### "Upload failed"
- Network issue or API error
- Original file is NOT deleted
- Safe to retry

### All files failing
- Check your Bullhorn connection (session might be expired)
- Verify permissions for file operations
- Check audit logs for detailed error messages

## Tips

- **Large batches**: For 100+ files, consider splitting into smaller batches
- **Peak hours**: Run during off-peak hours for better performance
- **Progress monitoring**: Use the Logs tab to track all operations
- **Backup strategy**: Original files are deleted - ensure Bullhorn has proper backups

## API Permissions Required

Your Bullhorn user must have permissions for:
- Read access to CandidateCertificationFileAttachment
- Delete access to files on CandidateCertification
- Upload access to files on CandidateCertification

## Questions?

Check the comprehensive documentation in `CERTIFICATION_CONVERTER_IMPLEMENTATION.md` for technical details.

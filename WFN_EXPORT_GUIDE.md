# WFN Placements Export Guide

## Overview

The WFN Placements Export feature enables secure export of Bullhorn placement data with hashed sensitive information (SSN, DOB) for payroll processing systems like WFN (Workforce Now) and ADP.

## Key Features

### ✅ Two Filter Modes

1. **Active Placements** - Exports all placements matching:
   - Status = 'Approved'
   - Start Date ≤ Current Date
   - End Date ≥ Current Date OR End Date IS NULL

2. **By Placement IDs** - Exports only specific placements:
   - Paste comma-separated or newline-separated IDs
   - Example: `12345,67890,34567` or one ID per line
   - Automatically deduplicates and validates numeric IDs

### 🔒 Security Features

- **SHA-256 Hashing**: SSN and DOB are hashed with your corporate salt
- **No Plaintext**: Raw sensitive data never written to CSV or logs
- **Salt Required**: Export disabled until hash salt is provided
- **Secure Storage**: Hash salt entered as password field (masked)

### 💰 Rate Card Integration

Automatically fetches placement compensation from nested Rate Card structure:
- **PlacementRateCard** → **PlacementRateCardLineGroup** → **PlacementRateCardLine**
- **Primary Rate** (Rate 1): Matches earn codes like REG, REGULAR, BASE, STD
- **Secondary Rate** (Rate 2): Matches earn codes like OT, OVERTIME, HOLIDAY, PREMIUM
- Configurable earn code lists to match your organization's conventions

### 👥 Candidate & Tax Data

Each export includes:
- **Candidate Demographics**: First Name, Last Name, Hashed SSN, Hashed DOB
- **Placement Details**: Status, Start Date, End Date, Employment Type
- **Job Information**: Job Order ID, Job Title
- **Tax Information**: Filing Status, Exemptions, Additional Withholding (W-4 2020+)
- **Rate Information**: Primary/Secondary Pay and Bill Rates

## Usage Instructions

### Active Placements Export

1. Navigate to **WFN Export** tab
2. Select **Active Placements** filter mode
3. Enter your **Hash Salt** (required for security)
4. Optionally adjust:
   - **Primary Earn Codes**: Customize to match your regular rate codes
   - **Secondary Earn Codes**: Customize to match your overtime/holiday codes
   - **Page Size**: Adjust API page size (100-1000 records per request)
5. Click **Start Export (Active)**
6. Monitor progress and statistics
7. Click **Download CSV** when complete

### By Placement IDs Export

1. Navigate to **WFN Export** tab
2. Select **By Placement IDs** filter mode
3. Enter your **Hash Salt** (required for security)
4. Paste Placement IDs in the text area:
   - **Comma-separated**: `12345,67890,34567`
   - **Newline-separated**: One ID per line
   - **Mixed format**: Automatically parsed and cleaned
5. Verify ID count appears below the text area
6. Optionally adjust earn codes and page size
7. Click **Start Export (By IDs)**
8. Monitor progress and statistics
9. Click **Download CSV** when complete

## CSV Output Format

The downloaded CSV includes these columns:

| Column | Description | Example |
|--------|-------------|---------|
| Placement ID | Bullhorn Placement ID | 82674 |
| Candidate ID | Bullhorn Candidate ID | 45123 |
| First Name | Candidate first name | John |
| Last Name | Candidate last name | Smith |
| Hashed SSN | SHA-256 hash of SSN | a3f5b9c... (64 chars) |
| Hashed DOB | SHA-256 hash of DOB timestamp | 2d8e4f1... (64 chars) |
| Status | Placement status | Approved |
| Start Date | ISO date format | 2024-01-15 |
| End Date | ISO date format | 2024-06-30 |
| Employment Type | Employment classification | Contract |
| Job Order ID | Associated job ID | 1426785 |
| Job Title | Job position title | Registered Nurse |
| Primary Pay Rate | Regular hourly pay | 45.00 |
| Secondary Pay Rate | OT/Holiday pay | 67.50 |
| Primary Bill Rate | Regular bill rate | 65.00 |
| Secondary Bill Rate | OT/Holiday bill rate | 97.50 |
| Filing Status | W-4 filing status | Single |
| Exemptions | Tax exemptions | 0 |
| Additional Withholding | Extra withholding | 0 |

## Configuration Details

### Hash Salt Best Practices

- **Store Securely**: Keep your salt in a secrets manager (not in code)
- **Consistency**: Use the same salt for all exports to enable matching
- **Rotation**: Consider rotating salt periodically per security policy
- **Length**: Recommend 16+ characters with high entropy

### Earn Code Configuration

Customize earn codes to match your Bullhorn configuration:

**Default Primary Codes** (Regular/Base work):
```
REG,REGULAR,BASE,STD
```

**Default Secondary Codes** (Overtime/Holiday):
```
OT,OVERTIME,HOLIDAY,PREMIUM
```

**Example Customization**:
- If you use `STRAIGHT` for regular time: `REG,REGULAR,BASE,STD,STRAIGHT`
- If you have `DBL` for double-time: `OT,OVERTIME,HOLIDAY,PREMIUM,DBL`

### Page Size Tuning

- **Default**: 500 records per API request
- **Small datasets**: Use 100-200 for faster initial response
- **Large datasets**: Use 500-1000 to minimize API calls
- **Rate limiting**: Lower page size if hitting rate limits

## Export Statistics

The statistics panel shows:

- **Total Placements**: Count from Bullhorn query
- **Processed**: Successfully exported records
- **Candidates Joined**: Records with candidate data
- **Errors**: Failed record count (check audit logs for details)

## API Integration Notes

### Bullhorn REST API Calls

The export makes these API calls per placement:

1. **Placement Query**: Fetches placement + embedded candidate/job data
2. **CandidateTaxInfo Query**: W-4 2020+ tax information (if available)
3. **PlacementRateCard Query**: Find rate card for placement
4. **PlacementRateCardLineGroup Query**: Get line groups for card
5. **PlacementRateCardLine Query**: Fetch individual rate lines

### Rate Limiting Considerations

- Large exports may take time due to nested queries
- Built-in rate limit tracking prevents 429 errors
- Monitor Rate Limit Status in header during export
- Consider exporting in batches if dataset is very large (>1000 placements)

### Fields Retrieved

**Placement Fields**:
- id, status, startDate, endDate, employmentType
- candidate(id, firstName, lastName, ssn, dateOfBirth)
- jobOrder(id, title)

**Rate Card Fields**:
- placementRateCard.id
- placementRateCardLineGroup.id
- placementRateCardLine: id, earnCode, alias, payRate, billRate

**Tax Info Fields**:
- filingStatus, exemptions, additionalWithholding

## Troubleshooting

### "No valid Placement IDs found"
- Ensure IDs are numeric only
- Check for extra characters or invalid formatting
- IDs must exist in Bullhorn

### "Export failed" errors
- Verify you have read permissions for Candidate.ssn field
- Check API session is still valid
- Review audit logs for specific error details
- Ensure placements exist and are accessible

### Missing rate data
- Verify placements have associated PlacementRateCard records
- Check earn code configuration matches your data
- Rate cards may not be configured for all placements

### Zero records exported (IDs mode)
- Confirm IDs are correct and exist
- Check if you have access to those specific placements
- Verify placements haven't been deleted

## Security & Compliance

### Data Handling

- ✅ SSN hashed before CSV write
- ✅ DOB hashed before CSV write
- ✅ Hash salt not stored in browser
- ✅ No console logging of sensitive data
- ❌ Raw SSN never in CSV
- ❌ Raw DOB never in CSV
- ❌ Salt never in logs

### Audit Trail

All exports are logged in the **Audit Logs** tab:
- Operation: "WFN Export"
- Filter mode used
- Record counts
- Success/error status
- Timestamp

### Recommended Practices

1. **Store Hash Salt Securely**: Use environment variables or secret manager
2. **Limit Access**: Only authorized users should export sensitive data
3. **Secure CSV Storage**: Store downloaded files in encrypted/restricted locations
4. **Regular Audits**: Review export logs periodically
5. **Principle of Least Privilege**: Grant minimum API permissions needed

## Example Workflows

### Monthly Payroll Export

1. Select **Active Placements** mode
2. Enter hash salt from your secrets manager
3. Keep default earn codes (or customize first time)
4. Start export
5. Download CSV
6. Upload to WFN/ADP import tool
7. Verify import success
8. Archive CSV securely

### Specific Placements Investigation

1. Select **By Placement IDs** mode
2. Paste specific IDs from support ticket or report
3. Enter hash salt
4. Start export
5. Review data in preview table
6. Download CSV for analysis
7. Share with compliance team (IDs already hashed)

### Bulk Corrections

1. Use **QueryBlast** to find problematic placements
2. Copy Placement IDs from results
3. Switch to **WFN Export** tab
4. Select **By Placement IDs** mode
5. Paste IDs from QueryBlast
6. Export to verify current state
7. Use **SmartStack** or **CSV Loader** to make corrections
8. Re-export to confirm changes

## Support & Feedback

For issues or feature requests:
- Check **Audit Logs** for detailed error messages
- Review **Console Monitor** (OAuth Test tab) for API debugging
- Contact Bullhorn support for API permission issues
- Refer to [Bullhorn REST API Documentation](https://bullhorn.github.io/rest-api-docs/)

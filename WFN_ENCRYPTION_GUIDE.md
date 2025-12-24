# WFN Export Encryption Guide

## Overview

The WFN Export feature now supports two export modes for handling sensitive PII data:

### 1. **Hashed PII (Default - Recommended)**
- SSN is hashed using SHA-256 with a corporate salt
- Birth date is excluded from the export
- Output is a standard CSV file
- No password required for download
- Best for: Most data sharing scenarios where SSN needs to be anonymized

### 2. **Unencrypted PII (Password Protected)**
- SSN and birth date are included in plaintext
- Entire file is encrypted using AES-256-GCM
- Requires a strong password to encrypt/decrypt
- Output is an encrypted binary file (.enc)
- Best for: When you need actual SSN/DOB values and can securely share the password

## How to Use

### Exporting with Hashed PII (Default)

1. Leave the "Export with Unencrypted PII" toggle **OFF**
2. Enter your corporate hash salt (keep this consistent across exports)
3. Configure other export settings (placement IDs, earn codes, etc.)
4. Click "Start Export"
5. Download the CSV file once processing is complete

**Security Notes:**
- Hash salt should be kept secret and consistent
- The same SSN will always produce the same hash (with the same salt)
- Hashes cannot be reversed to reveal the original SSN

### Exporting with Unencrypted PII (Encrypted File)

1. Toggle **ON** the "Export with Unencrypted PII (Password Protected)" option
2. Enter a **strong password** (minimum 12 characters recommended)
3. Configure other export settings
4. Click "Start Export"
5. Download the encrypted .enc file once processing is complete

**Security Notes:**
- Use a strong, unique password (mix of uppercase, lowercase, numbers, symbols)
- **Never** share the password through email or unsecured channels
- Share the password separately from the encrypted file
- The password cannot be recovered if lost

### Decrypting an Encrypted Export

1. Scroll down to the "Decrypt Encrypted Export" section
2. Click "Choose File" and select your .enc file
3. Enter the password that was used during export
4. Click "Decrypt and Download CSV"
5. The decrypted CSV will download automatically

## Encryption Details

### Algorithm
- **Encryption:** AES-256-GCM (Galois/Counter Mode)
- **Key Derivation:** PBKDF2 with 100,000 iterations
- **Hash:** SHA-256
- **IV Size:** 12 bytes (96 bits)
- **Salt Size:** 16 bytes (128 bits)

### File Structure (.enc files)
```
[16 bytes: Salt][12 bytes: IV][Remaining: Encrypted Data]
```

### Security Properties
- **Authenticated Encryption:** GCM mode provides both confidentiality and authenticity
- **Unique per file:** Each encryption uses a random salt and IV
- **Password-based:** Security depends on password strength
- **PBKDF2:** Protects against brute-force attacks with 100,000 iterations

## Best Practices

### Password Management
1. Use a password manager to generate strong passwords
2. Share passwords through approved secure channels only (e.g., encrypted messaging)
3. Document which password was used for which export (without storing the password itself)
4. Rotate passwords periodically for ongoing exports

### Hash Salt Management
1. Generate a strong, random corporate salt value
2. Store it securely (password manager, secure vault)
3. Use the same salt consistently for all exports
4. Do not share the salt externally

### Choosing the Right Mode

Use **Hashed PII** when:
- You need to share data with third parties
- The recipient doesn't need actual SSN values
- You need to maintain referential integrity across exports (same SSN = same hash)

Use **Unencrypted PII (Encrypted)** when:
- You need actual SSN and birth date values
- The recipient has secure password sharing capabilities
- You're transferring data within your organization
- Compliance requires preserving original PII values

## Compliance Notes

- **HIPAA:** Both modes can be HIPAA-compliant when used correctly
  - Hashed PII: Considered de-identified if salt is kept secure
  - Encrypted PII: Meets encryption requirements for data in transit/at rest
  
- **GDPR:** 
  - Hashed PII: May qualify as pseudonymization
  - Encrypted PII: Considered personal data until decrypted

- Always consult with your compliance team before selecting a mode
- Document which mode was used for audit purposes
- Include the export mode in your data handling procedures

## Troubleshooting

### "Decryption failed. Please check your password."
- Verify you're using the correct password
- Ensure the .enc file hasn't been corrupted
- Check that the file hasn't been modified or re-saved in another format

### "Password is required when exporting unencrypted PII"
- Make sure you've entered a password in the "Encryption Password" field
- Password cannot be empty

### File won't decrypt
- Verify the file is actually from a WFN export (should end in .enc)
- Ensure you selected the correct file
- Contact the person who created the export to verify the password

## Support

For questions or issues:
1. Check the audit logs for export details
2. Verify all settings before export
3. Test with a small dataset first
4. Contact your system administrator for password/salt management questions

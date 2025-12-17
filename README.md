# Bullhorn Data Manager

A comprehensive Bullhorn ATS/CRM data management platform that enables enterprise users to query, import, export, and manipulate candidate and job data through direct REST API integration.

## Features

### QueryBlast
Advanced search with complex query building, field selection, and support for both simple and grouped filters with AND/OR logic.

### CSV Data Loader
Bulk import records via CSV with intelligent field mapping, validation, and dry-run preview capabilities.

### SmartStack v2
Batch processing with CSV upload of IDs, query filters, field updates, and **conditional association logic**.

### QueryStack
Combines QueryBlast with SmartStack - query records first, then apply bulk updates with **conditional association logic**.

### Conditional Association Logic ⚡ NEW
Apply different to-many association operations (add/remove/replace) based on field values of each record. Create sophisticated rules like:
- Add certifications when status becomes "Active"
- Assign specialties based on experience level and location
- Update categories using multi-condition logic with AND/OR operators

[📖 Full Documentation](./CONDITIONAL_ASSOCIATIONS.md) | [⚡ Quick Reference](./CONDITIONAL_ASSOCIATIONS_QUICK_REF.md)

### Audit & Logging
Comprehensive tracking of all operations with timestamps, rollback capability, and detailed history.

### Connection Management
Save and quickly switch between multiple Bullhorn tenant connections (NPE/PROD for different clients).

## Getting Started

1. Click "Connect to Bullhorn" in the header
2. Enter your OAuth credentials (Client ID, Client Secret, Username, Password)
3. Authenticate with Bullhorn
4. Start using QueryBlast, CSV Loader, SmartStack, or QueryStack

## Documentation

- [PRD.md](./PRD.md) - Product Requirements Document
- [CONDITIONAL_ASSOCIATIONS.md](./CONDITIONAL_ASSOCIATIONS.md) - Conditional Logic Guide
- [CONDITIONAL_ASSOCIATIONS_QUICK_REF.md](./CONDITIONAL_ASSOCIATIONS_QUICK_REF.md) - Quick Reference
- [OAUTH_GUIDE.md](./OAUTH_GUIDE.md) - OAuth Setup Guide

## Key Capabilities

✅ Direct Bullhorn REST API integration  
✅ OAuth2 authentication with automatic token refresh  
✅ Complex query building with grouped filters  
✅ CSV import/export with field mapping  
✅ Batch updates with dry-run preview  
✅ **Conditional association logic based on field values**  
✅ To-many association management (add/remove/replace)  
✅ Comprehensive audit logging  
✅ Rollback capability for bulk operations  
✅ Multi-tenant connection management  

## Technology Stack

- React 19 + TypeScript
- Tailwind CSS v4
- shadcn/ui components
- Bullhorn REST API
- Spark Runtime SDK

## License

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.

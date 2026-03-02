# Candidate.primarySkills Field Test in CSV Loader

1. Field type det
3. To-Many configuration options


Create a CSV file named `candida
```csv

```

2. Select **Candidate** as th


3. Obs
## Expected Console Output
When you select `primarySkills` in the field m
```javascript
  c

    type: "SCALAR",              /
    associationType: undefined,   // 
  },
  isToOne: false

## Field Information Display
In the UI, below the field mapping selector, you should see a metadata box 
- **Field Type**: SCALAR (or TO_MANY)
- **Data Type**: String



- No To-Many configuration selector will appear

### Scenario 
- You can choose:
  - **Sub-field**: id (defaul



   - Shows complete field metadata
   
   - Shows when To-Many operation/sub-field is ch
## Troubleshooting
### 
- Check that you're actually s

-
- C

- You can still import comma



// Check if metadata is loaded

console.log('primarySki
// Check all TO_MANY fields
  .filter(([name, field]) => fiel
```

Fill out after testing:

Bullhorn Instance: _______________
primarySkills Field Metadata:
- Data Type: _______________
- Associated Entity: _______________



- Dry Run Status:
- Field Value in Bullhorn: ______________
Notes:
```

- `/src/components/CSVLoader



1. ✅ Console logging is working for field mapping
3. ✅ Field type detection (SCALAR 
5. ✅ CSV import processes the field correctly






























































Notes:
_______________
```

## Related Files

- `/src/components/CSVLoader.tsx` - Main component with console logging
- `/src/hooks/use-entity-metadata.ts` - Metadata fetching
- `/src/components/ToManyConfigSelector.tsx` - To-Many configuration UI
- `/src/lib/bullhorn-api.ts` - API calls

## Summary

This test helps verify that:
1. ✅ Console logging is working for field mapping
2. ✅ Field metadata is correctly retrieved from Bullhorn API
3. ✅ Field type detection (SCALAR vs TO_MANY) is accurate
4. ✅ UI responds appropriately to field type
5. ✅ CSV import processes the field correctly

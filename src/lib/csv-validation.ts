import { getQueryMethod, getCSVImportWarning } from './entity-query-support'

export interface ValidationRule {
  name: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationRule[]
  warnings: ValidationRule[]
}

export interface CSVValidationOptions {
  maxFileSize?: number
  maxRows?: number
  maxColumns?: number
  requireHeaders?: boolean
  minRows?: number
  allowEmptyValues?: boolean
  allowDuplicateHeaders?: boolean
}

const DEFAULT_OPTIONS: Required<CSVValidationOptions> = {
  maxFileSize: 50 * 1024 * 1024,
  maxRows: 100000,
  maxColumns: 200,
  requireHeaders: true,
  minRows: 1,
  allowEmptyValues: true,
  allowDuplicateHeaders: false
}

export function validateCSVFile(
  file: File,
  options: CSVValidationOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const errors: ValidationRule[] = []
  const warnings: ValidationRule[] = []

  if (file.size === 0) {
    errors.push({
      name: 'empty_file',
      message: 'CSV file is empty',
      severity: 'error'
    })
  }

  if (file.size > opts.maxFileSize) {
    errors.push({
      name: 'file_too_large',
      message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(opts.maxFileSize / 1024 / 1024).toFixed(2)}MB)`,
      severity: 'error'
    })
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    errors.push({
      name: 'invalid_extension',
      message: 'File must have .csv extension',
      severity: 'error'
    })
  }

  if (file.type && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel' && file.type !== '') {
    warnings.push({
      name: 'unexpected_mime_type',
      message: `File has unexpected MIME type: ${file.type}. Expected text/csv.`,
      severity: 'warning'
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export function validateCSVContent(
  headers: string[],
  rows: string[][],
  options: CSVValidationOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const errors: ValidationRule[] = []
  const warnings: ValidationRule[] = []

  if (opts.requireHeaders && headers.length === 0) {
    errors.push({
      name: 'missing_headers',
      message: 'CSV file has no headers',
      severity: 'error'
    })
  }

  if (headers.length > opts.maxColumns) {
    errors.push({
      name: 'too_many_columns',
      message: `CSV has ${headers.length} columns, maximum allowed is ${opts.maxColumns}`,
      severity: 'error'
    })
  }

  if (rows.length === 0) {
    errors.push({
      name: 'no_data_rows',
      message: 'CSV file has no data rows',
      severity: 'error'
    })
  }

  if (rows.length < opts.minRows) {
    errors.push({
      name: 'insufficient_rows',
      message: `CSV has ${rows.length} rows, minimum required is ${opts.minRows}`,
      severity: 'error'
    })
  }

  if (rows.length > opts.maxRows) {
    errors.push({
      name: 'too_many_rows',
      message: `CSV has ${rows.length} rows, maximum allowed is ${opts.maxRows}`,
      severity: 'error'
    })
  }

  const emptyHeaders = headers.filter((h, i) => !h || h.trim() === '')
  if (emptyHeaders.length > 0) {
    errors.push({
      name: 'empty_headers',
      message: `CSV has ${emptyHeaders.length} empty header(s). All columns must have names.`,
      severity: 'error'
    })
  }

  if (!opts.allowDuplicateHeaders) {
    const headerCounts = new Map<string, number>()
    headers.forEach(h => {
      const normalized = h.trim().toLowerCase()
      headerCounts.set(normalized, (headerCounts.get(normalized) || 0) + 1)
    })
    
    const duplicates = Array.from(headerCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([header, count]) => `"${header}" (${count} times)`)
    
    if (duplicates.length > 0) {
      errors.push({
        name: 'duplicate_headers',
        message: `Duplicate column headers found: ${duplicates.join(', ')}`,
        severity: 'error'
      })
    }
  }

  const invalidHeaderChars = /[^\w\s\-_()]/
  const headersWithInvalidChars = headers.filter(h => invalidHeaderChars.test(h))
  if (headersWithInvalidChars.length > 0) {
    warnings.push({
      name: 'special_chars_in_headers',
      message: `${headersWithInvalidChars.length} header(s) contain special characters: ${headersWithInvalidChars.slice(0, 3).map(h => `"${h}"`).join(', ')}${headersWithInvalidChars.length > 3 ? '...' : ''}`,
      severity: 'warning'
    })
  }

  const inconsistentRowLengths = rows.filter((row, i) => row.length !== headers.length)
  if (inconsistentRowLengths.length > 0) {
    warnings.push({
      name: 'inconsistent_columns',
      message: `${inconsistentRowLengths.length} row(s) have different number of columns than headers (expected ${headers.length})`,
      severity: 'warning'
    })
  }

  if (!opts.allowEmptyValues) {
    let emptyValueCount = 0
    rows.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell === '' || cell === null || cell === undefined) {
          emptyValueCount++
        }
      })
    })
    
    if (emptyValueCount > 0) {
      warnings.push({
        name: 'empty_values',
        message: `CSV contains ${emptyValueCount} empty cell(s)`,
        severity: 'warning'
      })
    }
  }

  const largeValueThreshold = 10000
  let largeValueCount = 0
  rows.forEach(row => {
    row.forEach(cell => {
      if (cell && cell.length > largeValueThreshold) {
        largeValueCount++
      }
    })
  })
  
  if (largeValueCount > 0) {
    warnings.push({
      name: 'large_cell_values',
      message: `${largeValueCount} cell(s) contain very large values (>${largeValueThreshold} characters)`,
      severity: 'warning'
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export interface FieldMappingValidationResult {
  isValid: boolean
  errors: ValidationRule[]
  warnings: ValidationRule[]
}

export function validateFieldMappings(
  mappings: Array<{ csvColumn: string; bullhornField: string }>,
  csvHeaders: string[],
  requireAtLeastOne: boolean = true
): FieldMappingValidationResult {
  const errors: ValidationRule[] = []
  const warnings: ValidationRule[] = []

  if (!mappings || mappings.length === 0) {
    if (requireAtLeastOne) {
      errors.push({
        name: 'no_mappings',
        message: 'No field mappings configured',
        severity: 'error'
      })
    }
    return { isValid: errors.length === 0, errors, warnings }
  }

  const validMappings = mappings.filter(m => 
    m && 
    m.csvColumn && 
    m.csvColumn.trim() !== '' &&
    m.bullhornField && 
    m.bullhornField !== '__skip__'
  )

  if (requireAtLeastOne && validMappings.length === 0) {
    errors.push({
      name: 'no_valid_mappings',
      message: 'At least one field must be mapped (not skipped)',
      severity: 'error'
    })
  }

  const mappedColumns = new Set<string>()
  mappings.forEach(m => {
    if (m.bullhornField && m.bullhornField !== '__skip__') {
      if (mappedColumns.has(m.bullhornField)) {
        errors.push({
          name: 'duplicate_field_mapping',
          message: `Field "${m.bullhornField}" is mapped multiple times`,
          severity: 'error'
        })
      }
      mappedColumns.add(m.bullhornField)
    }
  })

  const unmappedColumns = csvHeaders.filter(h => 
    !mappings.some(m => m.csvColumn === h && m.bullhornField && m.bullhornField !== '__skip__')
  )

  if (unmappedColumns.length > 0 && unmappedColumns.length < csvHeaders.length) {
    warnings.push({
      name: 'unmapped_columns',
      message: `${unmappedColumns.length} CSV column(s) will be skipped: ${unmappedColumns.slice(0, 3).map(c => `"${c}"`).join(', ')}${unmappedColumns.length > 3 ? '...' : ''}`,
      severity: 'warning'
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export function validateImportConfiguration(config: {
  entity: string
  lookupField?: string
  updateExisting: boolean
  createNew: boolean
  hasValidMappings: boolean
}): FieldMappingValidationResult {
  const errors: ValidationRule[] = []
  const warnings: ValidationRule[] = []

  if (!config.entity || config.entity.trim() === '') {
    errors.push({
      name: 'no_entity_selected',
      message: 'Entity type must be selected',
      severity: 'error'
    })
  }

  if (!config.hasValidMappings) {
    errors.push({
      name: 'no_field_mappings',
      message: 'At least one field must be mapped',
      severity: 'error'
    })
  }

  if (!config.updateExisting && !config.createNew) {
    errors.push({
      name: 'no_operation_selected',
      message: 'Must enable either "Update Existing" or "Create New"',
      severity: 'error'
    })
  }

  if ((config.updateExisting || config.createNew) && (!config.lookupField || config.lookupField === '__none__')) {
    warnings.push({
      name: 'no_lookup_field',
      message: 'No lookup field selected. All records will be treated as new.',
      severity: 'warning'
    })
  }

  if (config.updateExisting && (!config.lookupField || config.lookupField === '__none__')) {
    errors.push({
      name: 'update_without_lookup',
      message: 'Cannot update existing records without a lookup field',
      severity: 'error'
    })
  }

  if (config.entity) {
    const queryMethod = getQueryMethod(config.entity)
    
    if (queryMethod === 'search') {
      warnings.push({
        name: 'search_only_entity',
        message: `⚠️ ${config.entity} only supports Search (Lucene query syntax). Record lookups during CSV import use Query and may have limitations. Consider using exact ID matches in your lookup field.`,
        severity: 'warning'
      })
    } else if (queryMethod === 'query') {
      warnings.push({
        name: 'query_only_entity',
        message: `ℹ️ ${config.entity} only supports Query (SQL-like WHERE syntax). Search is not available for this entity type.`,
        severity: 'warning'
      })
    }
  }

    errors,
    warnings
  }
}

export function validateRowData(
  row: string[],
  headers: string[],
  rowIndex: number,
  mappings: Array<{ csvColumn: string; bullhornField: string }>,
  lookupField?: string
): FieldMappingValidationResult {
  const errors: ValidationRule[] = []
  const warnings: ValidationRule[] = []

  if (row.length !== headers.length) {
    warnings.push({
      name: 'column_count_mismatch',
      message: `Row ${rowIndex + 1} has ${row.length} columns, expected ${headers.length}`,
      severity: 'warning'
    })
  }

  const allEmpty = row.every(cell => !cell || cell.trim() === '')
  if (allEmpty) {
    warnings.push({
      name: 'empty_row',
      message: `Row ${rowIndex + 1} is completely empty`,
      severity: 'warning'
    })
  }

  if (lookupField && lookupField !== '__none__') {
    const lookupMapping = mappings.find(m => m.bullhornField === lookupField)
    if (lookupMapping) {
      const csvIndex = headers.indexOf(lookupMapping.csvColumn)
      if (csvIndex !== -1) {
        const lookupValue = row[csvIndex]
        if (!lookupValue || lookupValue.trim() === '') {
          warnings.push({
            name: 'empty_lookup_value',
            message: `Row ${rowIndex + 1} has empty lookup field value`,
            severity: 'warning'
          })
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}
